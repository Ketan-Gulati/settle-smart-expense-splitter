import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppHeader, Text, Surface, EmptyState, Button, StatusBadge } from '@/components';
import { groupRepository, GroupEntity } from '@/repositories/groupRepository';
import { settlementService } from '@/services/settlementService';
import { SettlementPlan } from '@/domain/settlement/settlementOptimizer';
import { useAppStore } from '@/store/appStore';

export default function GlobalSettleScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [groups, setGroups] = useState<GroupEntity[]>([]);
  const [plans, setPlans] = useState<Record<string, SettlementPlan>>({});
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const allGroups = await groupRepository.findAll();
      setGroups(allGroups);

      const planMap: Record<string, SettlementPlan> = {};
      for (const g of allGroups) {
        const planRes = await settlementService.getOptimizedSettlementPlan(g.id);
        if (planRes.success) {
          planMap[g.id] = planRes.data;
        }
      }
      setPlans(planMap);
    } catch (err) {
      console.error('Failed to load global settlements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans, dataVersion]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const groupsWithTransfers = groups.filter((g) => (plans[g.id]?.totalTransfersCount || 0) > 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader userName="Alex" onSettingsPress={() => router.push('/settings' as any)} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerTitleSection}>
          <Text variant="label" color={theme.colors.textMuted}>
            SMART SETTLEMENT ENGINE
          </Text>
          <Text variant="displayLarge">Global Settlements</Text>
          <Text variant="bodySecondary" color={theme.colors.textSecondary}>
            Optimized payment paths across all active groups.
          </Text>
        </View>

        {groupsWithTransfers.length === 0 ? (
          <Surface variant="subtle" style={styles.settledCard}>
            <EmptyState
              title="All Settled Up"
              description="No outstanding group debts require settlement across any of your groups."
              actionLabel="View Groups"
              onAction={() => router.push('/groups' as any)}
            />
          </Surface>
        ) : (
          groupsWithTransfers.map((g) => {
            const plan = plans[g.id];
            return (
              <Surface key={g.id} variant="card" style={styles.groupSettleCard}>
                <View style={styles.groupHeader}>
                  <Text variant="headline" weight="bold">
                    {g.name}
                  </Text>
                  {plan && plan.transferReductionPercentage > 0 && (
                    <StatusBadge
                      label={`${plan.transferReductionPercentage}% fewer`}
                      variant="positive"
                    />
                  )}
                </View>

                <Text variant="caption" color={theme.colors.textMuted}>
                  {plan?.totalTransfersCount || 0} optimized payment(s) resolving{' '}
                  {plan?.originalObligationsCount || 0} obligations.
                </Text>

                <Button
                  title={`Open Smart Settle (${g.name}) →`}
                  variant="primary"
                  size="small"
                  onPress={() => router.push(`/groups/${g.id}/settle` as any)}
                />
              </Surface>
            );
          })
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
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  headerTitleSection: {
    gap: 4,
    marginBottom: 8,
  },
  settledCard: {
    padding: 24,
    borderRadius: 16,
  },
  groupSettleCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
