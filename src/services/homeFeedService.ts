import { EntityId } from '../domain/common/types';
import { ExpenseEntity } from '../domain/expense/expense';
import { userRepository, UserEntity } from '../repositories/userRepository';
import { groupRepository, GroupEntity } from '../repositories/groupRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { balanceService } from './balanceService';
import { settlementService } from './settlementService';
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
  readonly userShareMinor: number; // positive = user is owed/lent, negative = user owes
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
   * Derives real dynamic home dashboard aggregates across all user groups.
   */
  public async getHomeDashboardData(): Promise<HomeDashboardData> {
    const user = await userRepository.getOrCreateDefaultUser();
    const groups = await groupRepository.findAll();

    let totalNetBalanceMinor = 0;
    let totalOwedToUserMinor = 0;
    let totalUserOwesMinor = 0;
    let totalOptimizedPaymentsCount = 0;
    let firstActiveGroupIdWithPayments: EntityId | null = null;

    const groupSummaries: GroupCardSummary[] = [];
    const allExpensesWithGroup: { expense: ExpenseEntity; group: GroupEntity }[] = [];

    for (const group of groups) {
      const balRes = await balanceService.getGroupBalances(group.id);
      const userNet = balRes.success ? balRes.data.userBalances[user.id]?.netBalanceMinor || 0 : 0;

      totalNetBalanceMinor += userNet;
      if (userNet > 0) {
        totalOwedToUserMinor += userNet;
      } else if (userNet < 0) {
        totalUserOwesMinor += Math.abs(userNet);
      }

      // Check settlement plan for optimized payments count
      const planRes = await settlementService.getOptimizedSettlementPlan(group.id);
      if (planRes.success && planRes.data.totalTransfersCount > 0) {
        totalOptimizedPaymentsCount += planRes.data.totalTransfersCount;
        if (!firstActiveGroupIdWithPayments) {
          firstActiveGroupIdWithPayments = group.id;
        }
      }

      const groupExpenses = await expenseRepository.findByGroup(group.id);
      for (const exp of groupExpenses) {
        allExpensesWithGroup.push({ expense: exp, group });
      }

      // Compute priority score (1: user owes/is owed, 2: has active expenses, 3: settled)
      let priorityScore = 3;
      if (userNet > 0)
        priorityScore = 1; // Highest attention: money owed to user
      else if (userNet < 0) priorityScore = 2; // High attention: user owes money

      groupSummaries.push({
        group,
        netBalanceMinor: userNet,
        unsettledExpensesCount: groupExpenses.length,
        priorityScore,
      });
    }

    // Sort groups deterministically by priority score, then by absolute balance descending
    groupSummaries.sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) {
        return a.priorityScore - b.priorityScore;
      }
      return Math.abs(b.netBalanceMinor) - Math.abs(a.netBalanceMinor);
    });

    // Sort recent expenses chronologically descending by date then created_at
    allExpensesWithGroup.sort((a, b) => {
      const dateA = new Date(a.expense.date).getTime();
      const dateB = new Date(b.expense.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.expense.createdAt).getTime() - new Date(a.expense.createdAt).getTime();
    });

    // Map top recent activity (limit 5)
    const recentActivity: ActivityItem[] = allExpensesWithGroup
      .slice(0, 5)
      .map(({ expense, group }) => {
        const isUserPayer = expense.payerId === user.id;
        const userSplit = expense.splits.find((s) => s.userId === user.id)?.amountMinor || 0;

        let userShareMinor = 0;
        if (isUserPayer) {
          // User paid total and consumed userSplit; they lent the remainder
          userShareMinor = expense.amountMinor - userSplit;
        } else {
          // Someone else paid; user borrowed their share
          userShareMinor = -userSplit;
        }

        const payerName = isUserPayer
          ? 'You'
          : group.members?.find((m) => m.id === expense.payerId)?.name || 'Someone';

        return {
          expenseId: expense.id,
          title: expense.description,
          groupName: group.name,
          groupId: group.id,
          timestamp: this.formatRelativeTime(expense.date),
          payerName,
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
      totalOptimizedPaymentsCount,
      topGroups: groupSummaries,
      recentActivity,
      firstActiveGroupIdWithPayments: firstActiveGroupIdWithPayments || (groups[0]?.id ?? null),
    };
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
