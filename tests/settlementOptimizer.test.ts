import { SettlementOptimizer } from '../src/domain/settlement/settlementOptimizer';
import { UserBalance } from '../src/domain/balance/balanceEngine';

describe('Phase 4 — Smart Settlement & Settlement Optimizer Comprehensive Tests', () => {
  const userA = 'user_A';
  const userB = 'user_B';
  const userC = 'user_C';
  const userD = 'user_D';

  const ketan = 'user_Ketan';
  const rohit = 'user_Rohit';
  const raj = 'user_Raj';

  // Helper to build UserBalance dictionary
  const makeBalances = (entries: [string, number][]): Record<string, UserBalance> => {
    const map: Record<string, UserBalance> = {};
    for (const [id, net] of entries) {
      map[id] = {
        userId: id,
        totalPaidMinor: net > 0 ? net : 0,
        totalShareMinor: net < 0 ? Math.abs(net) : 0,
        netBalanceMinor: net,
      };
    }
    return map;
  };

  test('1. Core Product Scenario: Ketan (-200), Rohit (-100), Raj (+300)', () => {
    // Settle differentiator: Ketan and Rohit both pay Raj directly in 2 payments instead of 3-way chain
    const balances = makeBalances([
      [ketan, -20000],
      [rohit, -10000],
      [raj, 30000],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances, 2);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalTransfersCount).toBe(2);
      expect(result.data.totalSettledMinor).toBe(30000);
      expect(result.data.transfers).toEqual([
        { fromUserId: ketan, toUserId: raj, amountMinor: 20000 },
        { fromUserId: rohit, toUserId: raj, amountMinor: 10000 },
      ]);
    }
  });

  test('2. One debtor / one creditor', () => {
    // A: -500, B: +500 => A -> B $500
    const balances = makeBalances([
      [userA, -50000],
      [userB, 50000],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transfers).toEqual([
        { fromUserId: userA, toUserId: userB, amountMinor: 50000 },
      ]);
    }
  });

  test('3. One debtor / multiple creditors', () => {
    // A: -1000, B: +600, C: +400 => A -> B 600, A -> C 400
    const balances = makeBalances([
      [userA, -100000],
      [userB, 60000],
      [userC, 40000],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transfers).toEqual([
        { fromUserId: userA, toUserId: userB, amountMinor: 60000 },
        { fromUserId: userA, toUserId: userC, amountMinor: 40000 },
      ]);
      expect(result.data.totalSettledMinor).toBe(100000);
    }
  });

  test('4. Multiple debtors / one creditor', () => {
    // A: -600, B: -400, C: +1000 => A -> C 600, B -> C 400
    const balances = makeBalances([
      [userA, -60000],
      [userB, -40000],
      [userC, 100000],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transfers).toEqual([
        { fromUserId: userA, toUserId: userC, amountMinor: 60000 },
        { fromUserId: userB, toUserId: userC, amountMinor: 40000 },
      ]);
    }
  });

  test('5. Multiple debtors / multiple creditors', () => {
    // A: -500, B: -300, C: +600, D: +200
    // Sorted debtors: A (500), B (300)
    // Sorted creditors: C (600), D (200)
    // Matches:
    // A -> C: 500 (C left: 100)
    // B -> C: 100 (C left: 0)
    // B -> D: 200 (D left: 0)
    const balances = makeBalances([
      [userA, -50000],
      [userB, -30000],
      [userC, 60000],
      [userD, 20000],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalTransfersCount).toBe(3);
      expect(result.data.transfers).toEqual([
        { fromUserId: userA, toUserId: userC, amountMinor: 50000 },
        { fromUserId: userB, toUserId: userC, amountMinor: 10000 },
        { fromUserId: userB, toUserId: userD, amountMinor: 20000 },
      ]);
    }
  });

  test('6. Already settled group (all zero balances)', () => {
    const balances = makeBalances([
      [userA, 0],
      [userB, 0],
      [userC, 0],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transfers.length).toBe(0);
      expect(result.data.totalSettledMinor).toBe(0);
    }
  });

  test('7. Invariant: Every member post-settlement net position is strictly 0', () => {
    const balances = makeBalances([
      ['u1', -12345],
      ['u2', -6789],
      ['u3', 10000],
      ['u4', 9134],
    ]);

    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      const netAfter: Record<string, number> = {};
      for (const [id, b] of Object.entries(balances)) {
        netAfter[id] = b.netBalanceMinor;
      }

      for (const t of result.data.transfers) {
        netAfter[t.fromUserId]! += t.amountMinor; // Debtor pays
        netAfter[t.toUserId]! -= t.amountMinor; // Creditor receives
      }

      for (const [, net] of Object.entries(netAfter)) {
        expect(net).toBe(0);
      }
    }
  });

  test('8. Determinism: Repeating optimizer yields strictly identical order and transfers', () => {
    const balances = makeBalances([
      ['u_charlie', -30000],
      ['u_alice', -30000],
      ['u_bob', 60000],
    ]);

    const run1 = SettlementOptimizer.optimizeSettlement(balances);
    const run2 = SettlementOptimizer.optimizeSettlement(balances);

    expect(run1.success).toBe(true);
    expect(run2.success).toBe(true);
    if (run1.success && run2.success) {
      expect(run1.data.transfers).toEqual(run2.data.transfers);
      // Tie breaker ensures u_alice comes before u_charlie
      expect(run1.data.transfers[0]?.fromUserId).toBe('u_alice');
      expect(run1.data.transfers[1]?.fromUserId).toBe('u_charlie');
    }
  });

  test('9. Large group scaling test (50 members)', () => {
    const entries: [string, number][] = [];
    let sum = 0;
    for (let i = 1; i <= 25; i++) {
      const amount = i * 1000;
      entries.push([`debtor_${i}`, -amount]);
      sum += amount;
    }
    // 25 creditors sharing the total
    const creditorShare = Math.floor(sum / 25);
    const rem = sum % 25;
    for (let i = 1; i <= 25; i++) {
      entries.push([`creditor_${i}`, creditorShare + (i <= rem ? 1 : 0)]);
    }

    const balances = makeBalances(entries);
    const result = SettlementOptimizer.optimizeSettlement(balances);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.transfers.length).toBeLessThan(50);
      expect(result.data.totalSettledMinor).toBe(sum);
    }
  });
});
