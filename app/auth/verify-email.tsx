import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Text } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';

export default function VerifyEmailScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (!token) {
      setError('Verification token is missing from the link.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await SettleApiService.verifyEmail(token);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Verification link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    handleVerify();
  }, [handleVerify]);

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.contentWrapper}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="body" style={{ marginTop: 16, color: theme.colors.textMuted }}>
              Verifying your email address...
            </Text>
          </View>
        ) : success ? (
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
              Email Verified!
            </Text>
            <Text
              variant="bodySecondary"
              style={[styles.subheadline, { color: theme.colors.textSecondary, textAlign: 'center' }]}
            >
              Your Settle account email has been verified successfully. You can now access all features.
            </Text>
            <Pressable
              onPress={() => router.replace('/(tabs)' as any)}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.88 : 1,
                  marginTop: 24,
                },
              ]}
            >
              <Text variant="body" weight="bold" style={{ color: theme.colors.primaryForeground }}>
                Continue to Settle →
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.center}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: theme.isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' },
              ]}
            >
              <Text style={{ fontSize: 32 }}>⚠️</Text>
            </View>
            <Text
              variant="displayLarge"
              weight="bold"
              style={[styles.headline, { color: theme.colors.textPrimary, textAlign: 'center' }]}
            >
              Verification Failed
            </Text>
            <Text
              variant="bodySecondary"
              style={[styles.subheadline, { color: theme.colors.textSecondary, textAlign: 'center' }]}
            >
              {error || 'This verification link is invalid or expired.'}
            </Text>
            <Pressable
              onPress={() => router.replace('/auth' as any)}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.88 : 1,
                  marginTop: 24,
                },
              ]}
            >
              <Text variant="body" weight="bold" style={{ color: theme.colors.primaryForeground }}>
                Back to Sign In
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});
