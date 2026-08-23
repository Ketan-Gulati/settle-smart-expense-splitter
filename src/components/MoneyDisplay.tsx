import React from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface MoneyDisplayProps {
  amountMinor: number;
  currency?: string;
  variant?: 'hero' | 'large' | 'medium' | 'small';
  sentiment?: 'positive' | 'negative' | 'neutral' | 'auto';
  showSign?: boolean;
  style?: TextStyle;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amountMinor,
  currency = 'INR',
  variant = 'medium',
  sentiment = 'neutral',
  showSign = false,
  style,
}) => {
  const theme = useAppTheme();

  const isPositive = amountMinor > 0;
  const isNegative = amountMinor < 0;
  const isZero = amountMinor === 0;

  // Derive color based on sentiment
  let color = theme.colors.textPrimary;
  if (sentiment === 'positive' || (sentiment === 'auto' && isPositive)) {
    color = theme.colors.positive;
  } else if (sentiment === 'negative' || (sentiment === 'auto' && isNegative)) {
    color = theme.colors.negative;
  } else if (isZero) {
    color = theme.colors.textMuted;
  }

  // Format currency symbol
  const getSymbol = (curr: string) => {
    switch (curr) {
      case 'INR':
        return '₹';
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return curr + ' ';
    }
  };

  const symbol = getSymbol(currency);
  const absoluteMinor = Math.abs(amountMinor);
  const major = Math.floor(absoluteMinor / 100);
  const minor = absoluteMinor % 100;

  const formattedMajor = new Intl.NumberFormat('en-IN').format(major);
  const formattedAmount =
    minor > 0 ? `${formattedMajor}.${minor.toString().padStart(2, '0')}` : formattedMajor;

  let signPrefix = '';
  if (showSign) {
    if (isPositive) signPrefix = '+';
    if (isNegative) signPrefix = '-';
  } else if (isNegative) {
    signPrefix = '-';
  }

  const textVariant =
    variant === 'hero'
      ? 'displayHero'
      : variant === 'large'
        ? 'displayLarge'
        : variant === 'small'
          ? 'bodySecondary'
          : 'headline';

  return (
    <View style={styles.container}>
      <Text variant={textVariant} color={color} style={[styles.text, style]}>
        {signPrefix}
        {symbol}
        {formattedAmount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  text: {
    fontVariant: ['tabular-nums'],
  },
});
