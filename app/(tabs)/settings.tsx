import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, DetailHeader, Avatar, Surface } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useUIStore } from '@/store/uiStore';
import { userRepository, UserEntity } from '@/repositories/userRepository';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { themeMode, setThemeMode } = useUIStore();
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);

  useEffect(() => {
    userRepository.getOrCreateDefaultUser().then(setCurrentUser);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader title="Settings" onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Surface variant="card" style={styles.profileCard}>
          <Avatar name={currentUser?.name || 'Alex'} size="large" />
          <View style={styles.profileInfo}>
            <Text variant="title" weight="bold">
              {currentUser?.name || 'Alex'}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              {currentUser?.email || 'alex@example.com'}
            </Text>
            <Text variant="label" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
              CURRENCY: {currentUser?.defaultCurrency || 'INR (₹)'}
            </Text>
          </View>
        </Surface>

        {/* Appearance Card */}
        <Surface variant="card" style={styles.sectionCard}>
          <Text variant="headline" weight="bold" style={styles.sectionTitle}>
            Appearance
          </Text>
          <Text variant="caption" color={theme.colors.textMuted} style={styles.sectionSub}>
            Choose your preferred color theme
          </Text>

          <View style={styles.themeRow}>
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const isSelected = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.surfaceMuted,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    variant="body"
                    weight="bold"
                    color={isSelected ? theme.colors.primaryForeground : theme.colors.textPrimary}
                    style={{ textTransform: 'capitalize' }}
                  >
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Surface>

        {/* Application Info */}
        <Surface variant="subtle" style={styles.infoCard}>
          <Text variant="label" color={theme.colors.textMuted}>
            SETTLE PRO
          </Text>
          <Text variant="caption" color={theme.colors.textSecondary}>
            Version 1.0.0 · Smart Debt Simplification Engine
          </Text>
        </Surface>
      </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
    marginTop: 8,
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sectionSub: {
    marginTop: -6,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
});
