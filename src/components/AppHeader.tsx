import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Avatar } from './Avatar';
import { Text } from './Text';
import { Icon } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface AppHeaderProps {
  userName?: string;
  avatarUrl?: string;
  onAvatarPress?: () => void;
  onSettingsPress?: () => void;
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  userName = 'Alex',
  avatarUrl,
  onAvatarPress,
  onSettingsPress,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }, style]}>
      <Pressable onPress={onAvatarPress} style={styles.avatarButton}>
        <Avatar name={userName} imageUrl={avatarUrl} size="medium" />
      </Pressable>

      <View style={styles.titleContainer}>
        <Text variant="headline" weight="bold" color={theme.colors.textPrimary}>
          Settle
        </Text>
      </View>

      <Pressable onPress={onSettingsPress} style={styles.iconButton}>
        <Icon name="settings-outline" size={22} color={theme.colors.textPrimary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  avatarButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 22,
  },
});
