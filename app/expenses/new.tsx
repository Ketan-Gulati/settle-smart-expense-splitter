import { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Avatar, NumericKeypad, Icon, Surface } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { GroupDTO, UserDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';
import {
  convertToGroupCurrency,
  getCurrencySymbol,
  getExchangeRateToInr,
  SUPPORTED_CURRENCIES,
} from '@/services/currency/currencyService';

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

  // Smart Suggestions state
  const [smartPresets, setSmartPresets] = useState<Array<{
    title: string;
    groupId: string;
    groupName: string;
    splitMethod: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';
    participantIds?: string[];
  }>>([]);

  // Form State
  const [amountStr, setAmountStr] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('INR');
  const [customRate, setCustomRate] = useState<string>('');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('FOOD');
  const [payerId, setPayerId] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES'>('EQUAL');

  // Custom split values
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});

  // Master Categorized List for Subtly Styled Dropdown with Instant Search
  const DEFAULT_CATEGORIES = [
    { id: 'FOOD', label: 'Food & Drinks', group: 'Dining', icon: 'restaurant-outline' },
    { id: 'GROCERIES', label: 'Groceries & Supermarket', group: 'Dining', icon: 'cart-outline' },
    { id: 'RESTAURANT', label: 'Restaurants & Cafes', group: 'Dining', icon: 'restaurant-outline' },
    { id: 'BARS', label: 'Bars & Nightlife', group: 'Dining', icon: 'film-outline' },
    { id: 'TRANSPORT', label: 'Transport / Taxi / Cab', group: 'Transit', icon: 'car-outline' },
    { id: 'FLIGHTS', label: 'Flights & Airports', group: 'Transit', icon: 'airplane-outline' },
    { id: 'FUEL', label: 'Fuel & Petrol', group: 'Transit', icon: 'car-outline' },
    { id: 'TRAVEL', label: 'Travel & Vacations', group: 'Transit', icon: 'airplane-outline' },
    { id: 'HOUSING', label: 'Rent & Housing', group: 'Home & Living', icon: 'bed-outline' },
    { id: 'HOTEL', label: 'Hotel & Airbnb Stay', group: 'Home & Living', icon: 'bed-outline' },
    { id: 'UTILITIES', label: 'Electricity, Gas & Water', group: 'Home & Living', icon: 'flash-outline' },
    { id: 'WIFI', label: 'WiFi & Internet', group: 'Home & Living', icon: 'flash-outline' },
    { id: 'ENTERTAINMENT', label: 'Movies & Concerts', group: 'Leisure', icon: 'film-outline' },
    { id: 'GAMES', label: 'Games & Activities', group: 'Leisure', icon: 'film-outline' },
    { id: 'SHOPPING', label: 'Shopping & Clothes', group: 'Lifestyle', icon: 'cart-outline' },
    { id: 'HEALTH', label: 'Medical & Healthcare', group: 'Lifestyle', icon: 'receipt-outline' },
    { id: 'GIFTS', label: 'Gifts & Celebrations', group: 'Lifestyle', icon: 'receipt-outline' },
    { id: 'GENERAL', label: 'General / Miscellaneous', group: 'General', icon: 'receipt-outline' },
    { id: 'OTHER', label: 'Other Expense', group: 'General', icon: 'receipt-outline' },
  ];

  const [customCategories, setCustomCategories] = useState<Array<{ id: string; label: string; group: string; icon: string }>>([]);

  const allCombinedCategories = [...customCategories, ...DEFAULT_CATEGORIES];

  // Modals for editing Group, Payer, Category and Split
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [payerModalVisible, setPayerModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to load user's custom categories
  const loadUserCustomCategories = async (userId: string) => {
    const key = `user_custom_categories_${userId}`;
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web') {
        raw = localStorage.getItem(key);
      } else {
        raw = await SecureStore.getItemAsync(key);
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomCategories(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load custom categories:', e);
    }
  };

  // Helper to save a new custom category for this specific user
  const handleAddNewCategory = async (newCategoryName: string) => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || !currentUser) return;

    const newId = trimmed.toUpperCase().replace(/\s+/g, '_');
    const existing = allCombinedCategories.find((c) => c.id === newId || c.label.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setCategory(existing.id);
      setCategoryModalVisible(false);
      setCategorySearchQuery('');
      return;
    }

    const newCatItem = {
      id: newId,
      label: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      group: 'Custom Categories',
      icon: 'receipt-outline',
    };

    const updated = [newCatItem, ...customCategories];
    setCustomCategories(updated);
    setCategory(newId);
    setCategoryModalVisible(false);
    setCategorySearchQuery('');

    const storageKey = `user_custom_categories_${currentUser.id}`;
    try {
      const jsonStr = JSON.stringify(updated);
      if (Platform.OS === 'web') {
        localStorage.setItem(storageKey, jsonStr);
      } else {
        await SecureStore.setItemAsync(storageKey, jsonStr);
      }
    } catch (e) {
      console.warn('Failed to save custom category:', e);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [user, allGroups, activityFeed] = await Promise.all([
        SettleApiService.getMe(),
        SettleApiService.getGroups(),
        SettleApiService.getActivityFeed(1, 25).catch(() => []),
      ]);
      setCurrentUser(user);
      setGroups(allGroups);
      await loadUserCustomCategories(user.id);

      // Personalized Repeated Description Learning:
      // Track and aggregate frequency counts persistently per user
      const freqStorageKey = `user_desc_frequency_${user.id}`;
      let storedFreq: Record<string, { count: number; groupId?: string; groupName?: string; lastUsed?: number }> = {};
      try {
        const raw = Platform.OS === 'web' ? localStorage.getItem(freqStorageKey) : await SecureStore.getItemAsync(freqStorageKey);
        if (raw) storedFreq = JSON.parse(raw);
      } catch { }

      const titleFrequency = new Map<string, { count: number; groupId: string; groupName: string; lastUsed: number }>();

      // Load stored frequencies
      Object.entries(storedFreq).forEach(([key, info]) => {
        titleFrequency.set(key.toLowerCase(), {
          count: info.count || 1,
          groupId: info.groupId || '',
          groupName: info.groupName || '',
          lastUsed: info.lastUsed || Date.now(),
        });
      });

      // Overlay activity feed counts
      for (const act of activityFeed) {
        if (act.type === 'EXPENSE' && act.title && act.groupId) {
          const cleanTitle = act.title.trim();
          const key = cleanTitle.toLowerCase();
          const existing = titleFrequency.get(key);
          const actTime = new Date(act.timestamp).getTime();

          if (existing) {
            existing.count += 1;
            if (actTime > existing.lastUsed) {
              existing.groupId = act.groupId;
              existing.groupName = act.groupName;
              existing.lastUsed = actTime;
            }
          } else {
            titleFrequency.set(key, {
              count: 1,
              groupId: act.groupId,
              groupName: act.groupName,
              lastUsed: actTime,
            });
          }
        }
      }

      // Filter to only descriptions that repeat (count >= 2), sorted by most frequent and recent, capped at top 4
      const sortedLearned = Array.from(titleFrequency.entries())
        .filter(([_, info]) => info.count >= 2) // ONLY show repeated expenses
        .map(([titleLower, info]) => {
          const matchingAct = activityFeed.find((a) => a.title?.trim().toLowerCase() === titleLower);
          return {
            title: matchingAct?.title?.trim() || titleLower,
            count: info.count,
            groupId: info.groupId,
            groupName: info.groupName,
            splitMethod: 'EQUAL' as const,
            score: info.count * 10000 + (info.lastUsed / 1000000000),
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4); // Max 4 top repeated recommendations

      setSmartPresets(sortedLearned);

      if (expenseId) {
        // Edit Mode: load existing expense data from backend
        const existingExp = await SettleApiService.getExpenseDetails(expenseId);
        if (existingExp) {
          // Check if expense is locked and user lacks permission
          if (existingExp.isLocked) {
            const isCreator = existingExp.createdByUserId === user.id;
            const isAllowed = existingExp.allowedEditorIds?.includes(user.id);
            if (!isCreator && !isAllowed) {
              setError('🔒 This expense is locked. You need edit access from the creator.');
            }
          }

          setIsLocked(existingExp.isLocked || false);
          setSelectedGroupId(existingExp.groupId);
          const groupData = await SettleApiService.getGroupDetails(existingExp.groupId);
          setCurrentGroup(groupData);
          setDescription(existingExp.description);
          setAmountStr((existingExp.amountMinor / 100).toString());
          setPayerId(existingExp.paidByUserId);
          setSelectedParticipantIds(existingExp.splits.map((s) => s.userId));
          if (existingExp.category) {
            setCategory(existingExp.category);
          }
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

  const groupCurrency = currentGroup?.currency || 'INR';
  const rawInputAmount = parseFloat(amountStr) || 0;
  const isForeignCurrency = selectedCurrency.toUpperCase() !== groupCurrency.toUpperCase();

  // Calculate converted group amount using exchange rate
  const userSpecifiedRate = customRate ? parseFloat(customRate) : undefined;
  const { convertedAmount, rateUsed } = convertToGroupCurrency(
    rawInputAmount,
    selectedCurrency,
    groupCurrency,
    userSpecifiedRate
  );

  const amountMinor = Math.round(convertedAmount * 100);
  const originalAmountMinor = isForeignCurrency ? Math.round(rawInputAmount * 100) : undefined;

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

      try {
        if (expenseId) {
          await SettleApiService.updateExpense(expenseId, {
            description: description.trim(),
            amountMinor,
            currency: groupCurrency,
            originalAmountMinor,
            originalCurrency: isForeignCurrency ? selectedCurrency : undefined,
            exchangeRate: isForeignCurrency ? rateUsed : undefined,
            isLocked,
            paidByUserId: payerId,
            splitMethod,
            category,
            participants: participantsPayload,
          });
        } else {
          await SettleApiService.createExpense({
            groupId: selectedGroupId,
            description: description.trim(),
            amountMinor,
            currency: groupCurrency,
            originalAmountMinor,
            originalCurrency: isForeignCurrency ? selectedCurrency : undefined,
            exchangeRate: isForeignCurrency ? rateUsed : undefined,
            isLocked,
            paidByUserId: payerId,
            splitMethod,
            category,
            participants: participantsPayload,
          });
        }
      } catch (networkErr: any) {
        // If offline or network error on new expense, seamlessly queue locally
        if (!expenseId) {
          const { OfflineSyncEngine } = await import('@/services/offline/syncEngine');
          await OfflineSyncEngine.enqueueExpense({
            clientTempId: `temp_${Date.now()}`,
            groupId: selectedGroupId,
            groupName: currentGroup?.name,
            description: description.trim(),
            amountMinor,
            paidByUserId: payerId,
            splitMethod,
            category,
            notes: undefined,
            participants: participantsPayload,
          });
        } else {
          throw networkErr;
        }
      }

      // Track description frequency count persistently for this user
      if (currentUser && description.trim()) {
        try {
          const freqStorageKey = `user_desc_frequency_${currentUser.id}`;
          let storedFreq: Record<string, { count: number; groupId?: string; groupName?: string; lastUsed?: number }> = {};
          const raw = Platform.OS === 'web' ? localStorage.getItem(freqStorageKey) : await SecureStore.getItemAsync(freqStorageKey);
          if (raw) storedFreq = JSON.parse(raw);

          const descKey = description.trim().toLowerCase();
          const existing = storedFreq[descKey] || { count: 0 };
          storedFreq[descKey] = {
            count: existing.count + 1,
            groupId: selectedGroupId,
            groupName: currentGroup?.name,
            lastUsed: Date.now(),
          };

          const jsonStr = JSON.stringify(storedFreq);
          if (Platform.OS === 'web') {
            localStorage.setItem(freqStorageKey, jsonStr);
          } else {
            await SecureStore.setItemAsync(freqStorageKey, jsonStr);
          }
        } catch (freqErr) {
          console.warn('Failed to update description frequency:', freqErr);
        }
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
        {/* 2. Group & Category Dropdown Row */}
        <View style={styles.contextRow}>


          {/* Category Dropdown Pill - Only shown once group selected */}
          {!!selectedGroupId && (
            <Pressable
              onPress={() => {
                setCategorySearchQuery('');
                setCategoryModalVisible(true);
              }}
              style={[
                styles.categoryDropdownPill,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceSubtle,
                },
              ]}
            >
              <Text variant="bodySecondary" color={theme.colors.textPrimary} weight="medium">
                🏷️ {allCombinedCategories.find((c) => c.id === category)?.label || 'Category'} ▼
              </Text>
            </Pressable>
          )}
        </View>

        {/* PROMPT BANNER WHEN NO GROUP SELECTED */}
        {!selectedGroupId ? (
          <Surface variant="subtle" style={styles.selectGroupPromptCard}>
            <View style={styles.groupPromptIconWrap}>
              <Icon name="people-outline" size={32} color={theme.colors.primary} />
            </View>
            <Text variant="headline" weight="bold" style={{ marginTop: 12 }}>
              Choose a Group First
            </Text>
            <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', marginTop: 4, maxWidth: 260 }}>
              Select which group or trip this expense belongs to so we can load participants and currency.
            </Text>
            <Pressable
              onPress={() => setGroupModalVisible(true)}
              style={[styles.selectGroupPromptBtn, { backgroundColor: theme.colors.primary }]}
            >
              <Text variant="body" weight="bold" color="#FFFFFF">
                Select Group
              </Text>
            </Pressable>
          </Surface>
        ) : (
          <>
            {/* 3. Description Input */}
            <View style={styles.descInputContainer}>
              <TextInput
                placeholder="What did you pay for? (e.g. Dinner, Uber, Fuel...)"
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

            {/* 3.6. Smart Suggestions Bar (Top 4 Repeated Descriptions) */}
            {!expenseId && smartPresets.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.smartPresetsRow}
              >
                {smartPresets.map((preset, idx) => (
                  <Pressable
                    key={idx}
                    onPress={async () => {
                      setDescription(preset.title);
                      if (preset.groupId) {
                        await handleSelectGroup(preset.groupId);
                      }
                    }}
                    style={[
                      styles.smartPresetPill,
                      {
                        backgroundColor: description.toLowerCase() === preset.title.toLowerCase()
                          ? theme.colors.primary
                          : theme.colors.surfaceSubtle,
                        borderColor: description.toLowerCase() === preset.title.toLowerCase()
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      weight="semibold"
                      color={
                        description.toLowerCase() === preset.title.toLowerCase()
                          ? '#FFFFFF'
                          : theme.colors.textSecondary
                      }
                    >
                      ⚡ {preset.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* 4. Hero Amount Display & Currency Selector */}
            <View style={styles.heroAmountSection}>
              <Pressable
                onPress={() => setCurrencyModalVisible(true)}
                style={[styles.currencyPill, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}
                hitSlop={8}
              >
                <Text variant="headline" weight="bold" color={theme.colors.primary}>
                  {getCurrencySymbol(selectedCurrency)}
                </Text>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted} style={{ fontSize: 11 }}>
                  {selectedCurrency} ▼
                </Text>
              </Pressable>

              <Text style={[styles.amountValueText, { color: theme.colors.textPrimary }]}>
                {amountStr ? Number(amountStr).toLocaleString('en-IN') : '0'}
              </Text>
            </View>

            {/* 4.5 Multi-Currency Conversion Info Card */}
            {isForeignCurrency && rawInputAmount > 0 && (
              <Surface variant="subtle" style={styles.conversionBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ gap: 2 }}>
                    <Text variant="caption" weight="bold" color={theme.colors.textPrimary}>
                      Converted to Group Currency: ₹{convertedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text variant="caption" color={theme.colors.textMuted}>
                      Rate: 1 {selectedCurrency} = ₹{rateUsed.toFixed(2)} INR
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setCurrencyModalVisible(true)}
                    style={styles.editRateBtn}
                  >
                    <Text variant="caption" weight="bold" color={theme.colors.primary}>
                      Edit Rate
                    </Text>
                  </Pressable>
                </View>
              </Surface>
            )}

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
                {selectedParticipantIds.length > 3 ? (
                  <View style={[styles.miniAvatar, { marginLeft: -8, backgroundColor: '#E2E8F0' }]}>
                    <Text variant="caption" weight="bold">
                      +{selectedParticipantIds.length - 3}
                    </Text>
                  </View>
                ) : null}
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

            {/* Locked Expense Toggle */}
            <Pressable
              onPress={() => setIsLocked((prev) => !prev)}
              style={[
                styles.lockToggleCard,
                {
                  backgroundColor: isLocked ? 'rgba(59, 130, 246, 0.08)' : theme.colors.surfaceSubtle,
                  borderColor: isLocked ? theme.colors.primary : theme.colors.borderSubtle,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <Text style={{ fontSize: 20 }}>{isLocked ? '🔒' : '🔓'}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="body" weight="semibold" color={theme.colors.textPrimary}>
                      Lock Expense from edits
                    </Text>
                    {isLocked && (
                      <View style={[styles.lockedBadgeMini, { backgroundColor: theme.colors.primary }]}>
                        <Text variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 10 }}>
                          PROTECTED
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text variant="caption" color={theme.colors.textMuted} style={{ fontSize: 11 }}>
                    {isLocked
                      ? 'Only you can edit this. Others must request edit access from you.'
                      : 'Anyone in the group can edit or delete this expense.'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.togglePillSwitch,
                  {
                    backgroundColor: isLocked ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      transform: [{ translateX: isLocked ? 18 : 2 }],
                    },
                  ]}
                />
              </View>
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
          </>
        )}
      </ScrollView>

      {/* Group Selector Modal */}
      <Modal visible={groupModalVisible} animationType="slide" transparent onRequestClose={() => setGroupModalVisible(false)}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setGroupModalVisible(false)}
        >
          <Pressable style={[styles.modalBox, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category Selector Modal with Real-Time Search Bar */}
      <Modal visible={categoryModalVisible} animationType="slide" transparent onRequestClose={() => setCategoryModalVisible(false)}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setCategoryModalVisible(false)}
        >
          <Pressable style={[styles.modalBox, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderWithClose}>
              <Text variant="headline" weight="bold" style={styles.modalTitle}>
                Select Category
              </Text>
              <Pressable onPress={() => setCategoryModalVisible(false)} hitSlop={8}>
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={[styles.categorySearchContainer, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
              <Icon name="search-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                placeholder="Search categories (e.g. food, flight, uber)..."
                placeholderTextColor={theme.colors.textMuted}
                value={categorySearchQuery}
                onChangeText={setCategorySearchQuery}
                style={[styles.categorySearchInput, { color: theme.colors.textPrimary }]}
                autoCapitalize="none"
              />
              {categorySearchQuery.length > 0 && (
                <Pressable onPress={() => setCategorySearchQuery('')} hitSlop={6}>
                  <Text style={{ fontSize: 14, color: theme.colors.textMuted }}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Filtered Categories List */}
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {categorySearchQuery.trim().length > 0 &&
                !allCombinedCategories.some(
                  (c) => c.label.toLowerCase() === categorySearchQuery.trim().toLowerCase()
                ) && (
                  <Pressable
                    onPress={() => handleAddNewCategory(categorySearchQuery)}
                    style={[
                      styles.categoryModalItem,
                      {
                        backgroundColor: 'rgba(2, 132, 199, 0.08)',
                        borderColor: theme.colors.primary,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <View style={[styles.categoryIconBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>+</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="body" weight="bold" color={theme.colors.primary}>
                        + Add "{categorySearchQuery.trim()}"
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        Save as your custom category for future use
                      </Text>
                    </View>
                  </Pressable>
                )}

              {allCombinedCategories.filter((c) =>
                c.label.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
                c.group.toLowerCase().includes(categorySearchQuery.toLowerCase())
              ).map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      setCategory(cat.id);
                      setCategoryModalVisible(false);
                    }}
                    style={[
                      styles.categoryModalItem,
                      isSelected && { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.primary },
                    ]}
                  >
                    <View style={[styles.categoryIconBadge, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceSubtle }]}>
                      <Icon
                        name={cat.icon as any}
                        size={18}
                        color={isSelected ? '#FFFFFF' : theme.colors.textPrimary}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="body" weight={isSelected ? 'bold' : 'medium'}>
                        {cat.label}
                      </Text>
                      <Text variant="caption" color={theme.colors.textMuted}>
                        {cat.group}
                      </Text>
                    </View>
                    {isSelected && (
                      <Text variant="body" weight="bold" color={theme.colors.primary}>
                        ✓
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Payer Modal */}
      <Modal visible={payerModalVisible} animationType="slide" transparent onRequestClose={() => setPayerModalVisible(false)}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setPayerModalVisible(false)}
        >
          <Pressable style={[styles.modalBox, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* Split Modal */}
      <Modal visible={splitModalVisible} animationType="slide" transparent onRequestClose={() => setSplitModalVisible(false)}>
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}
          onPress={() => setSplitModalVisible(false)}
        >
          <Pressable style={[styles.modalBox, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
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
          </Pressable>
        </Pressable>
      </Modal>

      {/* 11. Multi-Currency Selection & Live Exchange Rate Modal */}
      <Modal visible={currencyModalVisible} animationType="slide" transparent onRequestClose={() => setCurrencyModalVisible(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setCurrencyModalVisible(false)}>
          <Pressable style={[styles.modalBox, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View>
                <Text variant="headline" weight="bold">
                  Select Currency
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  Group Base Currency: {groupCurrency}
                </Text>
              </View>
              <Pressable onPress={() => setCurrencyModalVisible(false)}>
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {/* Real-time Currency & Country Search Bar */}
            <View
              style={[
                styles.categorySearchContainer,
                {
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderColor: theme.colors.borderSubtle,
                  marginVertical: 4,
                },
              ]}
            >
              <Icon name="search-outline" size={18} color={theme.colors.textMuted} />
              <TextInput
                placeholder="Search currency or country (e.g. USD, Dubai, Japan, Euro...)"
                placeholderTextColor={theme.colors.textMuted}
                value={currencySearchQuery}
                onChangeText={setCurrencySearchQuery}
                style={[styles.categorySearchInput, { color: theme.colors.textPrimary }]}
                autoCapitalize="none"
              />
              {currencySearchQuery.length > 0 && (
                <Pressable onPress={() => setCurrencySearchQuery('')}>
                  <Text style={{ fontSize: 16, color: theme.colors.textMuted, fontWeight: 'bold' }}>✕</Text>
                </Pressable>
              )}
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {SUPPORTED_CURRENCIES.filter((curr: any) => {
                  if (!currencySearchQuery.trim()) return true;
                  const q = currencySearchQuery.trim().toLowerCase();
                  const codeMatch = curr.code.toLowerCase().includes(q);
                  const nameMatch = curr.name.toLowerCase().includes(q);
                  const countryMatch = curr.countries?.some((c: string) => c.toLowerCase().includes(q));
                  return codeMatch || nameMatch || countryMatch;
                }).map((curr: any) => {
                  const isSelected = selectedCurrency.toUpperCase() === curr.code;
                  return (
                    <Pressable
                      key={curr.code}
                      onPress={() => {
                        setSelectedCurrency(curr.code);
                        setCustomRate('');
                        setCurrencyModalVisible(false);
                        setCurrencySearchQuery('');
                      }}
                      style={[
                        styles.currencyOptionCard,
                        {
                          backgroundColor: isSelected ? theme.colors.surfaceSubtle : 'transparent',
                          borderColor: isSelected ? theme.colors.primary : theme.colors.borderSubtle,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <View style={[styles.currSymbolCircle, { backgroundColor: theme.colors.surfaceSubtle }]}>
                          <Text style={{ fontSize: 20 }}>{curr.flag || curr.symbol}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text variant="body" weight="bold">
                              {curr.code}
                            </Text>
                            <Text variant="caption" color={theme.colors.textSecondary}>
                              · {curr.name} ({curr.symbol})
                            </Text>
                          </View>
                          <Text variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
                            {curr.countries?.join(', ')}
                          </Text>
                          <Text variant="caption" color={theme.colors.primary} style={{ fontSize: 11 }}>
                            {curr.code === 'INR' ? 'Group base currency' : `1 ${curr.code} ≈ ₹${curr.rateToInr} INR`}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Text variant="body" weight="bold" color={theme.colors.primary}>
                          ✓
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Custom Rate Input for Foreign Currencies */}
            {isForeignCurrency && (
              <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle, paddingTop: 12 }}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  CUSTOM EXCHANGE RATE (Optional)
                </Text>
                <TextInput
                  placeholder={`Default: ₹${getExchangeRateToInr(selectedCurrency)} per 1 ${selectedCurrency}`}
                  placeholderTextColor={theme.colors.textMuted}
                  value={customRate}
                  onChangeText={setCustomRate}
                  keyboardType="numeric"
                  style={[styles.customRateInput, { borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
                />
              </View>
            )}

            <Pressable
              onPress={() => setCurrencyModalVisible(false)}
              style={[styles.modalDoneBtn, { backgroundColor: theme.colors.primary, marginTop: 8 }]}
            >
              <Text variant="title" weight="bold" color={theme.colors.primaryForeground}>
                Confirm Currency
              </Text>
            </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectGroupPromptCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 20,
  },
  groupPromptIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectGroupPromptBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
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
  smartPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  smartPresetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
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
  categoryDropdownPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalHeaderWithClose: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categorySearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginVertical: 6,
  },
  categorySearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  categoryModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 10,
  },
  conversionBanner: {
    padding: 12,
    borderRadius: 14,
    marginTop: -6,
    marginBottom: 4,
  },
  editRateBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currencyOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  currSymbolCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRateInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  lockToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  lockedBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  togglePillSwitch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
