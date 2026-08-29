import { prisma } from '../../infrastructure/database/prisma';
import { CacheService } from '../../infrastructure/redis/redis.service';
import { ActivityEventDTO } from '../activity/activity.service';

export interface DashboardGroupCardDTO {
  id: string;
  name: string;
  currency: string;
  userNetBalanceMinor: number;
  unsettledExpenseCount: number;
  memberCount: number;
}

export interface DashboardResponse {
  totalNetBalanceMinor: number;
  groups: DashboardGroupCardDTO[];
  recentActivity: ActivityEventDTO[];
}

export class DashboardService {
  /**
   * Generates a stable Redis/In-Memory Cache Key for the User's Dashboard Read Model
   */
  public static getDashboardCacheKey(userId: string): string {
    return `settle:dashboard:user:${userId}`;
  }

  /**
   * Invalidate dashboard cache for a user or multiple users (e.g. on expense create/update/settlement)
   */
  public static async invalidateUserDashboard(userIds: string | string[]): Promise<void> {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if (ids.length === 0) return;
    const keys = ids.map((id) => this.getDashboardCacheKey(id));
    await CacheService.del(keys);
  }

  /**
   * Highly-optimized Dashboard Aggregator:
   * 1. Checks Redis cache first (< 10ms response).
   * 2. On cache miss, performs BATCH queries (0 N+1 queries) and computes balances in memory.
   * 3. Stores the read model in Redis cache with explicit TTL.
   */
  public static async getDashboardData(userId: string): Promise<DashboardResponse> {
    const cacheKey = this.getDashboardCacheKey(userId);

    // 1. Redis Cache Hit Check
    const cached = await CacheService.get<DashboardResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Single BATCH Query: Fetch user's active group memberships
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null, group: { isArchived: false } },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: { where: { leftAt: null } },
                expenses: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    if (memberships.length === 0) {
      const emptyDashboard: DashboardResponse = {
        totalNetBalanceMinor: 0,
        groups: [],
        recentActivity: [],
      };
      await CacheService.set(cacheKey, emptyDashboard, 300);
      return emptyDashboard;
    }

    const groupIds = memberships.map((m) => m.groupId);

    // 3. Single BATCH Query: Fetch all non-deleted expenses + splits AND settlements for ALL user's groups in parallel
    const [allExpenses, allSettlements] = await Promise.all([
      prisma.expense.findMany({
        where: {
          groupId: { in: groupIds },
          deletedAt: null,
        },
        select: {
          id: true,
          groupId: true,
          description: true,
          amountMinor: true,
          currency: true,
          paidByUserId: true,
          createdAt: true,
          splits: {
            select: {
              userId: true,
              amountMinor: true,
            },
          },
          payer: {
            select: {
              name: true,
            },
          },
          group: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.settlement.findMany({
        where: {
          groupId: { in: groupIds },
          deletedAt: null,
        },
        select: {
          groupId: true,
          fromUserId: true,
          toUserId: true,
          amountMinor: true,
        },
      }),
    ]);

    // 4. Compute User's Net Balance per group in-memory (O(N) single-pass)
    // netMap: groupId -> user's net balance (BigInt)
    const userGroupBalanceMap = new Map<string, bigint>();
    groupIds.forEach((gid) => userGroupBalanceMap.set(gid, 0n));

    // Process Expenses & Splits
    for (const exp of allExpenses) {
      const gid = exp.groupId;
      let currentBal = userGroupBalanceMap.get(gid) || 0n;

      // If current user is the payer, add what others owe
      if (exp.paidByUserId === userId) {
        currentBal += BigInt(exp.amountMinor);
      }

      // If current user is in splits, subtract user's share
      const userSplit = exp.splits.find((s) => s.userId === userId);
      if (userSplit) {
        currentBal -= BigInt(userSplit.amountMinor);
      }

      userGroupBalanceMap.set(gid, currentBal);
    }

    // Process Settlements
    for (const st of allSettlements) {
      const gid = st.groupId;
      let currentBal = userGroupBalanceMap.get(gid) || 0n;

      if (st.fromUserId === userId) {
        // User paid off debt -> net balance increases towards 0
        currentBal += BigInt(st.amountMinor);
      } else if (st.toUserId === userId) {
        // User received money -> net balance decreases towards 0
        currentBal -= BigInt(st.amountMinor);
      }

      userGroupBalanceMap.set(gid, currentBal);
    }

    // 5. Construct Groups summary & Total Net Balance
    const groups: DashboardGroupCardDTO[] = [];
    let totalNetBalanceMinor = 0;

    for (const m of memberships) {
      const userGroupBalBig = userGroupBalanceMap.get(m.groupId) || 0n;
      const userGroupBal = Number(userGroupBalBig);

      totalNetBalanceMinor += userGroupBal;

      groups.push({
        id: m.group.id,
        name: m.group.name,
        currency: m.group.currency,
        userNetBalanceMinor: userGroupBal,
        unsettledExpenseCount: m.group._count.expenses,
        memberCount: m.group._count.members,
      });
    }

    // 6. Construct Recent Activity Feed directly from already-fetched expenses (Top 5)
    const recentActivity: ActivityEventDTO[] = allExpenses.slice(0, 5).map((exp) => {
      const isPayer = exp.paidByUserId === userId;
      const userSplitBig = exp.splits.find((s) => s.userId === userId)?.amountMinor || 0n;
      const expAmount = Number(exp.amountMinor);
      const userSplit = Number(userSplitBig);
      const userShareMinor = isPayer ? expAmount - userSplit : -userSplit;

      return {
        id: exp.id,
        type: 'EXPENSE',
        title: exp.description,
        groupId: exp.groupId,
        groupName: exp.group?.name || 'Group',
        totalAmountMinor: expAmount,
        currency: exp.currency,
        payerName: exp.payer?.name || 'A Member',
        userShareMinor,
        timestamp: exp.createdAt.toISOString(),
      };
    });

    const response: DashboardResponse = {
      totalNetBalanceMinor,
      groups,
      recentActivity,
    };

    // 7. Store in Cache with 5-minute TTL (Invalidated proactively on mutations)
    await CacheService.set(cacheKey, response, 300);

    return response;
  }
}
