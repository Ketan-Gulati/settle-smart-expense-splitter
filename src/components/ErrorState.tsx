import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  style,
}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.badge,
          { backgroundColor: theme.colors.negativeSubtle, borderColor: theme.colors.negative },
        ]}
      >
        <Text variant="title" color={theme.colors.negative}>
          !
        </Text>
      </View>
      <Text variant="headline" align="center" style={styles.title}>
        {title}
      </Text>
      <Text
        variant="bodySecondary"
        color={theme.colors.textSecondary}
        align="center"
        style={styles.message}
      >
        {message}
      </Text>
      {onRetry && (
        <Button
          title={retryLabel}
          variant="secondary"
          size="medium"
          onPress={onRetry}
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
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 20,
    maxWidth: 280,
  },
  button: {
    minWidth: 140,
  },
});
