import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text variant="headline" align="center" style={styles.title}>
        {title}
      </Text>
      <Text
        variant="bodySecondary"
        color={theme.colors.textSecondary}
        align="center"
        style={styles.description}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          variant="primary"
          size="medium"
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 20,
    maxWidth: 280,
  },
  button: {
    minWidth: 140,
  },
});
