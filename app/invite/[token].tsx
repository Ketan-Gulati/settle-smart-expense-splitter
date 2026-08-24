import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Text, Button, Surface, Avatar } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { InvitePreviewDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function InviteJoinScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { token, code } = useLocalSearchParams<{ token?: string; code?: string }>();
  const inviteIdentifier = (token || code || '').trim();

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [preview, setPreview] = useState<InvitePreviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | 'GENERIC' | null>(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);

  const loadInvite = useCallback(async () => {
    if (!inviteIdentifier) {
      setError('No invitation link or code provided.');
      setErrorType('NOT_FOUND');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setErrorType(null);

      const [previewData, meUser] = await Promise.all([
        SettleApiService.resolveInvite(inviteIdentifier),
        isAuthenticated
          ? SettleApiService.getMe().catch(() => null)
          : Promise.resolve(null),
      ]);

      setPreview(previewData);
      if (meUser) {
        const alreadyIn = previewData.members.some((m) => m.id === meUser.id);
        setIsAlreadyMember(alreadyIn);
      } else {
        setIsAlreadyMember(false);
      }
    } catch (err: any) {
      const msg = err.message || 'Invitation is invalid, expired, or revoked.';
      setError(msg);
      if (err.code === 'INVITE_REVOKED' || msg.toLowerCase().includes('revoked')) {
        setErrorType('REVOKED');
      } else if (err.code === 'INVITE_EXPIRED' || msg.toLowerCase().includes('expired')) {
        setErrorType('EXPIRED');
      } else if (err.code === 'INVITE_NOT_FOUND' || msg.toLowerCase().includes('not found')) {
        setErrorType('NOT_FOUND');
      } else {
        setErrorType('GENERIC');
      }
    } finally {
      setLoading(false);
    }
  }, [inviteIdentifier, isAuthenticated]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  const handleJoin = async () => {
    if (!inviteIdentifier) return;

    if (!isAuthenticated) {
      // Preserve invitation state and direct to Auth screen
      router.push(`/auth?returnUrl=/invite/${encodeURIComponent(inviteIdentifier)}` as any);
      return;
    }

    try {
      setJoining(true);
      setError(null);
      const joinedGroup = await SettleApiService.joinGroupViaInvite(inviteIdentifier);
      notifyDataChanged();
      router.replace(`/groups/${joinedGroup.id}` as any);
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
      setErrorType('GENERIC');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top Header Bar */}
      <View style={[styles.header, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Pressable onPress={() => router.replace('/(tabs)/groups' as any)} style={styles.closeBtn}>
          <Text variant="body" weight="semibold" color={theme.colors.primary}>
            ✕ Cancel
          </Text>
        </Pressable>
        <Text variant="title" weight="bold">
          Settle
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="body" color={theme.colors.textMuted} style={{ marginTop: 14 }}>
              Verifying group invitation...
            </Text>
          </View>
        ) : error ? (
          <Surface variant="elevated" style={styles.errorCard}>
            <View style={[styles.statusIconCircle, { backgroundColor: '#FEE2E2' }]}>
              <Text style={{ fontSize: 28 }}>
                {errorType === 'REVOKED' ? '🔒' : errorType === 'EXPIRED' ? '⏰' : '⚠️'}
              </Text>
            </View>

            <Text variant="displayLarge" weight="bold" style={{ textAlign: 'center' }}>
              {errorType === 'REVOKED'
                ? 'Invitation Revoked'
                : errorType === 'EXPIRED'
                  ? 'Invitation Expired'
                  : "Invalid Invite"}
            </Text>

            <Text variant="body" color={theme.colors.textMuted} style={styles.errorDescription}>
              {errorType === 'REVOKED'
                ? 'This invitation is no longer active. Ask the group creator for a new invite link.'
                : errorType === 'EXPIRED'
                  ? 'This invite link has expired. Ask the group creator to share a fresh link.'
                  : error}
            </Text>

            <View style={styles.actionColumn}>
              {errorType === 'GENERIC' && (
                <Button
                  title="Try Again"
                  variant="subtle"
                  size="large"
                  onPress={loadInvite}
                  style={{ width: '100%' }}
                />
              )}
              <Button
                title="Back to Settle"
                variant="primary"
                size="large"
                onPress={() => router.replace('/(tabs)/groups' as any)}
                style={{ width: '100%' }}
              />
            </View>
          </Surface>
        ) : preview ? (
          <View style={styles.previewContainer}>
            {/* Friendly Welcoming Header */}
            <View style={styles.welcomeSection}>
              <Text variant="body" weight="medium" color={theme.colors.textSecondary}>
                You're invited 👋
              </Text>
              <Text variant="displayHero" weight="bold" style={styles.headlineText}>
                {preview.createdByName} invited you to join {preview.groupName}
              </Text>
              <Text variant="body" color={theme.colors.textMuted} style={styles.subheadline}>
                Join {preview.createdByName} and the group to split expenses, track balances, and settle up without spreadsheet headaches.
              </Text>
            </View>

            {/* Clean Group Metadata Card */}
            <Surface variant="elevated" style={styles.groupCard}>
              <View style={styles.groupCardTop}>
                <View style={[styles.typeIconBox, { backgroundColor: theme.colors.primary }]}>
                  <Text style={{ fontSize: 24 }}>
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
                <View style={{ flex: 1 }}>
                  <Text variant="title" weight="bold">
                    {preview.groupName}
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    {preview.memberCount} members • Split in ₹ {preview.currency}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.membersSection}>
                <Text variant="caption" weight="bold" color={theme.colors.textMuted}>
                  GROUP MEMBERS ({preview.memberCount})
                </Text>
                <View style={styles.memberChips}>
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
            </Surface>

            {/* Primary Action Button */}
            {isAlreadyMember ? (
              <View style={styles.alreadyMemberBox}>
                <Text variant="body" weight="medium" color={theme.colors.positive} align="center">
                  ✓ You're already a member of this group
                </Text>
                <Button
                  title={`Open ${preview.groupName} →`}
                  variant="primary"
                  size="large"
                  onPress={() => router.replace(`/groups/${preview.groupId}` as any)}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </View>
            ) : (
              <Button
                title={
                  joining
                    ? 'Joining Group...'
                    : !isAuthenticated
                      ? `Continue to Join ${preview.groupName} →`
                      : `Join ${preview.groupName} →`
                }
                variant="primary"
                size="large"
                onPress={handleJoin}
                loading={joining}
                style={styles.mainCtaBtn}
              />
            )}

            {!isAuthenticated && (
              <Text variant="caption" color={theme.colors.textMuted} align="center" style={{ marginTop: 4 }}>
                You will return to this group invitation immediately after sign in.
              </Text>
            )}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    paddingVertical: 4,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  center: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    padding: 28,
    borderRadius: 24,
    gap: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  statusIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  errorDescription: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
  },
  actionColumn: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  previewContainer: {
    gap: 24,
    marginTop: 10,
  },
  welcomeSection: {
    gap: 8,
  },
  headlineText: {
    fontSize: 28,
    lineHeight: 34,
  },
  subheadline: {
    lineHeight: 22,
    marginTop: 2,
  },
  groupCard: {
    padding: 20,
    borderRadius: 20,
    gap: 16,
  },
  groupCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  typeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  membersSection: {
    gap: 10,
  },
  memberChips: {
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
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  alreadyMemberBox: {
    gap: 8,
    marginTop: 8,
  },
  mainCtaBtn: {
    marginTop: 8,
  },
});
