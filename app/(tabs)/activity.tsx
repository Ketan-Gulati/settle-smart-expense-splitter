import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppHeader, EmptyState, ExpenseActivityRow, Text, Icon } from '@/components';
import { SettleApiService } from '@/services/api/settleApi';
import { ActivityEventDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

type DateFilterType = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR';

export default function ActivityScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [activities, setActivities] = useState<ActivityEventDTO[]>([]);
  const [userName, setUserName] = useState('Ketan');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DateFilterType>('ALL');

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      try {
        const [user, feed] = await Promise.all([
          SettleApiService.getMe(),
          SettleApiService.getActivityFeed(),
        ]);
        setUserName(user.name);
        setActivities(feed);
        return;
      } catch {
        // Fallback to local SQLite repository
        const { expenseRepository } = await import('@/repositories/expenseRepository');
        const { groupRepository } = await import('@/repositories/groupRepository');
        const { userRepository } = await import('@/repositories/userRepository');

        const defaultUser = await userRepository.getOrCreateDefaultUser();
        setUserName(defaultUser.name);

        const groups = await groupRepository.findAll();
        const groupMap = new Map(groups.map((g) => [g.id, g.name]));

        const allExpenses: any[] = [];
        for (const g of groups) {
          const exps = await expenseRepository.findByGroup(g.id);
          allExpenses.push(...exps);
        }

        allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const localActivities: ActivityEventDTO[] = allExpenses.slice(0, 30).map((e) => {
          const isPayer = e.payerId === defaultUser.id;
          const userSplit = e.splits.find((s: any) => s.userId === defaultUser.id)?.amountMinor || 0;
          const userShareMinor = isPayer ? e.amountMinor - userSplit : -userSplit;
          return {
            id: `act_${e.id}`,
            type: 'EXPENSE',
            groupId: e.groupId,
            groupName: groupMap.get(e.groupId) || 'Group',
            title: e.description,
            timestamp: e.date,
            payerName: isPayer ? 'You' : 'Member',
            totalAmountMinor: e.amountMinor,
            userShareMinor,
            currency: e.currency || 'INR',
          };
        });

        setActivities(localActivities);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities, dataVersion]);

  // Filter activities based on selected date range and search query
  const filteredActivities = useMemo(() => {
    let list = activities;

    if (selectedFilter !== 'ALL') {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const startOfThisYear = new Date(now.getFullYear(), 0, 1).getTime();
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

      list = list.filter((act) => {
        const actTime = new Date(act.timestamp).getTime();
        if (selectedFilter === 'THIS_MONTH') return actTime >= startOfThisMonth;
        if (selectedFilter === 'LAST_30_DAYS') return actTime >= thirtyDaysAgo;
        if (selectedFilter === 'THIS_YEAR') return actTime >= startOfThisYear;
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((act) => act.title.toLowerCase().includes(q));
    }

    return list;
  }, [activities, selectedFilter, searchQuery]);

  const filterOptions: { label: string; value: DateFilterType }[] = [
    { label: 'All Time', value: 'ALL' },
    { label: 'This Month', value: 'THIS_MONTH' },
    { label: 'Last 30 Days', value: 'LAST_30_DAYS' },
    { label: 'This Year', value: 'THIS_YEAR' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader userName={userName} onSettingsPress={() => router.push('/settings' as any)} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : activities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="All Caught Up"
            description="Your complete shared activity and transaction logs will be archived here."
            actionLabel="View Groups"
            onAction={() => router.push('/groups' as any)}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.titleSection}>
            <Text variant="displayLarge" weight="bold">
              Activity
            </Text>
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.colors.surfaceSubtle,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon name="search-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by description..."
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.textPrimary,
                  outlineStyle: 'none' as any,
                },
              ]}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Icon name="close-circle-outline" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Date Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterOptions.map((opt) => {
              const isSelected = selectedFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelectedFilter(opt.value)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.textPrimary
                        : theme.colors.surfaceSubtle,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={
                      isSelected
                        ? theme.colors.background
                        : theme.colors.textSecondary
                    }
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filteredActivities.length === 0 ? (
            <View style={styles.noResultsBox}>
              <Text variant="bodySecondary" color={theme.colors.textMuted} align="center">
                {searchQuery.trim()
                  ? `No activity matching "${searchQuery}"`
                  : 'No activity found for the selected time range.'}
              </Text>
            </View>
          ) : (
            <View style={styles.activityList}>
              {filteredActivities.map((activity, idx) => (
                <ExpenseActivityRow
                  key={activity.id}
                  title={activity.title}
                  groupName={activity.groupName}
                  timestamp={new Date(activity.timestamp).toLocaleDateString()}
                  payerName={activity.payerName}
                  totalAmountMinor={activity.totalAmountMinor}
                  userShareMinor={activity.userShareMinor}
                  currency={activity.currency}
                  categoryIconName="receipt-outline"
                  statusText={activity.statusText}
                  showDivider={idx < filteredActivities.length - 1}
                  onPress={() => {
                    if (activity.type === 'EXPENSE') {
                      router.push(`/expenses/${activity.id}` as any);
                    } else {
                      router.push(`/groups/${activity.groupId}/settle` as any);
                    }
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  titleSection: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  noResultsBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityList: {
    gap: 0,
  },
});
