import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { MoneyDisplay } from './MoneyDisplay';
import { StatusBadge } from './StatusBadge';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface DebtRowProps {
  personName: string;
  avatarUrl?: string;
  amountMinor: number;
  currency?: string;
  type: 'you_owe' | 'owes_you';
  reason?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const DebtRow: React.FC<DebtRowProps> = ({
  personName,
  avatarUrl,
  amountMinor,
  currency = 'INR',
  type,
  reason,
  onPress,
  style,
}) => {
  const theme = useAppTheme();
  const isOwed = type === 'owes_you';

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? theme.colors.surfaceSubtle : 'transparent',
          borderBottomColor: theme.colors.borderSubtle,
        },
        style,
      ]}
    >
      <Avatar name={personName} imageUrl={avatarUrl} size="medium" style={styles.avatar} />
      <View style={styles.info}>
        <Text variant="body" weight="semibold">
          {personName}
        </Text>
        {reason ? (
          <Text variant="caption" color={theme.colors.textMuted}>
            {reason}
          </Text>
        ) : (
          <Text variant="caption" color={isOwed ? theme.colors.positive : theme.colors.negative}>
            {isOwed ? 'owes you' : 'you owe'}
          </Text>
        )}
      </View>
      <View style={styles.amountContainer}>
        <MoneyDisplay
          amountMinor={amountMinor}
          currency={currency}
          variant="medium"
          sentiment={isOwed ? 'positive' : 'negative'}
          showSign={false}
        />
        <StatusBadge
          label={isOwed ? 'Receive' : 'Pay'}
          variant={isOwed ? 'positive' : 'negative'}
          size="small"
          style={styles.badge}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  badge: {
    marginTop: 4,
  },
});
