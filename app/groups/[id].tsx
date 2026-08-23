import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Text,
  DetailHeader,
  MoneyDisplay,
  Avatar,
  ExpenseActivityRow,
  EmptyState,
} from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { groupRepository, GroupEntity } from '@/repositories/groupRepository';
import { expenseRepository } from '@/repositories/expenseRepository';
import { userRepository, UserEntity } from '@/repositories/userRepository';
import { balanceService } from '@/services/balanceService';
import { ExpenseEntity } from '@/domain/expense/expense';
import { GroupBalanceSummary } from '@/domain/balance/balanceEngine';
import { useAppStore } from '@/store/appStore';

export default function GroupOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);
  const [group, setGroup] = useState<GroupEntity | null>(null);
  const [expenses, setExpenses] = useState<ExpenseEntity[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<GroupBalanceSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'balances' | 'settle'>(
    'overview'
  );
  const [loading, setLoading] = useState(true);

  const loadGroupDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const user = await userRepository.getOrCreateDefaultUser();
      setCurrentUser(user);

      const groupData = await groupRepository.findById(id);
      setGroup(groupData);

      if (groupData) {
        const expList = await expenseRepository.findByGroup(id);
        setExpenses(expList);

        const balRes = await balanceService.getGroupBalances(id);
        if (balRes.success) {
          setBalanceSummary(balRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroupDetails();
  }, [loadGroupDetails, dataVersion]);

  if (loading || !group) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const myBalance =
    (currentUser && balanceSummary?.userBalances[currentUser.id]?.netBalanceMinor) || 0;
  const isPositive = myBalance > 0;
  const isNegative = myBalance < 0;

  const getPayerName = (payerId: string) => {
    if (currentUser && payerId === currentUser.id) return 'You';
    return group.members?.find((m) => m.id === payerId)?.name || 'Someone';
  };

  const getUserShareMinor = (expense: ExpenseEntity): number => {
    if (!currentUser) return 0;
    const isPayer = expense.payerId === currentUser.id;
    const split = expense.splits.find((s) => s.userId === currentUser.id);
    const userSplitAmount = split ? split.amountMinor : 0;

    if (isPayer) {
      return expense.amountMinor - userSplitAmount; // User lent this portion
    } else if (split) {
      return -userSplitAmount; // User borrowed this portion
    }
    return 0;
  };

  const handleTabPress = (tab: 'overview' | 'expenses' | 'balances' | 'settle') => {
    setActiveTab(tab);
    if (tab === 'settle') {
      router.push(`/groups/${group.id}/settle` as any);
    }
  };

  // Compute pairwise member balances for the Balances Tab
  const getMemberPairwiseBalanceMinor = (otherUserId: string): number => {
    if (!currentUser) return 0;
    let youPaidForPerson = 0;
    let personPaidForYou = 0;

    for (const exp of expenses) {
      if (exp.payerId === currentUser.id) {
        const split = exp.splits.find((s) => s.userId === otherUserId);
        if (split) youPaidForPerson += split.amountMinor;
      } else if (exp.payerId === otherUserId) {
        const split = exp.splits.find((s) => s.userId === currentUser.id);
        if (split) personPaidForYou += split.amountMinor;
      }
    }
    return youPaidForPerson - personPaidForYou;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Detail Header */}
      <DetailHeader
        title={group.name}
        onBackPress={() => router.back()}
        rightAction={
          <Pressable onPress={() => router.push('/settings' as any)}>
            <Text style={{ fontSize: 20 }}>⚙</Text>
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
            {group.members?.length || 1} members · {group.currency}
          </Text>

          {/* Member Avatar Stack */}
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
        </View>

        {/* 3. Metrics Row: Total Group Spend vs Your Position */}
        <View style={styles.metricsRow}>
          <View style={styles.metricColumn}>
            <Text variant="label" color={theme.colors.textMuted} style={styles.metricLabel}>
              TOTAL GROUP SPEND
            </Text>
            <MoneyDisplay
              amountMinor={group.totalSpentMinor || 0}
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
                  const isPayer = exp.payerId === currentUser?.id;

                  return (
                    <ExpenseActivityRow
                      key={exp.id}
                      title={exp.description}
                      groupName={group.name}
                      timestamp={new Date(exp.date).toLocaleDateString()}
                      payerName={isPayer ? 'You' : getPayerName(exp.payerId)}
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
                  const isPayer = exp.payerId === currentUser?.id;

                  return (
                    <ExpenseActivityRow
                      key={exp.id}
                      title={exp.description}
                      groupName={group.name}
                      timestamp={new Date(exp.date).toLocaleDateString()}
                      payerName={isPayer ? 'You' : getPayerName(exp.payerId)}
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

            {group.members
              ?.filter((m) => m.id !== currentUser?.id)
              .map((member) => {
                const bal = getMemberPairwiseBalanceMinor(member.id);
                const owesYou = bal > 0;
                const youOwe = bal < 0;

                return (
                  <Pressable
                    key={member.id}
                    onPress={() =>
                      router.push(`/groups/${group.id}/balances?targetUserId=${member.id}` as any)
                    }
                    style={styles.memberBalanceCard}
                  >
                    <Avatar name={member.name} size="medium" />
                    <View style={styles.memberBalanceInfo}>
                      <Text variant="body" weight="bold">
                        {member.name}
                      </Text>
                      <Text
                        variant="caption"
                        color={
                          owesYou
                            ? theme.colors.positive
                            : youOwe
                              ? theme.colors.negative
                              : theme.colors.textMuted
                        }
                      >
                        {owesYou
                          ? `${member.name} owes you`
                          : youOwe
                            ? `You owe ${member.name}`
                            : 'Settled up'}
                      </Text>
                    </View>

                    <MoneyDisplay
                      amountMinor={Math.abs(bal)}
                      currency={group.currency}
                      variant="large"
                      sentiment={owesYou ? 'positive' : youOwe ? 'negative' : 'neutral'}
                    />
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
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    gap: 12,
  },
  memberBalanceInfo: {
    flex: 1,
    gap: 2,
  },
});
