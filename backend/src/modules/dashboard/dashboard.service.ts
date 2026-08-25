import { prisma } from '../../infrastructure/database/prisma';
import { BalanceService } from '../balances/balance.service';
import { ActivityService, ActivityEventDTO } from '../activity/activity.service';

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
  public static async getDashboardData(userId: string): Promise<DashboardResponse> {
    // 1. Fetch user's active groups
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null, group: { isArchived: false } },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                expenses: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    // 2. Derive net balance for each group concurrently in parallel (eliminating sequential query stalls)
    const netMaps = await Promise.all(
      memberships.map((m) => BalanceService.calculateGroupNetBalances(m.groupId))
    );

    const groups: DashboardGroupCardDTO[] = [];
    let totalNetBalanceMinor = 0;

    memberships.forEach((m, i) => {
      const netMap = netMaps[i] || new Map<string, bigint>();
      const userGroupBal = Number(netMap.get(userId) || 0n);

      totalNetBalanceMinor += userGroupBal;

      groups.push({
        id: m.group.id,
        name: m.group.name,
        currency: m.group.currency,
        userNetBalanceMinor: userGroupBal,
        unsettledExpenseCount: m.group._count.expenses,
        memberCount: m.group._count.members,
      });
    });

    // 3. Fetch top 5 recent activity events
    const activityResult = await ActivityService.getUserActivityFeed(userId, { page: 1, limit: 5 });

    return {
      totalNetBalanceMinor,
      groups,
      recentActivity: activityResult.data,
    };
  }
}
