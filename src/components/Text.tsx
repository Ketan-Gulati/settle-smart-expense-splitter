import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type TextVariant =
  | 'displayHero'
  | 'displayLarge'
  | 'headline'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodySecondary'
  | 'caption'
  | 'label'
  | 'mono';

export interface AppTextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
}

export const Text: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  weight,
  align,
  style,
  children,
  ...rest
}) => {
  const theme = useAppTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'displayHero':
        return {
          fontSize: theme.typography.fontSizes.displayLg,
          fontWeight: theme.typography.fontWeights.bold,
          lineHeight: theme.typography.fontSizes.displayLg * theme.typography.lineHeights.tight,
          color: color || theme.colors.textPrimary,
          letterSpacing: -0.8,
        };
      case 'displayLarge':
        return {
          fontSize: theme.typography.fontSizes.displaySm,
          fontWeight: theme.typography.fontWeights.bold,
          lineHeight: theme.typography.fontSizes.displaySm * theme.typography.lineHeights.tight,
          color: color || theme.colors.textPrimary,
          letterSpacing: -0.5,
        };
      case 'headline':
        return {
          fontSize: theme.typography.fontSizes.xxl,
          fontWeight: theme.typography.fontWeights.bold,
          lineHeight: theme.typography.fontSizes.xxl * theme.typography.lineHeights.snug,
          color: color || theme.colors.textPrimary,
        };
      case 'title':
        return {
          fontSize: theme.typography.fontSizes.lg,
          fontWeight: theme.typography.fontWeights.semibold,
          lineHeight: theme.typography.fontSizes.lg * theme.typography.lineHeights.snug,
          color: color || theme.colors.textPrimary,
        };
      case 'subtitle':
        return {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.medium,
          lineHeight: theme.typography.fontSizes.md * theme.typography.lineHeights.normal,
          color: color || theme.colors.textSecondary,
        };
      case 'bodySecondary':
        return {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.regular,
          lineHeight: theme.typography.fontSizes.sm * theme.typography.lineHeights.normal,
          color: color || theme.colors.textSecondary,
        };
      case 'caption':
        return {
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.medium,
          lineHeight: theme.typography.fontSizes.xs * theme.typography.lineHeights.normal,
          color: color || theme.colors.textMuted,
        };
      case 'label':
        return {
          fontSize: theme.typography.fontSizes.caption,
          fontWeight: theme.typography.fontWeights.bold,
          lineHeight: theme.typography.fontSizes.caption * theme.typography.lineHeights.normal,
          color: color || theme.colors.textMuted,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.8,
        };
      case 'mono':
        return {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.medium,
          fontFamily: 'monospace',
          color: color || theme.colors.textSecondary,
          letterSpacing: 0.2,
        };
      case 'body':
      default:
        return {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.regular,
          lineHeight: theme.typography.fontSizes.md * theme.typography.lineHeights.normal,
          color: color || theme.colors.textPrimary,
        };
    }
  };

  const customWeight = weight ? { fontWeight: theme.typography.fontWeights[weight] } : {};
  const textAlign = align ? { textAlign: align } : {};

  return (
    <RNText style={[styles.base, getVariantStyle(), customWeight, textAlign, style]} {...rest}>
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
