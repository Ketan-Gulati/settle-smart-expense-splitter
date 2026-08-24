import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button, Input, Surface, AppHeader, MoneyDisplay, EmptyState } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

interface GroupListItem {
  group: GroupDTO;
  netBalanceMinor: number;
}

export default function GroupsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [groupItems, setGroupItems] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Group Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const [user, groups] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getGroups(),
      ]);
      setCurrentUser(user);

      const items: GroupListItem[] = await Promise.all(
        groups.map(async (group) => {
          try {
            const balRes = await SettleApiService.getGroupBalances(group.id);
            return { group, netBalanceMinor: balRes.userNetBalanceMinor };
          } catch {
            return { group, netBalanceMinor: 0 };
          }
        })
      );

      setGroupItems(items);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups, dataVersion]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setCreateError('Group name is required.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const newGroup = await SettleApiService.createGroup(groupName.trim(), 'INR');

      setGroupName('');
      setModalVisible(false);
      notifyDataChanged();
      router.push(`/groups/${newGroup.id}` as any);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const getGroupInitial = (name: string) => {
    return name.charAt(0).toUpperCase() || 'G';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        userName={currentUser?.name || 'Ketan'}
        onSettingsPress={() => router.push('/settings' as any)}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : groupItems.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description="Create a group for your trip, housemates, or dinner to start sharing expenses."
          actionLabel="Create First Group"
          onAction={() => router.push('/groups/new' as any)}
          style={styles.empty}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Header Row: "Groups" + Black "+" Button */}
          <View style={styles.titleRow}>
            <Text variant="displayLarge" weight="bold">
              Groups
            </Text>
            <Pressable
              onPress={() => router.push('/groups/new' as any)}
              style={[styles.plusButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
                +
              </Text>
            </Pressable>
          </View>

          {/* Group Rows strictly matching Groups (Final) */}
          <View style={styles.groupList}>
            {groupItems.map(({ group, netBalanceMinor }, idx) => {
              const isPositive = netBalanceMinor > 0;
              const isNegative = netBalanceMinor < 0;
              const isSettled = netBalanceMinor === 0;

              return (
                <Pressable
                  key={group.id}
                  onPress={() => router.push(`/groups/${group.id}` as any)}
                  style={({ pressed }) => [
                    styles.groupRow,
                    {
                      borderBottomColor: theme.colors.borderSubtle,
                      borderBottomWidth: idx < groupItems.length - 1 ? 1 : 0,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  {/* Left Initial Badge */}
                  <View
                    style={[
                      styles.thumbnail,
                      {
                        backgroundColor: theme.colors.surfaceElevated,
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      variant="title"
                      weight="bold"
                      color={theme.colors.textPrimary}
                    >
                      {getGroupInitial(group.name)}
                    </Text>
                  </View>

                  {/* Center Name & Member count */}
                  <View style={styles.details}>
                    <Text variant="body" weight="semibold">
                      {group.name}
                    </Text>
                    <Text variant="caption" color={theme.colors.textMuted}>
                      {group.memberCount || 1} members
                    </Text>
                  </View>

                  {/* Right 2-tier user net position */}
                  <View style={styles.financialRight}>
                    {isSettled ? (
                      <Text variant="bodySecondary" color={theme.colors.textMuted} weight="medium">
                        Settled up
                      </Text>
                    ) : (
                      <>
                        <MoneyDisplay
                          amountMinor={netBalanceMinor}
                          currency={group.currency}
                          variant="medium"
                          sentiment={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
                          showSign
                          style={styles.netAmount}
                        />
                        <Text
                          variant="caption"
                          weight="bold"
                          color={isPositive ? theme.colors.positive : theme.colors.negative}
                          style={styles.statusLabel}
                        >
                          {isPositive ? 'YOU ARE OWED' : 'YOU OWE'}
                        </Text>
                      </>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Create Group Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Surface variant="elevated" style={styles.modalContent}>
            <Text variant="headline" style={styles.modalTitle}>
              Create New Group
            </Text>
            <Input
              label="Group Name"
              placeholder="e.g. Ski Trip '24, Apartment 4B"
              value={groupName}
              onChangeText={setGroupName}
            />

            {createError && (
              <Text variant="caption" color={theme.colors.negative} style={styles.errorText}>
                {createError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="subtle"
                size="medium"
                onPress={() => {
                  setModalVisible(false);
                  setCreateError(null);
                }}
                disabled={creating}
              />
              <Button
                title={creating ? 'Creating...' : 'Create Group'}
                variant="primary"
                size="medium"
                onPress={handleCreateGroup}
                loading={creating}
              />
            </View>
          </Surface>
        </View>
      </Modal>
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
  empty: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupList: {
    gap: 4,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 4,
  },
  financialRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  netAmount: {
    fontWeight: '700',
    fontSize: 16,
  },
  statusLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  errorText: {
    marginTop: -8,
  },
});
