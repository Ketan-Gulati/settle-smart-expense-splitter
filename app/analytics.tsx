import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, DetailHeader, Surface, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { AnalyticsSummaryDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await SettleApiService.getAnalyticsSummary(timeframe);
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader
        title="Spending Analytics"
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Timeframe Filter Pills */}
        <View style={styles.timeframeRow}>
          {(['month', 'quarter', 'year', 'all'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTimeframe(t)}
              style={[
                styles.timeframePill,
                {
                  backgroundColor: timeframe === t ? theme.colors.primary : theme.colors.surfaceSubtle,
                  borderColor: timeframe === t ? theme.colors.primary : theme.colors.borderSubtle,
                },
              ]}
            >
              <Text
                variant="caption"
                weight={timeframe === t ? 'bold' : 'medium'}
                color={timeframe === t ? '#FFFFFF' : theme.colors.textSecondary}
                style={{ textTransform: 'capitalize' }}
              >
                {t === 'month' ? 'This Month' : t === 'quarter' ? 'Last 3 Months' : t === 'year' ? 'This Year' : 'All Time'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : !analytics || analytics.categoryBreakdown.length === 0 ? (
          <Surface variant="subtle" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Icon name="receipt-outline" size={32} color={theme.colors.textMuted} />
            </View>
            <Text variant="title" weight="bold" style={{ marginTop: 12 }}>
              No Spending Data
            </Text>
            <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', marginTop: 4 }}>
              Add or participate in expenses to view category breakdowns and trends.
            </Text>
          </Surface>
        ) : (
          <>
            {/* 1. Hero Total Spending Card */}
            <Surface variant="elevated" style={styles.analyticsHeroCard}>
              <Text variant="caption" color={theme.colors.textMuted} weight="bold">
                YOUR TOTAL NET SHARE ({timeframe.toUpperCase()})
              </Text>
              <Text variant="displayHero" weight="bold" style={{ color: '#FFFFFF', marginVertical: 4 }}>
                ₹{(analytics.totalUserShareMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
              <View style={styles.heroSubRow}>
                <Text variant="caption" color={theme.colors.textSecondary}>
                  Paid upfront by you: ₹{(analytics.totalPaidUpfrontMinor / 100).toLocaleString('en-IN')}
                </Text>
                {analytics.monthOverMonthPercentChange !== 0 && (
                  <Text
                    variant="caption"
                    weight="bold"
                    color={analytics.monthOverMonthPercentChange > 0 ? '#EF4444' : '#10B981'}
                  >
                    {analytics.monthOverMonthPercentChange > 0 ? '↑' : '↓'} {Math.abs(analytics.monthOverMonthPercentChange)}% MoM
                  </Text>
                )}
              </View>
            </Surface>

            {/* 2. Category Spending Breakdown */}
            <View style={styles.sectionBlock}>
              <Text variant="headline" weight="bold" style={{ marginBottom: 12 }}>
                Spending by Category
              </Text>

              {analytics.categoryBreakdown.map((cat, idx) => {
                const colors = ['#38BDF8', '#818CF8', '#F472B6', '#34D399', '#FBBF24', '#A78BFA'];
                const barColor = colors[idx % colors.length];

                return (
                  <Surface key={cat.category} variant="card" style={styles.categoryCard}>
                    <View style={styles.categoryHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.categoryDot, { backgroundColor: barColor }]} />
                        <Text variant="body" weight="bold" style={{ textTransform: 'capitalize' }}>
                          {cat.category}
                        </Text>
                        <Text variant="caption" color={theme.colors.textMuted}>
                          ({cat.expenseCount} {cat.expenseCount === 1 ? 'expense' : 'expenses'})
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="body" weight="bold">
                          ₹{(cat.totalMinor / 100).toLocaleString('en-IN')}
                        </Text>
                        <Text variant="caption" color={theme.colors.textMuted} style={{ fontSize: 11 }}>
                          {cat.percentage}%
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${cat.percentage}%`, backgroundColor: barColor }]} />
                    </View>
                  </Surface>
                );
              })}
            </View>

            {/* 3. Top Group Distribution */}
            {analytics.groupDistribution.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text variant="headline" weight="bold" style={{ marginBottom: 12 }}>
                  Group Spending Distribution
                </Text>

                {analytics.groupDistribution.map((grp) => (
                  <Surface key={grp.groupId} variant="card" style={styles.groupSpendCard}>
                    <View style={{ flex: 1 }}>
                      <Text variant="body" weight="bold">
                        {grp.groupName}
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        {grp.percentage}% of total spending
                      </Text>
                    </View>
                    <Text variant="body" weight="bold" color={theme.colors.primary}>
                      ₹{(grp.userShareMinor / 100).toLocaleString('en-IN')}
                    </Text>
                  </Surface>
                ))}
              </View>
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
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeframeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  timeframePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  analyticsHeroCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionBlock: {
    marginTop: 10,
  },
  categoryCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 10,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  groupSpendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
});
