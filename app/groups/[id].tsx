import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Modal, RefreshControl } from 'react-native';
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
  GroupAnalyticsCharts,
  OfflineSyncBanner,
} from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, ExpenseDTO, GroupBalancesDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';
import { shareGroupInvite, copyToClipboard, buildInviteUrl } from '@/services/invitations/inviteUtils';

export type ExpenseTimeFilter =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_3_MONTHS'
  | 'LAST_6_MONTHS'
  | 'THIS_YEAR'
  | 'ALL';

export default function GroupOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [balances, setBalances] = useState<GroupBalancesDTO | null>(null);
  const [recurringSchedules, setRecurringSchedules] = useState<any[]>([]);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'bills' | 'charts' | 'balances' | 'settle'>('overview');
  const [expenseTimeFilter, setExpenseTimeFilter] = useState<ExpenseTimeFilter>('THIS_MONTH');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [regeneratingInvite, setRegeneratingInvite] = useState(false);

  // New recurring schedule form state
  const [recTitle, setRecTitle] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDay, setRecDay] = useState('1');
  const [recBehavior, setRecBehavior] = useState<'AUTO_ADD' | 'REMIND_CONFIRM'>('AUTO_ADD');
  const [recFrequency] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [submittingRec, setSubmittingRec] = useState(false);

  const loadGroupDetails = useCallback(async (isInitial = false) => {
    if (!id) {
      setError('No group ID provided');
      setLoading(false);
      return;
    }
    try {
      if (isInitial && !group) {
        setLoading(true);
      }
      setError(null);

      // Attempt live backend API call first
      try {
        const [user, groupData, expList, groupBals, schedules] = await Promise.all([
          SettleApiService.getMe(),
          SettleApiService.getGroupDetails(id),
          SettleApiService.getGroupExpenses(id),
          SettleApiService.getGroupBalances(id),
          SettleApiService.getGroupRecurringSchedules(id).catch(() => []),
        ]);

        setCurrentUser(user);
        setGroup(groupData);
        setExpenses(expList);
        setBalances(groupBals);
        setRecurringSchedules(schedules);
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
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroupDetails();
  }, [loadGroupDetails, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGroupDetails();
  };

  // Filtered expenses for selected time duration (Hook MUST be declared before any conditional early returns):
  // Today, Yesterday, This week, This month, Last month, Last 3 months, Last 6 months, This year, All
  const { filteredExpenses, filteredTotalSpendMinor } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);

    // Start of this week (Monday)
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfLast6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    const filtered = expenses.filter((exp) => {
      const expDate = new Date(exp.createdAt || (exp as any).date || now);

      switch (expenseTimeFilter) {
        case 'TODAY':
          return expDate >= startOfToday;
        case 'YESTERDAY':
          return expDate >= startOfYesterday && expDate <= endOfYesterday;
        case 'THIS_WEEK':
          return expDate >= startOfWeek;
        case 'THIS_MONTH':
          return expDate >= startOfThisMonth;
        case 'LAST_MONTH':
          return expDate >= startOfLastMonth && expDate <= endOfLastMonth;
        case 'LAST_3_MONTHS':
          return expDate >= startOfLast3Months;
        case 'LAST_6_MONTHS':
          return expDate >= startOfLast6Months;
        case 'THIS_YEAR':
          return expDate >= startOfThisYear;
        case 'ALL':
        default:
          return true;
      }
    });

    const totalSpend = filtered.reduce((acc, curr) => acc + curr.amountMinor, 0);
    return { filteredExpenses: filtered, filteredTotalSpendMinor: totalSpend };
  }, [expenses, expenseTimeFilter]);

  const tabList = useMemo(() => {
    const list: Array<'overview' | 'expenses' | 'bills' | 'charts' | 'balances' | 'settle'> = [
      'overview',
      'expenses',
      'bills',
      'charts',
      'balances',
      'settle',
    ];
    return list;
  }, []);

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

  const handleTabPress = (tab: 'overview' | 'expenses' | 'bills' | 'charts' | 'balances' | 'settle') => {
    setActiveTab(tab);
    if (tab === 'settle') {
      router.push(`/groups/${group.id}/settle` as any);
    }
  };

  const handleCreateRecurring = async () => {
    if (!recTitle || !recAmount || isNaN(Number(recAmount))) return;
    try {
      setSubmittingRec(true);
      await SettleApiService.createRecurringSchedule(group.id, {
        title: recTitle.trim(),
        amountMinor: Number(recAmount),
        frequency: recFrequency,
        behavior: recBehavior,
        dayOfMonth: Number(recDay) || 1,
      });
      setRecTitle('');
      setRecAmount('');
      setRecurringModalVisible(false);
      loadGroupDetails();
    } catch (err) {
      console.error('Failed to create recurring bill:', err);
    } finally {
      setSubmittingRec(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Detail Header */}
      <DetailHeader
        title={group.name}
        onBackPress={() => router.back()}
      />

      {/* Offline Sync Banner (Travel & Goa Mode) */}
      <OfflineSyncBanner />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
            <Pressable
              onPress={() => setMembersModalVisible(true)}
              style={styles.avatarStackContainer}
              hitSlop={6}
            >
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
              <Text variant="caption" weight="semibold" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>
                View all ({group.members?.length || group.memberCount || 1})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setInviteModalVisible(true)}
              style={[styles.inviteChip, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}
            >
              <Text variant="caption" weight="bold" color={theme.colors.primary}>
                + Invite
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

        {/* 4. Sub-Navigation Tabs (Horizontally Scrollable) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabNavScrollContainer}
          style={styles.tabNavScrollView}
        >
          {tabList.map((t) => {
            const isSelected = activeTab === t;
            const tabLabel = t === 'bills' ? '🔁 Bills' : t.charAt(0).toUpperCase() + t.slice(1);
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
                  {tabLabel}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

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
                  const expDate = new Date(exp.createdAt);
                  const formattedTimestamp = `${expDate.toLocaleDateString()} · ${expDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                  return (
                    <ExpenseActivityRow
                      key={exp.id}
                      title={exp.description}
                      groupName={group.name}
                      timestamp={formattedTimestamp}
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

        {/* TAB B: EXPENSES (Complete Ledger with Time Duration Filtering & Total Spend) */}
        {activeTab === 'expenses' && (
          <View style={styles.tabSection}>
            {/* 1. Header with Add Expense */}
            <View style={styles.recentExpensesHeader}>
              <Text variant="title" weight="bold">
                All Expenses ({filteredExpenses.length})
              </Text>
              <Pressable onPress={() => router.push(`/expenses/new?groupId=${group.id}` as any)}>
                <Text variant="caption" weight="bold" color={theme.colors.textSecondary}>
                  + Add Expense
                </Text>
              </Pressable>
            </View>

            {/* 2. Total Filtered Spend Display Card */}
            <Surface variant="card" style={styles.expenseTotalSummaryCard}>
              <View style={styles.expenseTotalSummaryRow}>
                <View>
                  <Text variant="caption" weight="bold" color={theme.colors.textMuted} style={{ letterSpacing: 0.5 }}>
                    TOTAL EXPENSE (SELECTED DURATION)
                  </Text>
                  <Text variant="title" weight="bold" color={theme.colors.textPrimary} style={{ marginTop: 2 }}>
                    {group.currency} {(filteredTotalSpendMinor / 100).toFixed(2)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="caption" color={theme.colors.textSecondary}>
                    {filteredExpenses.length} expense{filteredExpenses.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
            </Surface>

            {/* 3. Horizontal Time Filter Selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeFilterScrollRow}
            >
              {[
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'THIS_WEEK', label: 'This Week' },
                { id: 'LAST_MONTH', label: 'Last Month' },
                { id: 'LAST_3_MONTHS', label: 'Last 3 Months' },
                { id: 'LAST_6_MONTHS', label: 'Last 6 Months' },
                { id: 'THIS_YEAR', label: 'This Year' },
                { id: 'ALL', label: 'All Time' },
              ].map((tf) => {
                const isSelected = expenseTimeFilter === tf.id;
                return (
                  <Pressable
                    key={tf.id}
                    onPress={() => setExpenseTimeFilter(tf.id as ExpenseTimeFilter)}
                    style={[
                      styles.timeFilterPill,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceSubtle,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      weight={isSelected ? 'bold' : 'medium'}
                      color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                    >
                      {tf.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 4. Filtered Expense Ledger */}
            {filteredExpenses.length === 0 ? (
              <EmptyState
                title="No expenses in this period"
                description={`No expenses recorded for ${expenseTimeFilter.toLowerCase().replace(/_/g, ' ')}.`}
                actionLabel="+ Add Expense"
                onAction={() => router.push(`/expenses/new?groupId=${group.id}` as any)}
              />
            ) : (
              <View style={styles.expensesList}>
                {filteredExpenses.map((exp, idx) => {
                  const userShareMinor = getUserShareMinor(exp);
                  const isPayer = exp.paidByUserId === currentUser?.id;
                  const expDate = new Date(exp.createdAt);
                  const formattedTimestamp = `${expDate.toLocaleDateString()} · ${expDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`;

                  return (
                    <ExpenseActivityRow
                      key={exp.id}
                      title={exp.description}
                      groupName={group.name}
                      timestamp={formattedTimestamp}
                      payerName={isPayer ? 'You' : exp.paidByUserName}
                      totalAmountMinor={exp.amountMinor}
                      userShareMinor={userShareMinor}
                      currency={exp.currency}
                      categoryIconName="receipt-outline"
                      showDivider={idx < filteredExpenses.length - 1}
                      onPress={() => router.push(`/expenses/${exp.id}` as any)}
                    />
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB BILLS: RECURRING EXPENSES & SCHEDULES */}
        {activeTab === 'bills' && (
          <View style={styles.tabSection}>
            <View style={styles.billsHeaderRow}>
              <View>
                <Text variant="title" weight="bold">
                  Monthly Bills & Schedules
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  Automated recurring expenses and rent reminders
                </Text>
              </View>
              <Button
                title="+ Set Bill"
                variant="primary"
                size="small"
                onPress={() => setRecurringModalVisible(true)}
              />
            </View>

            {recurringSchedules.length === 0 ? (
              <Surface variant="subtle" style={{ padding: 24, borderRadius: 16, marginTop: 12 }}>
                <EmptyState
                  title="No Recurring Bills"
                  description="Add monthly rent, internet, or Netflix schedules to automatically generate expenses on the due date."
                  actionLabel="+ Add Recurring Bill"
                  onAction={() => setRecurringModalVisible(true)}
                />
              </Surface>
            ) : (
              <View style={{ gap: 10, marginTop: 12 }}>
                {recurringSchedules.map((schedule) => {
                  const nextDate = new Date(schedule.nextOccurrenceAt);
                  const formattedNext = `${nextDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

                  return (
                    <Surface key={schedule.id} variant="card" style={styles.recurringCard}>
                      <View style={styles.recurringTopRow}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="body" weight="bold">
                              {schedule.title}
                            </Text>
                            <View
                              style={[
                                styles.behaviorBadge,
                                {
                                  backgroundColor:
                                    schedule.behavior === 'AUTO_ADD'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                },
                              ]}
                            >
                              <Text
                                variant="caption"
                                weight="bold"
                                color={schedule.behavior === 'AUTO_ADD' ? '#10B981' : '#F59E0B'}
                                style={{ fontSize: 10 }}
                              >
                                {schedule.behavior === 'AUTO_ADD' ? 'AUTO-POST' : 'REMINDER'}
                              </Text>
                            </View>
                          </View>
                          <Text variant="caption" color={theme.colors.textMuted}>
                            {schedule.frequency} · Due on {schedule.dayOfMonth ? `${schedule.dayOfMonth}th` : 'scheduled date'} · Next: {formattedNext}
                          </Text>
                          <Text variant="caption" color={theme.colors.textSecondary}>
                            Paid by {schedule.paidByUserName || 'Member'}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <Text variant="title" weight="bold" color={theme.colors.primary}>
                            ₹{schedule.amountMinor.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </Text>
                          <Pressable
                            onPress={async () => {
                              try {
                                await SettleApiService.deleteRecurringSchedule(schedule.id);
                                loadGroupDetails();
                              } catch (e) {
                                console.error('Failed to remove schedule:', e);
                              }
                            }}
                            hitSlop={8}
                          >
                            <Text variant="caption" color={theme.colors.negative} weight="medium">
                              Remove
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </Surface>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB C: CHARTS & ANALYTICS */}
        {activeTab === 'charts' && (
          <View style={styles.tabSection}>
            <GroupAnalyticsCharts
              expenses={expenses}
              currency={group.currency}
              currentUser={currentUser}
            />
          </View>
        )}

        {/* TAB D: BALANCES (Group-level Member Overview) */}
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
      <Modal visible={inviteModalVisible} animationType="slide" transparent onRequestClose={() => setInviteModalVisible(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setInviteModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
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
                  <Text variant="caption" weight="semibold" color={theme.colors.primary}>
                    Copy code only ({group.activeInvite.inviteCode})
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.noInviteState}>
                <Text variant="body" color={theme.colors.textSecondary} align="center">
                  No active invite link for this group yet.
                </Text>
                <Button
                  title="Generate Invite Link"
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Members Modal (Full Names, Avatars, Roles) */}
      <Modal visible={membersModalVisible} animationType="slide" transparent onRequestClose={() => setMembersModalVisible(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setMembersModalVisible(false)}>
          <Pressable style={[styles.membersModalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.membersModalHeader}>
              <View>
                <Text variant="headline" style={{ fontWeight: '700' }}>
                  Group Members
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  {group.members?.length || group.memberCount || 1} people in this group
                </Text>
              </View>
              <Pressable
                onPress={() => setMembersModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                hitSlop={8}
              >
                <Text variant="body" weight="bold" color={theme.colors.textMuted}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <View style={styles.membersList}>
                {group.members && group.members.length > 0 ? (
                  group.members.map((member) => {
                    const isOwner = member.role === 'OWNER' || member.userId === group.createdBy;
                    const isMe = member.userId === currentUser?.id;

                    return (
                      <View
                        key={member.id}
                        style={[
                          styles.memberItemRow,
                          { borderBottomColor: theme.colors.borderSubtle },
                        ]}
                      >
                        <Avatar name={member.name} size="medium" />
                        <View style={styles.memberItemDetails}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="body" weight="semibold" color={theme.colors.textPrimary}>
                              {member.name}
                            </Text>
                            {isMe && (
                              <Text variant="caption" color={theme.colors.primary} weight="bold">
                                (You)
                              </Text>
                            )}
                          </View>
                          {member.email && (
                            <Text variant="caption" color={theme.colors.textMuted}>
                              {member.email}
                            </Text>
                          )}
                        </View>
                        {isOwner && (
                          <View
                            style={[
                              styles.roleBadge,
                              { backgroundColor: theme.colors.primarySubtle },
                            ]}
                          >
                            <Text variant="caption" weight="bold" color={theme.colors.primary}>
                              Owner
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text variant="body" color={theme.colors.textMuted} align="center" style={{ paddingVertical: 20 }}>
                    No members found.
                  </Text>
                )}
              </View>
            </ScrollView>

            <Button
              title="Done"
              variant="primary"
              size="large"
              onPress={() => setMembersModalVisible(false)}
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Set Recurring Bill / Rent Schedule Modal */}
      <Modal
        visible={recurringModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRecurringModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setRecurringModalVisible(false)}
        >
          <Pressable
            style={[styles.membersModalContent, { backgroundColor: theme.colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.membersModalHeader}>
              <View>
                <Text variant="headline" style={{ fontWeight: '700' }}>
                  Set Recurring Bill
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  Automate regular rent, wifi, or subscriptions
                </Text>
              </View>
              <Pressable
                onPress={() => setRecurringModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                hitSlop={8}
              >
                <Text variant="body" weight="bold" color={theme.colors.textMuted}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <View style={{ gap: 12, paddingVertical: 8 }}>
              <View style={styles.formField}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  BILL TITLE
                </Text>
                <Surface variant="subtle" style={styles.inputSurface}>
                  <Text
                    variant="body"
                    style={{ flex: 1, padding: 8 }}
                    // @ts-ignore
                    accessibilityRole="text"
                  >
                    <input
                      placeholder="e.g. Apartment Rent, WiFi, Netflix"
                      value={recTitle}
                      onChange={(e: any) => setRecTitle(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme.colors.textPrimary,
                        fontSize: 16,
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </Text>
                </Surface>
              </View>

              <View style={styles.formField}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  AMOUNT (₹)
                </Text>
                <Surface variant="subtle" style={styles.inputSurface}>
                  <Text
                    variant="body"
                    style={{ flex: 1, padding: 8 }}
                    // @ts-ignore
                    accessibilityRole="text"
                  >
                    <input
                      type="number"
                      placeholder="e.g. 25000"
                      value={recAmount}
                      onChange={(e: any) => setRecAmount(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme.colors.textPrimary,
                        fontSize: 16,
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </Text>
                </Surface>
              </View>

              <View style={styles.formField}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  DUE DAY OF MONTH (1 - 31)
                </Text>
                <Surface variant="subtle" style={styles.inputSurface}>
                  <Text
                    variant="body"
                    style={{ flex: 1, padding: 8 }}
                    // @ts-ignore
                    accessibilityRole="text"
                  >
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={recDay}
                      onChange={(e: any) => setRecDay(e.target.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: theme.colors.textPrimary,
                        fontSize: 16,
                        width: '100%',
                        outline: 'none',
                      }}
                    />
                  </Text>
                </Surface>
              </View>

              <View style={styles.formField}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  HOW SHOULD THIS REPEAT?
                </Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Pressable
                    onPress={() => setRecBehavior('AUTO_ADD')}
                    style={[
                      styles.simpleBehaviorCard,
                      {
                        backgroundColor:
                          recBehavior === 'AUTO_ADD'
                            ? theme.colors.surfaceSubtle
                            : theme.colors.surface,
                        borderColor:
                          recBehavior === 'AUTO_ADD'
                            ? theme.colors.primary
                            : theme.colors.borderSubtle,
                        borderWidth: recBehavior === 'AUTO_ADD' ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 18 }}>⚡</Text>
                        <View>
                          <Text variant="body" weight="bold">
                            Add automatically
                          </Text>
                          <Text variant="caption" color={theme.colors.textMuted}>
                            Post expense on the 1st without asking (e.g. Rent, Netflix)
                          </Text>
                        </View>
                      </View>
                      {recBehavior === 'AUTO_ADD' && (
                        <Text variant="body" weight="bold" color={theme.colors.primary}>
                          ✓
                        </Text>
                      )}
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setRecBehavior('REMIND_CONFIRM')}
                    style={[
                      styles.simpleBehaviorCard,
                      {
                        backgroundColor:
                          recBehavior === 'REMIND_CONFIRM'
                            ? theme.colors.surfaceSubtle
                            : theme.colors.surface,
                        borderColor:
                          recBehavior === 'REMIND_CONFIRM'
                            ? theme.colors.primary
                            : theme.colors.borderSubtle,
                        borderWidth: recBehavior === 'REMIND_CONFIRM' ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 18 }}>🔔</Text>
                        <View>
                          <Text variant="body" weight="bold">
                            Remind me first
                          </Text>
                          <Text variant="caption" color={theme.colors.textMuted}>
                            Send notification to confirm amount (e.g. Electricity, Maid)
                          </Text>
                        </View>
                      </View>
                      {recBehavior === 'REMIND_CONFIRM' && (
                        <Text variant="body" weight="bold" color={theme.colors.primary}>
                          ✓
                        </Text>
                      )}
                    </View>
                  </Pressable>
                </View>
              </View>

              <Button
                title="Create Recurring Schedule"
                variant="primary"
                size="large"
                onPress={handleCreateRecurring}
                loading={submittingRec}
                style={{ marginTop: 10 }}
              />
            </View>
          </Pressable>
        </Pressable>
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
  tabNavScrollView: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabNavScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 20,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  avatarStackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  membersModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  membersList: {
    gap: 4,
  },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  memberItemDetails: {
    flex: 1,
    gap: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expenseTotalSummaryCard: {
    padding: 14,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  expenseTotalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeFilterScrollRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  timeFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recurringCard: {
    padding: 16,
    borderRadius: 16,
  },
  recurringTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  behaviorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  formField: {
    gap: 4,
  },
  inputSurface: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  simpleBehaviorCard: {
    padding: 12,
    borderRadius: 14,
  },
});
