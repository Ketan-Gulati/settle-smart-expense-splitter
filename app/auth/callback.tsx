import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Text } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { TokenStorage } from '@/services/api/tokenStorage';
import { useAppStore } from '@/store/appStore';

export default function AuthCallbackScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { accessToken, refreshToken, returnUrl, state } = useLocalSearchParams<{
    accessToken?: string;
    refreshToken?: string;
    returnUrl?: string;
    state?: string;
  }>();

  const initSession = useAppStore((s) => s.initSession);

  useEffect(() => {
    async function processCallback() {
      if (accessToken && refreshToken) {
        await TokenStorage.setAccessToken(accessToken);
        await TokenStorage.setRefreshToken(refreshToken);
        await initSession();

        const targetUrl = returnUrl || state;
        if (targetUrl && targetUrl.startsWith('/')) {
          router.replace(decodeURIComponent(targetUrl) as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      } else {
        router.replace('/auth?error=Failed to complete Google authentication.' as any);
      }
    }

    processCallback();
  }, [accessToken, refreshToken, returnUrl, state, initSession, router]);

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="body" weight="medium" style={{ marginTop: 16, color: theme.colors.textSecondary }}>
          Completing sign in...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
