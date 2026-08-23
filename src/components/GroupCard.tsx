import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { MoneyDisplay } from './MoneyDisplay';
import { StatusBadge } from './StatusBadge';
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
  thumbnailEmoji = '🏖️',
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
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.thumbnail, { backgroundColor: theme.colors.surfaceSubtle }]}>
          <Text style={styles.emoji}>{thumbnailEmoji}</Text>
        </View>

        {isSettled ? (
          <StatusBadge label="Settled up" variant="neutral" size="small" />
        ) : isPositive ? (
          <StatusBadge label="You are owed" variant="positive" size="small" />
        ) : (
          <StatusBadge label="You owe" variant="negative" size="small" />
        )}
      </View>

      <View style={styles.bottomSection}>
        <Text variant="headline" weight="bold" numberOfLines={1}>
          {name}
        </Text>

        <MoneyDisplay
          amountMinor={netBalanceMinor}
          currency={currency}
          variant="large"
          sentiment="auto"
          showSign
          style={styles.amount}
        />

        <Text variant="caption" color={theme.colors.textMuted}>
          {unsettledExpensesCount > 0
            ? `${unsettledExpensesCount} unsettled expense${unsettledExpensesCount > 1 ? 's' : ''}`
            : 'All expenses settled'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  bottomSection: {
    gap: 4,
  },
  amount: {
    fontWeight: '700',
  },
});
