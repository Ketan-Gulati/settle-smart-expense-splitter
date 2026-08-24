import { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Text, Button, Input, Surface, Avatar } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { UserDTO, GroupDTO, GroupType, GroupInvitationDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';
import { shareGroupInvite, copyToClipboard, buildInviteUrl } from '@/services/invitations/inviteUtils';
import { detectCurrencyFromIP, CurrencyInfo, DEFAULT_CURRENCY } from '@/services/geo/currencyDetection';

const GROUP_TYPES: Array<{ id: GroupType; label: string; iconText: string }> = [
  { id: 'TRIP', label: 'Trip', iconText: '✈️' },
  { id: 'APARTMENT', label: 'Apartment', iconText: '🏠' },
  { id: 'HOME', label: 'Home', iconText: '🏡' },
  { id: 'COUPLE', label: 'Couple', iconText: '❤️' },
  { id: 'FRIENDS', label: 'Friends', iconText: '👥' },
  { id: 'OTHER', label: 'Other', iconText: '📁' },
];

export default function CreateGroupScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [currentUser, setCurrentUser] = useState<UserDTO | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Details
  const [groupName, setGroupName] = useState('');
  const [selectedType, setSelectedType] = useState<GroupType>('TRIP');
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currency, setCurrency] = useState('INR');
  const [detectingCurrency, setDetectingCurrency] = useState(false);

  // Step 2: Member Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<UserDTO[]>([]);

  // Step 3 & 4: Submitting & Success
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdGroup, setCreatedGroup] = useState<GroupDTO | null>(null);
  const [activeInvite, setActiveInvite] = useState<GroupInvitationDTO | null>(null);

  useEffect(() => {
    SettleApiService.getMe()
      .then(setCurrentUser)
      .catch((err) => console.error('Failed to get current user:', err));

    setDetectingCurrency(true);
    detectCurrencyFromIP()
      .then((curr) => {
        setCurrencyInfo(curr);
        setCurrency(curr.code);
      })
      .catch((err) => console.error('IP currency detection error:', err))
      .finally(() => setDetectingCurrency(false));
  }, []);

  // Search users as user types
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await SettleApiService.searchUsers(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleMember = (user: UserDTO) => {
    if (selectedMembers.some((m) => m.id === user.id)) {
      setSelectedMembers((prev) => prev.filter((m) => m.id !== user.id));
    } else {
      setSelectedMembers((prev) => [...prev, user]);
    }
  };

  const handleFinalCreate = async () => {
    if (!groupName.trim()) {
      setCreateError('Group name is required');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const memberIds = selectedMembers.map((m) => m.id);
      const newGroup = await SettleApiService.createGroup(
        groupName.trim(),
        selectedType,
        currency,
        memberIds
      );

      setCreatedGroup(newGroup);
      if (newGroup.activeInvite) {
        setActiveInvite(newGroup.activeInvite);
      }
      notifyDataChanged();
      setStep(4); // Success & Share Step
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleNativeShare = async () => {
    if (!createdGroup) return;
    const inviteIdentifier = activeInvite?.inviteCode || createdGroup.activeInvite?.inviteCode || createdGroup.id;
    await shareGroupInvite({
      groupName: createdGroup.name,
      inviterName: currentUser?.name,
      inviteTokenOrCode: inviteIdentifier,
      inviteCode: activeInvite?.inviteCode,
    });
  };

  const handleCopyLink = async () => {
    const inviteIdentifier = activeInvite?.inviteCode || createdGroup?.activeInvite?.inviteCode || createdGroup?.id;
    if (!inviteIdentifier) return;
    const url = buildInviteUrl(inviteIdentifier);
    const success = await copyToClipboard(url);
    if (success) showToast('Invite link copied');
  };

  const handleCopyCode = async () => {
    const code = activeInvite?.inviteCode || createdGroup?.activeInvite?.inviteCode;
    if (!code) return;
    const success = await copyToClipboard(code);
    if (success) showToast('Invite code copied');
  };

  const canonicalInviteUrl = createdGroup
    ? buildInviteUrl(activeInvite?.inviteCode || createdGroup.activeInvite?.inviteCode || createdGroup.id)
    : '';
  const displayInviteCode = activeInvite?.inviteCode || createdGroup?.activeInvite?.inviteCode || '------';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Toast Feedback Overlay */}
      {toastMessage && (
        <View style={[styles.toastContainer, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <Text variant="bodySecondary" weight="semibold" color={theme.colors.textPrimary}>
            ✓ {toastMessage}
          </Text>
        </View>
      )}

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Pressable
          onPress={() => {
            if (step === 1) router.back();
            else if (step === 4) router.replace(`/groups/${createdGroup?.id}` as any);
            else setStep((s) => (s - 1) as any);
          }}
          style={styles.backBtn}
        >
          <Text variant="body" weight="semibold" color={theme.colors.textSecondary}>
            ← Back
          </Text>
        </Pressable>

        <Text variant="title" weight="semibold">
          {step === 1 ? 'New Group' : step === 2 ? 'Add People' : step === 3 ? 'Review' : 'Group Created'}
        </Text>

        {step === 4 ? (
          <Pressable onPress={() => router.replace(`/groups/${createdGroup?.id}` as any)} style={styles.doneHeaderBtn}>
            <Text variant="body" weight="semibold" color={theme.colors.primary}>
              Done
            </Text>
          </Pressable>
        ) : (
          <View style={styles.stepIndicator}>
            <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
              {`Step ${step}/3`}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* STEP 1: GROUP DETAILS & CATEGORY CHIPS */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text variant="headline" weight="bold">
                Name your group
              </Text>
              <Text variant="bodySecondary" color={theme.colors.textMuted}>
                What are you splitting expenses for?
              </Text>
            </View>

            <Input
              label="Group Name"
              placeholder="e.g. Goa 2026, Apartment 4B, Friday Dinner"
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />

            <View style={styles.typeSection}>
              <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                TYPE
              </Text>
              <View style={styles.chipGrid}>
                {GROUP_TYPES.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setSelectedType(t.id)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceSubtle,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        },
                      ]}
                    >
                      <Text variant="body" color={isSelected ? theme.colors.primaryForeground : theme.colors.textPrimary}>
                        {t.iconText} {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.currencyBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
              <View>
                <Text variant="body" weight="medium">
                  Currency
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  {detectingCurrency ? 'Detecting local currency...' : 'Auto-detected from your location'}
                </Text>
              </View>
              <Text variant="body" weight="bold" color={theme.colors.primary}>
                {currencyInfo.symbol} {currencyInfo.code} ({currencyInfo.name})
              </Text>
            </View>

            <Button
              title="Next: Add People →"
              variant="primary"
              size="large"
              onPress={() => {
                if (!groupName.trim()) {
                  setCreateError('Please enter a group name');
                  return;
                }
                setCreateError(null);
                setStep(2);
              }}
              disabled={!groupName.trim()}
              style={styles.continueBtn}
            />
          </View>
        )}

        {/* STEP 2: MEMBER SEARCH & INVITATION PREVIEW */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text variant="headline" weight="bold">
                Add people
              </Text>
              <Text variant="bodySecondary" color={theme.colors.textMuted}>
                Who are you splitting expenses with?
              </Text>
            </View>

            {/* Creator Row (Locked) */}
            <Surface variant="card" style={styles.memberCard}>
              <Avatar name={currentUser?.name || 'You'} size="medium" />
              <View style={styles.memberInfo}>
                <Text variant="body" weight="semibold">
                  {currentUser?.name || 'You'} (You)
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  {currentUser?.email || 'Creator • Owner'}
                </Text>
              </View>
              <View style={[styles.lockedBadge, { backgroundColor: theme.colors.surfaceElevated }]}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  Creator
                </Text>
              </View>
            </Surface>

            {/* Selected Additional Members */}
            {selectedMembers.map((m) => (
              <Surface key={m.id} variant="card" style={styles.memberCard}>
                <Avatar name={m.name} size="medium" />
                <View style={styles.memberInfo}>
                  <Text variant="body" weight="semibold">
                    {m.name}
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    {m.email}
                  </Text>
                </View>
                <Pressable onPress={() => handleToggleMember(m)} style={styles.removeBtn}>
                  <Text variant="caption" weight="bold" color={theme.colors.negative}>
                    ✕ Remove
                  </Text>
                </Pressable>
              </Surface>
            ))}

            {/* Search Input for Existing Settle Users */}
            <View style={styles.searchBox}>
              <Input
                label="Search Settle Users"
                placeholder="Type name or email (e.g. Rohit, raj@...)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searching && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.searchSpinner} />}
            </View>

            {/* Search Results dropdown */}
            {searchResults.length > 0 && (
              <Surface variant="elevated" style={styles.resultsContainer}>
                {searchResults.map((user) => {
                  const isAdded = selectedMembers.some((m) => m.id === user.id);
                  return (
                    <Pressable
                      key={user.id}
                      onPress={() => handleToggleMember(user)}
                      style={[styles.searchResultRow, { borderBottomColor: theme.colors.borderSubtle }]}
                    >
                      <Avatar name={user.name} size="small" />
                      <View style={styles.memberInfo}>
                        <Text variant="body" weight="semibold">
                          {user.name}
                        </Text>
                        <Text variant="caption" color={theme.colors.textMuted}>
                          {user.email}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.addBadge,
                          {
                            backgroundColor: isAdded ? theme.colors.positive : theme.colors.primary,
                          },
                        ]}
                      >
                        <Text variant="caption" weight="bold" color="#FFFFFF">
                          {isAdded ? '✓ Added' : '+ Add'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </Surface>
            )}

            {/* Shareable Link Hint */}
            <View style={[styles.inviteHint, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
              <Text variant="body" weight="semibold">
                Need to invite someone without an account?
              </Text>
              <Text variant="caption" color={theme.colors.textMuted}>
                A secure invite link and code are automatically generated once you create the group.
              </Text>
            </View>

            <View style={styles.stepTwoButtons}>
              <Button
                title={selectedMembers.length === 0 ? 'Create with only me' : `Review Group (${selectedMembers.length + 1}) →`}
                variant="primary"
                size="large"
                onPress={() => setStep(3)}
              />
            </View>
          </View>
        )}

        {/* STEP 3: REVIEW & ATOMIC CREATION */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.sectionHeader}>
              <Text variant="headline" weight="bold">
                Review your group
              </Text>
              <Text variant="bodySecondary" color={theme.colors.textMuted}>
                Confirm group details before launching.
              </Text>
            </View>

            <Surface variant="elevated" style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.typeIconBox, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="title" color={theme.colors.primaryForeground}>
                    {GROUP_TYPES.find((t) => t.id === selectedType)?.iconText || '📁'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="bold">
                    {groupName}
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    {GROUP_TYPES.find((t) => t.id === selectedType)?.label} • Currency: {currency}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                MEMBERS ({selectedMembers.length + 1})
              </Text>

              <View style={styles.reviewMemberList}>
                <View style={styles.reviewMemberItem}>
                  <Avatar name={currentUser?.name || 'You'} size="small" />
                  <Text variant="body" weight="medium">
                    {currentUser?.name} (Creator)
                  </Text>
                </View>
                {selectedMembers.map((m) => (
                  <View key={m.id} style={styles.reviewMemberItem}>
                    <Avatar name={m.name} size="small" />
                    <Text variant="body" weight="medium">
                      {m.name}
                    </Text>
                  </View>
                ))}
              </View>
            </Surface>

            {createError && (
              <Text variant="caption" color={theme.colors.negative} style={styles.errorText}>
                {createError}
              </Text>
            )}

            <Button
              title={creating ? 'Creating Group...' : '✓ Create Group'}
              variant="primary"
              size="large"
              onPress={handleFinalCreate}
              loading={creating}
              style={styles.continueBtn}
            />
          </View>
        )}

        {/* STEP 4: MATURE, FINANCIAL-GRADE GROUP CREATED & INVITE FLOW */}
        {step === 4 && createdGroup && (
          <View style={styles.stepContainer}>
            {/* Status Header */}
            <View style={styles.confirmationHeader}>
              <View style={[styles.checkCircle, { borderColor: theme.colors.positive, backgroundColor: theme.colors.surfaceSubtle }]}>
                <Text variant="body" weight="bold" color={theme.colors.positive}>
                  ✓
                </Text>
              </View>
              <Text variant="title" weight="bold">
                Group created
              </Text>
              <Text variant="bodySecondary" color={theme.colors.textMuted}>
                Your group is ready for expenses.
              </Text>
            </View>

            {/* Group Identity Card */}
            <Surface variant="card" style={styles.groupIdentityCard}>
              <View style={styles.identityRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="bold">
                    {createdGroup.name}
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    {createdGroup.memberCount || selectedMembers.length + 1} {createdGroup.memberCount === 1 ? 'member' : 'members'} · {createdGroup.currency}
                  </Text>
                </View>
              </View>

              <View style={[styles.thinDivider, { backgroundColor: theme.colors.borderSubtle }]} />

              {/* Members Preview */}
              <View style={styles.memberAvatarRow}>
                <View style={styles.memberItemRow}>
                  <Avatar name={currentUser?.name || 'You'} size="small" />
                  <Text variant="bodySecondary" weight="medium">
                    {currentUser?.name || 'You'} · You
                  </Text>
                </View>
                {selectedMembers.map((m) => (
                  <View key={m.id} style={styles.memberItemRow}>
                    <Avatar name={m.name} size="small" />
                    <Text variant="bodySecondary" weight="medium">
                      {m.name}
                    </Text>
                  </View>
                ))}
              </View>
            </Surface>

            {/* Invite People Section */}
            <Surface variant="elevated" style={styles.inviteSectionCard}>
              <View style={styles.sectionHeader}>
                <Text variant="title" weight="bold">
                  Invite people
                </Text>
                <Text variant="bodySecondary" color={theme.colors.textMuted}>
                  Share a link or code so others can join this group.
                </Text>
              </View>

              {/* Primary Action: Native OS Share */}
              <Button
                title="Share invite"
                variant="primary"
                size="large"
                onPress={handleNativeShare}
                style={styles.primaryShareBtn}
              />

              {/* Secondary Action 1: Invite Link */}
              <View style={[styles.codeDetailBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                    INVITE LINK
                  </Text>
                  <Text variant="mono" numberOfLines={1} style={styles.linkText} color={theme.colors.textPrimary}>
                    {canonicalInviteUrl}
                  </Text>
                </View>
                <Pressable onPress={handleCopyLink} style={[styles.copyPill, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
                  <Text variant="caption" weight="bold" color={theme.colors.textPrimary}>
                    Copy
                  </Text>
                </Pressable>
              </View>

              {/* Secondary Action 2: Invite Code */}
              <View style={[styles.codeDetailBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.borderSubtle }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                    INVITE CODE
                  </Text>
                  <Text variant="title" weight="bold" style={styles.cleanCodeText} color={theme.colors.textPrimary}>
                    {displayInviteCode}
                  </Text>
                </View>
                <Pressable onPress={handleCopyCode} style={[styles.copyPill, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
                  <Text variant="caption" weight="bold" color={theme.colors.textPrimary}>
                    Copy
                  </Text>
                </Pressable>
              </View>

              <Text variant="caption" color={theme.colors.textMuted} align="center">
                You can share the invite link or code with anyone you want to add.
              </Text>
            </Surface>

            {/* Navigate to Group Action */}
            <Button
              title={`Go to ${createdGroup.name} →`}
              variant="subtle"
              size="large"
              onPress={() => router.replace(`/groups/${createdGroup.id}` as any)}
              style={styles.continueBtn}
            />
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
  toastContainer: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    zIndex: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
  },
  doneHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  stepIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  typeSection: {
    gap: 10,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  currencyBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  continueBtn: {
    marginTop: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  lockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchBox: {
    position: 'relative',
    marginTop: 8,
  },
  searchSpinner: {
    position: 'absolute',
    right: 14,
    top: 36,
  },
  resultsContainer: {
    borderRadius: 12,
    padding: 8,
    gap: 4,
    marginTop: -10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 12,
    borderBottomWidth: 1,
  },
  addBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inviteHint: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  stepTwoButtons: {
    marginTop: 10,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  reviewMemberList: {
    gap: 10,
  },
  reviewMemberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmationHeader: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  groupIdentityCard: {
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinDivider: {
    height: 1,
  },
  memberAvatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  memberItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteSectionCard: {
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  primaryShareBtn: {
    width: '100%',
  },
  codeDetailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  linkText: {
    fontSize: 13,
    marginTop: 2,
  },
  cleanCodeText: {
    letterSpacing: 2,
    marginTop: 2,
  },
  copyPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    textAlign: 'center',
  },
});
