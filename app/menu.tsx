import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, DetailHeader, Avatar, Surface, Button, Icon } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';
import { NotificationDTO } from '@/services/api/types';
import { useAppStore } from '@/store/appStore';

export default function MenuActionCenterScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const notifyDataChanged = useAppStore((s) => s.notifyDataChanged);

  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'HISTORY'>('ACTIONS');
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await SettleApiService.getNotifications();
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleRespond = async (notificationId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      setProcessingId(notificationId);
      await SettleApiService.respondToNotification(notificationId, action);
      await loadNotifications();
      notifyDataChanged();
    } catch (err) {
      console.error('Failed to respond to notification:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      setProcessingId(notificationId);
      await SettleApiService.dismissNotification(notificationId);
      await loadNotifications();
      notifyDataChanged();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingNotifications = notifications.filter((n) => n.status === 'PENDING');
  const historyNotifications = notifications.filter((n) => n.status !== 'PENDING');

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DetailHeader title="Notifications" onBackPress={() => router.back()} />

      {/* Action Center Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.borderSubtle }]}>
        <Pressable
          onPress={() => setActiveTab('ACTIONS')}
          style={[
            styles.tabItem,
            activeTab === 'ACTIONS' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            variant="body"
            weight={activeTab === 'ACTIONS' ? 'bold' : 'medium'}
            color={activeTab === 'ACTIONS' ? theme.colors.primary : theme.colors.textMuted}
          >
            Action Center {pendingNotifications.length > 0 ? `(${pendingNotifications.length})` : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('HISTORY')}
          style={[
            styles.tabItem,
            activeTab === 'HISTORY' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            variant="body"
            weight={activeTab === 'HISTORY' ? 'bold' : 'medium'}
            color={activeTab === 'HISTORY' ? theme.colors.primary : theme.colors.textMuted}
          >
            History
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : activeTab === 'ACTIONS' ? (
          /* ACTION CENTER: PENDING NOTIFICATIONS & INVITATIONS */
          <View style={styles.section}>
            {pendingNotifications.length === 0 ? (
              <Surface variant="subtle" style={styles.emptyCard}>
                <View style={styles.bellIconWrap}>
                  <Icon name="notifications-outline" size={28} color={theme.colors.textMuted} />
                </View>
                <Text variant="title" weight="bold" style={{ marginTop: 8 }}>
                  Action Center Clear
                </Text>
                <Text variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center' }}>
                  You have no pending group invitations or required actions.
                </Text>
              </Surface>
            ) : (
              pendingNotifications.map((notif) => {
                const isBusy = processingId === notif.id;
                const isInvite = notif.type === 'GROUP_INVITE';

                return (
                  <Surface key={notif.id} variant="elevated" style={styles.inviteCard}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.inviteHeader}>
                        <Avatar name={notif.actorName || 'Settle User'} size="medium" />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="body" weight="bold">
                            {notif.title}
                          </Text>
                          <Text variant="caption" color={theme.colors.textMuted}>
                            {notif.message}
                          </Text>
                        </View>
                      </View>

                      {/* Top-Right Cross (✕) Button to Dismiss & Move to History */}
                      <Pressable
                        onPress={() => handleDismiss(notif.id)}
                        disabled={isBusy}
                        style={styles.dismissBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={{ fontSize: 16, color: theme.colors.textMuted, fontWeight: 'bold' }}>✕</Text>
                      </Pressable>
                    </View>

                    {/* Action Buttons for Group Invites */}
                    {isInvite && (
                      <View style={styles.actionButtonsRow}>
                        <Button
                          title="Decline"
                          variant="subtle"
                          size="medium"
                          onPress={() => handleRespond(notif.id, 'REJECT')}
                          disabled={isBusy}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title={isBusy ? 'Processing...' : 'Accept Invite ✓'}
                          variant="primary"
                          size="medium"
                          onPress={() => handleRespond(notif.id, 'ACCEPT')}
                          loading={isBusy}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}
                  </Surface>
                );
              })
            )}
          </View>
        ) : (
          /* NOTIFICATIONS HISTORY */
          <View style={styles.section}>
            {historyNotifications.length === 0 ? (
              <Surface variant="subtle" style={styles.emptyCard}>
                <Text variant="body" color={theme.colors.textMuted}>
                  No notification history yet.
                </Text>
              </Surface>
            ) : (
              historyNotifications.map((notif) => (
                <Surface key={notif.id} variant="card" style={styles.historyCard}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body" weight="semibold">
                      {notif.title}
                    </Text>
                    <Text variant="caption" color={theme.colors.textSecondary}>
                      {notif.message}
                    </Text>
                    <Text variant="caption" color={theme.colors.textMuted} style={{ marginTop: 4 }}>
                      Status: {notif.status} • {new Date(notif.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </Surface>
              ))
            )}
          </View>
        )}
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
  },
  tabItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
    paddingTop: 14,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bellIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inviteCard: {
    padding: 16,
    borderRadius: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.35)',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dismissBtn: {
    padding: 4,
    marginLeft: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  historyCard: {
    padding: 14,
    borderRadius: 12,
  },
});
