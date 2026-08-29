import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Modal, TextInput, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text, DetailHeader, StatusBadge, SettlementPathCard, EmptyState, Button, Surface, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';
import { getInviteBaseUrl } from '@/services/invitations/inviteUtils';

interface TransferPlanItem {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountMinor: number;
}

export default function SmartSettlementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const dataVersion = useAppStore((s) => s.dataVersion);
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [transfers, setTransfers] = useState<TransferPlanItem[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<import('@/services/api/types').ExpenseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Settlement Recording Modal State
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferPlanItem | null>(null);
  const [settlementNote, setSettlementNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Request & Smart Reminder Modal State
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [snoozedDebtors, setSnoozedDebtors] = useState<Record<string, string>>({});
  const [snoozeFeedback, setSnoozeFeedback] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

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
      const [user, groupData, groupBals, expensesData] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getGroupDetails(id),
        SettleApiService.getGroupBalances(id),
        SettleApiService.getGroupExpenses(id, 1, 100),
      ]);

      setCurrentUser(user);
      setGroup(groupData);
      setGroupExpenses(expensesData || []);

      const computedTransfers: TransferPlanItem[] = [];
      const debtors = groupBals.members.filter((m) => m.netBalanceMinor < 0).map((m) => ({ ...m }));
      const creditors = groupBals.members.filter((m) => m.netBalanceMinor > 0).map((m) => ({ ...m }));

      let dIdx = 0;
      let cIdx = 0;

      while (dIdx < debtors.length && cIdx < creditors.length) {
        const debtor = debtors[dIdx]!;
        const creditor = creditors[cIdx]!;

        const debtAmt = Math.abs(debtor.netBalanceMinor);
        const creditAmt = creditor.netBalanceMinor;
        const transferAmt = Math.min(debtAmt, creditAmt);

        if (transferAmt > 0) {
          computedTransfers.push({
            fromUserId: debtor.userId,
            fromUserName: debtor.name,
            toUserId: creditor.userId,
            toUserName: creditor.name,
            amountMinor: transferAmt,
          });

          debtor.netBalanceMinor += transferAmt;
          creditor.netBalanceMinor -= transferAmt;
        }

        if (debtor.netBalanceMinor === 0) dIdx++;
        if (creditor.netBalanceMinor === 0) cIdx++;
      }

      setTransfers(computedTransfers);
    } catch (err: any) {
      console.error('Failed to load settlement data:', err);
      setError(err?.message || 'Group not found or you are not a member of this group.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRecordSettlement = async () => {
    if (!selectedTransfer || !id) return;
    try {
      setRecording(true);
      setRecordError(null);

      await SettleApiService.recordSettlement(
        id,
        selectedTransfer.toUserId,
        selectedTransfer.amountMinor,
        settlementNote.trim() || undefined,
        selectedTransfer.fromUserId
      );

      setRecordModalVisible(false);
      setSettlementNote('');
      setSelectedTransfer(null);
      notifyDataChanged();
    } catch (err: any) {
      setRecordError(err.message || 'Failed to record settlement');
    } finally {
      setRecording(false);
    }
  };

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
        <DetailHeader title="Settlement" onBackPress={() => router.replace('/(tabs)/groups' as any)} />
        <View style={styles.errorBox}>
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

  const isSettled = transfers.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Header with back and clear Group Title */}
      <DetailHeader
        title={group.name}
        onBackPress={() => router.back()}
        rightAction={
          <Pressable onPress={() => router.push('/menu' as any)}>
            <Text style={{ fontSize: 20 }}>☰</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Compact Hero Card */}
        <Surface variant="elevated" style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ gap: 2 }}>
              <Text variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.superTitle}>
                OPTIMIZED SETTLEMENT
              </Text>
              <Text variant="title" weight="bold" color={theme.colors.textPrimary}>
                {isSettled ? 'All Settled Up' : 'Settlement Ready'}
              </Text>
            </View>

            {!isSettled && (
              <StatusBadge
                label="OPTIMAL PATH"
                variant="positive"
                size="small"
                style={styles.pillBadge}
              />
            )}
          </View>

          {!isSettled && (
            <View style={styles.metricsRow}>
              <Text variant="headline" weight="bold" color={theme.colors.primary}>
                {transfers.length} direct payment{transfers.length > 1 ? 's' : ''}
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                settles all group balances with zero round-trips
              </Text>
            </View>
          )}
        </Surface>

        {/* Section Header: Optimized Payment Path */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
            Payment Path
          </Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            {transfers.length} transfer{transfers.length > 1 ? 's' : ''}
          </Text>
        </View>

        {isSettled ? (
          <EmptyState
            title="All Settled Up"
            description={`Everyone in ${group.name} is completely settled. No payments are needed.`}
            actionLabel="View Groups"
            onAction={() => router.push('/groups' as any)}
          />
        ) : (
          <View style={styles.pathCardStack}>
            {transfers.map((t, idx) => {
              const isDebtorUser = currentUser?.id === t.fromUserId;
              const isCreditorUser = currentUser?.id === t.toUserId;

              const debtorName = isDebtorUser ? 'You' : t.fromUserName;
              const creditorName = isCreditorUser ? 'You' : t.toUserName;

              // Derive complete bilateral expense breakdown:
              // 1. What debtor owes creditor (creditor paid, debtor shared) => OWED (+)
              // 2. What creditor owes debtor (debtor paid, creditor shared) => BORROWED (-)
              const breakdownItems: Array<{
                description: string;
                amountMinor: number;
                type: 'OWED' | 'BORROWED';
              }> = [];

              for (const exp of groupExpenses) {
                if (exp.paidByUserId === t.toUserId) {
                  const debtorSplit = exp.splits?.find((s) => s.userId === t.fromUserId);
                  if (debtorSplit && debtorSplit.amountMinor > 0) {
                    breakdownItems.push({
                      description: exp.description,
                      amountMinor: debtorSplit.amountMinor,
                      type: 'OWED',
                    });
                  }
                } else if (exp.paidByUserId === t.fromUserId) {
                  const creditorSplit = exp.splits?.find((s) => s.userId === t.toUserId);
                  if (creditorSplit && creditorSplit.amountMinor > 0) {
                    breakdownItems.push({
                      description: `${exp.description} (credit/you borrowed)`,
                      amountMinor: creditorSplit.amountMinor,
                      type: 'BORROWED',
                    });
                  }
                }
              }

              const isDebtorSnoozed = !!snoozedDebtors[t.fromUserId];

              return (
                <SettlementPathCard
                  key={`${t.fromUserId}_${t.toUserId}_${idx}`}
                  debtorName={debtorName}
                  creditorName={creditorName}
                  amountMinor={t.amountMinor}
                  currency={group.currency}
                  isDirectPath={true}
                  isCurrentUserDebtor={isDebtorUser}
                  isCurrentUserCreditor={isCreditorUser}
                  onSettlePress={() => {
                    setSelectedTransfer(t);
                    setRecordModalVisible(true);
                  }}
                  onRequestPress={() => {
                    setSelectedTransfer(t);
                    setRequestModalVisible(true);
                  }}
                  explanationQuestion={
                    isDebtorSnoozed
                      ? `⏰ Reminder snoozed (${snoozedDebtors[t.fromUserId]}). Why is ${debtorName} paying ${creditorName}?`
                      : `Why is ${debtorName} paying ${creditorName} ₹${(t.amountMinor / 100).toFixed(2)}?`
                  }
                  breakdownItems={breakdownItems.length > 0 ? breakdownItems : undefined}
                  explanationAnswer={`This optimized single payment directly clears ${debtorName}'s calculated net share across all group expenses.`}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Smart Reminder & Request Modal */}
      <Modal visible={requestModalVisible} animationType="slide" transparent onRequestClose={() => setRequestModalVisible(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setRequestModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <Text variant="headline" weight="bold">
                Remind {selectedTransfer ? selectedTransfer.fromUserName : ''}
              </Text>
              <Pressable onPress={() => setRequestModalVisible(false)}>
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {selectedTransfer && (
              <Text variant="body" color={theme.colors.textSecondary}>
                {group.name} is ready to settle. {selectedTransfer.fromUserName} owes you ₹{(selectedTransfer.amountMinor / 100).toFixed(2)}.
              </Text>
            )}

            {snoozeFeedback && (
              <View style={[styles.copiedAlert, { backgroundColor: 'rgba(2, 132, 199, 0.15)' }]}>
                <Text variant="caption" weight="bold" color={theme.colors.primary}>
                  {snoozeFeedback}
                </Text>
              </View>
            )}

            <View style={styles.requestOptionsStack}>
              {/* Option 1: Send Polite Reminder via WhatsApp with WhatsApp Vector SVG */}
              <Pressable
                onPress={async () => {
                  if (!selectedTransfer) return;
                  const amt = (selectedTransfer.amountMinor / 100).toFixed(2);
                  const creator = currentUser?.name || 'You';
                  const msg = `Hey ${selectedTransfer.fromUserName}, ${group.name} expenses are settled.\n\nYou owe ${creator} ₹${amt}.\n\n👉 Open Settle to view & pay:\n${getInviteBaseUrl()}/groups/${group.id}/settle`;
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                  if (typeof window !== 'undefined') {
                    window.open(whatsappUrl, '_blank');
                  } else {
                    const { Linking } = await import('react-native');
                    Linking.openURL(whatsappUrl);
                  }
                }}
                style={[styles.requestOptionCard, { borderColor: '#25D366', backgroundColor: 'rgba(37, 211, 102, 0.08)' }]}
              >
                <View style={[styles.optionIconPill, { backgroundColor: '#25D366' }]}>
                  <Icon name="logo-whatsapp" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                    Remind on WhatsApp
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Friendly & polite with direct Settle breakdown link
                  </Text>
                </View>
                <Icon name="arrow-back" size={16} color="#25D366" style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>

              {/* Option 2: Send In-App Notification Reminder */}
              <Pressable
                disabled={sendingReminder}
                onPress={async () => {
                  if (!selectedTransfer) return;
                  try {
                    setSendingReminder(true);
                    // Compute duration text based on group created date or expenses
                    const groupCreated = new Date(group.createdAt);
                    const now = new Date();
                    const diffDays = Math.max(1, Math.floor((now.getTime() - groupCreated.getTime()) / (1000 * 60 * 60 * 24)));
                    const durationText = diffDays === 1 ? '1 day' : `${diffDays} days`;

                    // Derive top expense descriptions between these two members
                    const sharedExps = groupExpenses.filter(
                      (e) => (e.paidByUserId === selectedTransfer.toUserId && e.splits?.some((s) => s.userId === selectedTransfer.fromUserId))
                    );
                    let expenseSummary = '';
                    if (sharedExps.length === 1 && sharedExps[0]?.description) {
                      expenseSummary = sharedExps[0].description;
                    } else if (sharedExps.length === 2 && sharedExps[0]?.description && sharedExps[1]?.description) {
                      expenseSummary = `${sharedExps[0].description} & ${sharedExps[1].description}`;
                    } else if (sharedExps.length > 2 && sharedExps[0]?.description) {
                      expenseSummary = `${sharedExps[0].description} & ${sharedExps.length - 1} other expenses`;
                    }

                    await SettleApiService.sendPaymentReminder({
                      recipientUserId: selectedTransfer.fromUserId,
                      groupId: group.id,
                      groupName: group.name,
                      amountMinor: selectedTransfer.amountMinor,
                      durationText,
                      expenseSummary: expenseSummary || undefined,
                    });
                    setSnoozeFeedback(`✓ Payment reminder sent to ${selectedTransfer.fromUserName}'s notifications!`);
                    setTimeout(() => {
                      setSnoozeFeedback(null);
                      setRequestModalVisible(false);
                    }, 2200);
                  } catch (e: any) {
                    setSnoozeFeedback(e?.message || 'Failed to dispatch notification');
                  } finally {
                    setSendingReminder(false);
                  }
                }}
                style={[styles.requestOptionCard, { borderColor: theme.colors.primary, backgroundColor: 'rgba(2, 132, 199, 0.08)' }]}
              >
                <View style={[styles.optionIconPill, { backgroundColor: theme.colors.primary }]}>
                  <Icon name="bell" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
                    Send In-App Reminder
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Alerts them in Notifications with 1-tap UPI payment
                  </Text>
                </View>
                {sendingReminder ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Icon name="arrow-back" size={16} color={theme.colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                )}
              </Pressable>
            </View>

            {/* Smart Non-Annoying Controls: Snooze & Remind Later */}
            <View style={styles.snoozeActionsRow}>
              <Pressable
                onPress={() => {
                  if (!selectedTransfer) return;
                  setSnoozedDebtors((prev) => ({
                    ...prev,
                    [selectedTransfer.fromUserId]: '3 days',
                  }));
                  setSnoozeFeedback(`Snoozed reminder for ${selectedTransfer.fromUserName} for 3 days.`);
                  setTimeout(() => {
                    setSnoozeFeedback(null);
                    setRequestModalVisible(false);
                  }, 1800);
                }}
                style={[styles.snoozeBtn, { borderColor: theme.colors.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="time-outline" size={16} color={theme.colors.textSecondary} />
                  <Text variant="caption" weight="medium" color={theme.colors.textSecondary}>
                    Snooze (3 days)
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!selectedTransfer) return;
                  setSnoozedDebtors((prev) => ({
                    ...prev,
                    [selectedTransfer.fromUserId]: 'next week',
                  }));
                  setSnoozeFeedback(`Reminding ${selectedTransfer.fromUserName} next week.`);
                  setTimeout(() => {
                    setSnoozeFeedback(null);
                    setRequestModalVisible(false);
                  }, 1800);
                }}
                style={[styles.snoozeBtn, { borderColor: theme.colors.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="time-outline" size={16} color={theme.colors.textSecondary} />
                  <Text variant="caption" weight="medium" color={theme.colors.textSecondary}>
                    Remind Later
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Reconciliation Option */}
            <View style={[styles.reconcileBox, { backgroundColor: theme.colors.surfaceSubtle }]}>
              <Text variant="caption" color={theme.colors.textSecondary}>
                Already received the payment?
              </Text>
              <Pressable
                onPress={() => {
                  setRequestModalVisible(false);
                  setRecordModalVisible(true);
                }}
              >
                <Text variant="caption" weight="bold" color={theme.colors.primary}>
                  Mark Payment as Received ✓
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Record Settlement Modal */}
      <Modal visible={recordModalVisible} animationType="slide" transparent onRequestClose={() => setRecordModalVisible(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setRecordModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text variant="headline" style={styles.modalTitle}>
              Record Payment
            </Text>
            {selectedTransfer && (
              <Text variant="body" color={theme.colors.textSecondary} style={{ marginBottom: 12 }}>
                {currentUser?.id === selectedTransfer.toUserId
                  ? `Confirming ₹${(selectedTransfer.amountMinor / 100).toFixed(2)} received from ${selectedTransfer.fromUserName}.`
                  : `Confirming payment of ₹${(selectedTransfer.amountMinor / 100).toFixed(2)} to ${selectedTransfer.toUserName}.`}
              </Text>
            )}

            <TextInput
              placeholder="Payment Note (e.g. UPI Ref #, Cash)"
              placeholderTextColor={theme.colors.textMuted}
              value={settlementNote}
              onChangeText={setSettlementNote}
              style={[
                styles.noteInput,
                { borderColor: theme.colors.borderSubtle, color: theme.colors.textPrimary },
              ]}
            />

            {recordError && (
              <Text variant="caption" color={theme.colors.negative} style={{ marginTop: 8 }}>
                {recordError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="subtle"
                size="medium"
                onPress={() => {
                  setRecordModalVisible(false);
                  setRecordError(null);
                }}
                disabled={recording}
              />
              <Button
                title={recording ? 'Recording...' : 'Confirm Settle'}
                variant="primary"
                size="medium"
                onPress={handleRecordSettlement}
                loading={recording}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.2)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  superTitle: {
    letterSpacing: 0.8,
    fontSize: 11,
  },
  pillBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  metricsRow: {
    gap: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  pathCardStack: {
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  errorBox: {
    padding: 24,
    marginTop: 40,
  },
  copiedAlert: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestOptionsStack: {
    gap: 10,
    marginVertical: 6,
  },
  requestOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  optionIconPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconcileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  snoozeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  snoozeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
