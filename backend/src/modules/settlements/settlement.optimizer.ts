export interface MemberNetBalance {
  userId: string;
  netBalanceMinor: bigint;
}

export interface OptimizedTransferPlan {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
}

export class SettlementOptimizer {
  /**
   * Generates a deterministic debt simplification plan from member net balances using a greedy matching algorithm.
   *
   * Note on Algorithmic Properties:
   * 1. Reduction Bound: Produces at most (N - 1) transfers where N is the number of members with non-zero balances.
   * 2. Heuristic vs NP-Hard Optimal: The minimum cash-flow problem is NP-hard (equivalent to subset sum).
   *    This greedy algorithm provides an efficient O(N log N) reduction with deterministic output, but does not
   *    guarantee the absolute theoretical minimum number of transactions across all arbitrary cyclic combinations.
   * 3. Financial Invariant Guarantees:
   *    - Conservation: Sum(transfers) equals total positive net balances.
   *    - Zero Net Deviation: Resulting net positions after applying transfers equal exactly 0n for all members.
   *    - Debtor/Creditor Bounds: Debtors only send money (<= |debt|); creditors only receive (<= credit).
   *    - Determinism: Tied amounts are sorted deterministically by alphabetical userId.
   */
  public static optimizeTransfers(balances: MemberNetBalance[]): OptimizedTransferPlan[] {
    let balanceSum = 0n;
    const debtors: { userId: string; amountRemaining: bigint }[] = [];
    const creditors: { userId: string; amountRemaining: bigint }[] = [];

    for (const b of balances) {
      balanceSum += b.netBalanceMinor;
      if (b.netBalanceMinor < 0n) {
        debtors.push({
          userId: b.userId,
          amountRemaining: -b.netBalanceMinor,
        });
      } else if (b.netBalanceMinor > 0n) {
        creditors.push({
          userId: b.userId,
          amountRemaining: b.netBalanceMinor,
        });
      }
    }

    if (balanceSum !== 0n) {
      throw new Error(`Cannot optimize settlement: Sum of net balances (${balanceSum}) is not zero.`);
    }

    // Deterministic Sort:
    // Primary: Largest amountRemaining first (descending)
    // Secondary tie-breaker: String comparison on userId
    debtors.sort((a, b) => {
      if (b.amountRemaining > a.amountRemaining) return 1;
      if (b.amountRemaining < a.amountRemaining) return -1;
      return a.userId.localeCompare(b.userId);
    });

    creditors.sort((a, b) => {
      if (b.amountRemaining > a.amountRemaining) return 1;
      if (b.amountRemaining < a.amountRemaining) return -1;
      return a.userId.localeCompare(b.userId);
    });

    const transfers: OptimizedTransferPlan[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx]!;
      const creditor = creditors[cIdx]!;

      const settledAmount = debtor.amountRemaining < creditor.amountRemaining
        ? debtor.amountRemaining
        : creditor.amountRemaining;

      if (settledAmount > 0n) {
        transfers.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amountMinor: settledAmount,
        });

        debtor.amountRemaining -= settledAmount;
        creditor.amountRemaining -= settledAmount;
      }

      if (debtor.amountRemaining === 0n) {
        dIdx++;
      }
      if (creditor.amountRemaining === 0n) {
        cIdx++;
      }
    }

    return transfers;
  }
}
