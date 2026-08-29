import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppHeader, Text, Surface, EmptyState, Button, StatusBadge, NotificationSideMenu, Icon } from '@/components';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, GroupBalancesDTO, UserDTO, SettlementDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function GlobalSettleScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [groupBalances, setGroupBalances] = useState<Record<string, GroupBalancesDTO>>({});
  const [settlementHistory, setSettlementHistory] = useState<SettlementDTO[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const [user, allGroups, history] = await Promise.all([
        SettleApiService.getMe().catch(() => null),
        SettleApiService.getGroups().catch(() => []),
        SettleApiService.getMySettlements(1, 50).catch(() => []),
      ]);
      setCurrentUser(user);
      setGroups(allGroups);
      setSettlementHistory(history);

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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlans();
  };

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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerTitleSection}>
          <Text variant="label" color={theme.colors.textMuted}>
            SMART SETTLEMENT ENGINE
          </Text>
          <Text variant="displayLarge">Global Settlements</Text>
          <Text variant="bodySecondary" color={theme.colors.textSecondary}>
            Optimized payment paths & past settlement history.
          </Text>
        </View>

        {/* Tab Switcher: Pending Settlements vs Completed History */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab('PENDING')}
            style={[
              styles.tabPill,
              activeTab === 'PENDING' && {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              variant="caption"
              weight="bold"
              color={activeTab === 'PENDING' ? '#FFFFFF' : theme.colors.textMuted}
            >
              Pending ({groupsWithTransfers.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('HISTORY')}
            style={[
              styles.tabPill,
              activeTab === 'HISTORY' && {
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primary,
              },
            ]}
          >
            <Text
              variant="caption"
              weight="bold"
              color={activeTab === 'HISTORY' ? '#FFFFFF' : theme.colors.textMuted}
            >
              Settled History ({settlementHistory.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === 'PENDING' ? (
          groupsWithTransfers.length === 0 ? (
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
                    <StatusBadge label="OPTIMIZED" variant="positive" />
                  </View>

                  <Text variant="caption" color={theme.colors.textMuted}>
                    {activeDebtors > 0 ? `${activeDebtors} member(s) have unsettled balances.` : 'Group settlement ready.'}
                  </Text>

                  <Button
                    title="Open Smart Settle →"
                    variant="primary"
                    size="small"
                    onPress={() => router.push(`/groups/${g.id}/settle` as any)}
                  />
                </Surface>
              );
            })
          )
        ) : (
          /* COMPLETED SETTLEMENT HISTORY TAB */
          settlementHistory.length === 0 ? (
            <Surface variant="subtle" style={styles.settledCard}>
              <EmptyState
                title="No Past Settlements"
                description="Recorded payment settlements will show up here for quick reference."
                actionLabel="View Groups"
                onAction={() => router.push('/groups' as any)}
              />
            </Surface>
          ) : (
            <View style={styles.historyList}>
              {settlementHistory.map((s) => {
                const isFromYou = s.fromUserId === currentUser?.id;
                const isToYou = s.toUserId === currentUser?.id;
                const sDate = new Date(s.createdAt);
                const formattedDate = `${sDate.toLocaleDateString()} · ${sDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                return (
                  <Surface key={s.id} variant="card" style={styles.historyItemCard}>
                    <View style={styles.historyTopRow}>
                      <View style={styles.historyIconWrap}>
                        <Icon name="checkmark-circle" size={22} color={theme.colors.positive} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="body" weight="bold">
                          {isFromYou ? 'You' : s.fromUserName} paid {isToYou ? 'You' : s.toUserName}
                        </Text>
                        <Text variant="caption" color={theme.colors.textMuted}>
                          {s.groupName || 'Group'} · {formattedDate}
                        </Text>
                        {!!s.note && (
                          <Text variant="caption" color={theme.colors.textSecondary} style={{ fontStyle: 'italic' }}>
                            "{s.note}"
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="title" weight="bold" color={theme.colors.positive}>
                          ₹{(s.amountMinor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        <StatusBadge label="SETTLED" variant="positive" size="small" style={{ marginTop: 4 }} />
                      </View>
                    </View>
                  </Surface>
                );
              })}
            </View>
          )
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  historyList: {
    gap: 10,
  },
  historyItemCard: {
    padding: 14,
    borderRadius: 14,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
