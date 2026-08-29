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
      let token = accessToken;
      let refresh = refreshToken;
      let target = returnUrl || state;

      if (typeof window !== 'undefined' && window.location?.search) {
        const params = new URLSearchParams(window.location.search);
        token = token || params.get('accessToken') || undefined;
        refresh = refresh || params.get('refreshToken') || undefined;
        target = target || params.get('returnUrl') || params.get('state') || undefined;
      }

      if (token && refresh) {
        await TokenStorage.setAccessToken(token);
        await TokenStorage.setRefreshToken(refresh);
        
        try {
          const user = await SettleApiService.getMe();
          useAppStore.setState({ currentUser: user, isAuthenticated: true, isSessionLoading: false });
        } catch {
          await initSession();
        }

        if (target && target.startsWith('/')) {
          router.replace(decodeURIComponent(target) as any);
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
