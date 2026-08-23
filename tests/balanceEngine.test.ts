import { ExpenseRecord } from '../src/domain/ledger/ledgerEngine';
import { BalanceEngine } from '../src/domain/balance/balanceEngine';

describe('Phase 3 — Ledger & Balance Engine Comprehensive Financial Tests', () => {
  const userA = 'user_A';
  const userB = 'user_B';
  const userC = 'user_C';
  const userD = 'user_D';

  const ketan = 'user_Ketan';
  const rohit = 'user_Rohit';
  const raj = 'user_Raj';

  test('1. One expense / two people', () => {
    // A paid ₹100 for A and B equally
    const expenses: ExpenseRecord[] = [
      {
        id: 'e1',
        amountMinor: 10000,
        payers: [{ userId: userA, amountMinor: 10000 }],
        splits: [
          { userId: userA, amountMinor: 5000 },
          { userId: userB, amountMinor: 5000 },
        ],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userBalances[userA]?.netBalanceMinor).toBe(5000);
      expect(result.data.userBalances[userB]?.netBalanceMinor).toBe(-5000);
      expect(result.data.pairwiseObligations).toEqual([
        { debtorId: userB, creditorId: userA, amountMinor: 5000 },
      ]);
    }
  });

  test('2. One expense / four people', () => {
    // A paid ₹1000 for A, B, C, D equally (₹250 each)
    const expenses: ExpenseRecord[] = [
      {
        id: 'e2',
        amountMinor: 100000,
        payers: [{ userId: userA, amountMinor: 100000 }],
        splits: [
          { userId: userA, amountMinor: 25000 },
          { userId: userB, amountMinor: 25000 },
          { userId: userC, amountMinor: 25000 },
          { userId: userD, amountMinor: 25000 },
        ],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB, userC, userD], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userBalances[userA]?.netBalanceMinor).toBe(75000);
      expect(result.data.userBalances[userB]?.netBalanceMinor).toBe(-25000);
      expect(result.data.userBalances[userC]?.netBalanceMinor).toBe(-25000);
      expect(result.data.userBalances[userD]?.netBalanceMinor).toBe(-25000);
      expect(result.data.pairwiseObligations.length).toBe(3);
    }
  });

  test('3. Multiple payers for a single expense', () => {
    // Expense = ₹1000. A paid ₹600, B paid ₹400. Participants: A, B, C, D (₹250 each)
    const expenses: ExpenseRecord[] = [
      {
        id: 'e3',
        amountMinor: 100000,
        payers: [
          { userId: userA, amountMinor: 60000 },
          { userId: userB, amountMinor: 40000 },
        ],
        splits: [
          { userId: userA, amountMinor: 25000 },
          { userId: userB, amountMinor: 25000 },
          { userId: userC, amountMinor: 25000 },
          { userId: userD, amountMinor: 25000 },
        ],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB, userC, userD], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      // Net:
      // A: paid 600 - share 250 = +350
      // B: paid 400 - share 250 = +150
      // C: paid 0 - share 250 = -250
      // D: paid 0 - share 250 = -250
      expect(result.data.userBalances[userA]?.netBalanceMinor).toBe(35000);
      expect(result.data.userBalances[userB]?.netBalanceMinor).toBe(15000);
      expect(result.data.userBalances[userC]?.netBalanceMinor).toBe(-25000);
      expect(result.data.userBalances[userD]?.netBalanceMinor).toBe(-25000);
    }
  });

  test('4. Payer is not a participant', () => {
    // A paid ₹300 for B and C only (₹150 each)
    const expenses: ExpenseRecord[] = [
      {
        id: 'e4',
        amountMinor: 30000,
        payers: [{ userId: userA, amountMinor: 30000 }],
        splits: [
          { userId: userB, amountMinor: 15000 },
          { userId: userC, amountMinor: 15000 },
        ],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB, userC], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userBalances[userA]?.netBalanceMinor).toBe(30000);
      expect(result.data.userBalances[userB]?.netBalanceMinor).toBe(-15000);
      expect(result.data.userBalances[userC]?.netBalanceMinor).toBe(-15000);
    }
  });

  test('5. Reciprocal bilateral debt netting', () => {
    // Exp 1: A paid ₹500 for B -> B owes A ₹500
    // Exp 2: B paid ₹200 for A -> A owes B ₹200
    // Netting should yield: B owes A ₹300
    const expenses: ExpenseRecord[] = [
      {
        id: 'e5_1',
        amountMinor: 50000,
        payers: [{ userId: userA, amountMinor: 50000 }],
        splits: [{ userId: userB, amountMinor: 50000 }],
      },
      {
        id: 'e5_2',
        amountMinor: 20000,
        payers: [{ userId: userB, amountMinor: 20000 }],
        splits: [{ userId: userA, amountMinor: 20000 }],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userBalances[userA]?.netBalanceMinor).toBe(30000);
      expect(result.data.userBalances[userB]?.netBalanceMinor).toBe(-30000);
      expect(result.data.pairwiseObligations).toEqual([
        { debtorId: userB, creditorId: userA, amountMinor: 30000 },
      ]);
    }
  });

  test('6. Important 3-Way Chain Invariant (Ketan -> Rohit ₹200, Rohit -> Raj ₹300)', () => {
    // Invariant: At Balance Engine level, the underlying direct debts MUST remain preserved!
    // Ketan owes Rohit ₹200. Rohit owes Raj ₹300.
    const expenses: ExpenseRecord[] = [
      {
        id: 'e_kr',
        amountMinor: 20000,
        payers: [{ userId: rohit, amountMinor: 20000 }],
        splits: [{ userId: ketan, amountMinor: 20000 }],
      },
      {
        id: 'e_rr',
        amountMinor: 30000,
        payers: [{ userId: raj, amountMinor: 30000 }],
        splits: [{ userId: rohit, amountMinor: 30000 }],
      },
    ];

    const result = BalanceEngine.calculateBalances([ketan, rohit, raj], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      // Net balances:
      // Ketan: -200
      // Rohit: +200 - 300 = -100
      // Raj: +300
      expect(result.data.userBalances[ketan]?.netBalanceMinor).toBe(-20000);
      expect(result.data.userBalances[rohit]?.netBalanceMinor).toBe(-10000);
      expect(result.data.userBalances[raj]?.netBalanceMinor).toBe(30000);

      // Pairwise obligations MUST remain direct (not pre-optimized into Ketan -> Raj):
      expect(result.data.pairwiseObligations).toEqual(
        expect.arrayContaining([
          { debtorId: ketan, creditorId: rohit, amountMinor: 20000 },
          { debtorId: rohit, creditorId: raj, amountMinor: 30000 },
        ])
      );
    }
  });

  test('7. Invariant: Sum of all net balances must always equal 0', () => {
    const expenses: ExpenseRecord[] = [
      {
        id: 'e7_1',
        amountMinor: 12500,
        payers: [{ userId: userA, amountMinor: 12500 }],
        splits: [
          { userId: userA, amountMinor: 4168 },
          { userId: userB, amountMinor: 4166 },
          { userId: userC, amountMinor: 4166 },
        ],
      },
      {
        id: 'e7_2',
        amountMinor: 9999,
        payers: [{ userId: userB, amountMinor: 9999 }],
        splits: [
          { userId: userA, amountMinor: 3333 },
          { userId: userB, amountMinor: 3333 },
          { userId: userC, amountMinor: 3333 },
        ],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB, userC], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      const netSum = Object.values(result.data.userBalances).reduce(
        (sum, b) => sum + b.netBalanceMinor,
        0
      );
      expect(netSum).toBe(0);
    }
  });

  test('8. Completely settled group produces 0 obligations and 0 net balances', () => {
    const expenses: ExpenseRecord[] = [
      {
        id: 'e8_1',
        amountMinor: 10000,
        payers: [{ userId: userA, amountMinor: 10000 }],
        splits: [{ userId: userB, amountMinor: 10000 }],
      },
      {
        id: 'e8_2',
        amountMinor: 10000,
        payers: [{ userId: userB, amountMinor: 10000 }],
        splits: [{ userId: userA, amountMinor: 10000 }],
      },
    ];

    const result = BalanceEngine.calculateBalances([userA, userB], expenses);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userBalances[userA]?.netBalanceMinor).toBe(0);
      expect(result.data.userBalances[userB]?.netBalanceMinor).toBe(0);
      expect(result.data.pairwiseObligations.length).toBe(0);
    }
  });
});
