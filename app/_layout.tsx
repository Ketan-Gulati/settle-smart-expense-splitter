import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useDatabaseInit } from '@/hooks/useDatabaseInit';

export default function RootLayout() {
  const theme = useAppTheme();
  const { isReady, error } = useDatabaseInit();

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
