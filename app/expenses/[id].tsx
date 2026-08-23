import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, DetailHeader, Avatar, MoneyDisplay, Surface, Button } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { expenseRepository } from '@/repositories/expenseRepository';
import { groupRepository, GroupEntity } from '@/repositories/groupRepository';
import { userRepository, UserEntity } from '@/repositories/userRepository';
import { ExpenseEntity } from '@/domain/expense/expense';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const router = useRouter();

  const [expense, setExpense] = useState<ExpenseEntity | null>(null);
  const [group, setGroup] = useState<GroupEntity | null>(null);
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const user = await userRepository.getOrCreateDefaultUser();
      setCurrentUser(user);

      const exp = await expenseRepository.findById(id);
      setExpense(exp);

      if (exp) {
        const groupData = await groupRepository.findById(exp.groupId);
        setGroup(groupData);
      }
    } catch (err) {
      console.error('Failed to load expense details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !expense || !group) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const payer = group.members?.find((m) => m.id === expense.payerId);
  const payerName = payer ? (payer.id === currentUser?.id ? 'You' : payer.name) : 'Someone';

  const handleDelete = async () => {
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await expenseRepository.delete(expense.id);
            router.back();
          } catch (err) {
            console.error('Failed to delete expense:', err);
            Alert.alert('Error', 'Failed to delete expense');
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Category / Group context badge */}
        <View style={styles.groupBadgeContainer}>
          <Pressable
            onPress={() => router.push(`/groups/${group.id}` as any)}
            style={[styles.groupBadge, { borderColor: theme.colors.borderSubtle }]}
          >
            <Text variant="caption" weight="bold" color={theme.colors.textPrimary}>
              👥 {group.name}
            </Text>
          </Pressable>
        </View>

        {/* 2. Hero Amount & Description */}
        <View style={styles.heroSection}>
          <Text variant="displayHero" weight="bold" style={styles.heroAmount}>
            ₹{(expense.amountMinor / 100).toLocaleString('en-IN')}
          </Text>
          <Text variant="headline" weight="bold" style={styles.descriptionText}>
            {expense.description}
          </Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            Added on {new Date(expense.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </Text>
        </View>

        {/* 3. Paid by Card */}
        <Surface variant="card" style={styles.infoCard}>
          <View style={styles.row}>
            <Avatar name={payer?.name || 'P'} size="medium" />
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
              const member = group.members?.find((m) => m.id === split.userId);
              const mName = member
                ? member.id === currentUser?.id
                  ? 'You'
                  : member.name
                : 'Member';

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
                    <Avatar name={member?.name || 'M'} size="small" />
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

        {/* 6. Edit & Delete Actions */}
        <View style={styles.actionsRow}>
          <Button
            title="Edit Expense"
            variant="secondary"
            size="large"
            onPress={() =>
              router.push(`/expenses/new?expenseId=${expense.id}&groupId=${group.id}` as any)
            }
          />
          <Button
            title={deleting ? 'Deleting...' : 'Delete Expense'}
            variant="destructive"
            size="large"
            onPress={handleDelete}
            disabled={deleting}
          />
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
    alignItems: 'center',
    marginTop: 8,
  },
  groupBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
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
    gap: 10,
  },
  notesCard: {
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  actionsRow: {
    marginTop: 12,
    gap: 10,
  },
});
