import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { MoneyDisplay } from './MoneyDisplay';
import { StatusBadge } from './StatusBadge';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface BreakdownItem {
  description: string;
  amountMinor: number;
  type: 'OWED' | 'BORROWED'; // OWED: debtor owes creditor (+), BORROWED: creditor owes debtor (-)
}

export interface SettlementPathCardProps {
  debtorName: string;
  creditorName: string;
  amountMinor: number;
  currency?: string;
  isDirectPath?: boolean;
  isCurrentUserDebtor?: boolean;
  isCurrentUserCreditor?: boolean;
  onSettlePress?: () => void;
  onRequestPress?: () => void;
  explanationQuestion?: string;
  explanationAnswer?: string;
  breakdownItems?: BreakdownItem[];
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
  onRequestPress,
  explanationQuestion,
  explanationAnswer,
  breakdownItems,
  style,
}) => {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const getBorderColor = () => {
    if (isCurrentUserDebtor) return theme.isDark ? 'rgba(239, 68, 68, 0.4)' : '#FCA5A5';
    if (isCurrentUserCreditor) return theme.isDark ? 'rgba(16, 185, 129, 0.4)' : '#6EE7B7';
    return theme.colors.border;
  };

  const defaultQuestion = `Why is ${debtorName} paying ${creditorName} ₹${(amountMinor / 100).toFixed(2)}?`;

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {onRequestPress && (
              <Pressable
                onPress={onRequestPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: '#10B981', opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Text variant="body" weight="bold" color="#FFFFFF">
                  Request ₹{(amountMinor / 100).toFixed(0)} ➔
                </Text>
              </Pressable>
            )}
            <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Text variant="caption" weight="bold" style={{ color: '#10B981' }}>
                Pending
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Understandable "Why?" Reasoning Accordion */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={[styles.accordionHeader, { borderTopColor: theme.colors.borderSubtle }]}
      >
        <View style={styles.accordionTitle}>
          <Text style={styles.lightbulb}>💡</Text>
          <Text variant="caption" weight="semibold" color={theme.colors.primary}>
            {explanationQuestion || defaultQuestion}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: theme.colors.primary }]}>
          {expanded ? '▲' : '▼'}
        </Text>
      </Pressable>

      {expanded && (
        <View style={[styles.accordionContent, { backgroundColor: theme.colors.surfaceSubtle }]}>
          {breakdownItems && breakdownItems.length > 0 ? (
            <View style={styles.breakdownTable}>
              <Text variant="caption" weight="bold" color={theme.colors.textMuted} style={{ marginBottom: 6 }}>
                Full balance breakdown between {debtorName} & {creditorName}:
              </Text>
              {breakdownItems.map((item, idx) => {
                const isOwed = item.type === 'OWED';
                return (
                  <View key={idx} style={styles.breakdownRow}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, color: isOwed ? '#10B981' : '#EF4444' }}>
                        {isOwed ? '+' : '−'}
                      </Text>
                      <Text variant="bodySecondary" numberOfLines={1} style={{ flex: 1 }}>
                        {item.description}
                      </Text>
                    </View>
                    <Text
                      variant="bodySecondary"
                      weight="semibold"
                      color={isOwed ? theme.colors.textPrimary : '#EF4444'}
                    >
                      {isOwed ? '' : '−'}₹{(item.amountMinor / 100).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.breakdownDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.breakdownRow}>
                <Text variant="bodySecondary" weight="bold">
                  Net Settlement Total
                </Text>
                <Text variant="body" weight="bold" color={theme.colors.primary}>
                  ₹{(amountMinor / 100).toFixed(2)}
                </Text>
              </View>
            </View>
          ) : (
            <Text variant="caption" color={theme.colors.textSecondary} style={{ lineHeight: 18 }}>
              {explanationAnswer ||
                `This optimized single direct payment of ₹${(amountMinor / 100).toFixed(2)} directly zeroes out all shared net obligations between ${debtorName} and ${creditorName}.`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 6,
    gap: 2,
  },
  arrowGlyph: {
    fontSize: 16,
    fontWeight: '700',
  },
  flowBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  amountActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  amountWrap: {
    gap: 1,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  accordionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  lightbulb: {
    fontSize: 11,
  },
  chevron: {
    fontSize: 9,
    marginLeft: 4,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  breakdownTable: {
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 4,
  },
});
