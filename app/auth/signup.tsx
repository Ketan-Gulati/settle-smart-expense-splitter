import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Text, Input } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppStore } from '@/store/appStore';

// Custom SVG Google Icon Component
const GoogleLogo = () => (
  <View style={{ width: 18, height: 18, marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
    {Platform.OS === 'web' ? (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
    ) : (
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#4285F4' }}>G</Text>
    )}
  </View>
);

export default function SignUpScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { returnUrl } = useLocalSearchParams<{ returnUrl?: string }>();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useAppStore((state) => state.register);

  const navigatePostAuth = () => {
    if (returnUrl) {
      router.replace(decodeURIComponent(returnUrl) as any);
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleSignUp = async () => {
    setError(null);
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanName) {
      setError('Please enter your full name');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }
    if (!cleanPass) {
      setError('Please choose a password');
      return;
    }
    if (cleanPass.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await register(cleanName, cleanEmail, cleanPass);
      navigatePostAuth();
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const stateParam = returnUrl ? encodeURIComponent(returnUrl) : '';
      const apiRoot = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://settle-smart-expense-splitter.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');
      const googleAuthUrl = `${apiRoot}/api/v1/auth/google?state=${stateParam}`;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = googleAuthUrl;
      } else {
        await Linking.openURL(googleAuthUrl);
      }
    } catch {
      setError('Unable to initiate Google authentication.');
      setGoogleLoading(false);
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
          {/* Top Brand & Header Section */}
          <View style={styles.brandHeader}>
            <Text
              variant="label"
              weight="bold"
              style={[styles.brandWordmark, { color: theme.colors.primary }]}
            >
              SETTLE
            </Text>
            <Text
              variant="displayLarge"
              weight="bold"
              style={[styles.headline, { color: theme.colors.textPrimary }]}
            >
              Create your Settle account
            </Text>
            <Text
              variant="bodySecondary"
              style={[styles.subheadline, { color: theme.colors.textSecondary }]}
            >
              Start splitting expenses with friends, roommates and groups.
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <View
              style={[
                styles.errorBanner,
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

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Input
              label="Full Name"
              placeholder="Your Name"
              autoCapitalize="words"
              autoCorrect={false}
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (error) setError(null);
              }}
              containerStyle={styles.inputContainer}
            />

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
              containerStyle={styles.inputContainer}
            />

            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (error) setError(null);
              }}
              containerStyle={styles.inputContainer}
              iconRight={
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  style={styles.eyeBtn}
                >
                  <Text variant="caption" weight="semibold" style={{ color: theme.colors.textMuted }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              }
            />

            <Input
              label="Confirm password"
              placeholder="Repeat your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (error) setError(null);
              }}
              containerStyle={styles.inputContainer}
            />
          </View>

          {/* Primary CTA: Create Account */}
          <Pressable
            disabled={loading || googleLoading}
            onPress={handleSignUp}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: loading || googleLoading ? 0.7 : pressed ? 0.88 : 1,
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
                Create account
              </Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            <Text
              variant="caption"
              weight="medium"
              style={[styles.dividerText, { color: theme.colors.textMuted }]}
            >
              or
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Alternative: Google Auth */}
          <Pressable
            disabled={loading || googleLoading}
            onPress={handleGoogleAuth}
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: theme.colors.surfaceSubtle,
                borderColor: theme.colors.border,
                opacity: googleLoading ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
            ) : (
              <View style={styles.btnRow}>
                <GoogleLogo />
                <Text variant="body" weight="medium" style={{ color: theme.colors.textPrimary }}>
                  Continue with Google
                </Text>
              </View>
            )}
          </Pressable>

          {/* Footer: Sign In Switch */}
          <View style={styles.footerRow}>
            <Text variant="bodySecondary" style={{ color: theme.colors.textSecondary }}>
              Already have an account?{' '}
            </Text>
            <Pressable
              onPress={() => router.push(`/auth${returnParam}` as any)}
              hitSlop={8}
            >
              <Text variant="bodySecondary" weight="bold" style={{ color: theme.colors.primary }}>
                Sign in
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
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  formGroup: {
    gap: 2,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 8,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 14,
    fontSize: 13,
  },
  secondaryBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
});
