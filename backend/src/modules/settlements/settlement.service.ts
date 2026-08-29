import { prisma } from '../../infrastructure/database/prisma';
import { GroupService } from '../groups/group.service';
import { NotificationService } from '../notifications/notification.service';
import { BalanceService } from '../balances/balance.service';
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
    const actualFromUserId = input.fromUserId || authenticatedUserId;
    const actualToUserId = input.toUserId;

    if (actualFromUserId === actualToUserId) {
      throw new ValidationError('Self-settlement is prohibited', 'SELF_SETTLEMENT_PROHIBITED');
    }

    await GroupService.verifyMembership(groupId, actualFromUserId);
    await GroupService.verifyMembership(groupId, actualToUserId);

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
          fromUserId: actualFromUserId,
          toUserId: actualToUserId,
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
            fromUserId: actualFromUserId,
            toUserId: actualToUserId,
            amountMinor: Number(input.amountMinor),
          },
        },
      });

      return created;
    });

    // Notify recipient and group members about payment & check if group is fully settled
    try {
      const formattedAmount = (Number(settlement.amountMinor) / 100).toFixed(2);
      const payerName = settlement.fromUser.name;
      const groupName = group?.currency ? (await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }))?.name || 'Group' : 'Group';

      // 1. Notify the payment receiver: "You were paid ₹1,500"
      if (settlement.toUserId !== authenticatedUserId) {
        await NotificationService.createNotification({
          recipientUserId: settlement.toUserId,
          actorUserId: authenticatedUserId,
          type: 'PAYMENT_RECEIVED',
          groupId,
          groupName,
          amountMinor: Number(settlement.amountMinor) / 100,
          title: `Payment Received`,
          message: `You were paid ₹${formattedAmount} by ${payerName} in ${groupName}`,
        });
      }

      // 2. Check if group is fully settled (all member net balances = 0)
      const balances = await BalanceService.calculateGroupNetBalances(groupId);
      const isFullySettled = Array.from(balances.values()).every((net) => net === 0n);

      if (isFullySettled) {
        const allMembers = await prisma.groupMember.findMany({
          where: { groupId, leftAt: null },
          select: { userId: true },
        });

        for (const m of allMembers) {
          await NotificationService.createNotification({
            recipientUserId: m.userId,
            actorUserId: authenticatedUserId,
            type: 'GROUP_SETTLED_UP',
            groupId,
            groupName,
            title: `Group Fully Settled!`,
            message: `${groupName} is fully settled up. All balances are zero! 🎉`,
          });
        }
      }

      // 3. Invalidate Dashboard Cache & Broadcast Realtime Event
      try {
        const { DashboardService } = await import('../dashboard/dashboard.service');
        const { RealtimeSyncService } = await import('../realtime/realtime.service');
        const allMembers = await prisma.groupMember.findMany({
          where: { groupId, leftAt: null },
          select: { userId: true },
        });
        const memberIds = allMembers.map((m) => m.userId);
        await DashboardService.invalidateUserDashboard(memberIds);
        RealtimeSyncService.notifyUsers(memberIds, { type: 'DATA_CHANGED', entity: 'SETTLEMENT', groupId });
      } catch (cacheErr) {
        console.warn('Failed to invalidate dashboard cache on settlement:', cacheErr);
      }
    } catch (notifErr) {
      console.warn('Failed to send settlement notifications:', notifErr);
    }

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

  public static async getUserSettlements(
    userId: string,
    query: PaginationQuery
  ): Promise<{ data: SettlementResponse[]; meta: { page: number; limit: number; total: number } }> {
    const skip = (query.page - 1) * query.limit;

    // Get user's active groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    const whereClause: any = {
      deletedAt: null,
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    };

    if (groupIds.length > 0) {
      whereClause.OR.push({ groupId: { in: groupIds } });
    }

    const [total, settlements] = await Promise.all([
      prisma.settlement.count({
        where: whereClause,
      }),
      prisma.settlement.findMany({
        where: whereClause,
        include: {
          group: { select: { name: true } },
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
        groupName: (s as any).group?.name || 'Group',
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
