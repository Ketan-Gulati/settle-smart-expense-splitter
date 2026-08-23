import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Text } from './Text';
import { MoneyDisplay } from './MoneyDisplay';
import { StatusBadge } from './StatusBadge';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface SettlementPathCardProps {
  debtorName: string;
  creditorName: string;
  amountMinor: number;
  currency?: string;
  isDirectPath?: boolean;
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
  explanationQuestion = 'Why am I paying this person?',
  explanationAnswer,
  style,
}) => {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.participantColumn}>
          <Text variant="headline" weight="bold">
            {debtorName}
          </Text>
          <Text variant="caption" color={theme.colors.textMuted}>
            pays
          </Text>
        </View>

        <View style={styles.pathIndicator}>
          {isDirectPath && (
            <StatusBadge label="DIRECT PATH" variant="neutral" size="small" style={styles.badge} />
          )}
          <Text style={[styles.arrow, { color: theme.colors.textMuted }]}>→</Text>
        </View>

        <View style={styles.creditorSection}>
          <View style={styles.creditorNameColumn}>
            <Text variant="headline" weight="bold">
              {creditorName}
            </Text>
            <Text variant="caption" color={theme.colors.textMuted}>
              receiver
            </Text>
          </View>
          <MoneyDisplay
            amountMinor={amountMinor}
            currency={currency}
            variant="medium"
            sentiment="neutral"
            style={styles.amount}
          />
        </View>
      </View>

      {explanationAnswer && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={[styles.accordionHeader, { backgroundColor: theme.colors.surfaceSubtle }]}
        >
          <View style={styles.accordionTitle}>
            <Text style={styles.lightbulb}>💡</Text>
            <Text variant="bodySecondary" weight="medium" color={theme.colors.textSecondary}>
              {explanationQuestion}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>
            {expanded ? '▲' : '▼'}
          </Text>
        </Pressable>
      )}

      {expanded && explanationAnswer && (
        <View style={[styles.accordionContent, { backgroundColor: theme.colors.surfaceSubtle }]}>
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantColumn: {
    gap: 2,
  },
  creditorNameColumn: {
    gap: 2,
  },
  pathIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 4,
  },
  arrow: {
    fontSize: 20,
  },
  creditorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amount: {
    fontWeight: 'bold',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  accordionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lightbulb: {
    fontSize: 16,
  },
  chevron: {
    fontSize: 12,
  },
  accordionContent: {
    padding: 12,
    borderRadius: 8,
    marginTop: -4,
  },
});
