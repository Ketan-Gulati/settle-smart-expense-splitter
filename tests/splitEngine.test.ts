import { SplitEngine } from '../src/domain/split/splitEngine';
import { ExpenseValidator } from '../src/domain/expense/expense';

describe('Phase 2 — Domain Engine & Split Calculations', () => {
  const p1 = 'user_1';
  const p2 = 'user_2';
  const p3 = 'user_3';
  const p4 = 'user_4';

  test('Equal split divides evenly and deterministically allocates remainder', () => {
    // ₹1000 across 4 people => exactly 25000 paise each
    const result1 = SplitEngine.calculateSplits({
      method: 'equal',
      totalAmountMinor: 100000,
      participantIds: [p1, p2, p3, p4],
    });

    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.data.length).toBe(4);
      expect(result1.data[0]?.amountMinor).toBe(25000);
      expect(result1.data[1]?.amountMinor).toBe(25000);
      expect(result1.data[2]?.amountMinor).toBe(25000);
      expect(result1.data[3]?.amountMinor).toBe(25000);
      const sum = result1.data.reduce((acc, s) => acc + s.amountMinor, 0);
      expect(sum).toBe(100000);
    }

    // ₹100 across 3 people => 33.34, 33.33, 33.33 => 10000 paise total
    const result2 = SplitEngine.calculateSplits({
      method: 'equal',
      totalAmountMinor: 10000,
      participantIds: [p1, p2, p3],
    });

    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data[0]?.amountMinor).toBe(3334);
      expect(result2.data[1]?.amountMinor).toBe(3333);
      expect(result2.data[2]?.amountMinor).toBe(3333);
      const sum = result2.data.reduce((acc, s) => acc + s.amountMinor, 0);
      expect(sum).toBe(10000);
    }
  });

  test('Exact split validates that sums match expense total precisely', () => {
    // Valid exact split
    const valid = SplitEngine.calculateSplits({
      method: 'exact',
      totalAmountMinor: 100000, // ₹1,000
      participantIds: [p1, p2, p3, p4],
      exactAmounts: {
        [p1]: 20000, // ₹200
        [p2]: 30000, // ₹300
        [p3]: 15000, // ₹150
        [p4]: 35000, // ₹350
      },
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      const sum = valid.data.reduce((acc, s) => acc + s.amountMinor, 0);
      expect(sum).toBe(100000);
    }

    // Invalid exact split (short by ₹50)
    const invalid = SplitEngine.calculateSplits({
      method: 'exact',
      totalAmountMinor: 100000,
      participantIds: [p1, p2, p3, p4],
      exactAmounts: {
        [p1]: 20000,
        [p2]: 30000,
        [p3]: 15000,
        [p4]: 30000, // sum is 95000
      },
    });

    expect(invalid.success).toBe(false);
  });

  test('Percentage split requires 100% total and preserves integer sum', () => {
    const validPct = SplitEngine.calculateSplits({
      method: 'percentage',
      totalAmountMinor: 100000, // ₹1,000
      participantIds: [p1, p2, p3, p4],
      percentages: {
        [p1]: 25,
        [p2]: 25,
        [p3]: 20,
        [p4]: 30,
      },
    });

    expect(validPct.success).toBe(true);
    if (validPct.success) {
      expect(validPct.data[0]?.amountMinor).toBe(25000);
      expect(validPct.data[1]?.amountMinor).toBe(25000);
      expect(validPct.data[2]?.amountMinor).toBe(20000);
      expect(validPct.data[3]?.amountMinor).toBe(30000);
      const sum = validPct.data.reduce((acc, s) => acc + s.amountMinor, 0);
      expect(sum).toBe(100000);
    }

    // Invalid percentage sum
    const invalidPct = SplitEngine.calculateSplits({
      method: 'percentage',
      totalAmountMinor: 100000,
      participantIds: [p1, p2],
      percentages: {
        [p1]: 50,
        [p2]: 40,
      },
    });

    expect(invalidPct.success).toBe(false);
  });

  test('Shares split calculates proportions in minor units with zero leakage', () => {
    // 1 share + 2 shares + 1 share + 2 shares = 6 shares on ₹600
    const result = SplitEngine.calculateSplits({
      method: 'shares',
      totalAmountMinor: 60000,
      participantIds: [p1, p2, p3, p4],
      shares: {
        [p1]: 1,
        [p2]: 2,
        [p3]: 1,
        [p4]: 2,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]?.amountMinor).toBe(10000);
      expect(result.data[1]?.amountMinor).toBe(20000);
      expect(result.data[2]?.amountMinor).toBe(10000);
      expect(result.data[3]?.amountMinor).toBe(20000);
      const sum = result.data.reduce((acc, s) => acc + s.amountMinor, 0);
      expect(sum).toBe(60000);
    }
  });

  test('Expense validation rejects non-group members and zero amounts', () => {
    const memberSet = new Set([p1, p2, p3]);

    const invalidPayer = ExpenseValidator.validateCreateCommand(
      {
        groupId: 'g1',
        description: 'Dinner',
        amountMinor: 50000,
        payerId: 'intruder_user',
        participantIds: [p1, p2],
        splitMethod: 'equal',
        createdBy: p1,
      },
      memberSet
    );

    expect(invalidPayer.success).toBe(false);

    const zeroAmount = ExpenseValidator.validateCreateCommand(
      {
        groupId: 'g1',
        description: 'Dinner',
        amountMinor: 0,
        payerId: p1,
        participantIds: [p1, p2],
        splitMethod: 'equal',
        createdBy: p1,
      },
      memberSet
    );

    expect(zeroAmount.success).toBe(false);
  });
});
