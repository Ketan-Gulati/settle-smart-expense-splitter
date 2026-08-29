import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Modal, Linking, Platform, Image } from 'react-native';
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

  const dataVersion = useAppStore((s) => s.dataVersion);

  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'HISTORY'>('ACTIONS');
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Pay Now UPI App Selector Modal
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedReminderNotif, setSelectedReminderNotif] = useState<NotificationDTO | null>(null);

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
  }, [loadNotifications, dataVersion]);

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
                        <View style={styles.iconAvatarWrapper}>
                          <Avatar name={notif.actorName || 'Settle User'} size="medium" />
                          <View
                            style={[
                              styles.miniStatusBadge,
                              {
                                backgroundColor:
                                  notif.type === 'EXPENSE_EDIT_GRANTED'
                                    ? '#10B981'
                                    : notif.type === 'EXPENSE_EDIT_REQUEST'
                                    ? '#F59E0B'
                                    : notif.type === 'EXPENSE_EDIT_DENIED'
                                    ? '#EF4444'
                                    : theme.colors.primary,
                              },
                            ]}
                          >
                            <Icon
                              name={
                                notif.type === 'EXPENSE_EDIT_GRANTED'
                                  ? 'checkmark-outline'
                                  : notif.type === 'EXPENSE_EDIT_REQUEST'
                                  ? 'lock-closed-outline'
                                  : notif.type === 'EXPENSE_EDIT_DENIED'
                                  ? 'close-outline'
                                  : notif.type === 'PAYMENT_REMINDER'
                                  ? 'wallet-outline'
                                  : 'receipt-outline'
                              }
                              size={11}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>
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
                          title={isBusy ? 'Processing...' : 'Accept Invite'}
                          iconLeft={<Icon name="checkmark-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />}
                          variant="primary"
                          size="medium"
                          onPress={() => handleRespond(notif.id, 'ACCEPT')}
                          loading={isBusy}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}

                    {/* Action Button for Payment Reminders */}
                    {notif.type === 'PAYMENT_REMINDER' && (
                      <View style={styles.actionButtonsRow}>
                        <Button
                          title="Pay Now"
                          iconRight={<Icon name="arrow-forward-outline" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                          variant="primary"
                          size="medium"
                          onPress={() => {
                            setSelectedReminderNotif(notif);
                            setPayModalVisible(true);
                          }}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}

                    {/* Action Buttons for Expense Edit Requests (Approve / Deny) */}
                    {notif.type === 'EXPENSE_EDIT_REQUEST' && (
                      <View style={styles.actionButtonsRow}>
                        <Button
                          title="Deny Access"
                          variant="subtle"
                          size="medium"
                          onPress={() => handleRespond(notif.id, 'REJECT')}
                          disabled={isBusy}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title={isBusy ? 'Granting...' : 'Grant Edit Access'}
                          iconLeft={<Icon name="checkmark-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />}
                          variant="primary"
                          size="medium"
                          onPress={() => handleRespond(notif.id, 'ACCEPT')}
                          loading={isBusy}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}

                    {/* Action Button for Edit Access Granted ("Click here to edit") */}
                    {notif.type === 'EXPENSE_EDIT_GRANTED' && notif.expenseId && (
                      <View style={styles.actionButtonsRow}>
                        <Button
                          title="Edit Expense"
                          iconLeft={<Icon name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />}
                          variant="primary"
                          size="medium"
                          onPress={() => {
                            router.push(`/expenses/new?expenseId=${notif.expenseId}&groupId=${notif.groupId}` as any);
                          }}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}

                    {/* Action Button for Group/Expense Links */}
                    {!!notif.groupId && !isInvite && notif.type !== 'PAYMENT_REMINDER' && notif.type !== 'EXPENSE_EDIT_REQUEST' && notif.type !== 'EXPENSE_EDIT_GRANTED' && (
                      <View style={styles.actionButtonsRow}>
                        <Button
                          title="View Group"
                          iconRight={<Icon name="arrow-forward-outline" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                          variant="primary"
                          size="small"
                          onPress={() => {
                            router.push(`/groups/${notif.groupId}` as any);
                          }}
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

      {/* Pay Now UPI Apps Modal */}
      <Modal visible={payModalVisible} animationType="slide" transparent onRequestClose={() => setPayModalVisible(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]} onPress={() => setPayModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text variant="headline" weight="bold">
                Select UPI App to Pay
              </Text>
              <Pressable onPress={() => setPayModalVisible(false)}>
                <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            {selectedReminderNotif && (
              <Text variant="body" color={theme.colors.textSecondary}>
                {selectedReminderNotif.message}
              </Text>
            )}

            <View style={styles.upiAppsStack}>
              {/* Google Pay */}
              <Pressable
                onPress={() => {
                  const gpayUrl = Platform.OS === 'android' ? 'gpay://upi/pay' : 'tez://';
                  Linking.openURL(gpayUrl).catch(() => Linking.openURL('https://pay.google.com/'));
                  setPayModalVisible(false);
                }}
                style={[styles.upiAppCard, { borderColor: theme.colors.border }]}
              >
                <Image
                  source={{ uri: 'https://img.icons8.com/?size=100&id=am4ltuIYDpQ5&format=png&color=000000' }}
                  style={styles.brandIconImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">Google Pay</Text>
                  <Text variant="caption" color={theme.colors.textMuted}>Instant UPI Transfer</Text>
                </View>
                <Icon name="arrow-back" size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>

              {/* PhonePe */}
              <Pressable
                onPress={() => {
                  const phonepeUrl = 'phonepe://';
                  Linking.openURL(phonepeUrl).catch(() => Linking.openURL('https://phonepe.com/'));
                  setPayModalVisible(false);
                }}
                style={[styles.upiAppCard, { borderColor: theme.colors.border }]}
              >
                <Image
                  source={{ uri: 'https://img.icons8.com/?size=100&id=OYtBxIlJwMGA&format=png&color=000000' }}
                  style={styles.brandIconImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">PhonePe</Text>
                  <Text variant="caption" color={theme.colors.textMuted}>Pay with UPI ID or Number</Text>
                </View>
                <Icon name="arrow-back" size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>

              {/* Paytm */}
              <Pressable
                onPress={() => {
                  const paytmUrl = 'paytmmp://';
                  Linking.openURL(paytmUrl).catch(() => Linking.openURL('https://paytm.com/'));
                  setPayModalVisible(false);
                }}
                style={[styles.upiAppCard, { borderColor: theme.colors.border }]}
              >
                <Image
                  source={{ uri: 'https://img.icons8.com/?size=100&id=68067&format=png&color=000000' }}
                  style={styles.brandIconImg}
                  resizeMode="contain"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">Paytm</Text>
                  <Text variant="caption" color={theme.colors.textMuted}>UPI & Wallet</Text>
                </View>
                <Icon name="arrow-back" size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>

              {/* CRED */}
              <Pressable
                onPress={() => {
                  const credUrl = 'cred://';
                  Linking.openURL(credUrl).catch(() => Linking.openURL('https://cred.club/'));
                  setPayModalVisible(false);
                }}
                style={[styles.upiAppCard, { borderColor: theme.colors.border }]}
              >
                <Image
                  source={{ uri: 'https://framerusercontent.com/images/SM0FtvVYTklAL1YWLoAlA1sBGc.jpg?width=460&height=460' }}
                  style={[styles.brandIconImg, { borderRadius: 8 }]}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">CRED</Text>
                  <Text variant="caption" color={theme.colors.textMuted}>Scan & Pay with CRED UPI</Text>
                </View>
                <Icon name="arrow-back" size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  iconAvatarWrapper: {
    position: 'relative',
  },
  miniStatusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upiAppsStack: {
    gap: 10,
    marginTop: 6,
  },
  upiAppCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  brandIconImg: {
    width: 32,
    height: 32,
  },
});
