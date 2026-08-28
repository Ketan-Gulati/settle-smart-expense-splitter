import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle, Image } from 'react-native';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';

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
  unreadCount = 0,
  onAvatarPress,
  onMenuPress,
  onSettingsPress,
  style,
}) => {
  const theme = useAppTheme();

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
          <View style={[styles.badgeDot, { backgroundColor: theme.colors.primary }]} />
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
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gearIcon: {
    fontSize: 22,
  },
});
