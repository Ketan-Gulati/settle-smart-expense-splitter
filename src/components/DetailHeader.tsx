import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface DetailHeaderProps {
  title: string;
  onBackPress: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  onBackPress,
  rightAction,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background }, style]}>
      <Pressable onPress={onBackPress} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color={theme.colors.textPrimary} />
      </Pressable>

      <Text variant="title" weight="bold" color={theme.colors.textPrimary} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.rightActionContainer}>
        {rightAction || <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '600',
  },
  rightActionContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  placeholder: {
    width: 24,
  },
});
