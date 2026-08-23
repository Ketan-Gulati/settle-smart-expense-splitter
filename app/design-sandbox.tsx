import { ScrollView, View, StyleSheet } from 'react-native';
import {
  Text,
  Button,
  Input,
  MoneyDisplay,
  StatusBadge,
  Avatar,
  ListRow,
  Surface,
  EmptyState,
  ErrorState,
  DebtRow,
  SettlementRow,
  SectionHeader,
  GroupCard,
  ExpenseActivityRow,
  SettlementPathCard,
} from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useUIStore } from '@/store/uiStore';

export default function DesignSandboxScreen() {
  const theme = useAppTheme();
  const { themeMode, setThemeMode } = useUIStore();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="displayLarge">Design System</Text>
      <Text variant="subtitle">Settle UI Primitives Showcase</Text>

      {/* Theme Switcher */}
      <Surface variant="subtle" style={styles.section}>
        <Text variant="label">Active Theme: {themeMode}</Text>
        <View style={styles.row}>
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <Button
              key={mode}
              title={mode}
              size="small"
              variant={themeMode === mode ? 'primary' : 'outline'}
              onPress={() => setThemeMode(mode)}
            />
          ))}
        </View>
      </Surface>

      {/* Typography & Amounts */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">Financial Typography</Text>
        <MoneyDisplay amountMinor={342000} sentiment="positive" showSign variant="hero" />
        <MoneyDisplay amountMinor={82000} sentiment="negative" showSign variant="large" />
        <MoneyDisplay amountMinor={0} sentiment="auto" variant="medium" />
      </Surface>

      {/* Buttons */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">Buttons</Text>
        <View style={styles.column}>
          <Button title="Primary Action" variant="primary" size="large" />
          <Button title="Secondary Action" variant="secondary" size="medium" />
          <Button title="Outline Button" variant="outline" size="small" />
          <Button title="Destructive Action" variant="destructive" size="medium" />
        </View>
      </Surface>

      {/* Inputs */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">Inputs</Text>
        <Input label="Description" placeholder="e.g. Friday Dinner" />
        <Input
          label="Amount"
          placeholder="0.00"
          keyboardType="numeric"
          error="Split amounts must match the total"
        />
      </Surface>

      {/* Badges & Avatars */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">Status Badges & Avatars</Text>
        <View style={styles.row}>
          <StatusBadge label="You are owed" variant="positive" />
          <StatusBadge label="You owe" variant="negative" />
          <StatusBadge label="Settled" variant="neutral" />
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Avatar name="Ketan Gulati" size="huge" />
          <Avatar name="Rohit Sharma" size="large" />
          <Avatar name="Raj Kumar" size="medium" />
          <Avatar name="Aman V" size="small" />
        </View>
      </Surface>

      {/* Financial Rows */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">Financial Presentation Rows</Text>
        <DebtRow personName="Rohit" amountMinor={20000} type="owes_you" reason="Dinner share" />
        <DebtRow personName="Raj" amountMinor={30000} type="you_owe" reason="Cab booking" />
        <ListRow
          title="Goa Trip 2026"
          subtitle="4 members · ₹32,480 total"
          leftElement={<Avatar name="Goa" size="medium" />}
          rightElement={
            <MoneyDisplay amountMinor={184000} sentiment="positive" showSign variant="small" />
          }
        />
      </Surface>

      {/* Smart Settlement Row */}
      <Surface variant="subtle" style={styles.section}>
        <Text variant="label">Smart Settlement Component</Text>
        <SettlementRow
          fromUserName="Ketan"
          toUserName="Raj"
          amountMinor={20000}
          isCurrentUserPayer
          explanation="Optimized direct transfer eliminating Rohit as intermediate."
        />
      </Surface>

      {/* State Feedback Primitives */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">State Feedback Primitives</Text>
        <EmptyState
          title="No expenses yet"
          description="Add your first shared expense to start tracking group balances."
          actionLabel="Add Expense"
          onAction={() => {}}
        />
        <ErrorState
          title="Connection Error"
          message="Changes saved locally. Sync will retry when connection is restored."
          onRetry={() => {}}
        />
      </Surface>

      {/* Stage 1 Final Primitives */}
      <Surface variant="card" style={styles.section}>
        <Text variant="label">Stage 1 — Final Reference Components</Text>
        <SectionHeader title="Recent Activity" actionLabel="View all →" onActionPress={() => {}} />
        <GroupCard
          id="g1"
          name="Goa Trip"
          netBalanceMinor={425000}
          unsettledExpensesCount={3}
          onPress={() => {}}
        />
        <ExpenseActivityRow
          title="Dinner at Jamie's"
          groupName="Goa Trip"
          timestamp="2h ago"
          payerName="You"
          totalAmountMinor={360000}
          userShareMinor={120000}
          categoryIconName="restaurant-outline"
        />
        <SettlementPathCard
          debtorName="Ketan"
          creditorName="Raj"
          amountMinor={20000}
          isDirectPath={true}
          explanationQuestion="Why am I paying Raj?"
          explanationAnswer="This direct payment resolves your ₹200 obligation directly to Raj, bypassing intermediate members."
        />
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  column: {
    gap: 10,
  },
});
