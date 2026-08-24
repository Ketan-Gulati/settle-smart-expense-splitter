import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text, DetailHeader, MoneyDisplay, Avatar, ExpenseActivityRow, EmptyState } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, PersonBalanceDetailDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function GroupBalancesScreen() {
  const { id, targetUserId } = useLocalSearchParams<{ id: string; targetUserId?: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [detail, setDetail] = useState<PersonBalanceDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      setError('No group ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const groupData = await SettleApiService.getGroupDetails(id);
      setGroup(groupData);

      let targetId = targetUserId;
      if (!targetId && groupData.members) {
        const currentUser = await SettleApiService.getMe();
        const otherMember = groupData.members.find((m) => m.userId !== currentUser.id);
        targetId = otherMember?.userId;
      }

      if (targetId) {
        const balanceDetail = await SettleApiService.getPersonBalanceDetail(id, targetId);
        setDetail(balanceDetail);
      }
    } catch (err: any) {
      console.error('Failed to load person balance details from backend:', err);
      setError(err?.message || 'Group not found or access denied.');
    } finally {
      setLoading(false);
    }
  }, [id, targetUserId]);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !group || !detail) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailHeader title="Balance Details" onBackPress={() => router.replace('/(tabs)/groups' as any)} />
        <View style={{ padding: 24, marginTop: 40 }}>
          <EmptyState
            title="Group Not Found"
            description={error || 'This group may have been deleted or the identifier is invalid.'}
            actionLabel="← Back to Groups"
            onAction={() => router.replace('/(tabs)/groups' as any)}
          />
        </View>
      </View>
    );
  }

  const personName = detail.person.name;
  const isOwed = detail.netBalanceWithPersonMinor > 0;
  const isOwing = detail.netBalanceWithPersonMinor < 0;

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
            amountMinor={Math.abs(detail.netBalanceWithPersonMinor)}
            currency={group.currency}
            variant="hero"
            sentiment={isOwed ? 'positive' : isOwing ? 'negative' : 'neutral'}
            style={styles.heroAmount}
          />

          <View style={[styles.sharedCountPill, { backgroundColor: theme.colors.surfaceSubtle }]}>
            <Text variant="caption" color={theme.colors.textSecondary} weight="medium">
              Across {detail.sharedExpenseCount} shared expense{detail.sharedExpenseCount > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* 3. Recent Activity Section */}
        <View style={styles.sectionHeader}>
          <Text variant="label" color={theme.colors.textMuted} style={styles.sectionLabel}>
            SHARED ACTIVITY ({detail.sharedExpenseCount})
          </Text>
        </View>

        <View style={[styles.activityCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {detail.sharedExpenses.map((exp, idx) => {
            const isYouPayer = exp.payerName === 'You' || exp.payerName === group.name;
            const impactMinor = isYouPayer ? exp.personShareMinor : -exp.userShareMinor;

            return (
              <ExpenseActivityRow
                key={exp.id}
                title={exp.description}
                groupName={group.name}
                timestamp={new Date(exp.date).toLocaleDateString()}
                payerName={exp.payerName}
                totalAmountMinor={exp.amountMinor}
                userShareMinor={impactMinor}
                currency={exp.currency}
                categoryIconName="receipt-outline"
                showDivider={idx < detail.sharedExpenses.length - 1}
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

        <View style={[styles.breakdownCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSubtle }]}>
          <View style={styles.breakdownLine}>
            <Text variant="bodySecondary" color={theme.colors.textSecondary}>
              You paid for {personName}
            </Text>
            <MoneyDisplay
              amountMinor={detail.youPaidForPersonMinor}
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
              amountMinor={detail.personPaidForYouMinor}
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
              amountMinor={Math.abs(detail.netBalanceWithPersonMinor)}
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
