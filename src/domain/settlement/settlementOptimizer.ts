import { EntityId, Result } from '../common/types';
import { UserBalance } from '../balance/balanceEngine';

export interface SettlementTransfer {
  readonly fromUserId: EntityId; // Debtor (sender)
  readonly toUserId: EntityId; // Creditor (receiver)
  readonly amountMinor: number; // Positive integer amount
}

export interface SettlementExplanation {
  readonly transfer: SettlementTransfer;
  readonly directDebtorDebts: { toUserId: EntityId; amountMinor: number }[];
  readonly directCreditorCredits: { fromUserId: EntityId; amountMinor: number }[];
  readonly rationale: string;
}

export interface SettlementPlan {
  readonly transfers: SettlementTransfer[];
  readonly totalTransfersCount: number;
  readonly totalSettledMinor: number;
  readonly originalObligationsCount: number;
  readonly transferReductionPercentage: number;
}

export class SettlementOptimizer {
  /**
   * Generates a minimal, deterministic settlement plan from member net balances.
   *
   * Algorithm:
   * 1. Check Invariant: Sum of net balances === 0.
   * 2. Separate into Debtors (net < 0) and Creditors (net > 0).
   * 3. Sort deterministically:
   *    - Descending absolute amount (largest debtors/creditors first)
   *    - Tie breaker: Alphabetical / lexicographical memberId
   * 4. Greedy match: Settle min(debtor_remaining, creditor_remaining).
   * 5. Adjust balances and advance pointers.
   *
   * Invariants guaranteed:
   * 1. Money is strictly conserved.
   * 2. Every debtor only pays; every creditor only receives.
   * 3. Resulting balances for all members after transfers are exactly 0.
   * 4. Identical inputs produce strictly identical transfer sets and orderings.
   */
  public static optimizeSettlement(
    userBalances: Record<EntityId, UserBalance>,
    originalObligationsCount: number = 0
  ): Result<SettlementPlan> {
    // 1. Invariant check: Sum of net balances === 0
    let balanceSum = 0;
    const debtors: { userId: EntityId; amountRemaining: number }[] = [];
    const creditors: { userId: EntityId; amountRemaining: number }[] = [];

    for (const [userId, balance] of Object.entries(userBalances)) {
      balanceSum += balance.netBalanceMinor;
      if (balance.netBalanceMinor < 0) {
        debtors.push({
          userId,
          amountRemaining: Math.abs(balance.netBalanceMinor),
        });
      } else if (balance.netBalanceMinor > 0) {
        creditors.push({
          userId,
          amountRemaining: balance.netBalanceMinor,
        });
      }
    }

    if (balanceSum !== 0) {
      return {
        success: false,
        error: new Error(
          `Cannot optimize settlement: Sum of net balances (${balanceSum}) is not zero.`
        ),
      };
    }

    // 2. Deterministic Sort:
    // Primary: Largest amountRemaining first (descending)
    // Secondary tie-breaker: String comparison on userId
    debtors.sort((a, b) => {
      if (b.amountRemaining !== a.amountRemaining) {
        return b.amountRemaining - a.amountRemaining;
      }
      return a.userId.localeCompare(b.userId);
    });

    creditors.sort((a, b) => {
      if (b.amountRemaining !== a.amountRemaining) {
        return b.amountRemaining - a.amountRemaining;
      }
      return a.userId.localeCompare(b.userId);
    });

    // 3. Greedy Matching
    const transfers: SettlementTransfer[] = [];
    let dIdx = 0;
    let cIdx = 0;
    let totalSettledMinor = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx]!;
      const creditor = creditors[cIdx]!;

      const transferAmount = Math.min(debtor.amountRemaining, creditor.amountRemaining);

      if (transferAmount > 0) {
        transfers.push({
          fromUserId: debtor.userId,
          toUserId: creditor.userId,
          amountMinor: transferAmount,
        });

        totalSettledMinor += transferAmount;
        debtor.amountRemaining -= transferAmount;
        creditor.amountRemaining -= transferAmount;
      }

      if (debtor.amountRemaining === 0) {
        dIdx++;
      }
      if (creditor.amountRemaining === 0) {
        cIdx++;
      }
    }

    const totalTransfersCount = transfers.length;
    const reduction =
      originalObligationsCount > 0 && totalTransfersCount < originalObligationsCount
        ? Math.round(
            ((originalObligationsCount - totalTransfersCount) / originalObligationsCount) * 100
          )
        : 0;

    return {
      success: true,
      data: {
        transfers,
        totalTransfersCount,
        totalSettledMinor,
        originalObligationsCount,
        transferReductionPercentage: reduction,
      },
    };
  }
}
