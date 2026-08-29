import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text, DetailHeader, Surface, ExpenseActivityRow, EmptyState, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { ExpenseDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

type TimeFilter =
  | 'THIS_MONTH'
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_MONTH'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS'
  | 'THIS_YEAR'
  | 'ALL';

type ChartViewType = 'CATEGORY' | 'TRENDS' | 'PAID_VS_SHARE';

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#F59E0B', // Amber
  GROCERIES: '#10B981', // Emerald
  RESTAURANT: '#F97316', // Orange
  BARS: '#EC4899', // Pink
  TRANSPORT: '#06B6D4', // Cyan
  FLIGHTS: '#3B82F6', // Blue
  FUEL: '#EAB308', // Yellow
  TRAVEL: '#14B8A6', // Teal
  HOUSING: '#8B5CF6', // Purple
  HOTEL: '#6366F1', // Indigo
  UTILITIES: '#0284C7', // Sky
  WIFI: '#0EA5E9',
  ENTERTAINMENT: '#D946EF', // Fuchsia
  GAMES: '#A855F7',
  SHOPPING: '#F43F5E', // Rose
  HEALTH: '#EF4444', // Red
  GIFTS: '#FB7185',
  GENERAL: '#64748B', // Slate
  OTHER: '#94A3B8',
};

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: 'restaurant-outline',
  GROCERIES: 'cart-outline',
  RESTAURANT: 'restaurant-outline',
  BARS: 'film-outline',
  TRANSPORT: 'car-outline',
  FLIGHTS: 'airplane-outline',
  FUEL: 'car-outline',
  TRAVEL: 'airplane-outline',
  HOUSING: 'bed-outline',
  HOTEL: 'bed-outline',
  UTILITIES: 'flash-outline',
  WIFI: 'flash-outline',
  ENTERTAINMENT: 'film-outline',
  GAMES: 'film-outline',
  SHOPPING: 'cart-outline',
  HEALTH: 'receipt-outline',
  GIFTS: 'receipt-outline',
  GENERAL: 'cart-outline',
  OTHER: 'receipt-outline',
};

export default function MyExpensesAnalyticsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Duration Filter (Default: THIS_MONTH)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('THIS_MONTH');
  const [chartView, setChartView] = useState<ChartViewType>('CATEGORY');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial && expenses.length === 0) {
        setLoading(true);
      }
      const [user, myExps] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getMyExpenses(1, 200).catch(() => []),
      ]);
      setCurrentUser(user);

      // If backend returned array, use it. If empty, check user's groups to consolidate all expenses
      if (Array.isArray(myExps) && myExps.length > 0) {
        setExpenses(myExps);
      } else {
        const groups = await SettleApiService.getGroups().catch(() => []);
        const groupExpensePromises = groups.map((g) =>
          SettleApiService.getGroupExpenses(g.id, 1, 100).catch(() => [])
        );
        const groupExpenseLists = await Promise.all(groupExpensePromises);
        const consolidated = groupExpenseLists.flat();

        // Sort descending by creation date
        consolidated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setExpenses(consolidated);
      }
    } catch (err) {
      console.error('Failed to load my expenses:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // 1. Filtered Expenses based on Time Duration Filter
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);

    // Start of this week (Monday)
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfLast6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    return expenses.filter((exp) => {
      const expDate = new Date(exp.createdAt || (exp as any).date || now);

      switch (timeFilter) {
        case 'TODAY':
          return expDate >= startOfToday;
        case 'YESTERDAY':
          return expDate >= startOfYesterday && expDate <= endOfYesterday;
        case 'THIS_WEEK':
          return expDate >= startOfWeek;
        case 'THIS_MONTH':
          return expDate >= startOfThisMonth;
        case 'LAST_MONTH':
          return expDate >= startOfLastMonth && expDate <= endOfLastMonth;
        case 'LAST_3_MONTHS':
          return expDate >= startOfLast3Months;
        case 'LAST_6_MONTHS':
          return expDate >= startOfLast6Months;
        case 'THIS_YEAR':
          return expDate >= startOfThisYear;
        case 'ALL':
        default:
          return true;
      }
    });
  }, [expenses, timeFilter]);

  // 2. Personal Metrics (My Actual Share vs What I Paid Out of Pocket)
  const personalMetrics = useMemo(() => {
    let totalPaidByMeMinor = 0;
    let totalMyActualShareMinor = 0;
    let totalGroupVolumeMinor = 0;

    for (const exp of filteredExpenses) {
      totalGroupVolumeMinor += exp.amountMinor;
      const isPayer = exp.paidByUserId === currentUser?.id;
      if (isPayer) {
        totalPaidByMeMinor += exp.amountMinor;
      }

      // Calculate my split
      const mySplit = exp.splits?.find((s) => s.userId === currentUser?.id);
      if (mySplit) {
        totalMyActualShareMinor += mySplit.amountMinor;
      } else if (isPayer && (!exp.splits || exp.splits.length === 0)) {
        totalMyActualShareMinor += exp.amountMinor;
      }
    }

    return {
      totalPaidByMeMinor,
      totalMyActualShareMinor,
      totalGroupVolumeMinor,
      netPositionMinor: totalPaidByMeMinor - totalMyActualShareMinor,
    };
  }, [filteredExpenses, currentUser]);

  // 3. Category Breakdown Aggregations
  const categoryStats = useMemo(() => {
    const map: Record<string, { amountMinor: number; count: number; myShareMinor: number }> = {};
    let totalSpendMinor = 0;

    for (const exp of filteredExpenses) {
      const cat = (exp.category || 'GENERAL').toUpperCase();
      if (!map[cat]) {
        map[cat] = { amountMinor: 0, count: 0, myShareMinor: 0 };
      }
      map[cat].amountMinor += exp.amountMinor;
      map[cat].count += 1;
      totalSpendMinor += exp.amountMinor;

      const mySplit = exp.splits?.find((s) => s.userId === currentUser?.id);
      if (mySplit) {
        map[cat].myShareMinor += mySplit.amountMinor;
      } else if (exp.paidByUserId === currentUser?.id) {
        map[cat].myShareMinor += exp.amountMinor;
      }
    }

    const items = Object.entries(map).map(([category, data]) => {
      const percentage = totalSpendMinor > 0 ? (data.amountMinor / totalSpendMinor) * 100 : 0;
      return {
        category,
        amountMinor: data.amountMinor,
        myShareMinor: data.myShareMinor,
        count: data.count,
        percentage,
        color: CATEGORY_COLORS[category] || '#64748B',
      };
    });

    items.sort((a, b) => b.amountMinor - a.amountMinor);

    return { items, totalSpendMinor };
  }, [filteredExpenses, currentUser]);

  // 4. Timeline Trends (Monthly / Weekly intervals)
  const timelineStats = useMemo(() => {
    const timelineMap: Record<string, { totalMinor: number; myShareMinor: number; label: string; date: Date }> = {};

    for (const exp of filteredExpenses) {
      const d = new Date(exp.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString([], { month: 'short', year: '2-digit' });

      if (!timelineMap[key]) {
        timelineMap[key] = { totalMinor: 0, myShareMinor: 0, label, date: d };
      }
      timelineMap[key].totalMinor += exp.amountMinor;

      const mySplit = exp.splits?.find((s) => s.userId === currentUser?.id);
      if (mySplit) {
        timelineMap[key].myShareMinor += mySplit.amountMinor;
      } else if (exp.paidByUserId === currentUser?.id) {
        timelineMap[key].myShareMinor += exp.amountMinor;
      }
    }

    const list = Object.entries(timelineMap).map(([key, data]) => ({
      key,
      ...data,
    }));

    list.sort((a, b) => a.date.getTime() - b.date.getTime());

    const maxPeriodSpend = Math.max(...list.map((l) => l.myShareMinor), 1);

    return { list, maxPeriodSpend };
  }, [filteredExpenses, currentUser]);

  // Time Filter Button Definitions
  const TIME_FILTERS: Array<{ id: TimeFilter; label: string }> = [
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'THIS_WEEK', label: 'This Week' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'LAST_3_MONTHS', label: 'Last 3 Months' },
    { id: 'LAST_6_MONTHS', label: 'Last 6 Months' },
    { id: 'THIS_YEAR', label: 'This Year' },
    { id: 'ALL', label: 'All Time' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader title="My Expenses & Analytics" onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 1. Time Duration Filter Horizontal Scroll Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeFilterScrollRow}
        >
          {TIME_FILTERS.map((tf) => {
            const isSelected = timeFilter === tf.id;
            return (
              <Pressable
                key={tf.id}
                onPress={() => setTimeFilter(tf.id)}
                style={[
                  styles.timeFilterPill,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceSubtle,
                    borderColor: isSelected ? theme.colors.primary : theme.colors.borderSubtle,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                >
                  {tf.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {/* 2. Hero Overview Cards: My Net Share & Out-of-Pocket Paid */}
            <Surface variant="elevated" style={styles.overviewHeroCard}>
              <View style={styles.heroCardHeader}>
                <View>
                  <Text variant="caption" weight="bold" color={theme.colors.textMuted} style={{ letterSpacing: 0.6 }}>
                    MY NET SHARE ({TIME_FILTERS.find((t) => t.id === timeFilter)?.label.toUpperCase()})
                  </Text>
                  <Text variant="displayHero" weight="bold" color={theme.colors.textPrimary} style={{ marginTop: 2 }}>
                    ₹ {(personalMetrics.totalMyActualShareMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
                  <Text variant="caption" weight="bold" color={theme.colors.primary}>
                    {filteredExpenses.length} Expenses
                  </Text>
                </View>
              </View>

              <View style={styles.heroSubStatsRow}>
                <View style={styles.subStatBox}>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Paid by You
                  </Text>
                  <Text variant="title" weight="bold" color={theme.colors.textPrimary}>
                    ₹ {(personalMetrics.totalPaidByMeMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={[styles.subStatBox, { borderLeftWidth: 1, borderLeftColor: theme.colors.borderSubtle, paddingLeft: 16 }]}>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Net Lending / Debt
                  </Text>
                  <Text
                    variant="title"
                    weight="bold"
                    color={
                      personalMetrics.netPositionMinor > 0
                        ? theme.colors.positive
                        : personalMetrics.netPositionMinor < 0
                          ? theme.colors.negative
                          : theme.colors.textMuted
                    }
                  >
                    {personalMetrics.netPositionMinor > 0 ? '+₹' : personalMetrics.netPositionMinor < 0 ? '-₹' : '₹'}
                    {Math.abs(personalMetrics.netPositionMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </Surface>

            {/* 3. Visual Analytics & Charts Tabs */}
            <View style={styles.chartNavRow}>
              {[
                { id: 'CATEGORY', label: '📊 By Category' },
                { id: 'PAID_VS_SHARE', label: '⚖️ Paid vs Share' },
                { id: 'TRENDS', label: '📈 Timeline Trends' },
              ].map((tab) => {
                const isSelected = chartView === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setChartView(tab.id as ChartViewType)}
                    style={[
                      styles.chartNavPill,
                      isSelected && {
                        backgroundColor: theme.colors.surfaceSubtle,
                        borderBottomColor: theme.colors.primary,
                        borderBottomWidth: 2,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      weight={isSelected ? 'bold' : 'medium'}
                      color={isSelected ? theme.colors.primary : theme.colors.textMuted}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {filteredExpenses.length === 0 ? (
              <EmptyState
                title="No expenses in this duration"
                description={`No transactions found for ${timeFilter.toLowerCase().replace(/_/g, ' ')}.`}
                actionLabel="+ Add Expense"
                onAction={() => router.push('/expenses/new' as any)}
              />
            ) : (
              <>
                {/* CHART VIEW 1: CATEGORY BREAKDOWN WITH COLOR BARS */}
                {chartView === 'CATEGORY' && (
                  <Surface variant="card" style={styles.chartSectionCard}>
                    <View style={styles.chartHeader}>
                      <Text variant="title" weight="bold">
                        Category Spending Distribution
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        Proportional budget allocation
                      </Text>
                    </View>

                    {/* Proportional Multi-Segment Progress Bar */}
                    <View style={styles.multiBarContainer}>
                      {categoryStats.items.map((item) => (
                        <View
                          key={item.category}
                          style={{
                            flex: item.percentage,
                            backgroundColor: item.color,
                            height: 14,
                          }}
                        />
                      ))}
                    </View>

                    {/* Category Breakdown Items */}
                    <View style={styles.categoryItemsList}>
                      {categoryStats.items.map((item) => {
                        const isSelected = selectedCategory === item.category;
                        const iconName = CATEGORY_ICONS[item.category] || 'receipt-outline';

                        return (
                          <Pressable
                            key={item.category}
                            onPress={() => setSelectedCategory(isSelected ? null : item.category)}
                            style={[
                              styles.categoryItemRow,
                              isSelected && { backgroundColor: theme.colors.surfaceSubtle, borderRadius: 10 },
                            ]}
                          >
                            <View style={[styles.categoryColorDot, { backgroundColor: item.color }]} />

                            <View style={[styles.categoryIconWrap, { backgroundColor: theme.colors.surfaceSubtle }]}>
                              <Icon name={iconName as any} size={16} color={item.color} />
                            </View>

                            <View style={{ flex: 1, gap: 2 }}>
                              <Text variant="body" weight="semibold">
                                {item.category.charAt(0) + item.category.slice(1).toLowerCase().replace(/_/g, ' ')}
                              </Text>
                              <Text variant="caption" color={theme.colors.textMuted}>
                                {item.count} expense{item.count === 1 ? '' : 's'} · {item.percentage.toFixed(1)}% of total
                              </Text>
                            </View>

                            <View style={{ alignItems: 'flex-end', gap: 2 }}>
                              <Text variant="body" weight="bold">
                                ₹ {(item.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </Text>
                              <Text variant="caption" color={theme.colors.primary} weight="medium">
                                Share: ₹ {(item.myShareMinor / 100).toFixed(0)}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Surface>
                )}

                {/* CHART VIEW 2: PAID VS ACTUAL SHARE TRACK */}
                {chartView === 'PAID_VS_SHARE' && (
                  <Surface variant="card" style={styles.chartSectionCard}>
                    <View style={styles.chartHeader}>
                      <Text variant="title" weight="bold">
                        Individual Share vs Total Paid
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        Compares what you paid upfront vs your actual consumption
                      </Text>
                    </View>

                    <View style={styles.shareTrackCard}>
                      <View style={styles.shareTrackRow}>
                        <Text variant="body" weight="bold">
                          Total Paid Out of Pocket
                        </Text>
                        <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                          ₹ {(personalMetrics.totalPaidByMeMinor / 100).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.trackBackground}>
                        <View
                          style={[
                            styles.trackFill,
                            {
                              width: `${Math.min(
                                100,
                                personalMetrics.totalGroupVolumeMinor > 0
                                  ? (personalMetrics.totalPaidByMeMinor / personalMetrics.totalGroupVolumeMinor) * 100
                                  : 0
                              )}%`,
                              backgroundColor: theme.colors.primary,
                            },
                          ]}
                        />
                      </View>

                      <View style={[styles.shareTrackRow, { marginTop: 16 }]}>
                        <Text variant="body" weight="bold">
                          Your Actual Consumed Share
                        </Text>
                        <Text variant="body" weight="bold" color={theme.colors.textSecondary}>
                          ₹ {(personalMetrics.totalMyActualShareMinor / 100).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.trackBackground}>
                        <View
                          style={[
                            styles.trackFill,
                            {
                              width: `${Math.min(
                                100,
                                personalMetrics.totalGroupVolumeMinor > 0
                                  ? (personalMetrics.totalMyActualShareMinor / personalMetrics.totalGroupVolumeMinor) * 100
                                  : 0
                              )}%`,
                              backgroundColor: '#10B981',
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </Surface>
                )}

                {/* CHART VIEW 3: TIMELINE TRENDS */}
                {chartView === 'TRENDS' && (
                  <Surface variant="card" style={styles.chartSectionCard}>
                    <View style={styles.chartHeader}>
                      <Text variant="title" weight="bold">
                        Monthly Spending Trend
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        Your net expense share trajectory over time
                      </Text>
                    </View>

                    <View style={styles.trendBarsRow}>
                      {timelineStats.list.map((item) => {
                        const heightPct = Math.max(12, (item.myShareMinor / timelineStats.maxPeriodSpend) * 100);
                        return (
                          <View key={item.key} style={styles.trendBarColumn}>
                            <Text variant="caption" weight="bold" color={theme.colors.textPrimary} style={{ fontSize: 10 }}>
                              ₹{(item.myShareMinor / 100).toFixed(0)}
                            </Text>
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    height: `${heightPct}%`,
                                    backgroundColor: theme.colors.primary,
                                  },
                                ]}
                              />
                            </View>
                            <Text variant="caption" color={theme.colors.textMuted} style={{ fontSize: 11, marginTop: 4 }}>
                              {item.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </Surface>
                )}

                {/* 4. Complete Expense Activity Ledger */}
                <View style={styles.ledgerHeader}>
                  <Text variant="title" weight="bold">
                    Expenses ({filteredExpenses.length})
                  </Text>
                </View>

                <View style={styles.ledgerList}>
                  {filteredExpenses.map((exp, idx) => {
                    const isPayer = exp.paidByUserId === currentUser?.id;
                    const mySplit = exp.splits?.find((s) => s.userId === currentUser?.id);
                    const userShareMinor = mySplit ? mySplit.amountMinor : isPayer ? exp.amountMinor : 0;
                    const expDate = new Date(exp.createdAt);
                    const formattedTimestamp = `${expDate.toLocaleDateString()} · ${expDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                    return (
                      <ExpenseActivityRow
                        key={exp.id}
                        title={exp.description}
                        groupName={exp.groupName || 'Expense'}
                        timestamp={formattedTimestamp}
                        payerName={isPayer ? 'You' : exp.paidByUserName}
                        totalAmountMinor={exp.amountMinor}
                        userShareMinor={isPayer ? exp.amountMinor - userShareMinor : -userShareMinor}
                        currency={exp.currency}
                        categoryIconName={(CATEGORY_ICONS[(exp.category || 'GENERAL').toUpperCase()] || 'receipt-outline') as any}
                        showDivider={idx < filteredExpenses.length - 1}
                        onPress={() => router.push(`/expenses/${exp.id}` as any)}
                      />
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 14,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeFilterScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  timeFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  overviewHeroCard: {
    padding: 18,
    borderRadius: 18,
    gap: 16,
  },
  heroCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroSubStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  subStatBox: {
    flex: 1,
    gap: 2,
  },
  chartNavRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  chartNavPill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  chartSectionCard: {
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  chartHeader: {
    gap: 2,
  },
  multiBarContainer: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  categoryItemsList: {
    gap: 4,
  },
  categoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 10,
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTrackCard: {
    gap: 8,
    paddingTop: 4,
  },
  shareTrackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackBackground: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 6,
  },
  trendBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 16,
  },
  trendBarColumn: {
    alignItems: 'center',
    width: 48,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barTrack: {
    width: 20,
    height: 110,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  ledgerHeader: {
    marginTop: 8,
  },
  ledgerList: {
    gap: 0,
  },
});
