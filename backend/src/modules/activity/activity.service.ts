import { prisma } from '../../infrastructure/database/prisma';
import { PaginationQuery } from '../expenses/expense.schemas';

export interface ActivityEventDTO {
  id: string;
  type: 'EXPENSE' | 'SETTLEMENT';
  title: string;
  groupId: string;
  groupName: string;
  timestamp: string;
  totalAmountMinor: number;
  currency: string;
  payerName: string;
  userShareMinor: number;
  subtitle?: string;
  statusText?: string;
}

export class ActivityService {
  public static async getUserActivityFeed(
    userId: string,
    query: PaginationQuery
  ): Promise<{ data: ActivityEventDTO[]; meta: { page: number; limit: number; total: number } }> {
    // 1. Get all active group IDs for the user
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return { data: [], meta: { page: query.page, limit: query.limit, total: 0 } };
    }

    const skip = (query.page - 1) * query.limit;

    // 2. Fetch recent expenses and settlements bounded by (skip + limit)
    const fetchLimit = Math.min(Math.max((query.page) * query.limit, 50), 200);

    const [expenses, settlements] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId: { in: groupIds }, deletedAt: null },
        take: fetchLimit,
        include: {
          group: { select: { name: true } },
          payer: { select: { id: true, name: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.settlement.findMany({
        where: { groupId: { in: groupIds }, deletedAt: null },
        take: fetchLimit,
        include: {
          group: { select: { name: true } },
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const combined: ActivityEventDTO[] = [];

    // Map expenses
    for (const exp of expenses) {
      const isYouPayer = exp.paidByUserId === userId;
      const youSplit = exp.splits.find((s) => s.userId === userId);
      const userShareMinor = isYouPayer
        ? Number(exp.amountMinor - (youSplit?.amountMinor || 0n))
        : -Number(youSplit?.amountMinor || 0n);

      let statusText = '';
      if (isYouPayer) {
        if (userShareMinor > 0) {
          statusText = `You lent ₹${(userShareMinor / 100).toFixed(2)}`;
        } else {
          statusText = 'You paid for yourself';
        }
      } else {
        if (youSplit && youSplit.amountMinor > 0n) {
          statusText = `You owe ${exp.payer.name} ₹${(Number(youSplit.amountMinor) / 100).toFixed(2)}`;
        } else {
          statusText = 'Not involved';
        }
      }

      combined.push({
        id: exp.id,
        type: 'EXPENSE',
        title: exp.description,
        groupId: exp.groupId,
        groupName: exp.group.name,
        timestamp: exp.createdAt.toISOString(),
        totalAmountMinor: Number(exp.amountMinor),
        currency: exp.currency,
        payerName: isYouPayer ? 'You' : exp.payer.name,
        userShareMinor,
        statusText,
      });
    }

    // Map settlements
    for (const s of settlements) {
      const isFromYou = s.fromUserId === userId;
      const isToYou = s.toUserId === userId;
      let userShareMinor = 0;
      if (isFromYou) userShareMinor = Number(s.amountMinor); // Sent money (improves net balance)
      if (isToYou) userShareMinor = -Number(s.amountMinor); // Received money

      let statusText = '';
      if (isFromYou) {
        statusText = `You paid ${s.toUser.name}`;
      } else if (isToYou) {
        statusText = `${s.fromUser.name} paid you`;
      } else {
        statusText = `${s.fromUser.name} paid ${s.toUser.name}`;
      }

      combined.push({
        id: s.id,
        type: 'SETTLEMENT',
        title: isFromYou ? `Paid ${s.toUser.name}` : isToYou ? `${s.fromUser.name} paid you` : `${s.fromUser.name} paid ${s.toUser.name}`,
        groupId: s.groupId,
        groupName: s.group.name,
        timestamp: s.createdAt.toISOString(),
        totalAmountMinor: Number(s.amountMinor),
        currency: s.currency,
        payerName: isFromYou ? 'You' : s.fromUser.name,
        userShareMinor,
        statusText,
      });
    }

    // Sort newest first
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = combined.length;
    const paginated = combined.slice(skip, skip + query.limit);

    return {
      data: paginated,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }
}
