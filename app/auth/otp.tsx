import { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Text, Input } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppStore } from '@/store/appStore';
import { SettleApiService } from '@/services/api/settleApi';

export default function OtpScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { returnUrl, email: initialEmail } = useLocalSearchParams<{ returnUrl?: string; email?: string }>();

  const [step, setStep] = useState<'REQUEST_EMAIL' | 'ENTER_OTP'>(
    initialEmail ? 'ENTER_OTP' : 'REQUEST_EMAIL'
  );
  const [email, setEmail] = useState(initialEmail || '');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const navigatePostAuth = () => {
    if (returnUrl) {
      router.replace(decodeURIComponent(returnUrl) as any);
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleSendCode = async () => {
    setError(null);
    setSuccessMessage(null);
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const res = await SettleApiService.sendOtp(cleanEmail, 'LOGIN');
      setSuccessMessage(res.message || 'Verification code sent to your email.');
      setStep('ENTER_OTP');
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (value: string, index: number) => {
    setError(null);
    const newDigits = [...otpDigits];

    // Support pasting full 6 digit code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      pasted.forEach((char, i) => {
        newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    setError(null);
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }

    try {
      setLoading(true);
      const result: any = await SettleApiService.verifyOtp({
        email: email.trim(),
        purpose: 'LOGIN',
        otp: fullOtp,
      });

      if (result && result.user) {
        useAppStore.setState({ currentUser: result.user, isAuthenticated: true });
        navigatePostAuth();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (val: string) => {
    if (!val) return '';
    const parts = val.split('@');
    if (parts.length !== 2) return val;
    const namePart = parts[0] || '';
    const masked = namePart.length > 2 ? `${namePart[0]}***${namePart.slice(-1)}` : `${namePart[0] || ''}***`;
    return `${masked}@${parts[1] || ''}`;
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
            onPress={() => {
              if (step === 'ENTER_OTP' && !initialEmail) {
                setStep('REQUEST_EMAIL');
                setError(null);
                setSuccessMessage(null);
              } else {
                router.push(`/auth${returnParam}` as any);
              }
            }}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Text variant="body" weight="medium" style={{ color: theme.colors.textSecondary }}>
              ← {step === 'ENTER_OTP' ? 'Change email' : 'Back to sign in'}
            </Text>
          </Pressable>

          {/* Header */}
          <View style={styles.brandHeader}>
            <Text
              variant="label"
              weight="bold"
              style={[styles.brandWordmark, { color: theme.colors.primary }]}
            >
              SETTLE OTP
            </Text>
            <Text
              variant="displayLarge"
              weight="bold"
              style={[styles.headline, { color: theme.colors.textPrimary }]}
            >
              {step === 'REQUEST_EMAIL' ? 'Sign in with Email Code' : 'Verify your email'}
            </Text>
            <Text
              variant="bodySecondary"
              style={[styles.subheadline, { color: theme.colors.textSecondary }]}
            >
              {step === 'REQUEST_EMAIL'
                ? 'We will send a 6-digit one-time code to verify your identity.'
                : `We sent a 6-digit code to ${maskEmail(email)}`}
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

          {successMessage && !error && (
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

          {step === 'REQUEST_EMAIL' ? (
            /* Step 1: Input Email */
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
                onPress={handleSendCode}
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
                    Send Verification Code
                  </Text>
                )}
              </Pressable>
            </View>
          ) : (
            /* Step 2: Enter 6-digit OTP */
            <View style={styles.formSection}>
              {/* 6 Digit Input Boxes */}
              <View style={styles.otpBoxesRow}>
                {otpDigits.map((digit, idx) => {
                  const isFilled = Boolean(digit);
                  return (
                    <TextInput
                      key={idx}
                      ref={(r) => {
                        inputRefs.current[idx] = r;
                      }}
                      value={digit}
                      onChangeText={(val) => handleDigitChange(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus={idx === 0}
                      selectTextOnFocus
                      placeholder="·"
                      placeholderTextColor={theme.colors.textMuted}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: theme.colors.surfaceSubtle,
                          borderColor: isFilled ? theme.colors.primary : theme.colors.border,
                          borderWidth: isFilled ? 2 : 1.5,
                          color: theme.colors.textPrimary,
                        },
                        Platform.OS === 'web'
                          ? ({
                              outline: 'none',
                              boxShadow: 'none',
                              textAlign: 'center',
                            } as any)
                          : undefined,
                      ]}
                    />
                  );
                })}
              </View>

              {/* Resend Action */}
              <View style={styles.resendRow}>
                <Text variant="caption" style={{ color: theme.colors.textMuted }}>
                  Didn't receive it?{' '}
                </Text>
                {cooldown > 0 ? (
                  <Text variant="caption" weight="medium" style={{ color: theme.colors.textSecondary }}>
                    Resend available in {cooldown}s
                  </Text>
                ) : (
                  <Pressable disabled={loading} onPress={handleSendCode} hitSlop={6}>
                    <Text variant="caption" weight="bold" style={{ color: theme.colors.primary }}>
                      Resend code
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Primary Verify Button */}
              <Pressable
                disabled={loading}
                onPress={handleVerifyOtp}
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
                    Verify & Sign In
                  </Text>
                )}
              </Pressable>
            </View>
          )}

          {/* Footer Password Switch */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => router.push(`/auth${returnParam}` as any)}
              hitSlop={8}
            >
              <Text variant="bodySecondary" weight="medium" style={{ color: theme.colors.textSecondary }}>
                Prefer password? <Text weight="bold" style={{ color: theme.colors.primary }}>Sign in with password</Text>
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
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    marginBottom: 20,
  },
  otpBox: {
    flex: 1,
    minWidth: 44,
    maxWidth: 54,
    height: 56,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    padding: 0,
  } as any,
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
});
