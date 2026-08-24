import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, DetailHeader, EmptyState } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { DashboardDTO } from '@/services/api/types';

export default function GlobalSettlementScreen() {
  const theme = useAppTheme();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGlobalSettlements() {
      try {
        setLoading(true);
        const dash = await SettleApiService.getDashboard();
        setDashboard(dash);
      } catch (err) {
        console.error('Failed to load global settlements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGlobalSettlements();
  }, []);

  if (loading || !dashboard) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const unsettledGroups = dashboard.groups.filter((g) => g.userNetBalanceMinor !== 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader title="Global Settlement" onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="label" color={theme.colors.textMuted} style={styles.superTitle}>
          CROSS-GROUP SETTLEMENTS
        </Text>

        <Text variant="displayHero" weight="bold" style={styles.heading}>
          All Group Obligations
        </Text>

        {unsettledGroups.length === 0 ? (
          <EmptyState
            title="All Settled Up"
            description="You are completely settled up across all your groups."
            actionLabel="Back to Home"
            onAction={() => router.push('/(tabs)' as any)}
          />
        ) : (
          <View style={styles.groupsList}>
            {unsettledGroups.map((g) => {
              const isOwed = g.userNetBalanceMinor > 0;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => router.push(`/groups/${g.id}/settle` as any)}
                  style={[
                    styles.groupSettlementCard,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                >
                  <View style={styles.groupInfo}>
                    <Text variant="headline" weight="bold">
                      {g.name}
                    </Text>
                    <Text
                      variant="bodySecondary"
                      color={isOwed ? theme.colors.positive : theme.colors.negative}
                      weight="semibold"
                    >
                      {isOwed
                        ? `You are owed ₹${(g.userNetBalanceMinor / 100).toFixed(2)}`
                        : `You owe ₹${(Math.abs(g.userNetBalanceMinor) / 100).toFixed(2)}`}
                    </Text>
                  </View>
                  <Text variant="body" weight="bold" color={theme.colors.primary}>
                    Review →
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  superTitle: {
    letterSpacing: 0.8,
    marginTop: 4,
  },
  heading: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 8,
  },
  groupsList: {
    gap: 12,
  },
  groupSettlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  groupInfo: {
    gap: 4,
  },
});
