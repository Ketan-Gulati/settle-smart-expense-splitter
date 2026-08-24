import { prisma } from '../../infrastructure/database/prisma';
import { GroupService } from '../groups/group.service';
import {
  ValidationError,
  FinancialInvariantError,
} from '../../errors/AppError';
import { CreateSettlementInput } from './settlement.schemas';
import { PaginationQuery } from '../expenses/expense.schemas';

export interface SettlementResponse {
  id: string;
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountMinor: number;
  currency: string;
  note: string | null;
  createdAt: string;
}

export class SettlementService {
  public static async recordSettlement(
    groupId: string,
    authenticatedUserId: string,
    input: CreateSettlementInput,
    idempotencyKey?: string
  ): Promise<SettlementResponse> {
    if (authenticatedUserId === input.toUserId) {
      throw new ValidationError('Self-settlement is prohibited', 'SELF_SETTLEMENT_PROHIBITED');
    }

    await GroupService.verifyMembership(groupId, authenticatedUserId);
    await GroupService.verifyMembership(groupId, input.toUserId);

    if (input.amountMinor <= 0n) {
      throw new FinancialInvariantError('Settlement amount must be greater than zero', 'INVALID_AMOUNT');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { currency: true },
    });

    const settlement = await prisma.$transaction(async (tx) => {
      const created = await tx.settlement.create({
        data: {
          groupId,
          fromUserId: authenticatedUserId,
          toUserId: input.toUserId,
          amountMinor: input.amountMinor,
          currency: group?.currency || 'INR',
          note: input.note,
        },
        include: {
          fromUser: { select: { name: true } },
          toUser: { select: { name: true } },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: authenticatedUserId,
          eventType: 'SETTLEMENT_RECORDED',
          entityType: 'SETTLEMENT',
          entityId: created.id,
          metadata: {
            idempotencyKey,
            groupId,
            fromUserId: authenticatedUserId,
            toUserId: input.toUserId,
            amountMinor: Number(input.amountMinor),
          },
        },
      });

      return created;
    });

    return {
      id: settlement.id,
      groupId: settlement.groupId,
      fromUserId: settlement.fromUserId,
      fromUserName: settlement.fromUser.name,
      toUserId: settlement.toUserId,
      toUserName: settlement.toUser.name,
      amountMinor: Number(settlement.amountMinor),
      currency: settlement.currency,
      note: settlement.note,
      createdAt: settlement.createdAt.toISOString(),
    };
  }

  public static async getGroupSettlements(
    groupId: string,
    userId: string,
    query: PaginationQuery
  ): Promise<{ data: SettlementResponse[]; meta: { page: number; limit: number; total: number } }> {
    await GroupService.verifyMembership(groupId, userId);

    const skip = (query.page - 1) * query.limit;

    const [total, settlements] = await Promise.all([
      prisma.settlement.count({
        where: { groupId, deletedAt: null },
      }),
      prisma.settlement.findMany({
        where: { groupId, deletedAt: null },
        include: {
          fromUser: { select: { name: true } },
          toUser: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
    ]);

    return {
      data: settlements.map((s) => ({
        id: s.id,
        groupId: s.groupId,
        fromUserId: s.fromUserId,
        fromUserName: s.fromUser.name,
        toUserId: s.toUserId,
        toUserName: s.toUser.name,
        amountMinor: Number(s.amountMinor),
        currency: s.currency,
        note: s.note,
        createdAt: s.createdAt.toISOString(),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }
}
