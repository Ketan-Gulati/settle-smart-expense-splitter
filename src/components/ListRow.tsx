import React from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  leftElement,
  rightElement,
  onPress,
  showDivider = true,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.colors.surfaceSubtle : 'transparent',
          borderBottomColor: theme.colors.borderSubtle,
          borderBottomWidth: showDivider ? 1 : 0,
          paddingVertical: theme.spacing.sm,
        },
        style,
      ]}
    >
      {leftElement && <View style={styles.leftContainer}>{leftElement}</View>}
      <View style={styles.contentContainer}>
        <Text variant="body" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View style={styles.rightContainer}>{rightElement}</View>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  leftContainer: {
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  rightContainer: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
});
