import React from 'react';
import { View, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  uppercase?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onActionPress,
  style,
  titleStyle,
  uppercase = false,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <Text
        variant={uppercase ? 'label' : 'title'}
        weight="bold"
        color={uppercase ? theme.colors.textMuted : theme.colors.textPrimary}
        style={titleStyle}
      >
        {uppercase ? title.toUpperCase() : title}
      </Text>
      {actionLabel && (
        <Text
          variant="bodySecondary"
          weight="medium"
          color={theme.colors.textSecondary}
          onPress={onActionPress}
          style={styles.action}
        >
          {actionLabel}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  action: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
});
