import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button, Input, Surface, AppHeader, MoneyDisplay, EmptyState, NotificationSideMenu } from '@/components';
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

  // Add Group Action Sheet State
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  // Join via Invite Code Modal State
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      try {
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
        return;
      } catch {
        // Fallback to local SQLite repository
        const { groupRepository } = await import('@/repositories/groupRepository');
        const { userRepository } = await import('@/repositories/userRepository');
        const { balanceService } = await import('@/services/balanceService');

        const defaultUser = await userRepository.getOrCreateDefaultUser();
        setCurrentUser({
          id: defaultUser.id,
          name: defaultUser.name,
          email: defaultUser.email || 'user@settle.app',
          avatarUrl: defaultUser.avatar || null,
        });

        const localGroups = await groupRepository.findByUser(defaultUser.id);
        const items: GroupListItem[] = await Promise.all(
          localGroups.map(async (g) => {
            const balRes = await balanceService.getGroupBalances(g.id);
            const userNet = balRes.success ? (balRes.data.userBalances[defaultUser.id]?.netBalanceMinor || 0) : 0;
            return {
              group: {
                id: g.id,
                name: g.name,
                currency: g.currency,
                createdBy: g.ownerId,
                createdAt: g.createdAt,
                isArchived: !!g.archivedAt,
                memberCount: g.members?.length || 1,
              },
              netBalanceMinor: userNet,
            };
          })
        );

        setGroupItems(items);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups, dataVersion]);

  const getGroupInitial = (name: string) => {
    return name.charAt(0).toUpperCase() || 'G';
  };

  const handleJoinViaCode = async () => {
    const rawCode = inviteCodeInput.trim();
    if (!rawCode) {
      setJoinError('Please enter an invite code or link.');
      return;
    }

    try {
      setJoining(true);
      setJoinError(null);

      // Extract code or token if user pasted full URL
      let cleanCode = rawCode;
      if (rawCode.includes('/invite/')) {
        cleanCode = rawCode.split('/invite/')[1]?.split('?')[0] || rawCode;
      }

      const joinedGroup = await SettleApiService.joinGroupViaInvite(cleanCode);

      setInviteCodeInput('');
      setJoinModalVisible(false);
      notifyDataChanged();
      router.push(`/groups/${joinedGroup.id}` as any);
    } catch (err: any) {
      console.error('Join via code error:', err);
      setJoinError(err.message || 'Invalid or expired invite code.');
    } finally {
      setJoining(false);
    }
  };

  const [sideMenuVisible, setSideMenuVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        userName={currentUser?.name || 'Ketan'}
        onAvatarPress={() => router.push('/profile' as any)}
        onMenuPress={() => setSideMenuVisible(true)}
      />

      <NotificationSideMenu
        visible={sideMenuVisible}
        onClose={() => setSideMenuVisible(false)}
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
          onAction={() => setActionSheetVisible(true)}
          style={styles.empty}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Header Row: "Groups" + Plus "+" Button */}
          <View style={styles.titleRow}>
            <Text variant="displayLarge" weight="bold">
              Groups
            </Text>
            <Pressable
              onPress={() => setActionSheetVisible(true)}
              style={[styles.plusButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
                +
              </Text>
            </Pressable>
          </View>

          {/* Group Rows */}
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

      {/* 1. Action Sheet Modal (2 Options: Create New Group or Join via Invite Code) */}
      <Modal visible={actionSheetVisible} animationType="fade" transparent>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setActionSheetVisible(false)}
        >
          <Pressable
            style={[styles.sheetContent, { backgroundColor: theme.colors.surfaceElevated }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <Text variant="title" weight="bold" style={styles.sheetTitle}>
              Add Group
            </Text>
            <Text variant="bodySecondary" color={theme.colors.textMuted} style={styles.sheetSubtitle}>
              Start a new shared expense group or join an existing one.
            </Text>

            <View style={styles.optionsWrapper}>
              {/* Option 1: Create New Group */}
              <Pressable
                onPress={() => {
                  setActionSheetVisible(false);
                  router.push('/groups/new' as any);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: theme.colors.primarySubtle }]}>
                  <Text style={{ fontSize: 22 }}>✨</Text>
                </View>
                <View style={styles.optionTextContainer}>
                  <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                    Create New Group
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Set up expenses for a trip, housemates, or dinner
                  </Text>
                </View>
                <Text variant="body" color={theme.colors.textMuted}>
                  ›
                </Text>
              </Pressable>

              {/* Option 2: Join via Invite Code */}
              <Pressable
                onPress={() => {
                  setActionSheetVisible(false);
                  setJoinError(null);
                  setInviteCodeInput('');
                  setJoinModalVisible(true);
                }}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Text style={{ fontSize: 22 }}>🔑</Text>
                </View>
                <View style={styles.optionTextContainer}>
                  <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                    Join via Invite Code
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Enter a code or link shared by a friend
                  </Text>
                </View>
                <Text variant="body" color={theme.colors.textMuted}>
                  ›
                </Text>
              </Pressable>
            </View>

            <Button
              title="Cancel"
              variant="subtle"
              size="large"
              onPress={() => setActionSheetVisible(false)}
              style={styles.cancelBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* 2. Join via Invite Code Modal */}
      <Modal visible={joinModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Surface variant="elevated" style={styles.modalContent}>
            <Text variant="headline" style={styles.modalTitle}>
              Join a Group
            </Text>
            <Text variant="bodySecondary" color={theme.colors.textMuted} style={{ marginBottom: 12 }}>
              Paste the 6-character code (e.g. SETTLE) or full invite link to join your group.
            </Text>

            <Input
              label="Invite Code or Link"
              placeholder="e.g. AB12CD or https://settle.app/invite/..."
              value={inviteCodeInput}
              autoCapitalize="characters"
              autoCorrect={false}
              onChangeText={(val) => {
                setInviteCodeInput(val);
                if (joinError) setJoinError(null);
              }}
            />

            {joinError && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                    borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                  },
                ]}
              >
                <Text variant="caption" weight="medium" color={theme.colors.negative}>
                  {joinError}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="subtle"
                size="medium"
                onPress={() => {
                  setJoinModalVisible(false);
                  setJoinError(null);
                }}
                disabled={joining}
              />
              <Button
                title={joining ? 'Joining...' : 'Join Group'}
                variant="primary"
                size="medium"
                onPress={handleJoinViaCode}
                loading={joining}
                disabled={!inviteCodeInput.trim()}
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
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    textAlign: 'center',
  },
  sheetSubtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  optionsWrapper: {
    gap: 12,
    marginVertical: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    gap: 2,
  },
  cancelBtn: {
    marginTop: 8,
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
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
