import React from 'react';
import { View, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export type StatusVariant = 'positive' | 'negative' | 'warning' | 'neutral';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  size?: 'small' | 'medium';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'small',
  style,
  textStyle,
}) => {
  const theme = useAppTheme();

  const getColors = () => {
    switch (variant) {
      case 'positive':
        return {
          bg: theme.colors.positiveSubtle,
          text: theme.colors.positiveForeground,
          border: theme.colors.positive,
        };
      case 'negative':
        return {
          bg: theme.colors.negativeSubtle,
          text: theme.colors.negativeForeground,
          border: theme.colors.negative,
        };
      case 'warning':
        return {
          bg: theme.colors.warningSubtle,
          text: theme.colors.warningForeground,
          border: theme.colors.warning,
        };
      case 'neutral':
      default:
        return {
          bg: theme.colors.surfaceMuted,
          text: theme.colors.textSecondary,
          border: theme.colors.border,
        };
    }
  };

  const colors = getColors();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderRadius: theme.radii.full,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 8 : 12,
        },
        style,
      ]}
    >
      <Text
        variant={isSmall ? 'caption' : 'bodySecondary'}
        weight="semibold"
        color={colors.text}
        style={textStyle}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
