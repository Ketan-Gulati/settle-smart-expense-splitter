import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text, DetailHeader, StatusBadge, SettlementPathCard, EmptyState, Button } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

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
  const [loading, setLoading] = useState(true);

  // Settlement Recording Modal State
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferPlanItem | null>(null);
  const [settlementNote, setSettlementNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

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
      const [user, groupData, groupBals] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getGroupDetails(id),
        SettleApiService.getGroupBalances(id),
      ]);

      setCurrentUser(user);
      setGroup(groupData);

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
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  const handleRecordSettlement = async () => {
    if (!selectedTransfer || !id) return;
    try {
      setRecording(true);
      setRecordError(null);

      await SettleApiService.recordSettlement(
        id,
        selectedTransfer.toUserId,
        selectedTransfer.amountMinor,
        settlementNote.trim() || undefined
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
            {isSettled ? 'All Settled Up' : 'Settlement Ready'}
          </Text>

          {!isSettled && (
            <StatusBadge
              label="OPTIMAL PATH"
              variant="positive"
              size="small"
              style={styles.pillBadge}
            />
          )}
        </View>

        {/* 5. Dynamic Metrics */}
        {!isSettled && (
          <View style={styles.metricsHero}>
            <Text variant="displayHero" weight="bold" style={styles.paymentsCountText}>
              {transfers.length} payment{transfers.length > 1 ? 's' : ''}
            </Text>
            <Text variant="bodySecondary" color={theme.colors.textMuted}>
              Direct resolution to settle all group balances
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* 6. Section Header: Optimized Payment Path */}
        <Text variant="title" weight="bold" style={styles.sectionHeading}>
          Optimized Payment Path
        </Text>

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
                  explanationQuestion={
                    isDebtorUser
                      ? `How does this settle your share with ${creditorName}?`
                      : `Why is ${debtorName} transferring to ${creditorName}?`
                  }
                  explanationAnswer={`This optimized direct payment of ₹${(t.amountMinor / 100).toFixed(2)} directly zeroes out ${debtorName}'s net obligation to ${creditorName}.`}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Record Settlement Modal */}
      <Modal visible={recordModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headline" style={styles.modalTitle}>
              Record Payment
            </Text>
            {selectedTransfer && (
              <Text variant="body" color={theme.colors.textSecondary} style={{ marginBottom: 12 }}>
                Confirming payment of ₹{(selectedTransfer.amountMinor / 100).toFixed(2)} to {selectedTransfer.toUserName}.
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
          </View>
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
  paymentsCountText: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 54,
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
});
