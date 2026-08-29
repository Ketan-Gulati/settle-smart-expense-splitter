import { EntityId } from '../domain/common/types';
import { GroupEntity } from '../repositories/groupRepository';
import { UserEntity } from '../repositories/userRepository';
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
  readonly unreadNotificationCount: number;
}

export class HomeFeedService {
  private static cachedData: HomeDashboardData | null = null;

  /**
   * Clears the client-side cached dashboard data so fresh live data is fetched
   */
  public clearCache(): void {
    HomeFeedService.cachedData = null;
  }

  /**
   * Returns cached dashboard data synchronously if available
   */
  public getCachedData(): HomeDashboardData | null {
    return HomeFeedService.cachedData;
  }

  /**
   * Consumes live backend /dashboard, /notifications, and /auth/me endpoints.
   */
  public async getHomeDashboardData(): Promise<HomeDashboardData> {
    try {
      const [dashboard, me, notifications] = await Promise.all([
        SettleApiService.getDashboard(),
        SettleApiService.getMe(),
        SettleApiService.getNotifications().catch(() => []),
      ]);

      const unreadNotificationCount = notifications.filter((n) => n.status !== 'READ').length;

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

      const result: HomeDashboardData = {
        user,
        greeting: this.getGreeting(user.name),
        totalNetBalanceMinor: dashboard.totalNetBalanceMinor,
        totalOwedToUserMinor,
        totalUserOwesMinor,
        totalOptimizedPaymentsCount: dashboard.groups.filter((g) => g.userNetBalanceMinor !== 0).length,
        topGroups: groupSummaries,
        recentActivity,
        firstActiveGroupIdWithPayments: dashboard.groups[0]?.id ?? null,
        unreadNotificationCount,
      };

      HomeFeedService.cachedData = result;
      return result;
    } catch (err: any) {
      console.error('HomeFeedService error:', err);
      // Return previous cached data if available, or throw
      if (HomeFeedService.cachedData) {
        return HomeFeedService.cachedData;
      }
      throw err;
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
