import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { MoneyDisplay } from './MoneyDisplay';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface GroupCardProps {
  id: string;
  name: string;
  currency?: string;
  netBalanceMinor: number; // >0 is owed to user, <0 user owes, 0 settled
  unsettledExpensesCount?: number;
  memberCount?: number;
  thumbnailEmoji?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  name,
  currency = 'INR',
  netBalanceMinor,
  unsettledExpensesCount = 0,
  memberCount,
  onPress,
  style,
}) => {
  const theme = useAppTheme();

  const isPositive = netBalanceMinor > 0;
  const isSettled = netBalanceMinor === 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text variant="body" weight="bold" color={theme.colors.textPrimary}>
            {name}
          </Text>
          <Text variant="caption" color={theme.colors.textSecondary}>
            {memberCount ? `${memberCount} members · ` : ''}
            {unsettledExpensesCount} unsettled expense{unsettledExpensesCount === 1 ? '' : 's'}
          </Text>
        </View>

        <View style={styles.balanceInfo}>
          <MoneyDisplay
            amountMinor={netBalanceMinor}
            currency={currency}
            variant="medium"
            sentiment={isPositive ? 'positive' : isSettled ? 'neutral' : 'negative'}
            showSign
          />
          <Text
            variant="caption"
            weight="medium"
            color={
              isSettled
                ? theme.colors.textMuted
                : isPositive
                ? theme.colors.positive
                : theme.colors.negative
            }
          >
            {isSettled ? 'Settled up' : isPositive ? 'You are owed' : 'You owe'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleInfo: {
    flex: 1,
    gap: 2,
    paddingRight: 12,
  },
  balanceInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
});
