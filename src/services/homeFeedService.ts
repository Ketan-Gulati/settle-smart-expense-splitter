import { EntityId } from '../domain/common/types';
import { GroupEntity, groupRepository } from '../repositories/groupRepository';
import { UserEntity, userRepository } from '../repositories/userRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { balanceService } from './balanceService';
import { SettleApiService } from './api/settleApi';
import { IconName } from '../components/Icon';

export interface GroupCardSummary {
  readonly group: GroupEntity;
  readonly netBalanceMinor: number;
  readonly unsettledExpensesCount: number;
  readonly priorityScore: number;
}

export interface ActivityItem {
  readonly expenseId: EntityId;
  readonly title: string;
  readonly groupName: string;
  readonly groupId: EntityId;
  readonly timestamp: string;
  readonly payerName: string;
  readonly totalAmountMinor: number;
  readonly userShareMinor: number;
  readonly currency: string;
  readonly categoryIconName: IconName;
}

export interface HomeDashboardData {
  readonly user: UserEntity;
  readonly greeting: string;
  readonly totalNetBalanceMinor: number;
  readonly totalOwedToUserMinor: number;
  readonly totalUserOwesMinor: number;
  readonly totalOptimizedPaymentsCount: number;
  readonly topGroups: GroupCardSummary[];
  readonly recentActivity: ActivityItem[];
  readonly firstActiveGroupIdWithPayments: EntityId | null;
}

export class HomeFeedService {
  /**
   * Consumes live backend /dashboard and /auth/me endpoints.
   */
  public async getHomeDashboardData(): Promise<HomeDashboardData> {
    try {
      const [dashboard, me] = await Promise.all([
        SettleApiService.getDashboard(),
        SettleApiService.getMe(),
      ]);

      let totalOwedToUserMinor = 0;
      let totalUserOwesMinor = 0;

      const groupSummaries: GroupCardSummary[] = dashboard.groups.map((g) => {
        if (g.userNetBalanceMinor > 0) totalOwedToUserMinor += g.userNetBalanceMinor;
        if (g.userNetBalanceMinor < 0) totalUserOwesMinor += Math.abs(g.userNetBalanceMinor);

        let priorityScore = 3;
        if (g.userNetBalanceMinor > 0) priorityScore = 1;
        else if (g.userNetBalanceMinor < 0) priorityScore = 2;

        return {
          group: {
            id: g.id,
            name: g.name,
            currency: g.currency,
            type: 'trip',
            ownerId: me.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          netBalanceMinor: g.userNetBalanceMinor,
          unsettledExpensesCount: g.unsettledExpenseCount,
          priorityScore,
        };
      });

      // Map recent activities from live backend response
      const recentActivity: ActivityItem[] = (dashboard.recentActivity || []).map((act) => ({
        expenseId: act.id,
        title: act.title,
        groupName: act.groupName,
        groupId: act.groupId,
        timestamp: this.formatRelativeTime(act.timestamp),
        payerName: act.payerName,
        totalAmountMinor: act.totalAmountMinor,
        userShareMinor: act.userShareMinor,
        currency: act.currency,
        categoryIconName: this.getCategoryIcon(act.title),
      }));

      const user: UserEntity = {
        id: me.id,
        name: me.name,
        email: me.email,
        defaultCurrency: 'INR',
        createdAt: me.createdAt || new Date().toISOString(),
      };

      return {
        user,
        greeting: this.getGreeting(user.name),
        totalNetBalanceMinor: dashboard.totalNetBalanceMinor,
        totalOwedToUserMinor,
        totalUserOwesMinor,
        totalOptimizedPaymentsCount: dashboard.groups.filter((g) => g.userNetBalanceMinor !== 0).length,
        topGroups: groupSummaries,
        recentActivity,
        firstActiveGroupIdWithPayments: dashboard.groups[0]?.id ?? null,
      };
    } catch {
      // Local repository fallback (e.g. for offline unit testing)
      const user = await userRepository.getOrCreateDefaultUser();
      const groups = await groupRepository.findAll();

      let totalNetBalanceMinor = 0;
      let totalOwedToUserMinor = 0;
      let totalUserOwesMinor = 0;
      const groupSummaries: GroupCardSummary[] = [];
      const allExpensesWithGroup: any[] = [];

      for (const group of groups) {
        const balRes = await balanceService.getGroupBalances(group.id);
        const userNet = balRes.success ? balRes.data.userBalances[user.id]?.netBalanceMinor || 0 : 0;
        totalNetBalanceMinor += userNet;
        if (userNet > 0) totalOwedToUserMinor += userNet;
        else if (userNet < 0) totalUserOwesMinor += Math.abs(userNet);

        const groupExpenses = await expenseRepository.findByGroup(group.id);
        for (const exp of groupExpenses) {
          allExpensesWithGroup.push({ expense: exp, group });
        }

        groupSummaries.push({
          group,
          netBalanceMinor: userNet,
          unsettledExpensesCount: groupExpenses.length,
          priorityScore: userNet > 0 ? 1 : userNet < 0 ? 2 : 3,
        });
      }

      allExpensesWithGroup.sort((a, b) => {
        const dateA = new Date(a.expense.date).getTime();
        const dateB = new Date(b.expense.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.expense.createdAt).getTime() - new Date(a.expense.createdAt).getTime();
      });

      const recentActivity: ActivityItem[] = allExpensesWithGroup.slice(0, 5).map(({ expense, group }) => {
        const isUserPayer = expense.payerId === user.id;
        const userSplit = expense.splits.find((s: any) => s.userId === user.id)?.amountMinor || 0;
        const userShareMinor = isUserPayer ? expense.amountMinor - userSplit : -userSplit;
        return {
          expenseId: expense.id,
          title: expense.description,
          groupName: group.name,
          groupId: group.id,
          timestamp: this.formatRelativeTime(expense.date),
          payerName: isUserPayer ? 'You' : 'Someone',
          totalAmountMinor: expense.amountMinor,
          userShareMinor,
          currency: expense.currency,
          categoryIconName: this.getCategoryIcon(expense.description),
        };
      });

      return {
        user,
        greeting: this.getGreeting(user.name),
        totalNetBalanceMinor,
        totalOwedToUserMinor,
        totalUserOwesMinor,
        totalOptimizedPaymentsCount: 0,
        topGroups: groupSummaries,
        recentActivity,
        firstActiveGroupIdWithPayments: groups[0]?.id ?? null,
      };
    }
  }

  private getGreeting(name: string): string {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }

  private formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  public getCategoryIcon(_desc?: string): IconName {
    return 'receipt-outline';
  }
}

export const homeFeedService = new HomeFeedService();
