import { prisma } from '../../infrastructure/database/prisma';
import { GroupService } from '../groups/group.service';
import { NotFoundError } from '../../errors/AppError';

export interface MemberBalanceDTO {
  userId: string;
  name: string;
  avatarUrl: string | null;
  netBalanceMinor: number;
}

export interface GroupBalancesResponse {
  groupId: string;
  userNetBalanceMinor: number;
  members: MemberBalanceDTO[];
}

export interface PersonBalanceDetailResponse {
  person: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  netBalanceWithPersonMinor: number;
  youPaidForPersonMinor: number;
  personPaidForYouMinor: number;
  sharedExpenseCount: number;
  sharedExpenses: Array<{
    id: string;
    description: string;
    amountMinor: number;
    currency: string;
    date: string;
    payerId: string;
    payerName: string;
    userShareMinor: number;
    personShareMinor: number;
  }>;
}

export class BalanceService {
  /**
   * Derive net balance for all members in a group from non-deleted expenses, splits, and settlements.
   * Returns a map of userId -> netBalanceMinor (bigint).
   */
  public static async calculateGroupNetBalances(groupId: string): Promise<Map<string, bigint>> {
    const [expenses, settlements, members] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: { splits: true },
      }),
      prisma.settlement.findMany({
        where: { groupId, deletedAt: null },
      }),
      prisma.groupMember.findMany({
        where: { groupId, leftAt: null },
        select: { userId: true },
      }),
    ]);

    const netMap = new Map<string, bigint>();
    for (const m of members) {
      netMap.set(m.userId, 0n);
    }

    // 1. Process Expenses & Splits
    for (const exp of expenses) {
      const currentPayerBalance = netMap.get(exp.paidByUserId) || 0n;
      netMap.set(exp.paidByUserId, currentPayerBalance + exp.amountMinor);

      for (const split of exp.splits) {
        const currentSplitBalance = netMap.get(split.userId) || 0n;
        netMap.set(split.userId, currentSplitBalance - split.amountMinor);
      }
    }

    // 2. Process Settlements (fromUser sent money => +credit; toUser received money => -credit)
    for (const s of settlements) {
      const fromBal = netMap.get(s.fromUserId) || 0n;
      netMap.set(s.fromUserId, fromBal + s.amountMinor);

      const toBal = netMap.get(s.toUserId) || 0n;
      netMap.set(s.toUserId, toBal - s.amountMinor);
    }

    return netMap;
  }

  public static async getGroupBalances(groupId: string, userId: string): Promise<GroupBalancesResponse> {
    await GroupService.verifyMembership(groupId, userId);

    const [netMap, group] = await Promise.all([
      this.calculateGroupNetBalances(groupId),
      prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      }),
    ]);

    if (!group) throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');

    const members: MemberBalanceDTO[] = group.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      netBalanceMinor: Number(netMap.get(m.userId) || 0n),
    }));

    return {
      groupId,
      userNetBalanceMinor: Number(netMap.get(userId) || 0n),
      members,
    };
  }

  public static async getPersonBalanceDetail(
    groupId: string,
    authenticatedUserId: string,
    targetUserId: string
  ): Promise<PersonBalanceDetailResponse> {
    await GroupService.verifyMembership(groupId, authenticatedUserId);
    await GroupService.verifyMembership(groupId, targetUserId);

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, avatarUrl: true },
    });

    if (!targetUser) throw new NotFoundError('Target user not found', 'NOT_FOUND');

    const [expenses, settlements] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId, deletedAt: null },
        include: {
          payer: { select: { name: true } },
          splits: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.settlement.findMany({
        where: {
          groupId,
          deletedAt: null,
          OR: [
            { fromUserId: authenticatedUserId, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: authenticatedUserId },
          ],
        },
      }),
    ]);

    let youPaidForPersonMinor = 0n;
    let personPaidForYouMinor = 0n;
    const sharedExpenses: PersonBalanceDetailResponse['sharedExpenses'] = [];

    for (const exp of expenses) {
      const userSplit = exp.splits.find((s) => s.userId === authenticatedUserId);
      const targetSplit = exp.splits.find((s) => s.userId === targetUserId);

      const isUserPayer = exp.paidByUserId === authenticatedUserId;
      const isTargetPayer = exp.paidByUserId === targetUserId;

      if (isUserPayer && targetSplit) {
        youPaidForPersonMinor += targetSplit.amountMinor;
      }
      if (isTargetPayer && userSplit) {
        personPaidForYouMinor += userSplit.amountMinor;
      }

      // Check if both participated in this expense
      if (
        (isUserPayer && targetSplit) ||
        (isTargetPayer && userSplit) ||
        (userSplit && targetSplit)
      ) {
        sharedExpenses.push({
          id: exp.id,
          description: exp.description,
          amountMinor: Number(exp.amountMinor),
          currency: exp.currency,
          date: exp.createdAt.toISOString(),
          payerId: exp.paidByUserId,
          payerName: exp.payer.name,
          userShareMinor: Number(userSplit?.amountMinor || 0n),
          personShareMinor: Number(targetSplit?.amountMinor || 0n),
        });
      }
    }

    // Adjust for bilateral settlements
    let settlementAdjustment = 0n;
    for (const s of settlements) {
      if (s.fromUserId === authenticatedUserId && s.toUserId === targetUserId) {
        settlementAdjustment += s.amountMinor; // You paid them back
      } else if (s.fromUserId === targetUserId && s.toUserId === authenticatedUserId) {
        settlementAdjustment -= s.amountMinor; // They paid you back
      }
    }

    const netBalanceWithPersonMinor =
      youPaidForPersonMinor - personPaidForYouMinor + settlementAdjustment;

    return {
      person: targetUser,
      netBalanceWithPersonMinor: Number(netBalanceWithPersonMinor),
      youPaidForPersonMinor: Number(youPaidForPersonMinor),
      personPaidForYouMinor: Number(personPaidForYouMinor),
      sharedExpenseCount: sharedExpenses.length,
      sharedExpenses,
    };
  }
}
