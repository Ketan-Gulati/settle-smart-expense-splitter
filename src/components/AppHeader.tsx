import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle, Image } from 'react-native';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAppStore } from '@/store/appStore';

export interface AppHeaderProps {
  userName?: string;
  avatarUrl?: string;
  unreadCount?: number;
  onAvatarPress?: () => void;
  onMenuPress?: () => void;
  onSettingsPress?: () => void;
  style?: ViewStyle;
}

const LOGO_URL = 'https://res.cloudinary.com/dxanpvaub/image/upload/v1787513935/41d9d9e0-b225-4f40-a08c-afbab7f728e7_r4ovlo.png';

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName = 'Alex',
  avatarUrl,
  unreadCount: explicitUnreadCount,
  onAvatarPress,
  onMenuPress,
  onSettingsPress,
  style,
}) => {
  const theme = useAppTheme();
  const storeUnreadCount = useAppStore((s) => s.unreadNotificationCount);
  const fetchUnreadCount = useAppStore((s) => s.fetchUnreadNotificationCount);

  React.useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const unreadCount = explicitUnreadCount !== undefined ? explicitUnreadCount : storeUnreadCount;

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }, style]}>
      {/* Absolute Centered Logo */}
      <View style={[styles.titleContainer, { pointerEvents: 'none' }]}>
        <Image
          source={{ uri: LOGO_URL }}
          style={styles.logoImage}
          tintColor={theme.colors.textPrimary}
          resizeMode="contain"
        />
      </View>

      {/* Top-Left: Profile & Settings Avatar */}
      <Pressable onPress={onAvatarPress} style={styles.avatarButton}>
        <Avatar name={userName} imageUrl={avatarUrl} size="medium" />
      </Pressable>

      {/* Top-Right: Hamburger Menu with Action Center / Notification Badge */}
      <Pressable onPress={onMenuPress || onSettingsPress} style={styles.iconButton}>
        <Icon name="menu-outline" size={24} color={theme.colors.textPrimary} />
        {unreadCount > 0 && (
          <View style={[styles.badgeNumberWrap, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.badgeNumberText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'relative',
  },
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 10,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 48,
    right: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoImage: {
    width: '100%',
    maxWidth: 260,
    height: 75,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 10,
    position: 'relative',
  },
  badgeNumberWrap: {
    position: 'absolute',
    top: 4,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  badgeNumberText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  gearIcon: {
    fontSize: 22,
  },
});
