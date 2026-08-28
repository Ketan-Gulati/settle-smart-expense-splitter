import { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Avatar, NumericKeypad } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function NewOrEditExpenseScreen() {
  const { groupId: initialGroupId, expenseId } = useLocalSearchParams<{
    groupId?: string;
    expenseId?: string;
  }>();
  const theme = useAppTheme();
  const router = useRouter();
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [groups, setGroups] = useState<GroupDTO[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || '');
  const [currentGroup, setCurrentGroup] = useState<GroupDTO | null>(null);
  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [payerId, setPayerId] = useState<string>('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL');

  // Custom split values
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  // Modals for editing Group, Payer and Split
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [payerModalVisible, setPayerModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [user, allGroups] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getGroups(),
      ]);
      setCurrentUser(user);
      setGroups(allGroups);

      if (expenseId) {
        // Edit Mode: load existing expense data from backend
        const existingExp = await SettleApiService.getExpenseDetails(expenseId);
        if (existingExp) {
          setSelectedGroupId(existingExp.groupId);
          const groupData = await SettleApiService.getGroupDetails(existingExp.groupId);
          setCurrentGroup(groupData);
          setDescription(existingExp.description);
          setAmountStr((existingExp.amountMinor / 100).toString());
          setPayerId(existingExp.paidByUserId);
          setSelectedParticipantIds(existingExp.splits.map((s) => s.userId));
          if (existingExp.splitMethod) {
            setSplitMethod(existingExp.splitMethod as any);
          }
          const exactMap: Record<string, string> = {};
          for (const s of existingExp.splits) {
            exactMap[s.userId] = (s.amountMinor / 100).toString();
          }
          setExactAmounts(exactMap);
        }
      } else if (initialGroupId) {
        setSelectedGroupId(initialGroupId);
        const groupData = await SettleApiService.getGroupDetails(initialGroupId);
        setCurrentGroup(groupData);
        if (groupData?.members && groupData.members.length > 0) {
          setPayerId(user.id);
          setSelectedParticipantIds(groupData.members.map((m) => m.userId));
        }
      } else {
        setSelectedGroupId('');
        setCurrentGroup(null);
        setPayerId(user.id);
        setSelectedParticipantIds([]);
      }
    } catch (err) {
      console.error('Failed to load expense dependencies:', err);
    } finally {
      setLoading(false);
    }
  }, [initialGroupId, expenseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectGroup = async (gId: string) => {
    setSelectedGroupId(gId);
    setGroupModalVisible(false);
    const groupData = await SettleApiService.getGroupDetails(gId);
    setCurrentGroup(groupData);
    if (groupData?.members && groupData.members.length > 0) {
      if (currentUser) setPayerId(currentUser.id);
      setSelectedParticipantIds(groupData.members.map((m) => m.userId));
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="title" align="center">
          No groups found.
        </Text>
        <Text
          variant="caption"
          color={theme.colors.textMuted}
          align="center"
          style={{ marginTop: 8 }}
        >
          Please create a group first before adding expenses.
        </Text>
        <Pressable
          onPress={() => router.push('/groups' as any)}
          style={[
            styles.modalDoneBtn,
            { backgroundColor: theme.colors.primary, marginTop: 16, paddingHorizontal: 20 },
          ]}
        >
          <Text color={theme.colors.primaryForeground} weight="bold">
            Go to Groups
          </Text>
        </Pressable>
      </View>
    );
  }

  const handleKeyPress = (key: string) => {
    if (key === '.' && amountStr.includes('.')) return;
    const parts = amountStr.split('.');
    if (parts.length > 1 && parts[1] && parts[1].length >= 2) return;
    setAmountStr((prev) => prev + key);
  };

  const handleDelete = () => {
    setAmountStr((prev) => prev.slice(0, -1));
  };

  const rawAmount = parseFloat(amountStr) || 0;
  const amountMinor = Math.round(rawAmount * 100);

  const getPayerName = () => {
    if (currentUser && payerId === currentUser.id) return 'You';
    return currentGroup?.members?.find((m) => m.userId === payerId)?.name || 'Someone';
  };

  const perPersonAmountMinor =
    selectedParticipantIds.length > 0 ? Math.round(amountMinor / selectedParticipantIds.length) : 0;

  const handleSave = async () => {
    if (!description.trim()) {
      setError('Please enter a description for the expense.');
      return;
    }
    if (!selectedGroupId) {
      setError('Please select a group.');
      return;
    }
    if (amountMinor <= 0) {
      setError('Please enter an amount greater than 0.');
      return;
    }
    if (!payerId) {
      setError('Please select who paid.');
      return;
    }
    if (selectedParticipantIds.length === 0) {
      setError('Please select at least one person to split with.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const participantsPayload = selectedParticipantIds.map((userId) => {
        const item: { userId: string; amountMinor?: number; percentage?: number; shares?: number } = { userId };
        if (splitMethod === 'EXACT') {
          item.amountMinor = Math.round((parseFloat(exactAmounts[userId] || '0') || 0) * 100);
        } else if (splitMethod === 'PERCENTAGE') {
          item.percentage = parseFloat(percentages[userId] || '0') || 0;
        } else if (splitMethod === 'SHARES') {
          item.shares = Math.max(1, parseInt(shares[userId] || '1', 10));
        }
        return item;
      });

      if (expenseId) {
        await SettleApiService.updateExpense(expenseId, {
          description: description.trim(),
          amountMinor,
          paidByUserId: payerId,
          splitMethod,
          participants: participantsPayload,
        });
      } else {
        await SettleApiService.createExpense({
          groupId: selectedGroupId,
          description: description.trim(),
          amountMinor,
          paidByUserId: payerId,
          splitMethod,
          participants: participantsPayload,
        });
      }

      notifyDataChanged();
      if (router.canGoBack()) {
        router.back();
      } else if (selectedGroupId) {
        router.replace(`/groups/${selectedGroupId}` as any);
      } else {
        router.replace('/(tabs)/groups' as any);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (selectedGroupId) {
      router.replace(`/groups/${selectedGroupId}` as any);
    } else {
      router.replace('/(tabs)/groups' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 1. Header Bar: Close (X) + Centered Title */}
      <View style={styles.topHeader}>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Text variant="headline" weight="bold">
          {expenseId ? 'Edit Expense' : 'Add Expense'}
        </Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 2. Group Selector Pill */}
        <View style={styles.contextRow}>
          <Pressable
            onPress={() => setGroupModalVisible(true)}
            style={[
              styles.groupSelectorPill,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceSubtle,
              },
            ]}
          >
            <Text variant="bodySecondary" color={theme.colors.textPrimary} weight="bold">
              👥 {currentGroup?.name || 'Select Group'} ▼
            </Text>
          </Pressable>
        </View>

        {/* 3. Description Input */}
        <View style={styles.descInputContainer}>
          <TextInput
            placeholder="e.g. Dinner, Groceries, Uber, Hotel..."
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            style={[
              styles.descTextInput,
              {
                color: theme.colors.textPrimary,
                borderColor: theme.colors.borderSubtle,
                backgroundColor: theme.colors.surface,
              },
            ]}
          />
        </View>

        {/* 4. Hero Amount Display */}
        <View style={styles.heroAmountSection}>
          <Text style={[styles.currencySymbol, { color: theme.colors.textPrimary }]}>₹</Text>
          <Text style={[styles.amountValueText, { color: theme.colors.textPrimary }]}>
            {amountStr ? Number(amountStr).toLocaleString('en-IN') : '0'}
          </Text>
        </View>

        {/* 5. Paid By Row Card */}
        <Pressable
          onPress={() => setPayerModalVisible(true)}
          style={[styles.actionRowCard, { borderColor: theme.colors.borderSubtle }]}
        >
          <View style={styles.payerAvatarInitial}>
            <Text variant="title" weight="bold">
              {getPayerName().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.actionCardDetails}>
            <Text variant="body" weight="semibold">
              Paid by {getPayerName()}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              ₹{(amountMinor / 100).toLocaleString('en-IN')}
            </Text>
          </View>
          <Text variant="bodySecondary" color={theme.colors.textSecondary} weight="medium">
            Edit
          </Text>
        </Pressable>

        {/* 6. Split Summary Row Card */}
        <Pressable
          onPress={() => setSplitModalVisible(true)}
          style={[styles.actionRowCard, { borderColor: theme.colors.borderSubtle }]}
        >
          <View style={styles.avatarStackMini}>
            {selectedParticipantIds.slice(0, 3).map((id, idx) => {
              const m = currentGroup?.members?.find((mem) => mem.userId === id);
              return (
                <View
                  key={id}
                  style={[
                    styles.miniAvatar,
                    {
                      marginLeft: idx === 0 ? 0 : -8,
                      backgroundColor: idx === 0 ? '#E2E8F0' : idx === 1 ? '#FEF3C7' : '#DBEAFE',
                    },
                  ]}
                >
                  <Text variant="caption" weight="bold">
                    {m?.name.charAt(0).toUpperCase() || 'M'}
                  </Text>
                </View>
              );
            })}
            {selectedParticipantIds.length > 3 && (
              <View style={[styles.miniAvatar, { marginLeft: -8, backgroundColor: '#E2E8F0' }]}>
                <Text variant="caption" weight="bold">
                  +{selectedParticipantIds.length - 3}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionCardDetails}>
            <Text variant="body" weight="semibold">
              Split {splitMethod.charAt(0).toUpperCase() + splitMethod.slice(1).toLowerCase()}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              {selectedParticipantIds.length} people · ₹
              {(perPersonAmountMinor / 100).toLocaleString('en-IN')} each
            </Text>
          </View>
          <Text variant="bodySecondary" color={theme.colors.textSecondary} weight="medium">
            Edit
          </Text>
        </Pressable>

        {error && (
          <Text variant="caption" color={theme.colors.negative} align="center">
            {error}
          </Text>
        )}

        {/* 7. Keypad strictly integrated */}
        <View style={styles.keypadWrapper}>
          <NumericKeypad onKeyPress={handleKeyPress} onDelete={handleDelete} />
        </View>

        {/* 8. Save Expense CTA */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveExpenseBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
            {saving ? 'Saving...' : expenseId ? 'Update Expense ✓' : 'Save Expense ✓'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Group Selector Modal */}
      <Modal visible={groupModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headline" weight="bold" style={styles.modalTitle}>
              Select Group
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => handleSelectGroup(g.id)}
                  style={[
                    styles.groupModalItem,
                    g.id === selectedGroupId && { backgroundColor: theme.colors.surfaceSubtle },
                  ]}
                >
                  <Avatar name={g.name} size="medium" />
                  <Text
                    variant="body"
                    weight={g.id === selectedGroupId ? 'bold' : 'medium'}
                    color={theme.colors.textPrimary}
                    style={{ flex: 1 }}
                  >
                    {g.name}
                  </Text>
                  {g.id === selectedGroupId && (
                    <Text variant="body" weight="bold" color={theme.colors.primary}>
                      ✓
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payer Modal */}
      <Modal visible={payerModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headline" weight="bold" style={styles.modalTitle}>
              Who paid?
            </Text>
            {currentGroup?.members?.map((m) => (
              <Pressable
                key={m.userId}
                onPress={() => {
                  setPayerId(m.userId);
                  setPayerModalVisible(false);
                }}
                style={styles.modalOptionRow}
              >
                <Avatar name={m.name} size="medium" />
                <Text variant="body" weight="medium">
                  {m.name} {m.userId === currentUser?.id ? '(You)' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* Split Modal */}
      <Modal visible={splitModalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headline" weight="bold" style={styles.modalTitle}>
              Split Configuration
            </Text>

            {/* Split method selector */}
            <View style={styles.splitMethodTabs}>
              {(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setSplitMethod(m)}
                  style={[
                    styles.splitMethodTab,
                    splitMethod === m && { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={
                      splitMethod === m
                        ? theme.colors.primaryForeground
                        : theme.colors.textSecondary
                    }
                    style={{ textTransform: 'capitalize' }}
                  >
                    {m.toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 220 }}>
              {currentGroup?.members?.map((m) => {
                const isSelected = selectedParticipantIds.includes(m.userId);
                return (
                  <View key={m.userId} style={styles.modalOptionRow}>
                    <Pressable
                      onPress={() => {
                        setSelectedParticipantIds((prev) =>
                          prev.includes(m.userId) ? prev.filter((id) => id !== m.userId) : [...prev, m.userId]
                        );
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                    >
                      <Avatar name={m.name} size="small" />
                      <Text variant="body" weight="medium">
                        {m.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          color: isSelected ? theme.colors.primary : '#94A3B8',
                        }}
                      >
                        {isSelected ? '✓' : '○'}
                      </Text>
                    </Pressable>

                    {isSelected && splitMethod === 'EXACT' && (
                      <TextInput
                        placeholder="₹0"
                        keyboardType="numeric"
                        value={exactAmounts[m.userId] || ''}
                        onChangeText={(t) => setExactAmounts((p) => ({ ...p, [m.userId]: t }))}
                        style={styles.customSplitInput}
                      />
                    )}

                    {isSelected && splitMethod === 'PERCENTAGE' && (
                      <TextInput
                        placeholder="%"
                        keyboardType="numeric"
                        value={percentages[m.userId] || ''}
                        onChangeText={(t) => setPercentages((p) => ({ ...p, [m.userId]: t }))}
                        style={styles.customSplitInput}
                      />
                    )}

                    {isSelected && splitMethod === 'SHARES' && (
                      <TextInput
                        placeholder="1 share"
                        keyboardType="numeric"
                        value={shares[m.userId] || '1'}
                        onChangeText={(t) => setShares((p) => ({ ...p, [m.userId]: t }))}
                        style={styles.customSplitInput}
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setSplitModalVisible(false)}
              style={[styles.modalDoneBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
                Done
              </Text>
            </Pressable>
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
    padding: 24,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeButton: {
    width: 32,
    alignItems: 'flex-start',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 14,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  groupSelectorPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  descInputContainer: {
    marginTop: 4,
  },
  descTextInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  heroAmountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    marginRight: 6,
  },
  amountValueText: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  actionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  payerAvatarInitial: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardDetails: {
    flex: 1,
    gap: 2,
  },
  avatarStackMini: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  keypadWrapper: {
    paddingVertical: 4,
  },
  saveExpenseBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: 4,
  },
  splitMethodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  splitMethodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  groupModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 14,
  },
  customSplitInput: {
    width: 80,
    height: 36,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  modalDoneBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
