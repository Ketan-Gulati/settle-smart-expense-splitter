import { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Text,
  Surface,
  AppHeader,
  MoneyDisplay,
  GroupCard,
  SectionHeader,
  ExpenseActivityRow,
  NotificationSideMenu,
  Icon,
  OfflineSyncBanner,
} from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { homeFeedService, HomeDashboardData } from '@/services/homeFeedService';
import { useAppStore } from '@/store/appStore';

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const cached = homeFeedService.getCachedData();
  const [data, setData] = useState<HomeDashboardData | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      if (!homeFeedService.getCachedData()) {
        setLoading(true);
      }
      const dashboard = await homeFeedService.getHomeDashboardData();
      setData(dashboard);
    } catch (err) {
      console.error('Failed to load home dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const {
    user,
    greeting,
    totalNetBalanceMinor,
    totalOptimizedPaymentsCount,
    topGroups,
    recentActivity,
    unreadNotificationCount,
  } = data;

  const isPositive = totalNetBalanceMinor > 0;
  const isNegative = totalNetBalanceMinor < 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. App Header with Dynamic Notification Count Badge */}
      <AppHeader
        userName={user.name}
        unreadCount={unreadNotificationCount}
        onAvatarPress={() => router.push('/profile' as any)}
        onMenuPress={() => setSideMenuVisible(true)}
      />

      {/* Notifications Slide-Out Menu */}
      <NotificationSideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
      />

      {/* Offline Sync Banner (Travel & No-Connection Auto-Sync) */}
      <OfflineSyncBanner />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 2. Greeting & Total Net Balance Hero */}
        <View style={styles.heroSection}>
          <Text variant="bodySecondary" color={theme.colors.textSecondary} weight="medium">
            {greeting}
          </Text>
          <Text variant="label" color={theme.colors.textMuted} style={styles.netLabel}>
            TOTAL NET BALANCE
          </Text>

          <MoneyDisplay
            amountMinor={totalNetBalanceMinor}
            variant="hero"
            sentiment={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
            showSign
            style={styles.heroAmount}
          />
        </View>

        {/* 3. Action Row: Review Settlement & + Add Expense */}
        <View style={styles.actionsContainer}>
          {topGroups.length > 0 && totalOptimizedPaymentsCount > 0 ? (
            <Pressable
              testID="home-review-settlement-btn"
              onPress={() => {
                router.push('/settle' as any);
              }}
              style={({ pressed }) => [
                styles.settleBanner,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.isDark ? 'rgba(2, 132, 199, 0.4)' : '#BAE6FD',
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <View style={styles.bannerRow}>
                <View style={styles.bannerLeft}>
                  <View style={[styles.settleIconPill, { backgroundColor: theme.isDark ? 'rgba(2, 132, 199, 0.2)' : '#E0F2FE' }]}>
                    <Icon name="flash" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                      Review Settlement
                    </Text>
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {totalOptimizedPaymentsCount} direct payment{totalOptimizedPaymentsCount > 1 ? 's' : ''} to zero all balances
                    </Text>
                  </View>
                </View>
                <View style={[styles.settleArrowBtn, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="arrow-back" size={16} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
              </View>
            </Pressable>
          ) : topGroups.length > 0 && totalNetBalanceMinor === 0 ? (
            <Surface variant="subtle" style={styles.settledBanner}>
              <Text variant="bodySecondary" color={theme.colors.positive} weight="semibold">
                ✓ All settled up across your groups
              </Text>
            </Surface>
          ) : null}

          {topGroups.length > 0 && (
            <Pressable
              onPress={() => router.push('/expenses/new' as any)}
              style={({ pressed }) => [
                styles.addExpenseHomeBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                + Add Expense
              </Text>
            </Pressable>
          )}
        </View>

        {/* 4. Relevant Groups Section / Empty UX State */}
        {topGroups.length === 0 ? (
          <View style={styles.firstTimeEmptyState}>
            <Text variant="displayLarge" weight="bold" style={styles.emptyHeroHeading}>
              Quiet the noise of expenses.
            </Text>
            <Text variant="body" color={theme.colors.textSecondary} style={styles.emptyHeroSub}>
              Settle keeps track of who owes who, with absolute clarity.
            </Text>
            <Pressable
              onPress={() => router.push('/groups' as any)}
              style={[styles.createFirstGroupBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
                Create your first group
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {topGroups.slice(0, 3).map((item) => (
              <GroupCard
                key={item.group.id}
                id={item.group.id}
                name={item.group.name}
                currency={item.group.currency}
                netBalanceMinor={item.netBalanceMinor}
                unsettledExpensesCount={item.unsettledExpensesCount}
                onPress={() => router.push(`/groups/${item.group.id}` as any)}
              />
            ))}
          </View>
        )}

        {/* 5. Recent Activity Section */}
        <View style={styles.activitySection}>
          <SectionHeader
            title="Recent Activity"
            actionLabel={recentActivity.length > 0 ? 'View all' : undefined}
            onActionPress={() => router.push('/activity' as any)}
          />

          {recentActivity.length === 0 ? (
            <Surface variant="subtle" style={styles.emptyActivityBox}>
              <Text variant="caption" color={theme.colors.textMuted} align="center">
                No recent activity. Expenses added in your groups will appear here.
              </Text>
            </Surface>
          ) : (
            <Surface variant="card" style={styles.activityCard}>
              {recentActivity.map((activity, idx) => (
                <ExpenseActivityRow
                  key={activity.expenseId}
                  title={activity.title}
                  groupName={activity.groupName}
                  timestamp={activity.timestamp}
                  payerName={activity.payerName}
                  totalAmountMinor={activity.totalAmountMinor}
                  userShareMinor={activity.userShareMinor}
                  currency={activity.currency}
                  categoryIconName={activity.categoryIconName}
                  showDivider={idx < recentActivity.length - 1}
                  onPress={() => router.push(`/expenses/${activity.expenseId}` as any)}
                />
              ))}
            </Surface>
          )}
        </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  netLabel: {
    marginTop: 8,
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '700',
    marginTop: 4,
  },
  actionsContainer: {
    gap: 10,
  },
  settleBanner: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settleIconPill: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExpenseHomeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  settledBanner: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  firstTimeEmptyState: {
    paddingVertical: 32,
    gap: 16,
  },
  emptyHeroHeading: {
    fontSize: 36,
    lineHeight: 42,
  },
  emptyHeroSub: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  createFirstGroupBtn: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupsContainer: {
    gap: 12,
  },
  activitySection: {
    gap: 8,
  },
  activityCard: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  emptyActivityBox: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
});
