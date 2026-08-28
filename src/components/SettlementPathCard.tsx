import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { MoneyDisplay } from './MoneyDisplay';
import { StatusBadge } from './StatusBadge';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SettlementPathCardProps {
  debtorName: string;
  creditorName: string;
  amountMinor: number;
  currency?: string;
  isDirectPath?: boolean;
  isCurrentUserDebtor?: boolean;
  isCurrentUserCreditor?: boolean;
  onSettlePress?: () => void;
  explanationQuestion?: string;
  explanationAnswer?: string;
  style?: ViewStyle;
}

export const SettlementPathCard: React.FC<SettlementPathCardProps> = ({
  debtorName,
  creditorName,
  amountMinor,
  currency = 'INR',
  isDirectPath = true,
  isCurrentUserDebtor = false,
  isCurrentUserCreditor = false,
  onSettlePress,
  explanationQuestion = 'Why am I paying this person?',
  explanationAnswer,
  style,
}) => {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const getBorderColor = () => {
    if (isCurrentUserDebtor) return theme.isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5';
    if (isCurrentUserCreditor) return theme.isDark ? 'rgba(16, 185, 129, 0.4)' : '#6EE7B7';
    return theme.colors.border;
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: getBorderColor(),
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.memberBlock}>
          <Avatar name={debtorName === 'You' ? 'You' : debtorName} size="medium" />
          <View style={styles.memberInfo}>
            <Text variant="body" weight="bold" color={theme.colors.textPrimary} numberOfLines={1}>
              {debtorName}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              {isCurrentUserDebtor ? 'You send' : 'Sender'}
            </Text>
          </View>
        </View>

        <View style={styles.transferFlowCenter}>
          <Text style={[styles.arrowGlyph, { color: theme.colors.primary }]}>➔</Text>
          {isDirectPath && (
            <StatusBadge label="DIRECT" variant="neutral" size="small" style={styles.flowBadge} />
          )}
        </View>

        <View style={[styles.memberBlock, styles.memberBlockRight]}>
          <View style={[styles.memberInfo, styles.memberInfoRight]}>
            <Text variant="body" weight="bold" color={theme.colors.textPrimary} numberOfLines={1}>
              {creditorName}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              {isCurrentUserCreditor ? 'You receive' : 'Receiver'}
            </Text>
          </View>
          <Avatar name={creditorName === 'You' ? 'You' : creditorName} size="medium" />
        </View>
      </View>

      <View style={[styles.amountActionBar, { backgroundColor: theme.colors.surfaceSubtle }]}>
        <View style={styles.amountWrap}>
          <Text variant="caption" weight="medium" color={theme.colors.textSecondary}>
            Total to Settle
          </Text>
          <MoneyDisplay
            amountMinor={amountMinor}
            currency={currency}
            variant="large"
            sentiment={isCurrentUserDebtor ? 'negative' : isCurrentUserCreditor ? 'positive' : 'neutral'}
          />
        </View>

        {isCurrentUserDebtor && onSettlePress && (
          <Pressable
            onPress={onSettlePress}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text variant="body" weight="bold" color={theme.colors.primaryForeground}>
              Settle Up ✓
            </Text>
          </Pressable>
        )}

        {isCurrentUserCreditor && (
          <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Text variant="caption" weight="bold" style={{ color: '#10B981' }}>
              Pending Receipt
            </Text>
          </View>
        )}
      </View>

      {explanationAnswer && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={[styles.accordionHeader, { borderTopColor: theme.colors.borderSubtle }]}
        >
          <View style={styles.accordionTitle}>
            <Text style={styles.lightbulb}>💡</Text>
            <Text variant="caption" weight="medium" color={theme.colors.textSecondary}>
              {explanationQuestion}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </Pressable>
      )}

      {expanded && explanationAnswer && (
        <View style={styles.accordionContent}>
          <Text variant="caption" color={theme.colors.textSecondary}>
            {explanationAnswer}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  memberBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  memberBlockRight: {
    justifyContent: 'flex-end',
  },
  memberInfo: {
    flexShrink: 1,
  },
  memberInfoRight: {
    alignItems: 'flex-end',
  },
  transferFlowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  arrowGlyph: {
    fontSize: 20,
    fontWeight: '800',
  },
  flowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  amountActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  amountWrap: {
    gap: 2,
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  accordionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  lightbulb: {
    fontSize: 12,
  },
  chevron: {
    fontSize: 10,
    marginLeft: 6,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
});
