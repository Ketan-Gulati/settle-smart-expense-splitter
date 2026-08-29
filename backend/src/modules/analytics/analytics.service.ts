import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { authenticate } from '../../middleware/auth.middleware';
import { RedisService } from '../../infrastructure/redis/redis.client';

export interface CategorySpendSummary {
  category: string;
  totalMinor: number;
  percentage: number;
  expenseCount: number;
}

export interface GroupSpendSummary {
  groupId: string;
  groupName: string;
  userShareMinor: number;
  percentage: number;
  currency: string;
}

export interface MonthlyTrendItem {
  month: string; // e.g. "Aug 2026"
  totalShareMinor: number;
  paidUpfrontMinor: number;
}

export interface AnalyticsSummaryResponse {
  period: string;
  totalUserShareMinor: number;
  totalPaidUpfrontMinor: number;
  monthOverMonthPercentChange: number; // e.g. +14.2 or -8.5
  categoryBreakdown: CategorySpendSummary[];
  groupDistribution: GroupSpendSummary[];
  monthlyTrend: MonthlyTrendItem[];
}

export class AnalyticsService {
  /**
   * Generates comprehensive personal spending and category analytics for the authenticated user.
   */
  public static async getUserAnalyticsSummary(
    userId: string,
    timeframe: 'month' | 'quarter' | 'year' | 'all' = 'month'
  ): Promise<AnalyticsSummaryResponse> {
    const cacheKey = `settle:analytics:user:${userId}:${timeframe}`;

    if (await RedisService.isHealthy()) {
      try {
        const cached = await RedisService.getClient().get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    // 1. Get all active group IDs the user belongs to
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null },
      select: { groupId: true, group: { select: { name: true, currency: true } } },
    });

    const groupMap = new Map<string, { name: string; currency: string }>();
    memberships.forEach((m) => groupMap.set(m.groupId, m.group));
    const groupIds = Array.from(groupMap.keys());

    if (groupIds.length === 0) {
      const emptyRes: AnalyticsSummaryResponse = {
        period: timeframe,
        totalUserShareMinor: 0,
        totalPaidUpfrontMinor: 0,
        monthOverMonthPercentChange: 0,
        categoryBreakdown: [],
        groupDistribution: [],
        monthlyTrend: [],
      };
      return emptyRes;
    }

    // 2. Fetch all non-deleted expenses across user groups
    const now = new Date();
    let startDate: Date | undefined;

    if (timeframe === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Get last 2 months for MoM comparison
    } else if (timeframe === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    } else if (timeframe === 'year') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    }

    const expenses = await prisma.expense.findMany({
      where: {
        groupId: { in: groupIds },
        deletedAt: null,
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      select: {
        id: true,
        groupId: true,
        amountMinor: true,
        currency: true,
        category: true,
        paidByUserId: true,
        createdAt: true,
        splits: {
          select: {
            userId: true,
            amountMinor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Calculate category breakdown and totals for the current month / period
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const prevMonthEnd = currentMonthStart - 1;

    let currentPeriodShareMinor = 0;
    let currentPeriodPaidMinor = 0;
    let prevMonthShareMinor = 0;

    const categoryMap = new Map<string, { total: number; count: number }>();
    const groupShareMap = new Map<string, number>();
    const monthTrendMap = new Map<string, { share: number; paid: number }>();

    for (const exp of expenses) {
      const expTime = exp.createdAt.getTime();
      const isCurrentMonth = expTime >= currentMonthStart;
      const isPrevMonth = expTime >= prevMonthStart && expTime <= prevMonthEnd;

      // Find user's split share
      const userSplit = exp.splits.find((s) => s.userId === userId);
      const userShare = userSplit ? Number(userSplit.amountMinor) : 0;
      const userPaid = exp.paidByUserId === userId ? Number(exp.amountMinor) : 0;

      // Month Trend
      const monthKey = exp.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const currentMonthData = monthTrendMap.get(monthKey) || { share: 0, paid: 0 };
      currentMonthData.share += userShare;
      currentMonthData.paid += userPaid;
      monthTrendMap.set(monthKey, currentMonthData);

      if (isCurrentMonth || timeframe !== 'month') {
        currentPeriodShareMinor += userShare;
        currentPeriodPaidMinor += userPaid;

        if (userShare > 0) {
          // Category tally
          const cat = (exp.category || 'General').toUpperCase();
          const existingCat = categoryMap.get(cat) || { total: 0, count: 0 };
          existingCat.total += userShare;
          existingCat.count += 1;
          categoryMap.set(cat, existingCat);

          // Group distribution tally
          const currentGroupShare = groupShareMap.get(exp.groupId) || 0;
          groupShareMap.set(exp.groupId, currentGroupShare + userShare);
        }
      }

      if (isPrevMonth) {
        prevMonthShareMinor += userShare;
      }
    }

    // Month-over-month calculation
    let momPercentChange = 0;
    if (prevMonthShareMinor > 0) {
      momPercentChange = Number((((currentPeriodShareMinor - prevMonthShareMinor) / prevMonthShareMinor) * 100).toFixed(1));
    }

    // Format Category Breakdown
    const categoryBreakdown: CategorySpendSummary[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalMinor: data.total,
        percentage: currentPeriodShareMinor > 0 ? Number(((data.total / currentPeriodShareMinor) * 100).toFixed(1)) : 0,
        expenseCount: data.count,
      }))
      .sort((a, b) => b.totalMinor - a.totalMinor);

    // Format Group Distribution
    const groupDistribution: GroupSpendSummary[] = Array.from(groupShareMap.entries())
      .map(([groupId, shareMinor]) => {
        const gInfo = groupMap.get(groupId);
        return {
          groupId,
          groupName: gInfo?.name || 'Group',
          currency: gInfo?.currency || 'INR',
          userShareMinor: shareMinor,
          percentage: currentPeriodShareMinor > 0 ? Number(((shareMinor / currentPeriodShareMinor) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.userShareMinor - a.userShareMinor);

    // Format Monthly Trend
    const monthlyTrend: MonthlyTrendItem[] = Array.from(monthTrendMap.entries())
      .map(([month, data]) => ({
        month,
        totalShareMinor: data.share,
        paidUpfrontMinor: data.paid,
      }))
      .slice(0, 6);

    const response: AnalyticsSummaryResponse = {
      period: timeframe,
      totalUserShareMinor: currentPeriodShareMinor,
      totalPaidUpfrontMinor: currentPeriodPaidMinor,
      monthOverMonthPercentChange: momPercentChange,
      categoryBreakdown,
      groupDistribution,
      monthlyTrend,
    };

    if (await RedisService.isHealthy()) {
      try {
        await RedisService.getClient().set(cacheKey, JSON.stringify(response), 'EX', 300); // 5 min cache
      } catch {}
    }

    return response;
  }
}

export const analyticsRoutes = Router();

analyticsRoutes.get('/summary', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const timeframe = (req.query.timeframe as any) || 'month';
    const result = await AnalyticsService.getUserAnalyticsSummary(req.user!.id, timeframe);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
