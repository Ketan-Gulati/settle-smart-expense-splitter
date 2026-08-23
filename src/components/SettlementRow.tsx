import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { MoneyDisplay } from './MoneyDisplay';
import { Button } from './Button';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SettlementRowProps {
  fromUserName: string;
  toUserName: string;
  fromAvatarUrl?: string;
  toAvatarUrl?: string;
  amountMinor: number;
  currency?: string;
  explanation?: string;
  isCurrentUserPayer?: boolean;
  isCurrentUserReceiver?: boolean;
  onSettlePress?: () => void;
  onExplainPress?: () => void;
  style?: ViewStyle;
}

export const SettlementRow: React.FC<SettlementRowProps> = ({
  fromUserName,
  toUserName,
  fromAvatarUrl,
  toAvatarUrl,
  amountMinor,
  currency = 'INR',
  explanation,
  isCurrentUserPayer = false,
  isCurrentUserReceiver = false,
  onSettlePress,
  onExplainPress,
  style,
}) => {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.party}>
          <Avatar name={fromUserName} imageUrl={fromAvatarUrl} size="small" />
          <Text variant="body" weight={isCurrentUserPayer ? 'bold' : 'medium'}>
            {isCurrentUserPayer ? 'You' : fromUserName}
          </Text>
        </View>

        <Text variant="caption" color={theme.colors.textMuted} style={styles.arrow}>
          pays →
        </Text>

        <View style={styles.party}>
          <Avatar name={toUserName} imageUrl={toAvatarUrl} size="small" />
          <Text variant="body" weight={isCurrentUserReceiver ? 'bold' : 'medium'}>
            {isCurrentUserReceiver ? 'You' : toUserName}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <MoneyDisplay
          amountMinor={amountMinor}
          currency={currency}
          variant="large"
          sentiment="neutral"
        />
        {explanation && (
          <Pressable onPress={onExplainPress} style={styles.explanation}>
            <Text variant="caption" color={theme.colors.primary}>
              Why this payment?
            </Text>
          </Pressable>
        )}
      </View>

      {onSettlePress && isCurrentUserPayer && (
        <Button
          title="Settle Payment"
          variant="primary"
          size="small"
          onPress={onSettlePress}
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  party: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrow: {
    marginHorizontal: 8,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  explanation: {
    paddingVertical: 4,
  },
  actionButton: {
    marginTop: 12,
  },
});
