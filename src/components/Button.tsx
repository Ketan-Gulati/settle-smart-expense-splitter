import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'outline' | 'destructive';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  iconLeft,
  iconRight,
  onPress,
  ...rest
}) => {
  const theme = useAppTheme();

  const getVariantStyles = (pressed: boolean) => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: pressed ? theme.colors.surfaceElevated : theme.colors.surfaceSubtle,
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
          text: theme.colors.textPrimary,
        };
      case 'subtle':
        return {
          container: {
            backgroundColor: pressed ? theme.colors.surfaceSubtle : 'transparent',
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: theme.colors.primary,
        };
      case 'outline':
        return {
          container: {
            backgroundColor: pressed ? theme.colors.surfaceSubtle : 'transparent',
            borderColor: theme.colors.border,
            borderWidth: 1,
          },
          text: theme.colors.textPrimary,
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: pressed ? theme.colors.negativeSubtle : theme.colors.negative,
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: theme.colors.destructiveForeground,
        };
      case 'primary':
      default:
        return {
          container: {
            backgroundColor: pressed ? theme.colors.textSecondary : theme.colors.primary,
            borderColor: 'transparent',
            borderWidth: 0,
          },
          text: theme.colors.primaryForeground,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radii.sm,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radii.md,
          minHeight: 52,
        };
      case 'medium':
      default:
        return {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radii.sm,
          minHeight: 44,
        };
    }
  };

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        getSizeStyles(),
        getVariantStyles(pressed).container,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={getVariantStyles(pressed).text}
              style={styles.spinner}
            />
          ) : (
            <>
              {iconLeft && <>{iconLeft}</>}
              <Text
                variant={size === 'small' ? 'bodySecondary' : 'title'}
                weight="semibold"
                color={getVariantStyles(pressed).text}
                style={[styles.text, textStyle]}
              >
                {title}
              </Text>
              {iconRight && <>{iconRight}</>}
            </>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: {
    opacity: 0.45,
  },
  spinner: {
    paddingVertical: 2,
  },
  text: {
    textAlign: 'center',
  },
});
