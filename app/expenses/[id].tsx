import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, DetailHeader, Avatar, MoneyDisplay, Surface, Button, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { ExpenseDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [expense, setExpense] = useState<ExpenseDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const isCreatorOrEditor =
    currentUser &&
    expense &&
    (expense.createdByUserId === currentUser.id ||
      expense.paidByUserId === currentUser.id ||
      expense.allowedEditorIds?.includes(currentUser.id));

  const handleRequestEditAccess = async () => {
    if (!expense) return;
    try {
      setRequestingAccess(true);
      await SettleApiService.requestEditAccess(expense.id);
      setRequestSent(true);
      Alert.alert('Request Sent', 'A notification has been sent to the creator for edit approval.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send edit request');
    } finally {
      setRequestingAccess(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [user, exp] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getExpenseDetails(id),
      ]);
      setCurrentUser(user);
      setExpense(exp);
    } catch (err) {
      console.error('Failed to load expense details from backend:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading || !expense) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const payerName = expense.paidByUserId === currentUser?.id ? 'You' : expense.paidByUserName;

  const handleDelete = async () => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await SettleApiService.deleteExpense(expense.id);
            notifyDataChanged();
            router.back();
          } catch (err: any) {
            console.error('Failed to delete expense:', err);
            Alert.alert('Error', err.message || 'Failed to delete expense');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader title="Expense Details" onBackPress={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 1. Category / Group context badge */}
        <View style={styles.groupBadgeContainer}>
          <Pressable
            onPress={() => router.push(`/groups/${expense.groupId}` as any)}
            style={[styles.groupBadge, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}
          >
            <Icon name="people-outline" size={14} color={theme.colors.textSecondary} style={{ marginRight: 6 }} />
            <Text variant="caption" weight="bold" color={theme.colors.textPrimary} style={{ fontSize: 13 }}>
              {expense.groupName}
            </Text>
          </Pressable>

          {/* Category Badge */}
          {expense.category && (
            <View style={[styles.categoryBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.25)' }]}>
              <Icon
                name={
                  expense.category.toLowerCase().includes('food') || expense.category.toLowerCase().includes('dining')
                    ? 'restaurant-outline'
                    : expense.category.toLowerCase().includes('travel') || expense.category.toLowerCase().includes('taxi') || expense.category.toLowerCase().includes('transport')
                    ? 'car-outline'
                    : expense.category.toLowerCase().includes('flight') || expense.category.toLowerCase().includes('trip')
                    ? 'airplane-outline'
                    : expense.category.toLowerCase().includes('hotel') || expense.category.toLowerCase().includes('stay')
                    ? 'bed-outline'
                    : expense.category.toLowerCase().includes('grocer') || expense.category.toLowerCase().includes('shopping')
                    ? 'cart-outline'
                    : expense.category.toLowerCase().includes('movie') || expense.category.toLowerCase().includes('entertainment')
                    ? 'film-outline'
                    : 'receipt-outline'
                }
                size={13}
                color="#38BDF8"
                style={{ marginRight: 5 }}
              />
              <Text variant="caption" weight="bold" color="#38BDF8" style={{ fontSize: 12, textTransform: 'capitalize' }}>
                {expense.category}
              </Text>
            </View>
          )}
        </View>

        {/* 2. Hero Amount & Description */}
        <View style={styles.heroSection}>
          <Text variant="displayHero" weight="bold" style={styles.heroAmount}>
            ₹{(expense.amountMinor / 100).toLocaleString('en-IN')}
          </Text>

          {/* Multi-Currency Foreign Amount & Exchange Rate Badge */}
          {expense.originalCurrency && expense.originalAmountMinor && (
            <View style={[styles.foreignCurrencyBadge, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
              <Text variant="caption" weight="bold" color={theme.colors.primary}>
                {expense.originalCurrency} {(expense.originalAmountMinor / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text variant="caption" color={theme.colors.textMuted} style={{ fontSize: 11 }}>
                • Converted @ 1 {expense.originalCurrency} = ₹{expense.exchangeRate ? Number(expense.exchangeRate).toFixed(2) : ''} INR
              </Text>
            </View>
          )}

          <Text variant="headline" weight="bold" style={styles.descriptionText}>
            {expense.description}
          </Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            Added on {new Date(expense.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} at {new Date(expense.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </Text>
        </View>

        {/* 3. Paid by Card */}
        <Surface variant="card" style={styles.infoCard}>
          <View style={styles.row}>
            <Avatar name={payerName} size="medium" />
            <View style={styles.rowText}>
              <Text variant="caption" color={theme.colors.textMuted}>
                PAID BY
              </Text>
              <Text variant="body" weight="bold">
                {payerName}
              </Text>
            </View>
            <MoneyDisplay
              amountMinor={expense.amountMinor}
              currency={expense.currency}
              variant="medium"
              sentiment="neutral"
            />
          </View>
        </Surface>

        {/* 4. Split breakdown Card */}
        <Surface variant="card" style={styles.infoCard}>
          <View style={styles.splitHeaderRow}>
            <Text variant="caption" color={theme.colors.textMuted} weight="bold">
              SPLIT BREAKDOWN ({expense.splits.length} PEOPLE)
            </Text>
          </View>

          <View style={styles.splitsList}>
            {expense.splits.map((split, idx) => {
              const mName = split.userId === currentUser?.id ? 'You' : split.userName;

              return (
                <View
                  key={split.userId}
                  style={[
                    styles.splitRow,
                    idx < expense.splits.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.memberAvatarRow}>
                    <Avatar name={mName} size="small" />
                    <Text variant="body" weight="medium">
                      {mName}
                    </Text>
                  </View>
                  <MoneyDisplay
                    amountMinor={split.amountMinor}
                    currency={expense.currency}
                    variant="medium"
                    sentiment="neutral"
                  />
                </View>
              );
            })}
          </View>
        </Surface>

        {/* 5. Optional Notes */}
        {expense.notes && (
          <Surface variant="subtle" style={styles.notesCard}>
            <Text variant="caption" color={theme.colors.textMuted}>
              NOTE
            </Text>
            <Text variant="body">{expense.notes}</Text>
          </Surface>
        )}

        {/* 6. Lock Status Banner & Request Edit Access */}
        {expense.isLocked && (
          <Surface variant="subtle" style={styles.lockStatusCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 20 }}>🔒</Text>
              <View style={{ flex: 1 }}>
                <Text variant="caption" weight="bold" color={theme.colors.textPrimary}>
                  Locked Expense
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} style={{ fontSize: 11 }}>
                  {isCreatorOrEditor
                    ? 'You have edit access to this locked expense.'
                    : 'Only the creator can edit this expense. You can request edit access below.'}
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* 7. Edit & Delete Actions / Request Edit Access */}
        <View style={styles.actionsRow}>
          {(!expense.isLocked || isCreatorOrEditor) ? (
            <>
              <Button
                title="Edit Expense"
                variant="secondary"
                size="large"
                onPress={() =>
                  router.push(`/expenses/new?expenseId=${expense.id}&groupId=${expense.groupId}` as any)
                }
              />
              <Button
                title={deleting ? 'Deleting...' : 'Delete Expense'}
                variant="destructive"
                size="large"
                onPress={handleDelete}
                disabled={deleting}
              />
            </>
          ) : (
            <Button
              title={requestingAccess ? 'Requesting Access...' : requestSent ? '✓ Request Sent to Creator' : '🔒 Request Edit Access'}
              variant="primary"
              size="large"
              onPress={handleRequestEditAccess}
              disabled={requestingAccess || requestSent}
            />
          )}
        </View>
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
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  groupBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  heroSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  heroAmount: {
    fontSize: 44,
    lineHeight: 50,
  },
  descriptionText: {
    fontSize: 22,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  splitHeaderRow: {
    marginBottom: 12,
  },
  splitsList: {
    gap: 0,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  memberAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foreignCurrencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginVertical: 4,
  },
  notesCard: {
    padding: 16,
    borderRadius: 16,
    gap: 6,
  },
  lockStatusCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionsRow: {
    marginTop: 12,
    gap: 10,
  },
});
