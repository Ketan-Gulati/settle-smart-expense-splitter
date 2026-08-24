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

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { returnUrl } = useLocalSearchParams<{ returnUrl?: string }>();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSendReset = async () => {
    setError(null);
    setSuccessMessage(null);
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const res = await SettleApiService.forgotPassword(cleanEmail);
      setSuccessMessage(
        res.message || 'If an account exists with that email, reset instructions have been sent.'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const returnParam = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';

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
          {/* Back Navigation */}
          <Pressable
            onPress={() => router.push(`/auth${returnParam}` as any)}
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
              Reset your password
            </Text>
            <Text
              variant="bodySecondary"
              style={[styles.subheadline, { color: theme.colors.textSecondary }]}
            >
              Enter the email address associated with your Settle account and we will send you instructions.
            </Text>
          </View>

          {/* Error / Success Banners */}
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

          {successMessage && (
            <View
              style={[
                styles.alertBanner,
                {
                  backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
                  borderColor: theme.isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                },
              ]}
            >
              <Text variant="caption" weight="medium" style={{ color: theme.colors.positive }}>
                {successMessage}
              </Text>
            </View>
          )}

          <View style={styles.formSection}>
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (error) setError(null);
              }}
              containerStyle={{ marginBottom: 16 }}
            />

            <Pressable
              disabled={loading}
              onPress={handleSendReset}
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
                  Send Reset Instructions
                </Text>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => router.push(`/auth${returnParam}` as any)}
              hitSlop={8}
            >
              <Text variant="bodySecondary" weight="medium" style={{ color: theme.colors.textSecondary }}>
                Remember your password?{' '}
                <Text weight="bold" style={{ color: theme.colors.primary }}>
                  Sign in
                </Text>
              </Text>
            </Pressable>
          </View>
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
    marginBottom: 26,
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
  alertBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  formSection: {
    marginBottom: 12,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
});
