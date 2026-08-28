import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, DetailHeader, Avatar, Button, Surface, Input, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useUIStore } from '@/store/uiStore';
import { SettleApiService } from '@/services/api/settleApi';
import { UserDTO } from '@/services/api/types';

export default function ProfileScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { themeMode, setThemeMode } = useUIStore();

  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Change Password Multi-Step Flow States
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'CONFIRM' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS'>('CONFIRM');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);

  // Delete Account Multi-Step Emotional Flow States
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'LOADING' | 'BLOCKED_OWE_OTHERS' | 'OWED_CREDITS' | 'CONFIRM' | 'EMOTIONAL'>('LOADING');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<{
    canDelete: boolean;
    totalOwedByYouMinor: number;
    totalOwedToYouMinor: number;
    reason?: string;
  } | null>(null);

  useEffect(() => {
    SettleApiService.getUserProfile()
      .then(setUser)
      .catch((err) => console.error('Failed to load profile:', err))
      .finally(() => setLoading(false));
  }, []);

  const openDeleteAccountModal = async () => {
    try {
      setDeleteStep('LOADING');
      setDeleteModalVisible(true);
      const status = await SettleApiService.getAccountDeletionStatus();
      setDeletionStatus(status);

      if (!status.canDelete) {
        // User owes money to others -> strictly block deletion
        setDeleteStep('BLOCKED_OWE_OTHERS');
      } else if (status.totalOwedToYouMinor > 0) {
        // Others owe money to user -> show total collectible warning
        setDeleteStep('OWED_CREDITS');
      } else {
        // Completely settled -> standard confirmation
        setDeleteStep('CONFIRM');
      }
    } catch {
      setDeleteStep('CONFIRM');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await SettleApiService.deleteAccount();
      await SettleApiService.logout();
      setDeleteModalVisible(false);
      router.replace('/auth' as any);
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      // Even if server errored, log out locally to protect state
      await SettleApiService.logout();
      setDeleteModalVisible(false);
      router.replace('/auth' as any);
    } finally {
      setDeletingAccount(false);
    }
  };

  const openPasswordChangeModal = () => {
    setStep('CONFIRM');
    setOtpInput('');
    setNewPassword('');
    setConfirmPassword('');
    setFlowError(null);
    setModalVisible(true);
  };

  const handleRequestOtp = async () => {
    try {
      setFlowLoading(true);
      setFlowError(null);
      const res = await SettleApiService.requestPasswordChangeOtp();
      setMaskedEmail(res.emailMasked);
      setStep('OTP');
    } catch (err: any) {
      setFlowError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setFlowLoading(false);
    }
  };

  const handleProceedToNewPassword = () => {
    if (otpInput.trim().length !== 6) {
      setFlowError('Please enter the complete 6-digit verification code.');
      return;
    }
    setFlowError(null);
    setStep('NEW_PASSWORD');
  };

  const handleSubmitNewPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      setFlowError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFlowError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setFlowLoading(true);
      setFlowError(null);
      await SettleApiService.changePassword(otpInput.trim(), newPassword);
      setStep('SUCCESS');
    } catch (err: any) {
      setFlowError(err.message || 'Failed to change password. Please verify the code and try again.');
    } finally {
      setFlowLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await SettleApiService.logout();
      router.replace('/auth' as any);
    } catch (err) {
      console.error('Logout error:', err);
      router.replace('/auth' as any);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader title="Account & Profile" onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Hero Avatar & Name */}
        <View style={styles.avatarHero}>
          <Avatar name={user?.name || 'User'} size="large" />
          <Text variant="headline" weight="bold" style={{ marginTop: 8 }}>
            {user?.name}
          </Text>
          <Text variant="bodySecondary" color={theme.colors.textMuted}>
            {user?.email}
          </Text>
        </View>

        {/* Simple & Clean Settle ID Card (Without Copy Icon) */}
        <Surface variant="elevated" style={styles.settleIdCard}>
          <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
            YOUR UNIQUE SETTLE ID
          </Text>
          <Text variant="title" weight="bold" color={theme.colors.primary} style={styles.settleIdText}>
            @{user?.settleId || 'settle_user'}
          </Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            Friends can search for you using your Settle ID to quickly split expenses and add you to groups.
          </Text>
        </Surface>

        {/* Account Details & Interactive Theme Selector Section */}
        <View style={styles.section}>
          <Text variant="caption" weight="bold" color={theme.colors.textMuted} style={styles.sectionTitle}>
            ACCOUNT SETTINGS
          </Text>

          <Surface variant="card" style={styles.infoRow}>
            <Text variant="body" weight="medium">
              Default Currency
            </Text>
            <Text variant="body" weight="bold" color={theme.colors.primary}>
              INR (₹)
            </Text>
          </Surface>

          {/* Change Password Action Card */}
          <Pressable onPress={openPasswordChangeModal}>
            <Surface variant="card" style={styles.interactiveRow}>
              <View style={{ gap: 2 }}>
                <Text variant="body" weight="semibold">
                  Change Password
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  Secure password update with email OTP
                </Text>
              </View>
              <Text variant="body" color={theme.colors.primary} weight="bold">
                Update →
              </Text>
            </Surface>
          </Pressable>

          {/* Interactive Theme Mode Selector */}
          <Surface variant="card" style={styles.themeSectionCard}>
            <View style={styles.themeHeaderRow}>
              <Text variant="body" weight="medium">
                Theme Mode
              </Text>
              <Text variant="caption" weight="semibold" color={theme.colors.textSecondary}>
                {themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'System'}
              </Text>
            </View>

            <View style={styles.themePillsRow}>
              {(['dark', 'light', 'system'] as const).map((mode) => {
                const isSelected = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => setThemeMode(mode)}
                    style={[
                      styles.themePill,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceSubtle,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      variant="bodySecondary"
                      weight={isSelected ? 'bold' : 'medium'}
                      color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                    >
                      {mode === 'dark' ? '🌙 Dark' : mode === 'light' ? '☀️ Light' : '⚙️ System'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>
        </View>

        {/* Action Buttons: Sign Out & Subtle Delete Account */}
        <View style={styles.footerSection}>
          <Button
            title="Sign Out"
            variant="subtle"
            size="large"
            onPress={handleLogout}
            loading={loggingOut}
          />

          {/* Subtle Delete Account Option */}
          <Pressable onPress={openDeleteAccountModal} style={styles.deleteAccountBtn}>
            <Text variant="caption" color={theme.colors.textMuted} weight="medium">
              Delete Account
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Delete Account Multi-Step Dialog Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Surface variant="elevated" style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text
                variant="title"
                weight="bold"
                color={
                  deleteStep === 'BLOCKED_OWE_OTHERS' || deleteStep === 'EMOTIONAL'
                    ? '#EF4444'
                    : theme.colors.textPrimary
                }
              >
                {deleteStep === 'BLOCKED_OWE_OTHERS'
                  ? 'Account Deletion Blocked'
                  : deleteStep === 'OWED_CREDITS'
                    ? 'Uncollected Money Notice'
                    : deleteStep === 'EMOTIONAL'
                      ? "We're sorry to see you go..."
                      : 'Delete Account?'}
              </Text>
              <Pressable onPress={() => setDeleteModalVisible(false)} hitSlop={10}>
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {/* STEP 0: LOADING STATUS */}
            {deleteStep === 'LOADING' && (
              <View style={[styles.modalBody, { paddingVertical: 24, alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text variant="caption" color={theme.colors.textMuted} style={{ marginTop: 8 }}>
                  Checking active debts & group balances...
                </Text>
              </View>
            )}

            {/* SCENARIO A: BLOCKED BECAUSE USER OWES MONEY TO OTHERS */}
            {deleteStep === 'BLOCKED_OWE_OTHERS' && (
              <View style={styles.modalBody}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={{ fontSize: 28 }}>🛑</Text>
                </View>

                <Text variant="body" weight="bold" style={{ textAlign: 'center', color: '#EF4444' }}>
                  Cannot Delete: Pending Unsettled Debts
                </Text>

                <View style={[styles.deleteWarningBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                  <Text variant="caption" color="#EF4444" weight="semibold" style={{ textAlign: 'center' }}>
                    You currently owe ₹{((deletionStatus?.totalOwedByYouMinor || 0) / 100).toFixed(2)} to your groups.
                  </Text>
                </View>

                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', lineHeight: 18 }}>
                  To maintain financial fairness, you must settle up all your pending dues with your group members before your account can be closed.
                </Text>

                <View style={styles.modalActions}>
                  <Button
                    title="Close"
                    variant="subtle"
                    onPress={() => setDeleteModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Go to Settle Up"
                    variant="primary"
                    onPress={() => {
                      setDeleteModalVisible(false);
                      router.push('/settle' as any);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* SCENARIO B: OTHERS OWE MONEY TO USER (WARNING WITH TOTAL COLLECTIBLE) */}
            {deleteStep === 'OWED_CREDITS' && (
              <View style={styles.modalBody}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Text style={{ fontSize: 28 }}>💰</Text>
                </View>

                <Text variant="body" weight="bold" style={{ textAlign: 'center' }}>
                  You are owed ₹{((deletionStatus?.totalOwedToYouMinor || 0) / 100).toFixed(2)} in total!
                </Text>

                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', lineHeight: 18 }}>
                  You still have uncollected money from your friends across active expense groups. If you delete your account now, your claim to these balances will be permanently forfeited.
                </Text>

                <Text variant="caption" weight="bold" color={theme.colors.textPrimary} style={{ textAlign: 'center' }}>
                  Do you still really want to delete your account?
                </Text>

                <View style={styles.modalActions}>
                  <Button
                    title="Keep & Collect"
                    variant="subtle"
                    onPress={() => setDeleteModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Yes, Continue"
                    variant="destructive"
                    onPress={() => setDeleteStep('EMOTIONAL')}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* SCENARIO C: FULLY SETTLED INITIAL CONFIRMATION */}
            {deleteStep === 'CONFIRM' && (
              <View style={styles.modalBody}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                  <Text style={{ fontSize: 28 }}>⚠️</Text>
                </View>

                <Text variant="body" weight="semibold" style={{ textAlign: 'center' }}>
                  Do you really want to delete your Settle account?
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', lineHeight: 18 }}>
                  All your shared groups are currently settled up. Deleting your account will remove your profile and activity logs permanently.
                </Text>

                <View style={styles.modalActions}>
                  <Button
                    title="Keep Account"
                    variant="subtle"
                    onPress={() => setDeleteModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Yes, Proceed"
                    variant="destructive"
                    onPress={() => setDeleteStep('EMOTIONAL')}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* FINAL EMOTIONAL FAREWELL & EXECUTION */}
            {deleteStep === 'EMOTIONAL' && (
              <View style={styles.modalBody}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Text style={{ fontSize: 28 }}>🥺</Text>
                </View>

                <Text variant="body" weight="bold" style={{ textAlign: 'center', color: theme.colors.textPrimary }}>
                  It won't be the same without you, {user?.name?.split(' ')[0] || 'friend'}.
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center', lineHeight: 18 }}>
                  Thank you for being part of Settle and splitting moments with your friends. If you ever want to come back, our doors are always open.
                </Text>

                <View style={[styles.deleteWarningBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                  <Text variant="caption" color="#EF4444" weight="semibold" style={{ textAlign: 'center' }}>
                    Final Confirmation: This action is permanent and cannot be undone.
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title="Nevermind"
                    variant="subtle"
                    onPress={() => setDeleteModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Delete Forever"
                    variant="destructive"
                    onPress={handleDeleteAccount}
                    loading={deletingAccount}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </Surface>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <Surface variant="elevated" style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text variant="title" weight="bold">
                Change Password
              </Text>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {/* Error Banner */}
            {flowError && (
              <View style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }]}>
                <Text variant="caption" color="#EF4444" weight="semibold">
                  {flowError}
                </Text>
              </View>
            )}

            {/* STEP 1: CONFIRMATION */}
            {step === 'CONFIRM' && (
              <View style={styles.modalBody}>
                <View style={styles.modalIconWrap}>
                  <Icon name="settings-outline" size={32} color={theme.colors.primary} />
                </View>
                <Text variant="body" weight="semibold" style={{ textAlign: 'center' }}>
                  Are you sure you want to change your password?
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center' }}>
                  For your security, we will send a 6-digit verification code to your registered email address ({user?.email}) to confirm it's you.
                </Text>

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="subtle"
                    onPress={() => setModalVisible(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Send OTP"
                    variant="primary"
                    onPress={handleRequestOtp}
                    loading={flowLoading}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === 'OTP' && (
              <View style={styles.modalBody}>
                <Text variant="body" weight="semibold">
                  Enter Verification Code
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  We sent a 6-digit code to {maskedEmail || user?.email}.
                </Text>

                <Input
                  placeholder="Enter 6-digit OTP"
                  value={otpInput}
                  onChangeText={(text) => setOtpInput(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  containerStyle={{ marginTop: 8 }}
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Back"
                    variant="subtle"
                    onPress={() => setStep('CONFIRM')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Verify OTP"
                    variant="primary"
                    onPress={handleProceedToNewPassword}
                    disabled={otpInput.trim().length !== 6}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* STEP 3: INPUT NEW PASSWORD */}
            {step === 'NEW_PASSWORD' && (
              <View style={styles.modalBody}>
                <Text variant="body" weight="semibold">
                  Set New Password
                </Text>
                <Text variant="caption" color={theme.colors.textMuted}>
                  Please choose a strong password with at least 8 characters.
                </Text>

                <Input
                  label="New Password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  containerStyle={{ marginTop: 8 }}
                />

                <Input
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  containerStyle={{ marginTop: 8 }}
                />

                <View style={styles.modalActions}>
                  <Button
                    title="Back"
                    variant="subtle"
                    onPress={() => setStep('OTP')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Update Password"
                    variant="primary"
                    onPress={handleSubmitNewPassword}
                    loading={flowLoading}
                    disabled={!newPassword || newPassword.length < 8 || !confirmPassword}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}

            {/* STEP 4: SUCCESS */}
            {step === 'SUCCESS' && (
              <View style={styles.modalBody}>
                <View style={[styles.modalIconWrap, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={{ fontSize: 28 }}>✓</Text>
                </View>
                <Text variant="title" weight="bold" style={{ textAlign: 'center', marginTop: 4 }}>
                  Password Updated!
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center' }}>
                  Your password has been changed securely. All existing sessions have been refreshed.
                </Text>

                <Button
                  title="Done"
                  variant="primary"
                  onPress={() => setModalVisible(false)}
                  style={{ marginTop: 14, width: '100%' }}
                />
              </View>
            )}
          </Surface>
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
    gap: 20,
  },
  avatarHero: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  settleIdCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    gap: 6,
  },
  settleIdText: {
    fontSize: 22,
    marginTop: 2,
    marginBottom: 4,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    letterSpacing: 0.8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
  },
  interactiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
  },
  themeSectionCard: {
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themePillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxWidth: 420,
    width: '100%',
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBody: {
    gap: 12,
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  deleteWarningBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  footerSection: {
    marginTop: 12,
    alignItems: 'center',
    gap: 16,
  },
  deleteAccountBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
