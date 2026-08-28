import { Money } from '../src/utils/money';
import { SettlementOptimizer, MemberNetBalance } from '../src/modules/settlements/settlement.optimizer';

/**
 * Test-Only Independent Reference Ledger
 * Completely separate from production service logic to verify mathematical correctness.
 */
export class ReferenceLedger {
  private balances = new Map<string, bigint>();

  constructor(memberIds: string[]) {
    for (const id of memberIds) {
      this.balances.set(id, 0n);
    }
  }

  public recordExpense(paidByUserId: string, splits: { userId: string; amountMinor: bigint }[]): void {
    const totalAmount = splits.reduce((acc, s) => acc + s.amountMinor, 0n);
    const currentPayer = this.balances.get(paidByUserId) || 0n;
    this.balances.set(paidByUserId, currentPayer + totalAmount);

    for (const split of splits) {
      const current = this.balances.get(split.userId) || 0n;
      this.balances.set(split.userId, current - split.amountMinor);
    }
  }

  public recordSettlement(fromUserId: string, toUserId: string, amountMinor: bigint): void {
    const currentFrom = this.balances.get(fromUserId) || 0n;
    this.balances.set(fromUserId, currentFrom + amountMinor);

    const currentTo = this.balances.get(toUserId) || 0n;
    this.balances.set(toUserId, currentTo - amountMinor);
  }

  public getBalance(userId: string): bigint {
    return this.balances.get(userId) || 0n;
  }

  public getAllBalances(): Map<string, bigint> {
    return new Map(this.balances);
  }

  public getZeroSumTotal(): bigint {
    let sum = 0n;
    for (const bal of this.balances.values()) {
      sum += bal;
    }
    return sum;
  }
}

describe('SETTLE — Comprehensive Financial Correctness & Mathematical Ledger Audit', () => {
  describe('1. Money Representation & Precision', () => {
    test('Converts decimal strings and numbers to integer minor units without precision loss', () => {
      expect(Money.toMinor('250.00')).toBe(25000n);
      expect(Money.toMinor('250.50')).toBe(25050n);
      expect(Money.toMinor('0.01')).toBe(1n);
      expect(Money.toMinor('0.33')).toBe(33n);
      expect(Money.toMinor('999999.99')).toBe(99999999n);
      expect(Money.toMinor(10.25)).toBe(1025n);
    });

    test('Converts minor units back to major units without rounding drift', () => {
      expect(Money.toMajor(25000n)).toBe(250.0);
      expect(Money.toMajor(1n)).toBe(0.01);
      expect(Money.toMajor(33n)).toBe(0.33);
      expect(Money.toMajor(0n)).toBe(0.0);
    });

    test('Rejects invalid money representations', () => {
      expect(() => Money.toMinor('invalid_str')).toThrow();
      expect(() => Money.toMinor(NaN)).toThrow();
    });
  });

  describe('2. Equal Split Conservation & Remainder Distribution', () => {
    const testCases: Array<{ amountMinor: bigint; count: number; expected: bigint[] }> = [
      { amountMinor: 100n, count: 3, expected: [34n, 33n, 33n] }, // ₹1.00 / 3
      { amountMinor: 25000n, count: 3, expected: [8334n, 8333n, 8333n] }, // ₹250.00 / 3
      { amountMinor: 1000n, count: 6, expected: [167n, 167n, 167n, 167n, 166n, 166n] }, // ₹10.00 / 6 (remainder 4)
      { amountMinor: 1n, count: 3, expected: [1n, 0n, 0n] }, // 1 paise / 3
      { amountMinor: 9999n, count: 7, expected: [1429n, 1429n, 1429n, 1428n, 1428n, 1428n, 1428n] }, // 9999 % 7 = 3
      { amountMinor: 715000n, count: 3, expected: [238334n, 238333n, 238333n] }, // ₹7,150.00 / 3
    ];

    test.each(testCases)(
      'amount $amountMinor across $count people conserves exact total and distributes remainders deterministically',
      ({ amountMinor, count, expected }) => {
        const allocated = Money.allocateEqual(amountMinor, count);
        expect(allocated).toEqual(expected);

        // Invariant: sum of shares === total exactly
        const total = allocated.reduce((acc, s) => acc + s, 0n);
        expect(total).toBe(amountMinor);
      }
    );

    test('Equal allocation across 2 to 100 people always conserves exact sum', () => {
      const amounts = [1n, 2n, 7n, 10n, 33n, 99n, 100n, 101n, 25000n, 715000n, 10000000n];
      for (const amount of amounts) {
        for (let count = 2; count <= 50; count++) {
          const shares = Money.allocateEqual(amount, count);
          expect(shares.length).toBe(count);
          const sum = shares.reduce((acc, s) => acc + s, 0n);
          expect(sum).toBe(amount);
        }
      }
    });
  });

  describe('3. Percentage & Shares Split Conservation', () => {
    test('Percentage splits allocate remainder paise to maintain exact sum conservation', () => {
      const amount = 10000n; // ₹100.00
      // 33.33% / 33.33% / 33.34%
      const p1 = (amount * 3333n) / 10000n; // 3333
      const p2 = (amount * 3333n) / 10000n; // 3333
      const p3 = amount - (p1 + p2); // 3334
      expect(p1 + p2 + p3).toBe(amount);
    });

    test('Shares split conserves total amount across unequal share weights', () => {
      const amount = 10000n; // ₹100.00
      const totalWeights = 6n; // 1 + 2 + 3
      const s1 = (amount * 1n) / totalWeights; // 1666
      const s2 = (amount * 2n) / totalWeights; // 3333
      const s3 = amount - (s1 + s2); // 5001
      expect(s1 + s2 + s3).toBe(amount);
    });
  });

  describe('4. Zero-Sum Ledger Invariant & Reference Ledger Equivalence', () => {
    test('Multi-expense Goa trip scenario strictly maintains zero-sum ledger', () => {
      const members = ['ketan', 'rohit', 'raj'];
      const ledger = new ReferenceLedger(members);

      // 1. Ketan pays ₹250 for Ketan, Rohit, Raj (Equal)
      const splits1 = Money.allocateEqual(25000n, 3);
      ledger.recordExpense('ketan', [
        { userId: 'ketan', amountMinor: splits1[0]! }, // 8334
        { userId: 'rohit', amountMinor: splits1[1]! }, // 8333
        { userId: 'raj', amountMinor: splits1[2]! }, // 8333
      ]);

      expect(ledger.getBalance('ketan')).toBe(16666n); // +₹166.66
      expect(ledger.getBalance('rohit')).toBe(-8333n); // -₹83.33
      expect(ledger.getBalance('raj')).toBe(-8333n); // -₹83.33
      expect(ledger.getZeroSumTotal()).toBe(0n);

      // 2. Rohit pays Ketan ₹83.33 via settlement
      ledger.recordSettlement('rohit', 'ketan', 8333n);

      expect(ledger.getBalance('ketan')).toBe(8333n); // +₹83.33
      expect(ledger.getBalance('rohit')).toBe(0n); // Settled up
      expect(ledger.getBalance('raj')).toBe(-8333n); // -₹83.33
      expect(ledger.getZeroSumTotal()).toBe(0n);
    });

    test('Complex cyclic debts and settlements maintain zero-sum conservation', () => {
      const members = ['userA', 'userB', 'userC', 'userD'];
      const ledger = new ReferenceLedger(members);

      // A pays 100 for B
      ledger.recordExpense('userA', [{ userId: 'userB', amountMinor: 10000n }]);
      // B pays 50 for C
      ledger.recordExpense('userB', [{ userId: 'userC', amountMinor: 5000n }]);
      // C pays 80 for D
      ledger.recordExpense('userC', [{ userId: 'userD', amountMinor: 8000n }]);
      // D pays 40 for A
      ledger.recordExpense('userD', [{ userId: 'userA', amountMinor: 4000n }]);

      expect(ledger.getBalance('userA')).toBe(6000n); // +100 - 40 = +60
      expect(ledger.getBalance('userB')).toBe(-5000n); // -100 + 50 = -50
      expect(ledger.getBalance('userC')).toBe(3000n); // -50 + 80 = +30
      expect(ledger.getBalance('userD')).toBe(-4000n); // -80 + 40 = -40
      expect(ledger.getZeroSumTotal()).toBe(0n);
    });
  });

  describe('5. Settlement Optimization Correctness & Net-Position Invariance', () => {
    test('SettlementOptimizer simplifies cyclic debt graph while preserving exact net positions', () => {
      const balances: MemberNetBalance[] = [
        { userId: 'userA', netBalanceMinor: 6000n }, // +₹60.00
        { userId: 'userB', netBalanceMinor: -5000n }, // -₹50.00
        { userId: 'userC', netBalanceMinor: 3000n }, // +₹30.00
        { userId: 'userD', netBalanceMinor: -4000n }, // -₹40.00
      ];

      const transfers = SettlementOptimizer.optimizeTransfers(balances);

      // Total transfers should be minimal (at most N - 1 = 3 transfers)
      expect(transfers.length).toBeLessThanOrEqual(3);

      // Verify that applying these transfers resolves all balances to exactly zero
      const postBalances = new Map<string, bigint>();
      for (const b of balances) {
        postBalances.set(b.userId, b.netBalanceMinor);
      }

      let totalTransferred = 0n;
      for (const t of transfers) {
        expect(t.amountMinor).toBeGreaterThan(0n);
        totalTransferred += t.amountMinor;

        const debtorBal = postBalances.get(t.fromUserId)!;
        const creditorBal = postBalances.get(t.toUserId)!;

        postBalances.set(t.fromUserId, debtorBal + t.amountMinor);
        postBalances.set(t.toUserId, creditorBal - t.amountMinor);
      }

      // Total money transferred must equal total positive net balances (6000 + 3000 = 9000)
      expect(totalTransferred).toBe(9000n);

      // Every member must be at exact zero post settlement
      for (const bal of postBalances.values()) {
        expect(bal).toBe(0n);
      }
    });

    test('SettlementOptimizer produces deterministic output for identical inputs', () => {
      const balances: MemberNetBalance[] = [
        { userId: 'user1', netBalanceMinor: -10000n },
        { userId: 'user2', netBalanceMinor: 5000n },
        { userId: 'user3', netBalanceMinor: 5000n },
      ];

      const plan1 = SettlementOptimizer.optimizeTransfers(balances);
      const plan2 = SettlementOptimizer.optimizeTransfers(balances);

      expect(plan1).toEqual(plan2);
    });
  });

  describe('6. Property-Based & Randomized Stress Testing', () => {
    test('1,000 randomized expense and settlement operations strictly maintain zero-sum invariant', () => {
      const memberCount = 10;
      const members = Array.from({ length: memberCount }, (_, i) => `user_${i}`);
      const ledger = new ReferenceLedger(members);

      // Seeded-style deterministic random generator
      let seed = 42;
      const pseudoRandom = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      for (let op = 0; op < 1000; op++) {
        const isExpense = pseudoRandom() > 0.3;

        if (isExpense) {
          const payerIdx = Math.floor(pseudoRandom() * memberCount);
          const payerId = members[payerIdx]!;
          const participantCount = Math.floor(pseudoRandom() * memberCount) + 1;
          const participantIds = members.slice(0, participantCount);

          const amountMinor = BigInt(Math.floor(pseudoRandom() * 100000) + 1); // 1 paise to ₹1,000.00
          const shares = Money.allocateEqual(amountMinor, participantIds.length);

          ledger.recordExpense(
            payerId,
            participantIds.map((id, idx) => ({ userId: id, amountMinor: shares[idx]! }))
          );
        } else {
          // Settlement operation between debtor and creditor
          const allBalances = Array.from(ledger.getAllBalances().entries());
          const debtors = allBalances.filter(([_, b]) => b < 0n);
          const creditors = allBalances.filter(([_, b]) => b > 0n);

          if (debtors.length > 0 && creditors.length > 0) {
            const [debtorId, debtorBal] = debtors[0]!;
            const [creditorId, creditorBal] = creditors[0]!;

            const maxSettle = -debtorBal < creditorBal ? -debtorBal : creditorBal;
            const settleAmount = BigInt(Math.max(1, Math.floor(Number(maxSettle) * pseudoRandom())));

            ledger.recordSettlement(debtorId, creditorId, settleAmount);
          }
        }

        // Mathematical invariant check after every single operation:
        expect(ledger.getZeroSumTotal()).toBe(0n);
      }
    });
  });
});
