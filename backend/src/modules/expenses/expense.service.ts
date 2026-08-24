import { prisma } from '../../infrastructure/database/prisma';
import { SplitMethod } from '@prisma/client';
import { GroupService } from '../groups/group.service';
import { Money } from '../../utils/money';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  FinancialInvariantError,
} from '../../errors/AppError';
import { CreateExpenseInput, UpdateExpenseInput, PaginationQuery } from './expense.schemas';

export interface ExpenseSplitResponse {
  userId: string;
  userName: string;
  amountMinor: number;
}

export interface ExpenseDetailsResponse {
  id: string;
  groupId: string;
  groupName: string;
  description: string;
  amountMinor: number;
  currency: string;
  paidByUserId: string;
  paidByUserName: string;
  splitMethod: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
  splits: ExpenseSplitResponse[];
}

export class ExpenseService {
  public static async createExpense(
    authenticatedUserId: string,
    input: CreateExpenseInput,
    idempotencyKey?: string
  ): Promise<ExpenseDetailsResponse> {
    // 1. Verify group membership for authenticated user, payer, and all participants
    await GroupService.verifyMembership(input.groupId, authenticatedUserId);
    await GroupService.verifyMembership(input.groupId, input.paidByUserId);

    const participantIds = input.participants.map((p) => p.userId);
    const uniqueParticipantIds = Array.from(new Set(participantIds));
    if (uniqueParticipantIds.length !== participantIds.length) {
      throw new ValidationError('Duplicate participant in expense', 'INVALID_PARTICIPANT');
    }

    for (const participantId of uniqueParticipantIds) {
      await GroupService.verifyMembership(input.groupId, participantId);
    }

    // 2. Server-side Split Allocation Calculation & Invariant Enforcement
    const computedSplits = this.calculateSplits(
      input.amountMinor,
      input.splitMethod,
      input.participants
    );

    // Verify split sum invariant
    const totalSplit = computedSplits.reduce((acc, s) => acc + s.amountMinor, 0n);
    if (totalSplit !== input.amountMinor) {
      throw new FinancialInvariantError('Sum of participant splits must exactly equal total amount', 'INVALID_SPLIT_SUM');
    }

    // 3. Atomic Transaction Execution
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId: input.groupId,
          description: input.description.trim(),
          amountMinor: input.amountMinor,
          currency: 'INR',
          paidByUserId: input.paidByUserId,
          splitMethod: input.splitMethod as SplitMethod,
          category: input.category,
          notes: input.notes,
          splits: {
            create: computedSplits.map((s) => ({
              userId: s.userId,
              amountMinor: s.amountMinor,
            })),
          },
        },
        include: {
          group: { select: { name: true } },
          payer: { select: { name: true } },
          splits: {
            include: { user: { select: { name: true } } },
          },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: authenticatedUserId,
          eventType: 'EXPENSE_CREATED',
          entityType: 'EXPENSE',
          entityId: created.id,
          metadata: {
            idempotencyKey,
            groupId: input.groupId,
            amountMinor: Number(input.amountMinor),
            splitsCount: computedSplits.length,
          },
        },
      });

      return created;
    });

    return this.mapExpenseResponse(expense);
  }

  public static async getExpenseDetails(expenseId: string, userId: string): Promise<ExpenseDetailsResponse> {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: { select: { name: true } },
        payer: { select: { name: true } },
        splits: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!expense || expense.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    await GroupService.verifyMembership(expense.groupId, userId);

    return this.mapExpenseResponse(expense);
  }

  public static async updateExpense(
    expenseId: string,
    authenticatedUserId: string,
    input: UpdateExpenseInput
  ): Promise<ExpenseDetailsResponse> {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { splits: true },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    await GroupService.verifyMembership(existing.groupId, authenticatedUserId);

    const newAmountMinor = input.amountMinor ?? existing.amountMinor;
    const newPaidByUserId = input.paidByUserId ?? existing.paidByUserId;
    const newSplitMethod = (input.splitMethod ?? existing.splitMethod) as SplitMethod;

    if (input.paidByUserId) {
      await GroupService.verifyMembership(existing.groupId, input.paidByUserId);
    }

    let computedSplits: Array<{ userId: string; amountMinor: bigint }>;
    if (input.participants) {
      const participantIds = input.participants.map((p) => p.userId);
      const uniqueParticipantIds = Array.from(new Set(participantIds));
      if (uniqueParticipantIds.length !== participantIds.length) {
        throw new ValidationError('Duplicate participant in expense', 'INVALID_PARTICIPANT');
      }

      for (const pId of uniqueParticipantIds) {
        await GroupService.verifyMembership(existing.groupId, pId);
      }

      computedSplits = this.calculateSplits(newAmountMinor, newSplitMethod, input.participants);
    } else if (input.amountMinor && input.amountMinor !== existing.amountMinor) {
      // Re-allocate existing participants with new amount
      computedSplits = this.calculateSplits(
        newAmountMinor,
        newSplitMethod,
        existing.splits.map((s) => ({ userId: s.userId }))
      );
    } else {
      computedSplits = existing.splits.map((s) => ({ userId: s.userId, amountMinor: s.amountMinor }));
    }

    const totalSplit = computedSplits.reduce((acc, s) => acc + s.amountMinor, 0n);
    if (totalSplit !== newAmountMinor) {
      throw new FinancialInvariantError('Sum of participant splits must exactly equal total amount', 'INVALID_SPLIT_SUM');
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old splits
      await tx.expenseSplit.deleteMany({
        where: { expenseId },
      });

      // Update expense and create new splits
      const exp = await tx.expense.update({
        where: { id: expenseId },
        data: {
          description: input.description !== undefined ? input.description.trim() : existing.description,
          amountMinor: newAmountMinor,
          paidByUserId: newPaidByUserId,
          splitMethod: newSplitMethod,
          category: input.category !== undefined ? input.category : existing.category,
          notes: input.notes !== undefined ? input.notes : existing.notes,
          splits: {
            create: computedSplits.map((s) => ({
              userId: s.userId,
              amountMinor: s.amountMinor,
            })),
          },
        },
        include: {
          group: { select: { name: true } },
          payer: { select: { name: true } },
          splits: {
            include: { user: { select: { name: true } } },
          },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: authenticatedUserId,
          eventType: 'EXPENSE_UPDATED',
          entityType: 'EXPENSE',
          entityId: expenseId,
          metadata: { amountMinor: Number(newAmountMinor), splitsCount: computedSplits.length },
        },
      });

      return exp;
    });

    return this.mapExpenseResponse(updated);
  }

  public static async deleteExpense(expenseId: string, authenticatedUserId: string): Promise<void> {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    await GroupService.verifyMembership(existing.groupId, authenticatedUserId);

    // Hardening Invariant: Check if active settlements exist in the group
    // Deleting an expense after settlements are recorded invalidates historical debt reconciliations
    const activeSettlementsCount = await prisma.settlement.count({
      where: { groupId: existing.groupId, deletedAt: null },
    });

    if (activeSettlementsCount > 0) {
      throw new ConflictError(
        'Cannot delete expense after settlements have been recorded in this group. Historical debt records must be preserved.',
        'CANNOT_DELETE_SETTLED_EXPENSE'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: authenticatedUserId,
          eventType: 'EXPENSE_DELETED',
          entityType: 'EXPENSE',
          entityId: expenseId,
          metadata: { groupId: existing.groupId },
        },
      });
    });
  }

  public static async getGroupExpenses(
    groupId: string,
    userId: string,
    query: PaginationQuery
  ): Promise<{ data: ExpenseDetailsResponse[]; meta: { page: number; limit: number; total: number } }> {
    await GroupService.verifyMembership(groupId, userId);

    const skip = (query.page - 1) * query.limit;

    const [total, expenses] = await Promise.all([
      prisma.expense.count({
        where: { groupId, deletedAt: null },
      }),
      prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: {
          group: { select: { name: true } },
          payer: { select: { name: true } },
          splits: {
            include: { user: { select: { name: true } } },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data: expenses.map((exp) => this.mapExpenseResponse(exp)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  private static calculateSplits(
    amountMinor: bigint,
    splitMethod: string,
    participants: Array<{ userId: string; amountMinor?: bigint; percentage?: number; shares?: number }>
  ): Array<{ userId: string; amountMinor: bigint }> {
    const count = participants.length;
    if (count === 0) throw new ValidationError('Participants list cannot be empty');

    if (splitMethod === 'EQUAL') {
      const allocated = Money.allocateEqual(amountMinor, count);
      return participants.map((p, idx) => ({
        userId: p.userId,
        amountMinor: allocated[idx]!,
      }));
    }

    if (splitMethod === 'EXACT') {
      return participants.map((p) => {
        if (p.amountMinor === undefined || p.amountMinor < 0n) {
          throw new ValidationError(`Exact amount for participant ${p.userId} is required and must be >= 0`);
        }
        return {
          userId: p.userId,
          amountMinor: p.amountMinor,
        };
      });
    }

    if (splitMethod === 'PERCENTAGE') {
      const totalPercentage = participants.reduce((acc, p) => acc + (p.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new ValidationError(`Percentage split must total 100%, got ${totalPercentage}%`);
      }

      let runningSum = 0n;
      const splits = participants.map((p, idx) => {
        if (idx === count - 1) {
          // Final participant absorbs rounding remainder
          return {
            userId: p.userId,
            amountMinor: amountMinor - runningSum,
          };
        }
        const pct = p.percentage || 0;
        const shareMinor = (amountMinor * BigInt(Math.round(pct * 100))) / 10000n;
        runningSum += shareMinor;
        return {
          userId: p.userId,
          amountMinor: shareMinor,
        };
      });
      return splits;
    }

    if (splitMethod === 'SHARES') {
      const totalShares = participants.reduce((acc, p) => acc + (p.shares || 1), 0);
      if (totalShares <= 0) throw new ValidationError('Total shares must be > 0');

      let runningSum = 0n;
      const totalSharesBig = BigInt(totalShares);
      const splits = participants.map((p, idx) => {
        if (idx === count - 1) {
          return {
            userId: p.userId,
            amountMinor: amountMinor - runningSum,
          };
        }
        const sharesBig = BigInt(p.shares || 1);
        const shareMinor = (amountMinor * sharesBig) / totalSharesBig;
        runningSum += shareMinor;
        return {
          userId: p.userId,
          amountMinor: shareMinor,
        };
      });
      return splits;
    }

    throw new ValidationError(`Unsupported split method: ${splitMethod}`);
  }

  private static mapExpenseResponse(expense: any): ExpenseDetailsResponse {
    return {
      id: expense.id,
      groupId: expense.groupId,
      groupName: expense.group.name,
      description: expense.description,
      amountMinor: Number(expense.amountMinor),
      currency: expense.currency,
      paidByUserId: expense.paidByUserId,
      paidByUserName: expense.payer.name,
      splitMethod: expense.splitMethod,
      category: expense.category,
      notes: expense.notes,
      createdAt: expense.createdAt.toISOString(),
      splits: expense.splits.map((s: any) => ({
        userId: s.userId,
        userName: s.user.name,
        amountMinor: Number(s.amountMinor),
      })),
    };
  }
}
