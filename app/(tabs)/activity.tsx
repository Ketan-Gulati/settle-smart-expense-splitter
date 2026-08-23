import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppHeader, EmptyState, ExpenseActivityRow, Text } from '@/components';
import { homeFeedService, ActivityItem } from '@/services/homeFeedService';
import { userRepository } from '@/repositories/userRepository';
import { useAppStore } from '@/store/appStore';

export default function ActivityScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [userName, setUserName] = useState('Alex');
  const [loading, setLoading] = useState(true);

  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const user = await userRepository.getOrCreateDefaultUser();
      setUserName(user.name);
      const feed = await homeFeedService.getHomeDashboardData();
      setActivities(feed.recentActivity);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities, dataVersion]);

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

          <View style={styles.activityList}>
            {activities.map((activity, idx) => (
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
                showDivider={idx < activities.length - 1}
                onPress={() => router.push(`/expenses/${activity.expenseId}` as any)}
              />
            ))}
          </View>
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
    paddingVertical: 12,
  },
  activityList: {
    gap: 0,
  },
});
