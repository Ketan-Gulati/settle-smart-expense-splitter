import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert, RefreshControl, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, DetailHeader, Avatar, MoneyDisplay, Surface, Button, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { ExpenseDTO, UserDTO, ExpenseCommentDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);
  const dataVersion = useAppStore((s) => s.dataVersion);

  const [expense, setExpense] = useState<ExpenseDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [comments, setComments] = useState<ExpenseCommentDTO[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
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
      const [user, exp, cmts] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getExpenseDetails(id),
        SettleApiService.getExpenseComments(id).catch(() => []),
      ]);
      setCurrentUser(user);
      setExpense(exp);
      setComments(cmts);
    } catch (err) {
      console.error('Failed to load expense details from backend:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const handleSendComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !id || submittingComment) return;

    try {
      setSubmittingComment(true);
      const newCmt = await SettleApiService.addExpenseComment(id, trimmed);
      setComments((prev) => [...prev, newCmt]);
      setCommentText('');
      notifyDataChanged();
    } catch (err: any) {
      Alert.alert('Failed to post comment', err?.message || 'Network error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!id) return;
    try {
      await SettleApiService.deleteExpenseComment(id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      notifyDataChanged();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to delete comment');
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

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

        {/* 8. Expense Comments & Discussion Thread */}
        <Surface variant="card" style={styles.commentsContainer}>
          <View style={styles.commentsHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="chatbubble-outline" size={18} color={theme.colors.primary} />
              <Text variant="headline" weight="bold">
                Discussion & Notes
              </Text>
            </View>
            <Text variant="caption" color={theme.colors.textMuted}>
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </Text>
          </View>

          {/* Comment List */}
          {comments.length === 0 ? (
            <View style={styles.emptyCommentsBox}>
              <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center' }}>
                No comments yet. Have a question about this bill? Leave a note below.
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((cmt) => {
                const isAuthor = currentUser?.id === cmt.userId;

                return (
                  <View key={cmt.id} style={styles.commentItem}>
                    <Avatar name={cmt.userName} size="small" />
                    <View style={styles.commentBody}>
                      <View style={styles.commentMetaRow}>
                        <Text variant="caption" weight="bold" color={theme.colors.textPrimary}>
                          {isAuthor ? 'You' : cmt.userName}
                        </Text>
                        <Text variant="caption" color={theme.colors.textMuted} style={{ fontSize: 10 }}>
                          {new Date(cmt.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </Text>
                      </View>

                      <Text variant="body" style={styles.commentText}>
                        {cmt.content}
                      </Text>
                    </View>

                    {isAuthor && (
                      <Pressable
                        onPress={() => handleDeleteComment(cmt.id)}
                        style={styles.deleteCommentBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="trash-outline" size={13} color={theme.colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* New Comment Input Field */}
          <View style={[styles.commentInputRow, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment or question..."
              placeholderTextColor={theme.colors.textMuted}
              style={[styles.commentTextInput, { color: theme.colors.textPrimary }]}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSendComment}
              disabled={submittingComment || !commentText.trim()}
              style={[
                styles.sendCommentBtn,
                {
                  backgroundColor: commentText.trim() ? theme.colors.primary : 'transparent',
                },
              ]}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon
                  name="arrow-forward-outline"
                  size={16}
                  color={commentText.trim() ? '#FFFFFF' : theme.colors.textMuted}
                />
              )}
            </Pressable>
          </View>
        </Surface>

        {/* 9. Edit & Delete Actions / Request Edit Access */}
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
  commentsContainer: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  commentsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyCommentsBox: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentBody: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteCommentBtn: {
    padding: 4,
    marginTop: 6,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
    marginTop: 6,
  },
  commentTextInput: {
    flex: 1,
    fontSize: 13,
    maxHeight: 80,
    paddingVertical: 4,
  },
  sendCommentBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
