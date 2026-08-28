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
  const isNegative = netBalanceMinor < 0;
  const isSettled = netBalanceMinor === 0;

  const getBorderColor = () => {
    if (isPositive) return theme.isDark ? 'rgba(16, 185, 129, 0.35)' : '#A7F3D0';
    if (isNegative) return theme.isDark ? 'rgba(239, 68, 68, 0.35)' : '#FECACA';
    return theme.colors.border;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: getBorderColor(),
          opacity: pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text variant="title" weight="bold" color={theme.colors.textPrimary}>
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
            variant="large"
            sentiment={isPositive ? 'positive' : isSettled ? 'neutral' : 'negative'}
            showSign
          />
          <Text
            variant="caption"
            weight="bold"
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleInfo: {
    flex: 1,
    gap: 3,
    paddingRight: 12,
  },
  balanceInfo: {
    alignItems: 'flex-end',
    gap: 3,
  },
});
