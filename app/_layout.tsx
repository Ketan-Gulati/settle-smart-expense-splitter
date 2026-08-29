import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useDatabaseInit } from '@/hooks/useDatabaseInit';
import { useAppStore } from '@/store/appStore';

export default function RootLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const { isReady, error } = useDatabaseInit();
  const { isAuthenticated, isSessionLoading, initSession } = useAppStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (!isReady || isSessionLoading) return;

    const isCallback = segments[0] === 'auth' && segments[1] === 'callback';
    if (isCallback) return; // Allow auth/callback to process tokens without interference

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isSessionLoading, isReady, segments, router]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'settle-global-outline-reset';
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        input, textarea, select, [contenteditable="true"] {
          outline: none !important;
          outline-style: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
          color: ${theme.colors.textPrimary} !important;
          -webkit-text-fill-color: ${theme.colors.textPrimary} !important;
          background-color: transparent !important;
        }
        input:focus, textarea:focus, select:focus {
          outline: none !important;
          outline-style: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
          color: ${theme.colors.textPrimary} !important;
          -webkit-text-fill-color: ${theme.colors.textPrimary} !important;
        }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px ${theme.colors.surface} inset !important;
          box-shadow: 0 0 0 1000px ${theme.colors.surface} inset !important;
          -webkit-text-fill-color: ${theme.colors.textPrimary} !important;
          color: ${theme.colors.textPrimary} !important;
          caret-color: ${theme.colors.primary} !important;
          border-radius: 8px !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        input::placeholder, textarea::placeholder {
          color: ${theme.colors.textMuted} !important;
          -webkit-text-fill-color: ${theme.colors.textMuted} !important;
          opacity: 1 !important;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `;
    }
  }, [theme]);

  useEffect(() => {
    if (error) {
      console.error('Failed to initialize local database:', error);
    }
  }, [error]);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Initializing Settle...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: theme.typography.fontWeights.semibold,
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="design-sandbox" options={{ title: 'Design Sandbox' }} />
        <Stack.Screen name="onboarding" options={{ title: 'Welcome', headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: 'Sign In', presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
