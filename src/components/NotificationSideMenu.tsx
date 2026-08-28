import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from './Text';
import { Icon } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SettleApiService } from '@/services/api/settleApi';

export interface NotificationSideMenuProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.86, 360);

export const NotificationSideMenu: React.FC<NotificationSideMenuProps> = ({ visible, onClose }) => {
  const theme = useAppTheme();
  const router = useRouter();

  const [slideAnim] = useState(new Animated.Value(DRAWER_WIDTH));
  const [fadeAnim] = useState(new Animated.Value(0));

  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = useCallback(async () => {
    try {
      const notifs = await SettleApiService.getNotifications();
      const pending = notifs.filter((n) => n.status === 'PENDING');
      setUnreadCount(pending.length);
    } catch {
      // Ignore network errors in drawer preview
    }
  }, []);

  useEffect(() => {
    if (visible) {
      checkUnread();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, checkUnread]);

  const handleOpenNotificationsPage = () => {
    onClose();
    router.push('/menu' as any);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* Backdrop overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                backgroundColor: theme.colors.overlay,
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Slide-out Drawer from Right */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Menu Drawer Header */}
          <View style={[styles.drawerHeader, { borderBottomColor: theme.colors.borderSubtle }]}>
            <Text variant="title" weight="bold" color={theme.colors.textPrimary}>
              Menu
            </Text>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={{ fontSize: 18, color: theme.colors.textMuted }}>✕</Text>
            </Pressable>
          </View>

          {/* Drawer Menu Options List */}
          <ScrollView
            contentContainerStyle={styles.drawerContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Single clean Notifications tab */}
            <Pressable
              onPress={handleOpenNotificationsPage}
              style={({ pressed }) => [
                styles.menuItemRow,
                {
                  backgroundColor: theme.colors.surfaceSubtle,
                  borderColor: theme.colors.borderSubtle,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceElevated }]}>
                  <Icon name="notifications-outline" size={20} color={theme.colors.textPrimary} />
                </View>
                <View style={{ gap: 2 }}>
                  <Text variant="body" weight="semibold" color={theme.colors.textPrimary}>
                    Notifications
                  </Text>
                  <Text variant="caption" color={theme.colors.textMuted}>
                    Invites & group alerts
                  </Text>
                </View>
              </View>

              <View style={styles.menuItemRight}>
                {unreadCount > 0 ? (
                  <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="caption" weight="bold" color="#FFFFFF">
                      {unreadCount} new
                    </Text>
                  </View>
                ) : (
                  <Text variant="caption" color={theme.colors.textMuted}>
                    All caught up
                  </Text>
                )}
                <Text variant="body" color={theme.colors.textMuted}>
                  →
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawer: {
    height: '100%',
    borderLeftWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 100,
  },
  drawerHeader: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  closeBtn: {
    padding: 6,
  },
  drawerContent: {
    padding: 16,
    gap: 12,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
});
