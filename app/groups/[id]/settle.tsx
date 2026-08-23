import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, DetailHeader, StatusBadge, SettlementPathCard, EmptyState } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { groupRepository, GroupEntity } from '@/repositories/groupRepository';
import { userRepository, UserEntity } from '@/repositories/userRepository';
import { settlementService } from '@/services/settlementService';
import { SettlementPlan, SettlementExplanation } from '@/domain/settlement/settlementOptimizer';
import { useAppStore } from '@/store/appStore';

export default function SmartSettlementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [group, setGroup] = useState<GroupEntity | null>(null);
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);
  const [plan, setPlan] = useState<SettlementPlan | null>(null);
  const [explanations, setExplanations] = useState<Record<string, SettlementExplanation>>({});
  const [loading, setLoading] = useState(true);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const user = await userRepository.getOrCreateDefaultUser();
      setCurrentUser(user);

      const groupData = await groupRepository.findById(id);
      setGroup(groupData);

      const planRes = await settlementService.getOptimizedSettlementPlan(id);
      if (planRes.success) {
        setPlan(planRes.data);

        // Preload explanations for transfers
        const expMap: Record<string, SettlementExplanation> = {};
        for (const t of planRes.data.transfers) {
          const key = `${t.fromUserId}_${t.toUserId}`;
          const expRes = await settlementService.explainTransfer(id, t);
          if (expRes.success) {
            expMap[key] = expRes.data;
          }
        }
        setExplanations(expMap);
      }
    } catch (err) {
      console.error('Failed to load settlement plan:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const getUserName = (userId: string) => {
    if (currentUser && userId === currentUser.id) return 'You';
    return group.members?.find((m) => m.id === userId)?.name || 'Member';
  };

  const transfers = plan?.transfers || [];
  const origCount = plan?.originalObligationsCount || 0;
  const optCount = plan?.totalTransfersCount || 0;
  const isReduced = optCount < origCount && optCount > 0;
  const isSettled = optCount === 0;

  const displayedTransfers = showAllPayments ? transfers : transfers.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Header with back and clear Group Title */}
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
        {/* 2. Supertitle */}
        <Text variant="label" color={theme.colors.textMuted} style={styles.superTitle}>
          SMART SETTLEMENT ENGINE
        </Text>

        {/* 3. Prominent Group Name Identification */}
        <Text variant="displayHero" weight="bold" style={styles.groupNameHeading}>
          {group.name}
        </Text>

        {/* 4. Dynamic Headline & Reduction Badge */}
        <View style={styles.statusRow}>
          <Text variant="headline" weight="bold" color={theme.colors.textPrimary}>
            {isSettled
              ? 'All Settled Up'
              : isReduced
                ? 'Optimization Complete'
                : 'Settlement Ready'}
          </Text>

          {isReduced && plan && plan.transferReductionPercentage > 0 && (
            <StatusBadge
              label={`${plan.transferReductionPercentage}% FEWER TRANSFERS`}
              variant="positive"
              size="small"
              style={styles.pillBadge}
            />
          )}
        </View>

        {/* 5. Dynamic Metrics: Only strike through if reduction actually happened */}
        {!isSettled && (
          <View style={styles.metricsHero}>
            {isReduced ? (
              <>
                <Text
                  variant="title"
                  weight="bold"
                  color={theme.colors.textMuted}
                  style={styles.strikethroughText}
                >
                  {origCount} obligations
                </Text>
                <Text variant="displayHero" weight="bold" style={styles.paymentsCountText}>
                  {optCount} payment{optCount > 1 ? 's' : ''}
                </Text>
              </>
            ) : (
              <View style={styles.neutralObligationsRow}>
                <Text variant="displayHero" weight="bold" style={styles.paymentsCountText}>
                  {optCount} payment{optCount > 1 ? 's' : ''}
                </Text>
                <Text variant="bodySecondary" color={theme.colors.textMuted}>
                  Direct resolution for {origCount} obligation{origCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />

        {/* 6. Section Header: Optimized Payment Path */}
        <Text variant="title" weight="bold" style={styles.sectionHeading}>
          Optimized Payment Path
        </Text>

        {transfers.length === 0 ? (
          <EmptyState
            title="All Settled Up"
            description={`Everyone in ${group.name} is completely settled. No payments are needed.`}
            actionLabel="View Groups"
            onAction={() => router.push('/groups' as any)}
          />
        ) : (
          <View style={styles.pathCardStack}>
            {/* Every single payment rendered with the unified SettlementPathCard */}
            {displayedTransfers.map((t, idx) => {
              const expKey = `${t.fromUserId}_${t.toUserId}`;
              const explanation = explanations[expKey]?.rationale;
              const debtor = getUserName(t.fromUserId);
              const creditor = getUserName(t.toUserId);

              return (
                <SettlementPathCard
                  key={`${t.fromUserId}_${t.toUserId}_${idx}`}
                  debtorName={debtor}
                  creditorName={creditor}
                  amountMinor={t.amountMinor}
                  currency={group.currency}
                  isDirectPath={true}
                  explanationQuestion={
                    debtor === 'You'
                      ? `Why am I paying ${creditor}?`
                      : `Why is ${debtor} paying ${creditor}?`
                  }
                  explanationAnswer={
                    explanation ||
                    `This payment resolves net group obligations between ${debtor} and ${creditor} in the minimum number of transactions.`
                  }
                />
              );
            })}

            {/* View More Payments CTA when multiple payments exist */}
            {transfers.length > 3 && !showAllPayments && (
              <Pressable onPress={() => setShowAllPayments(true)} style={styles.viewMoreBtn}>
                <Text
                  variant="caption"
                  weight="bold"
                  color={theme.colors.textSecondary}
                  style={styles.viewMoreText}
                >
                  VIEW {transfers.length - 3} MORE PAYMENT
                  {transfers.length - 3 > 1 ? 'S' : ''}
                </Text>
              </Pressable>
            )}
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
    gap: 10,
  },
  superTitle: {
    letterSpacing: 0.8,
    marginTop: 4,
  },
  groupNameHeading: {
    fontSize: 32,
    lineHeight: 38,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  pillBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metricsHero: {
    gap: 2,
    marginVertical: 4,
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    fontSize: 20,
  },
  paymentsCountText: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 54,
  },
  neutralObligationsRow: {
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  sectionHeading: {
    fontSize: 18,
    marginBottom: 4,
  },
  pathCardStack: {
    gap: 12,
  },
  viewMoreBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  viewMoreText: {
    letterSpacing: 0.5,
  },
});
