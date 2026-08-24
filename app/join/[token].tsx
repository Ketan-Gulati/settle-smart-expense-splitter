import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, Button, Surface, Avatar } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { InvitePreviewDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function JoinGroupScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [preview, setPreview] = useState<InvitePreviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    SettleApiService.resolveInvite(token)
      .then(setPreview)
      .catch((err) => {
        setError(err.message || 'Invitation is invalid, expired, or revoked.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;

    if (!isAuthenticated) {
      // Direct user to auth screen, then return here
      router.push(`/auth?returnUrl=/join/${token}` as any);
      return;
    }

    try {
      setJoining(true);
      setError(null);
      const joinedGroup = await SettleApiService.joinGroupViaInvite(token);
      notifyDataChanged();
      router.replace(`/groups/${joinedGroup.id}` as any);
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Pressable onPress={() => router.replace('/(tabs)/groups' as any)} style={styles.backBtn}>
          <Text variant="body" weight="semibold" color={theme.colors.primary}>
            ✕ Cancel
          </Text>
        </Pressable>
        <Text variant="title" weight="bold">
          Group Invitation
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="body" color={theme.colors.textMuted} style={{ marginTop: 12 }}>
              Verifying invitation...
            </Text>
          </View>
        ) : error ? (
          <Surface variant="card" style={styles.errorCard}>
            <Text variant="title" weight="bold" color={theme.colors.negative}>
              ⚠️ Invalid Invitation
            </Text>
            <Text variant="body" color={theme.colors.textMuted}>
              {error}
            </Text>
            <Button
              title="Return to Groups"
              variant="primary"
              size="medium"
              onPress={() => router.replace('/(tabs)/groups' as any)}
              style={{ marginTop: 12 }}
            />
          </Surface>
        ) : preview ? (
          <View style={styles.previewContainer}>
            <Surface variant="elevated" style={styles.previewCard}>
              <View style={[styles.groupIconBox, { backgroundColor: theme.colors.primary }]}>
                <Text variant="headline" color={theme.colors.primaryForeground}>
                  {preview.groupType === 'TRIP'
                    ? '✈️'
                    : preview.groupType === 'APARTMENT'
                      ? '🏠'
                      : preview.groupType === 'HOME'
                        ? '🏡'
                        : preview.groupType === 'COUPLE'
                          ? '❤️'
                          : '👥'}
                </Text>
              </View>

              <Text variant="displayLarge" weight="bold" style={styles.groupTitle}>
                {preview.groupName}
              </Text>

              <Text variant="body" color={theme.colors.textMuted}>
                Created by <Text variant="body" weight="bold">{preview.createdByName}</Text>
              </Text>

              <View style={styles.divider} />

              <View style={styles.membersSection}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  MEMBERS ALREADY IN GROUP ({preview.memberCount})
                </Text>
                <View style={styles.memberAvatarRow}>
                  {preview.members.map((m) => (
                    <View key={m.id} style={styles.memberChip}>
                      <Avatar name={m.name} size="small" />
                      <Text variant="bodySecondary" weight="medium">
                        {m.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.currencyBanner, { backgroundColor: theme.colors.surfaceSubtle }]}>
                <Text variant="caption" color={theme.colors.textMuted}>
                  CURRENCY
                </Text>
                <Text variant="body" weight="bold">
                  ₹ {preview.currency} (All expenses split in {preview.currency})
                </Text>
              </View>
            </Surface>

            <Button
              title={
                joining
                  ? 'Joining Group...'
                  : !isAuthenticated
                    ? 'Sign In to Join Group'
                    : `Join ${preview.groupName} →`
              }
              variant="primary"
              size="large"
              onPress={handleJoin}
              loading={joining}
              style={styles.joinBtn}
            />
          </View>
        ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    padding: 24,
    borderRadius: 16,
    gap: 10,
    alignItems: 'center',
    textAlign: 'center',
  },
  previewContainer: {
    gap: 20,
  },
  previewCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  groupIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  groupTitle: {
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
    marginVertical: 6,
  },
  membersSection: {
    width: '100%',
    gap: 10,
  },
  memberAvatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  currencyBanner: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    gap: 2,
    alignItems: 'center',
    marginTop: 6,
  },
  joinBtn: {
    marginTop: 10,
  },
});
