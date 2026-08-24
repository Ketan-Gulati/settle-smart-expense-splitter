import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Text, Input } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';

export default function ResetPasswordScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!token) {
      setError('Password reset token is missing from the link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await SettleApiService.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {success ? (
            <View style={styles.center}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
                ]}
              >
                <Text style={{ fontSize: 32 }}>✓</Text>
              </View>
              <Text
                variant="displayLarge"
                weight="bold"
                style={[styles.headline, { color: theme.colors.textPrimary, textAlign: 'center' }]}
              >
                Password Updated!
              </Text>
              <Text
                variant="bodySecondary"
                style={[styles.subheadline, { color: theme.colors.textSecondary, textAlign: 'center' }]}
              >
                Your password has been changed successfully. You can now sign in with your new password.
              </Text>
              <Pressable
                onPress={() => router.replace('/auth' as any)}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.88 : 1,
                    marginTop: 20,
                  },
                ]}
              >
                <Text variant="body" weight="bold" style={{ color: theme.colors.primaryForeground }}>
                  Sign In with New Password
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Back Navigation */}
              <Pressable
                onPress={() => router.replace('/auth' as any)}
                style={styles.backBtn}
                hitSlop={8}
              >
                <Text variant="body" weight="medium" style={{ color: theme.colors.textSecondary }}>
                  ← Back to sign in
                </Text>
              </Pressable>

              {/* Header */}
              <View style={styles.brandHeader}>
                <Text
                  variant="label"
                  weight="bold"
                  style={[styles.brandWordmark, { color: theme.colors.primary }]}
                >
                  SETTLE SECURITY
                </Text>
                <Text
                  variant="displayLarge"
                  weight="bold"
                  style={[styles.headline, { color: theme.colors.textPrimary }]}
                >
                  Choose new password
                </Text>
                <Text
                  variant="bodySecondary"
                  style={[styles.subheadline, { color: theme.colors.textSecondary }]}
                >
                  Please choose a strong password with at least 8 characters.
                </Text>
              </View>

              {/* Error Banner */}
              {error && (
                <View
                  style={[
                    styles.alertBanner,
                    {
                      backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                      borderColor: theme.isDark ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                    },
                  ]}
                >
                  <Text variant="caption" weight="medium" style={{ color: theme.colors.negative }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Inputs */}
              <View style={styles.formGroup}>
                <Input
                  label="New password"
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError(null);
                  }}
                  containerStyle={{ marginBottom: 12 }}
                />

                <Input
                  label="Confirm new password"
                  placeholder="Repeat new password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (error) setError(null);
                  }}
                  containerStyle={{ marginBottom: 16 }}
                />
              </View>

              <Pressable
                disabled={loading}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: loading ? 0.7 : pressed ? 0.88 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                ) : (
                  <Text
                    variant="body"
                    weight="bold"
                    style={{ color: theme.colors.primaryForeground }}
                  >
                    Update Password
                  </Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  brandHeader: {
    marginBottom: 24,
  },
  brandWordmark: {
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 8,
  },
  headline: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 14,
    lineHeight: 20,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alertBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 8,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
