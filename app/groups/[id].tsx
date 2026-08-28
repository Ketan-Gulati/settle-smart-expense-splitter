import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  Text,
  Button,
  Surface,
  DetailHeader,
  MoneyDisplay,
  Avatar,
  ExpenseActivityRow,
  EmptyState,
} from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, ExpenseDTO, GroupBalancesDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';
import { shareGroupInvite, copyToClipboard, buildInviteUrl } from '@/services/invitations/inviteUtils';

export default function GroupOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [balances, setBalances] = useState<GroupBalancesDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'balances' | 'settle'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [regeneratingInvite, setRegeneratingInvite] = useState(false);

  const loadGroupDetails = useCallback(async () => {
    if (!id) {
      setError('No group ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // Attempt live backend API call first
      try {
        const [user, groupData, expList, groupBals] = await Promise.all([
          SettleApiService.getMe(),
          SettleApiService.getGroupDetails(id),
          SettleApiService.getGroupExpenses(id),
          SettleApiService.getGroupBalances(id),
        ]);

        setCurrentUser(user);
        setGroup(groupData);
        setExpenses(expList);
        setBalances(groupBals);
        return;
      } catch (backendErr) {
        // If not found on backend (e.g. local dev SQLite seed group), fall back gracefully to local SQLite database
        const { groupRepository } = await import('@/repositories/groupRepository');
        const { expenseRepository } = await import('@/repositories/expenseRepository');
        const { userRepository } = await import('@/repositories/userRepository');
        const { balanceService } = await import('@/services/balanceService');

        const localGroup = await groupRepository.findById(id);
        if (localGroup) {
          const defaultUser = await userRepository.getOrCreateDefaultUser();
          const localExpenses = await expenseRepository.findByGroup(id);
          const balRes = await balanceService.getGroupBalances(id);

          const mappedExpenses: ExpenseDTO[] = localExpenses.map((e) => {
            const payerName = localGroup.members?.find((m) => m.id === e.payerId)?.name || 'Member';
            return {
              id: e.id,
              groupId: e.groupId,
              groupName: localGroup.name,
              description: e.description,
              amountMinor: e.amountMinor,
              currency: e.currency || 'INR',
              paidByUserId: e.payerId,
              paidByUserName: payerName,
              splitMethod: e.splitMethod || 'EQUAL',
              category: 'GENERAL',
              notes: null,
              createdAt: e.createdAt,
              splits: e.splits.map((s) => ({
                userId: s.userId,
                userName: localGroup.members?.find((m) => m.id === s.userId)?.name || 'Member',
                amountMinor: s.amountMinor,
              })),
            };
          });

          const memberBalances = (localGroup.members || []).map((m) => ({
            userId: m.id,
            name: m.name,
            avatarUrl: m.avatar || null,
            netBalanceMinor: balRes.success ? (balRes.data.userBalances[m.id]?.netBalanceMinor || 0) : 0,
          }));

          setCurrentUser({
            id: defaultUser.id,
            name: defaultUser.name,
            email: defaultUser.email || 'user@settle.app',
            avatarUrl: defaultUser.avatar || null,
          });

          setGroup({
            id: localGroup.id,
            name: localGroup.name,
            groupType: (localGroup.type?.toUpperCase() as any) || 'OTHER',
            currency: localGroup.currency || 'INR',
            createdBy: localGroup.ownerId,
            createdAt: localGroup.createdAt,
            isArchived: !!localGroup.archivedAt,
            memberCount: localGroup.members?.length || 1,
            members: (localGroup.members || []).map((m) => ({
              id: m.id,
              userId: m.id,
              name: m.name,
              email: m.email || undefined,
              avatarUrl: m.avatar || null,
              role: m.id === localGroup.ownerId ? 'OWNER' : 'MEMBER',
              joinedAt: localGroup.createdAt,
            })),
          });

          setExpenses(mappedExpenses);
          setBalances({
            groupId: id,
            userNetBalanceMinor: balRes.success ? (balRes.data.userBalances[defaultUser.id]?.netBalanceMinor || 0) : 0,
            members: memberBalances,
          });
          return;
        }

        throw backendErr;
      }
    } catch (err: any) {
      console.error('Failed to load group:', err);
      setError(err?.message || 'Group not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroupDetails();
  }, [loadGroupDetails, dataVersion]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailHeader title="Group" onBackPress={() => router.replace('/(tabs)/groups' as any)} />
        <View style={{ padding: 24, marginTop: 40 }}>
          <EmptyState
            title="Group Not Found"
            description={error || 'This group may have been deleted or the link is invalid.'}
            actionLabel="← Back to Groups"
            onAction={() => router.replace('/(tabs)/groups' as any)}
          />
        </View>
      </View>
    );
  }

  const myBalance = balances?.userNetBalanceMinor || 0;
  const isPositive = myBalance > 0;
  const isNegative = myBalance < 0;
  const totalGroupSpend = expenses.reduce((acc, e) => acc + e.amountMinor, 0);

  const handleShareInvite = async () => {
    if (!group?.activeInvite) return;
    await shareGroupInvite({
      groupName: group.name,
      inviterName: currentUser?.name,
      inviteTokenOrCode: group.activeInvite.inviteCode,
      inviteCode: group.activeInvite.inviteCode,
    });
  };

  const handleCopyInviteLink = async () => {
    if (!group?.activeInvite) return;
    const url = buildInviteUrl(group.activeInvite.inviteCode);
    await copyToClipboard(url);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyInviteCode = async () => {
    if (!group?.activeInvite) return;
    await copyToClipboard(group.activeInvite.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    if (!group) return;
    try {
      setRegeneratingInvite(true);
      const newInvite = await SettleApiService.createGroupInvite(group.id);
      setGroup({ ...group, activeInvite: newInvite });
    } catch (e) {
      console.error('Regenerate invite error', e);
    } finally {
      setRegeneratingInvite(false);
    }
  };

  const getUserShareMinor = (expense: ExpenseDTO): number => {
    if (!currentUser) return 0;
    const isPayer = expense.paidByUserId === currentUser.id;
    const split = expense.splits.find((s) => s.userId === currentUser.id);
    const userSplitAmount = split ? split.amountMinor : 0;

    if (isPayer) {
      return expense.amountMinor - userSplitAmount;
    } else if (split) {
      return -userSplitAmount;
    }
    return 0;
  };

  const handleTabPress = (tab: 'overview' | 'expenses' | 'balances' | 'settle') => {
    setActiveTab(tab);
    if (tab === 'settle') {
      router.push(`/groups/${group.id}/settle` as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Detail Header */}
      <DetailHeader
        title={group.name}
        onBackPress={() => router.back()}
        rightAction={
          <Pressable onPress={() => setInviteModalVisible(true)} style={{ padding: 4 }}>
            <Text variant="caption" weight="bold" color={theme.colors.primary}>
              + Invite
            </Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 2. Group Title & Context */}
        <View style={styles.groupHeroSection}>
          <Text variant="displayHero" weight="bold" style={styles.groupTitle}>
            {group.name}
          </Text>
          <Text variant="caption" color={theme.colors.textMuted} style={styles.groupSubtitle}>
            {group.members?.length || group.memberCount || 1} members · {group.currency}
          </Text>

          {/* Member Avatar Stack & Invite button */}
          <View style={styles.avatarRowWithInvite}>
            <View style={styles.avatarStack}>
              {group.members?.slice(0, 4).map((member, idx) => (
                <View
                  key={member.id}
                  style={[
                    styles.avatarWrapper,
                    { marginLeft: idx === 0 ? 0 : -10, zIndex: 10 - idx },
                  ]}
                >
                  <Avatar name={member.name} size="medium" />
                </View>
              ))}
              {(group.members?.length || 0) > 4 && (
                <View style={[styles.moreAvatar, { marginLeft: -10, zIndex: 5 }]}>
                  <Text variant="caption" weight="bold" color={theme.colors.textSecondary}>
                    +{(group.members?.length || 0) - 4}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => setInviteModalVisible(true)}
              style={[styles.inviteChip, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}
            >
              <Text variant="caption" weight="bold" color={theme.colors.primary}>
                + Invite {group.activeInvite ? `(${group.activeInvite.inviteCode})` : 'People'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 3. Metrics Row: Total Group Spend vs Your Position */}
        <View style={styles.metricsRow}>
          <View style={styles.metricColumn}>
            <Text variant="label" color={theme.colors.textMuted} style={styles.metricLabel}>
              TOTAL GROUP SPEND
            </Text>
            <MoneyDisplay
              amountMinor={totalGroupSpend}
              currency={group.currency}
              variant="large"
              sentiment="neutral"
              style={styles.totalSpentAmount}
            />
          </View>

          <View style={styles.metricColumnRight}>
            <Text variant="label" color={theme.colors.textMuted} style={styles.metricLabel}>
              YOUR POSITION
            </Text>
            <MoneyDisplay
              amountMinor={myBalance}
              currency={group.currency}
              variant="large"
              sentiment={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
              showSign
              style={styles.positionAmount}
            />
            <Text
              variant="caption"
              color={
                isPositive
                  ? theme.colors.positive
                  : isNegative
                    ? theme.colors.negative
                    : theme.colors.textMuted
              }
              weight="medium"
            >
              {isPositive ? 'You are owed' : isNegative ? 'You owe' : 'Settled up'}
            </Text>
          </View>
        </View>

        {/* 4. Sub-Navigation Tabs */}
        <View style={styles.tabNavRow}>
          {(['overview', 'expenses', 'balances', 'settle'] as const).map((t) => {
            const isSelected = activeTab === t;
            return (
              <Pressable
                key={t}
                onPress={() => handleTabPress(t)}
                style={[
                  styles.tabItem,
                  isSelected && {
                    borderBottomColor: theme.colors.textPrimary,
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <Text
                  variant="bodySecondary"
                  weight={isSelected ? 'bold' : 'medium'}
                  color={isSelected ? theme.colors.textPrimary : theme.colors.textMuted}
                  style={styles.tabText}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 5. TAB CONTENTS */}

        {/* TAB A: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabSection}>
            <View style={styles.recentExpensesHeader}>
              <Text variant="title" weight="bold">
                Recent Expenses
              </Text>
              <Pressable onPress={() => router.push(`/expenses/new?groupId=${group.id}` as any)}>
                <Text variant="caption" weight="bold" color={theme.colors.textSecondary}>
                  + Add Expense
                </Text>
              </Pressable>
            </View>

            {expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                description="Add a bill, dinner, or booking for this group."
                actionLabel="+ Add Expense"
                onAction={() => router.push(`/expenses/new?groupId=${group.id}` as any)}
              />
            ) : (
              <View style={styles.expensesList}>
                {expenses.slice(0, 5).map((exp, idx) => {
                  const userShareMinor = getUserShareMinor(exp);
                  const isPayer = exp.paidByUserId === currentUser?.id;

                  return (
                    <ExpenseActivityRow
                      key={exp.id}
                      title={exp.description}
                      groupName={group.name}
                      timestamp={new Date(exp.createdAt).toLocaleDateString()}
                      payerName={isPayer ? 'You' : exp.paidByUserName}
                      totalAmountMinor={exp.amountMinor}
                      userShareMinor={userShareMinor}
                      currency={exp.currency}
                      categoryIconName="receipt-outline"
                      showDivider={idx < Math.min(expenses.length, 5) - 1}
                      onPress={() => router.push(`/expenses/${exp.id}` as any)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB B: EXPENSES (Complete Ledger) */}
        {activeTab === 'expenses' && (
          <View style={styles.tabSection}>
            <View style={styles.recentExpensesHeader}>
              <Text variant="title" weight="bold">
                All Expenses ({expenses.length})
              </Text>
              <Pressable onPress={() => router.push(`/expenses/new?groupId=${group.id}` as any)}>
                <Text variant="caption" weight="bold" color={theme.colors.textSecondary}>
                  + Add Expense
                </Text>
              </Pressable>
            </View>

            {expenses.length === 0 ? (
              <EmptyState
                title="No expenses yet"
                description="Add an expense to start tracking."
                actionLabel="+ Add Expense"
                onAction={() => router.push(`/expenses/new?groupId=${group.id}` as any)}
              />
            ) : (
              <View style={styles.expensesList}>
                {expenses.map((exp, idx) => {
                  const userShareMinor = getUserShareMinor(exp);
                  const isPayer = exp.paidByUserId === currentUser?.id;

                  return (
                    <ExpenseActivityRow
                      key={exp.id}
                      title={exp.description}
                      groupName={group.name}
                      timestamp={new Date(exp.createdAt).toLocaleDateString()}
                      payerName={isPayer ? 'You' : exp.paidByUserName}
                      totalAmountMinor={exp.amountMinor}
                      userShareMinor={userShareMinor}
                      currency={exp.currency}
                      categoryIconName="receipt-outline"
                      showDivider={idx < expenses.length - 1}
                      onPress={() => router.push(`/expenses/${exp.id}` as any)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB C: BALANCES (Group-level Member Overview) */}
        {activeTab === 'balances' && (
          <View style={styles.tabSection}>
            <Text variant="title" weight="bold" style={{ marginBottom: 12 }}>
              Group Member Balances
            </Text>

            {balances?.members
              ?.filter((m) => m.userId !== currentUser?.id)
              .map((member) => {
                const bal = member.netBalanceMinor;

                return (
                  <Pressable
                    key={member.userId}
                    onPress={() =>
                      router.push(`/groups/${group.id}/balances?targetUserId=${member.userId}` as any)
                    }
                    style={[
                      styles.memberBalanceCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Avatar name={member.name} size="medium" />
                    <View style={styles.memberBalanceInfo}>
                      <Text variant="body" weight="bold">
                        {member.name}
                      </Text>
                      <Text
                        variant="caption"
                        color={
                          bal !== 0
                            ? bal < 0
                              ? theme.colors.negative
                              : theme.colors.positive
                            : theme.colors.textMuted
                        }
                      >
                        {bal > 0 ? 'Gets back' : bal < 0 ? 'Owes' : 'Settled up'}
                      </Text>
                    </View>

                    <MoneyDisplay
                      amountMinor={Math.abs(bal)}
                      currency={group.currency}
                      variant="large"
                      sentiment={bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'neutral'}
                    />
                  </Pressable>
                );
              })}
          </View>
        )}
      </ScrollView>

      {/* Invite People Sheet Modal */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Surface variant="elevated" style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text variant="title" weight="bold">
                Invite to {group.name}
              </Text>
              <Pressable onPress={() => setInviteModalVisible(false)} style={styles.closeBtn}>
                <Text variant="body" weight="bold" color={theme.colors.textMuted}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <Text variant="bodySecondary" color={theme.colors.textMuted}>
              Share this secure invite with friends so they can join with one tap.
            </Text>

            {group.activeInvite ? (
              <View style={styles.inviteDetailsCard}>
                <View style={[styles.codeBox, { backgroundColor: theme.colors.surfaceSubtle }]}>
                  <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                    INVITE CODE
                  </Text>
                  <Text variant="displayHero" weight="bold" color={theme.colors.primary} style={{ letterSpacing: 4 }}>
                    {group.activeInvite.inviteCode}
                  </Text>
                </View>

                <View style={styles.modalActionButtons}>
                  <Button
                    title={copiedCode ? '✓ Copied!' : 'Copy Link 🔗'}
                    variant="subtle"
                    size="large"
                    onPress={handleCopyInviteLink}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Share Invite 📤"
                    variant="primary"
                    size="large"
                    onPress={handleShareInvite}
                    style={{ flex: 1 }}
                  />
                </View>

                <Pressable onPress={handleCopyInviteCode} style={styles.copyCodeOption}>
                  <Text variant="caption" weight="semibold" color={theme.colors.textSecondary}>
                    Copy Code Only ({group.activeInvite.inviteCode})
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.noInviteState}>
                <Text variant="body" color={theme.colors.textMuted}>
                  No active invite for this group.
                </Text>
                <Button
                  title={regeneratingInvite ? 'Generating...' : 'Generate New Invite'}
                  variant="primary"
                  size="medium"
                  onPress={handleRegenerateInvite}
                  loading={regeneratingInvite}
                  style={{ marginTop: 8 }}
                />
              </View>
            )}

            {group.activeInvite && (
              <View style={styles.revokeSection}>
                <Pressable onPress={handleRegenerateInvite} disabled={regeneratingInvite}>
                  <Text variant="caption" weight="medium" color={theme.colors.negative} align="center">
                    {regeneratingInvite ? 'Generating fresh invite...' : '↻ Revoke & Generate New Invite'}
                  </Text>
                </Pressable>
              </View>
            )}
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  groupHeroSection: {
    gap: 6,
    marginTop: 4,
  },
  groupTitle: {
    fontSize: 32,
    lineHeight: 38,
  },
  groupSubtitle: {
    letterSpacing: 0.2,
  },
  avatarRowWithInvite: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  inviteChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 4,
  },
  metricColumn: {
    flex: 1,
    gap: 4,
  },
  metricColumnRight: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  metricLabel: {
    letterSpacing: 0.5,
    fontSize: 11,
  },
  totalSpentAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  positionAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  tabNavRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabItem: {
    paddingVertical: 10,
    marginRight: 20,
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 14,
  },
  tabSection: {
    gap: 12,
  },
  recentExpensesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  expensesList: {
    gap: 0,
  },
  memberBalanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  memberBalanceInfo: {
    flex: 1,
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    padding: 4,
  },
  inviteDetailsCard: {
    gap: 14,
    marginTop: 4,
  },
  codeBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 6,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  copyCodeOption: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  noInviteState: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  revokeSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
    marginTop: 4,
  },
});
