import { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from './Text';
import { Surface } from './Surface';
import { Icon } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ExpenseDTO, UserDTO } from '@/services/api/types';

interface GroupAnalyticsChartsProps {
  expenses: ExpenseDTO[];
  currency: string;
  currentUser: UserDTO | null;
}

type TimeFilter = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH';
type ChartViewType = 'CATEGORY' | 'TRENDS' | 'SHARE';

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#F59E0B', // Amber
  TRANSPORT: '#06B6D4', // Cyan
  HOUSING: '#8B5CF6', // Purple
  UTILITIES: '#3B82F6', // Blue
  ENTERTAINMENT: '#EC4899', // Pink
  TRAVEL: '#10B981', // Emerald
  GENERAL: '#64748B', // Slate
  OTHER: '#94A3B8',
};

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: 'restaurant-outline',
  TRANSPORT: 'car-outline',
  HOUSING: 'bed-outline',
  UTILITIES: 'flash-outline',
  ENTERTAINMENT: 'film-outline',
  TRAVEL: 'airplane-outline',
  GENERAL: 'cart-outline',
  OTHER: 'receipt-outline',
};

export const GroupAnalyticsCharts = ({ expenses, currency, currentUser }: GroupAnalyticsChartsProps) => {
  const theme = useAppTheme();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [chartView, setChartView] = useState<ChartViewType>('CATEGORY');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter expenses by selected time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return expenses.filter((exp) => {
      const expDate = new Date(exp.createdAt || (exp as any).date || now);
      if (timeFilter === 'THIS_MONTH') {
        return expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
      }
      if (timeFilter === 'LAST_MONTH') {
        const targetMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const targetYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return expDate.getFullYear() === targetYear && expDate.getMonth() === targetMonth;
      }
      return true;
    });
  }, [expenses, timeFilter]);

  // Aggregate Category Breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { amountMinor: number; count: number }> = {};
    let totalMinor = 0;

    for (const exp of filteredExpenses) {
      const cat = (exp.category || 'GENERAL').toUpperCase();
      if (!map[cat]) {
        map[cat] = { amountMinor: 0, count: 0 };
      }
      map[cat].amountMinor += exp.amountMinor;
      map[cat].count += 1;
      totalMinor += exp.amountMinor;
    }

    const items = Object.entries(map).map(([category, data]) => {
      const percentage = totalMinor > 0 ? (data.amountMinor / totalMinor) * 100 : 0;
      return {
        category,
        amountMinor: data.amountMinor,
        count: data.count,
        percentage,
        color: CATEGORY_COLORS[category] || '#64748B',
      };
    });

    items.sort((a, b) => b.amountMinor - a.amountMinor);

    return { items, totalMinor };
  }, [filteredExpenses]);

  // Aggregate Individual Share vs Group Total
  const shareStats = useMemo(() => {
    let totalGroupSpendMinor = 0;
    let myNetShareMinor = 0;
    let myPaidTotalMinor = 0;

    for (const exp of filteredExpenses) {
      totalGroupSpendMinor += exp.amountMinor;
      if (currentUser) {
        if (exp.paidByUserId === currentUser.id) {
          myPaidTotalMinor += exp.amountMinor;
        }
        const userSplit = exp.splits?.find((s) => s.userId === currentUser.id);
        if (userSplit) {
          myNetShareMinor += userSplit.amountMinor;
        }
      }
    }

    const mySharePercentage = totalGroupSpendMinor > 0 ? (myNetShareMinor / totalGroupSpendMinor) * 100 : 0;
    const othersShareMinor = Math.max(0, totalGroupSpendMinor - myNetShareMinor);
    const othersPercentage = 100 - mySharePercentage;

    return {
      totalGroupSpendMinor,
      myNetShareMinor,
      myPaidTotalMinor,
      mySharePercentage,
      othersShareMinor,
      othersPercentage,
    };
  }, [filteredExpenses, currentUser]);

  // Monthly / Weekly Trend Buckets
  const trendBuckets = useMemo(() => {
    const buckets: Record<string, { label: string; amountMinor: number; myShareMinor: number }> = {};

    for (const exp of filteredExpenses) {
      const date = new Date(exp.createdAt || (exp as any).date || new Date());
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;

      if (!buckets[key]) {
        buckets[key] = { label: key, amountMinor: 0, myShareMinor: 0 };
      }
      buckets[key].amountMinor += exp.amountMinor;

      if (currentUser) {
        const split = exp.splits?.find((s) => s.userId === currentUser.id);
        if (split) {
          buckets[key].myShareMinor += split.amountMinor;
        }
      }
    }

    const result = Object.values(buckets);
    return result.slice(-6); // Last 6 recorded activity points
  }, [filteredExpenses, currentUser]);

  const maxTrendMinor = Math.max(...trendBuckets.map((b) => b.amountMinor), 100);

  return (
    <View style={styles.container}>
      {/* Top Filter Chips */}
      <View style={styles.topControlRow}>
        {/* Time Window Selector */}
        <View style={[styles.filterGroup, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
          {(['ALL', 'THIS_MONTH', 'LAST_MONTH'] as const).map((tf) => {
            const isSelected = timeFilter === tf;
            const label = tf === 'ALL' ? 'All Time' : tf === 'THIS_MONTH' ? 'This Month' : 'Last Month';
            return (
              <Pressable
                key={tf}
                onPress={() => setTimeFilter(tf)}
                style={[
                  styles.filterPill,
                  isSelected && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text
                  variant="caption"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? theme.colors.textPrimary : theme.colors.textMuted}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Chart View Mode Tabs */}
      <View style={styles.chartModeRow}>
        {[
          { id: 'CATEGORY', label: 'By Category' },
          { id: 'SHARE', label: 'My Share vs Total' },
          { id: 'TRENDS', label: 'History Trends' },
        ].map((mode) => {
          const isSelected = chartView === mode.id;
          return (
            <Pressable
              key={mode.id}
              onPress={() => setChartView(mode.id as ChartViewType)}
              style={[
                styles.chartModeTab,
                isSelected && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                variant="caption"
                weight={isSelected ? 'bold' : 'semibold'}
                color={isSelected ? theme.colors.primary : theme.colors.textMuted}
              >
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* VIEW 1: CATEGORY SPENDING (DONUT & SEGMENT BREAKDOWN) */}
      {chartView === 'CATEGORY' && (
        <Surface variant="card" style={styles.cardSurface}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text variant="headline" weight="bold">
                Category Spending
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                {filteredExpenses.length} expense{filteredExpenses.length === 1 ? '' : 's'} recorded
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                {currency} {(categoryStats.totalMinor / 100).toFixed(2)}
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                Total Filtered
              </Text>
            </View>
          </View>

          {categoryStats.items.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Text variant="caption" color={theme.colors.textMuted}>
                No expense data found for this period.
              </Text>
            </View>
          ) : (
            <>
              {/* Stacked Proportional Visual Bar */}
              <View style={styles.stackedBarContainer}>
                {categoryStats.items.map((cat, idx) => (
                  <Pressable
                    key={cat.category}
                    onPress={() => setSelectedCategory(selectedCategory === cat.category ? null : cat.category)}
                    style={[
                      styles.stackedBarSegment,
                      {
                        flex: Math.max(cat.percentage, 2),
                        backgroundColor: cat.color,
                        borderTopLeftRadius: idx === 0 ? 6 : 0,
                        borderBottomLeftRadius: idx === 0 ? 6 : 0,
                        borderTopRightRadius: idx === categoryStats.items.length - 1 ? 6 : 0,
                        borderBottomRightRadius: idx === categoryStats.items.length - 1 ? 6 : 0,
                        opacity: selectedCategory && selectedCategory !== cat.category ? 0.35 : 1,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Category Legend & Percentage Table */}
              <View style={styles.categoryList}>
                {categoryStats.items.map((cat) => {
                  const isSelected = selectedCategory === cat.category;
                  const iconName = (CATEGORY_ICONS[cat.category] || 'receipt-outline') as any;

                  return (
                    <Pressable
                      key={cat.category}
                      onPress={() => setSelectedCategory(isSelected ? null : cat.category)}
                      style={[
                        styles.categoryRow,
                        {
                          backgroundColor: isSelected ? theme.colors.surfaceSubtle : 'transparent',
                          borderColor: isSelected ? theme.colors.border : 'transparent',
                        },
                      ]}
                    >
                      <View style={styles.catLeft}>
                        <View style={[styles.catColorDot, { backgroundColor: cat.color }]}>
                          <Icon name={iconName} size={14} color="#FFFFFF" />
                        </View>
                        <View>
                          <Text variant="body" weight="semibold">
                            {cat.category.charAt(0) + cat.category.slice(1).toLowerCase()}
                          </Text>
                          <Text variant="caption" color={theme.colors.textMuted}>
                            {cat.count} expense{cat.count > 1 ? 's' : ''} ({cat.percentage.toFixed(1)}%)
                          </Text>
                        </View>
                      </View>

                      <Text variant="body" weight="bold">
                        {currency} {(cat.amountMinor / 100).toFixed(2)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </Surface>
      )}

      {/* VIEW 2: INDIVIDUAL SHARE VS GROUP TOTAL */}
      {chartView === 'SHARE' && (
        <Surface variant="card" style={styles.cardSurface}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text variant="headline" weight="bold">
                Your Share vs Group Total
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                Filters out money you lent to others
              </Text>
            </View>
          </View>

          {/* Share Breakdown Metric Cards */}
          <View style={styles.shareCardsRow}>
            {/* Card 1: Your Net Share */}
            <View style={[styles.shareMetricCard, { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: theme.colors.primary }]}>
              <Text variant="caption" weight="bold" color={theme.colors.primary}>
                YOUR SHARE
              </Text>
              <Text variant="title" weight="bold" color={theme.colors.textPrimary} style={{ marginTop: 4 }}>
                {currency} {(shareStats.myNetShareMinor / 100).toFixed(2)}
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                {shareStats.mySharePercentage.toFixed(1)}% of group total
              </Text>
            </View>

            {/* Card 2: Others' Share */}
            <View style={[styles.shareMetricCard, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
              <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                OTHERS' SHARE
              </Text>
              <Text variant="title" weight="bold" color={theme.colors.textPrimary} style={{ marginTop: 4 }}>
                {currency} {(shareStats.othersShareMinor / 100).toFixed(2)}
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                {shareStats.othersPercentage.toFixed(1)}% of group total
              </Text>
            </View>
          </View>

          {/* Comparison Progress Track */}
          <View style={styles.shareTrackWrapper}>
            <View style={styles.shareTrackBar}>
              <View
                style={[
                  styles.shareSegmentMine,
                  {
                    flex: Math.max(shareStats.mySharePercentage, 2),
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
              <View
                style={[
                  styles.shareSegmentOthers,
                  {
                    flex: Math.max(shareStats.othersPercentage, 2),
                    backgroundColor: theme.isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
              />
            </View>
            <View style={styles.shareLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text variant="caption" color={theme.colors.textSecondary}>
                  Your Consumption ({currency} {(shareStats.myNetShareMinor / 100).toFixed(0)})
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.isDark ? '#334155' : '#CBD5E1' }]} />
                <Text variant="caption" color={theme.colors.textSecondary}>
                  Others' Consumption ({currency} {(shareStats.othersShareMinor / 100).toFixed(0)})
                </Text>
              </View>
            </View>
          </View>
        </Surface>
      )}

      {/* VIEW 3: HISTORICAL BALANCE & SPENDING TRENDS */}
      {chartView === 'TRENDS' && (
        <Surface variant="card" style={styles.cardSurface}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text variant="headline" weight="bold">
                Spending Timeline Trends
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                Activity distribution over time
              </Text>
            </View>
          </View>

          {trendBuckets.length === 0 ? (
            <View style={styles.emptyChartBox}>
              <Text variant="caption" color={theme.colors.textMuted}>
                Not enough historical data to map trends.
              </Text>
            </View>
          ) : (
            <View style={styles.timelineBarChart}>
              <View style={styles.barsRow}>
                {trendBuckets.map((bucket, idx) => {
                  const heightPercent = Math.min(100, Math.max(12, (bucket.amountMinor / maxTrendMinor) * 100));
                  return (
                    <View key={`${bucket.label}_${idx}`} style={styles.barColumn}>
                      <Text variant="caption" weight="bold" color={theme.colors.textPrimary} style={{ fontSize: 10 }}>
                        {(bucket.amountMinor / 100).toFixed(0)}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${heightPercent}%`,
                              backgroundColor: theme.colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text variant="caption" color={theme.colors.textMuted} style={styles.barLabel}>
                        {bucket.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </Surface>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterGroup: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chartModeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    gap: 8,
  },
  chartModeTab: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  cardSurface: {
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emptyChartBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackedBarContainer: {
    flexDirection: 'row',
    height: 14,
    width: '100%',
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  stackedBarSegment: {
    height: '100%',
  },
  categoryList: {
    gap: 8,
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catColorDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareMetricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareTrackWrapper: {
    gap: 10,
    marginTop: 4,
  },
  shareTrackBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  shareSegmentMine: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  shareSegmentOthers: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  shareLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineBarChart: {
    paddingVertical: 12,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingTop: 16,
  },
  barColumn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 18,
    height: 85,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 10,
  },
});
