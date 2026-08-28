import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppHeader, Text, Surface, EmptyState, Button, StatusBadge, NotificationSideMenu } from '@/components';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, GroupBalancesDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function GlobalSettleScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, GroupBalancesDTO>>({});
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const [user, allGroups] = await Promise.all([
        SettleApiService.getMe().catch(() => null),
        SettleApiService.getGroups().catch(() => []),
      ]);
      setCurrentUser(user);
      setGroups(allGroups);

      const balMap: Record<string, GroupBalancesDTO> = {};
      await Promise.all(
        allGroups.map(async (g) => {
          try {
            const bals = await SettleApiService.getGroupBalances(g.id);
            balMap[g.id] = bals;
          } catch (e) {
            // Ignore balance errors for empty groups
          }
        })
      );
      setGroupBalances(balMap);
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

  const groupsWithTransfers = groups.filter((g) => {
    const bals = groupBalances[g.id];
    if (!bals) return false;
    return bals.members.some((m) => m.netBalanceMinor !== 0);
  });

  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        userName={currentUser?.name || 'You'}
        onAvatarPress={() => router.push('/profile' as any)}
        onMenuPress={() => setSideMenuVisible(true)}
      />

      <NotificationSideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
      />

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
            const bals = groupBalances[g.id];
            const activeDebtors = bals?.members.filter((m) => m.netBalanceMinor < 0).length || 0;
            return (
              <Surface key={g.id} variant="card" style={styles.groupSettleCard}>
                <View style={styles.groupHeader}>
                  <Text variant="headline" weight="bold">
                    {g.name}
                  </Text>
                  <StatusBadge
                    label="OPTIMIZED"
                    variant="positive"
                  />
                </View>

                <Text variant="caption" color={theme.colors.textMuted}>
                  {activeDebtors > 0 ? `${activeDebtors} member(s) have unsettled balances.` : 'Group settlement ready.'}
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
