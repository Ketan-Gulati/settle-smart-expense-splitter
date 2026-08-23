import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, DetailHeader, MoneyDisplay, Avatar, ExpenseActivityRow } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { groupRepository, GroupEntity } from '@/repositories/groupRepository';
import { userRepository, UserEntity } from '@/repositories/userRepository';
import { expenseRepository } from '@/repositories/expenseRepository';
import { ExpenseEntity } from '@/domain/expense/expense';
import { useAppStore } from '@/store/appStore';

export default function GroupBalancesScreen() {
  const { id, targetUserId } = useLocalSearchParams<{ id: string; targetUserId?: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [group, setGroup] = useState<GroupEntity | null>(null);
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);
  const [sharedExpenses, setSharedExpenses] = useState<ExpenseEntity[]>([]);
  const [targetMember, setTargetMember] = useState<UserEntity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const user = await userRepository.getOrCreateDefaultUser();
      setCurrentUser(user);

      const groupData = await groupRepository.findById(id);
      setGroup(groupData);

      // Select target member based on URL query param or fallback to first non-user member
      let otherMember: UserEntity | null = null;
      if (targetUserId && groupData?.members) {
        otherMember = groupData.members.find((m) => m.id === targetUserId) || null;
      }
      if (!otherMember && groupData?.members) {
        otherMember = groupData.members.find((m) => m.id !== user.id) || null;
      }
      setTargetMember(otherMember);

      const allExpenses = await expenseRepository.findByGroup(id);
      // Strictly filter to shared expenses involving both current user and target member
      const bilateral = allExpenses.filter((exp) => {
        const isParticipantOrPayerUser =
          exp.payerId === user.id || exp.splits.some((s) => s.userId === user.id);
        const isParticipantOrPayerOther =
          otherMember &&
          (exp.payerId === otherMember.id || exp.splits.some((s) => s.userId === otherMember.id));
        return isParticipantOrPayerUser && isParticipantOrPayerOther;
      });
      setSharedExpenses(bilateral);
    } catch (err) {
      console.error('Failed to load balance details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, targetUserId]);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  if (loading || !group) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const personName = targetMember?.name || 'Member';

  // Calculate bilateral pairwise metrics from real ledger
  let youPaidForPersonMinor = 0;
  let personPaidForYouMinor = 0;

  for (const exp of sharedExpenses) {
    const youPaid = exp.payerId === currentUser?.id;
    const personPaid = exp.payerId === targetMember?.id;

    if (youPaid) {
      const personSplit = exp.splits.find((s) => s.userId === targetMember?.id);
      if (personSplit) {
        youPaidForPersonMinor += personSplit.amountMinor;
      }
    } else if (personPaid) {
      const youSplit = exp.splits.find((s) => s.userId === currentUser?.id);
      if (youSplit) {
        personPaidForYouMinor += youSplit.amountMinor;
      }
    }
  }

  const netBalanceWithPersonMinor = youPaidForPersonMinor - personPaidForYouMinor;
  const isOwed = netBalanceWithPersonMinor > 0;
  const isOwing = netBalanceWithPersonMinor < 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Header with back and person name */}
      <DetailHeader
        title={personName}
        onBackPress={() => router.back()}
        rightAction={
          <Pressable>
            <Text style={{ fontSize: 20 }}>⋮</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 2. Avatar Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarBox}>
            <Avatar name={personName} size="huge" />
          </View>

          <Text variant="bodySecondary" color={theme.colors.textSecondary} weight="medium">
            {isOwed
              ? `${personName} owes you`
              : isOwing
                ? `You owe ${personName}`
                : 'All settled up'}
          </Text>

          <MoneyDisplay
            amountMinor={Math.abs(netBalanceWithPersonMinor)}
            currency={group.currency}
            variant="hero"
            sentiment={isOwed ? 'positive' : isOwing ? 'negative' : 'neutral'}
            style={styles.heroAmount}
          />

          <View style={styles.sharedCountPill}>
            <Text variant="caption" color={theme.colors.textSecondary} weight="medium">
              Across {sharedExpenses.length} shared expense{sharedExpenses.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* 3. Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <Text variant="label" color={theme.colors.textMuted} style={styles.sectionLabel}>
            SHARED ACTIVITY ({sharedExpenses.length})
          </Text>
        </View>

        <View style={styles.activityCard}>
          {sharedExpenses.map((exp, idx) => {
            const isYouPayer = exp.payerId === currentUser?.id;
            const youSplit = exp.splits.find((s) => s.userId === currentUser?.id);
            const otherSplit = exp.splits.find((s) => s.userId === targetMember?.id);
            const impactMinor = isYouPayer
              ? otherSplit?.amountMinor || 0
              : -(youSplit?.amountMinor || 0);

            return (
              <ExpenseActivityRow
                key={exp.id}
                title={exp.description}
                groupName={group.name}
                timestamp={new Date(exp.date).toLocaleDateString()}
                payerName={isYouPayer ? 'You' : personName}
                totalAmountMinor={exp.amountMinor}
                userShareMinor={impactMinor}
                currency={exp.currency}
                categoryIconName="receipt-outline"
                showDivider={idx < sharedExpenses.length - 1}
                onPress={() => router.push(`/expenses/${exp.id}` as any)}
              />
            );
          })}
        </View>

        {/* 4. Calculation Breakdown Card */}
        <View style={styles.sectionHeader}>
          <Text variant="label" color={theme.colors.textMuted} style={styles.sectionLabel}>
            CALCULATION BREAKDOWN
          </Text>
        </View>

        <View style={[styles.breakdownCard, { borderColor: theme.colors.borderSubtle }]}>
          <View style={styles.breakdownLine}>
            <Text variant="bodySecondary" color={theme.colors.textSecondary}>
              You paid for {personName}
            </Text>
            <MoneyDisplay
              amountMinor={youPaidForPersonMinor}
              currency={group.currency}
              variant="medium"
              sentiment="neutral"
            />
          </View>

          <View style={styles.breakdownLine}>
            <Text variant="bodySecondary" color={theme.colors.textSecondary}>
              {personName} paid for you
            </Text>
            <MoneyDisplay
              amountMinor={personPaidForYouMinor}
              currency={group.currency}
              variant="medium"
              sentiment="neutral"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.netLine}>
            <Text variant="title" weight="bold">
              {isOwed ? 'NET owed to you' : isOwing ? 'NET you owe' : 'NET balance'}
            </Text>
            <MoneyDisplay
              amountMinor={Math.abs(netBalanceWithPersonMinor)}
              currency={group.currency}
              variant="large"
              sentiment={isOwed ? 'positive' : isOwing ? 'negative' : 'neutral'}
              style={styles.netResultAmount}
            />
          </View>
        </View>

        {/* 5. Fixed Settle Up CTA */}
        <Pressable
          onPress={() => router.push(`/groups/${group.id}/settle` as any)}
          style={[styles.settleUpBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
            ▤ Settle Up
          </Text>
        </Pressable>
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  avatarBox: {
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 50,
  },
  sharedCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 8,
  },
  sectionLabel: {
    letterSpacing: 0.6,
    fontSize: 11,
  },
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 12,
  },
  breakdownCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  breakdownLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  netLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  netResultAmount: {
    fontSize: 24,
    fontWeight: '800',
  },
  settleUpBtn: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
