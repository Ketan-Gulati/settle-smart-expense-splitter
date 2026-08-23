import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SurfaceProps {
  variant?: 'base' | 'subtle' | 'elevated' | 'card';
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const Surface: React.FC<SurfaceProps> = ({ variant = 'base', style, children }) => {
  const theme = useAppTheme();

  const getSurfaceStyle = () => {
    switch (variant) {
      case 'subtle':
        return {
          backgroundColor: theme.colors.surfaceSubtle,
          borderRadius: theme.radii.md,
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: theme.radii.md,
        };
      case 'card':
        return {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      case 'base':
      default:
        return {
          backgroundColor: theme.colors.surface,
        };
    }
  };

  return <View style={[styles.base, getSurfaceStyle(), style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    padding: 16,
  },
});
