import { prisma } from '../../infrastructure/database/prisma';
import { SplitMethod } from '@prisma/client';
import { GroupService } from '../groups/group.service';
import { Money } from '../../utils/money';
import { NotificationService } from '../notifications/notification.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { RealtimeSyncService } from '../realtime/realtime.service';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
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
  originalAmountMinor?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  isLocked?: boolean;
  createdByUserId?: string;
  allowedEditorIds?: string[];
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
      const created = await (tx.expense as any).create({
        data: {
          groupId: input.groupId,
          description: input.description.trim(),
          amountMinor: input.amountMinor,
          currency: input.currency || 'INR',
          originalAmountMinor: input.originalAmountMinor,
          originalCurrency: input.originalCurrency,
          exchangeRate: input.exchangeRate,
          isLocked: input.isLocked ?? false,
          createdByUserId: authenticatedUserId,
          allowedEditorIds: [authenticatedUserId],
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

    // Notify other group members about the newly added expense
    try {
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: input.groupId, leftAt: null, userId: { not: authenticatedUserId } },
        select: { userId: true },
      });

      const formattedAmount = (Number(expense.amountMinor) / 100).toFixed(2);
      const payerName = expense.payer.name;
      const groupName = expense.group.name;

      for (const member of groupMembers) {
        await NotificationService.createNotification({
          recipientUserId: member.userId,
          actorUserId: authenticatedUserId,
          type: 'EXPENSE_ADDED',
          groupId: input.groupId,
          groupName,
          title: `New Expense: ${expense.description}`,
          message: `${payerName} added ₹${formattedAmount} in ${groupName}`,
        });
      }
    } catch (notifErr) {
      console.error('Failed to send expense notifications to group members:', notifErr);
    }

    // Invalidate Dashboard Cache & Broadcast Realtime Event
    try {
      const affectedUserIds = Array.from(new Set([input.paidByUserId, ...computedSplits.map((s) => s.userId)]));
      await DashboardService.invalidateUserDashboard(affectedUserIds);
      RealtimeSyncService.notifyUsers(affectedUserIds, { type: 'DATA_CHANGED', entity: 'EXPENSE', groupId: input.groupId });
    } catch (cacheErr) {
      console.warn('Failed to invalidate dashboard cache on expense creation:', cacheErr);
    }

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

    // Enforce Lock Check: If locked, only creator or users in allowedEditorIds can edit
    const expData = existing as any;
    if (expData.isLocked) {
      const isCreator = expData.createdByUserId === authenticatedUserId;
      const isAllowed = expData.allowedEditorIds?.includes(authenticatedUserId);
      if (!isCreator && !isAllowed) {
        throw new ForbiddenError(
          'This expense is locked by the creator. You must request edit access.',
          'EXPENSE_LOCKED'
        );
      }
    }

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

    // Notify other group members about the updated expense
    try {
      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: updated.groupId, leftAt: null, userId: { not: authenticatedUserId } },
        select: { userId: true },
      });

      const actor = await prisma.user.findUnique({
        where: { id: authenticatedUserId },
        select: { name: true },
      });
      const actorName = actor?.name || 'A member';
      const formattedAmount = (Number(updated.amountMinor) / 100).toFixed(2);

      for (const member of groupMembers) {
        await NotificationService.createNotification({
          recipientUserId: member.userId,
          actorUserId: authenticatedUserId,
          type: 'EXPENSE_UPDATED',
          groupId: updated.groupId,
          groupName: updated.group.name,
          title: `Expense Updated: ${updated.description}`,
          message: `${actorName} edited "${updated.description}" (₹${formattedAmount})`,
        });
      }
    } catch (notifErr) {
      console.warn('Failed to send expense update notifications:', notifErr);
    }
    // Invalidate Dashboard Cache & Broadcast Realtime Event
    try {
      const allMembers = await prisma.groupMember.findMany({
        where: { groupId: updated.groupId, leftAt: null },
        select: { userId: true },
      });
      const memberIds = allMembers.map((m) => m.userId);
      await DashboardService.invalidateUserDashboard(memberIds);
      RealtimeSyncService.notifyUsers(memberIds, { type: 'DATA_CHANGED', entity: 'EXPENSE', groupId: updated.groupId });
    } catch (cacheErr) {
      console.warn('Failed to invalidate dashboard cache on expense update:', cacheErr);
    }

    return this.mapExpenseResponse(updated);
  }

  public static async deleteExpense(
    expenseId: string,
    authenticatedUserId: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; message: string }> {
    const existing = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        splits: true,
      },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    await GroupService.verifyMembership(existing.groupId, authenticatedUserId);

    // Enforce Lock Protection
    const expObj = existing as any;
    if (expObj.isLocked) {
      const isCreator = expObj.createdByUserId === authenticatedUserId;
      const isAllowed = expObj.allowedEditorIds?.includes(authenticatedUserId);
      if (!isCreator && !isAllowed) {
        throw new ForbiddenError(
          'This expense is locked by its creator. You must request edit access before deleting it.',
          'EXPENSE_LOCKED'
        );
      }
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
          metadata: {
            idempotencyKey,
            groupId: existing.groupId,
            deletedAt: new Date().toISOString(),
          },
        },
      });
    });

    // Invalidate Dashboard Cache & Broadcast Realtime Event
    try {
      const allMembers = await prisma.groupMember.findMany({
        where: { groupId: existing.groupId, leftAt: null },
        select: { userId: true },
      });
      const memberIds = allMembers.map((m) => m.userId);
      await DashboardService.invalidateUserDashboard(memberIds);
      RealtimeSyncService.notifyUsers(memberIds, { type: 'DATA_CHANGED', entity: 'EXPENSE', groupId: existing.groupId });
    } catch (cacheErr) {
      console.warn('Failed to invalidate dashboard cache on expense deletion:', cacheErr);
    }
    return { success: true, message: 'Expense deleted successfully' };
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

  public static async getUserExpenses(
    userId: string,
    query: PaginationQuery
  ): Promise<{ data: ExpenseDetailsResponse[]; meta: { page: number; limit: number; total: number } }> {
    // 1. Get all group IDs the user belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    const whereClause: any = {
      deletedAt: null,
    };

    if (groupIds.length > 0) {
      whereClause.OR = [
        { groupId: { in: groupIds } },
        { paidByUserId: userId },
        { splits: { some: { userId } } },
      ];
    } else {
      whereClause.OR = [
        { paidByUserId: userId },
        { splits: { some: { userId } } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where: whereClause }),
      prisma.expense.findMany({
        where: whereClause,
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

  public static async requestEditAccess(
    expenseId: string,
    authenticatedUserId: string
  ): Promise<{ success: boolean; message: string }> {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: { select: { name: true } },
      },
    });

    if (!expense || expense.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    await GroupService.verifyMembership(expense.groupId, authenticatedUserId);

    const requester = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: { name: true },
    });
    const requesterName = requester?.name || 'A group member';
    const expObj = expense as any;
    const targetRecipientId = expObj.createdByUserId || expObj.paidByUserId;

    if (targetRecipientId === authenticatedUserId) {
      return { success: true, message: 'You already have edit access to this expense.' };
    }

    // Send edit access request notification to the creator/payer
    await NotificationService.createNotification({
      recipientUserId: targetRecipientId,
      actorUserId: authenticatedUserId,
      type: 'EXPENSE_EDIT_REQUEST',
      groupId: expense.groupId,
      groupName: expense.group.name,
      expenseId: expense.id,
      expenseTitle: expense.description,
      amountMinor: Number(expense.amountMinor),
      title: 'Edit Access Requested 🔒',
      message: `${requesterName} is requesting permission to edit "${expense.description}".`,
    });

    return {
      success: true,
      message: `Request sent to ${expObj.createdByUserId ? 'creator' : 'payer'}. You will be notified once approved.`,
    };
  }

  private static mapExpenseResponse(expense: any): ExpenseDetailsResponse {
    return {
      id: expense.id,
      groupId: expense.groupId,
      groupName: expense.group.name,
      description: expense.description,
      amountMinor: Number(expense.amountMinor),
      currency: expense.currency,
      originalAmountMinor: expense.originalAmountMinor ? Number(expense.originalAmountMinor) : undefined,
      originalCurrency: expense.originalCurrency || undefined,
      exchangeRate: expense.exchangeRate ? Number(expense.exchangeRate) : undefined,
      isLocked: expense.isLocked ?? false,
      createdByUserId: expense.createdByUserId || undefined,
      allowedEditorIds: expense.allowedEditorIds || [],
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
