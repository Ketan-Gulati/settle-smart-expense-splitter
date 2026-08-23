import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { MoneyDisplay } from './MoneyDisplay';
import { Icon, IconName } from './Icon';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ExpenseActivityRowProps {
  title: string;
  groupName: string;
  timestamp: string;
  payerName: string;
  totalAmountMinor: number;
  userShareMinor: number; // positive = lent, negative = borrowed
  currency?: string;
  categoryIconName?: IconName;
  onPress?: () => void;
  showDivider?: boolean;
  style?: ViewStyle;
}

export const ExpenseActivityRow: React.FC<ExpenseActivityRowProps> = ({
  title,
  groupName,
  timestamp,
  payerName,
  totalAmountMinor,
  userShareMinor,
  currency = 'INR',
  categoryIconName = 'receipt-outline',
  onPress,
  showDivider = true,
  style,
}) => {
  const theme = useAppTheme();

  const isLent = userShareMinor > 0;
  const isBorrowed = userShareMinor < 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.container,
        {
          opacity: pressed ? 0.8 : 1,
          borderBottomColor: theme.colors.borderSubtle,
          borderBottomWidth: showDivider ? 1 : 0,
        },
        style,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceSubtle }]}>
        <Icon name={categoryIconName} size={20} color={theme.colors.textPrimary} />
      </View>

      <View style={styles.details}>
        <Text variant="body" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" color={theme.colors.textMuted} numberOfLines={1}>
          {groupName} • {timestamp}
        </Text>
      </View>

      <View style={styles.financials}>
        {/* Top line: Net Lent / Borrowed Amount */}
        <MoneyDisplay
          amountMinor={userShareMinor}
          currency={currency}
          variant="medium"
          sentiment={isLent ? 'positive' : isBorrowed ? 'negative' : 'neutral'}
          showSign
          style={styles.shareAmount}
        />

        {/* Bottom line: Payer and Total Note */}
        <Text variant="caption" color={theme.colors.textMuted}>
          {payerName === 'You' ? 'You paid' : `${payerName} paid`}{' '}
          <MoneyDisplay
            amountMinor={totalAmountMinor}
            currency={currency}
            variant="small"
            sentiment="neutral"
          />
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  details: {
    flex: 1,
    gap: 2,
  },
  financials: {
    alignItems: 'flex-end',
    gap: 2,
  },
  shareAmount: {
    fontWeight: '700',
  },
});
