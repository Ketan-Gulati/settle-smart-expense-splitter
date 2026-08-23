import { EntityId, Result } from '../common/types';
import { ExpenseRecord, LedgerEngine, PairwiseDebt } from '../ledger/ledgerEngine';

export interface UserBalance {
  readonly userId: EntityId;
  readonly totalPaidMinor: number;
  readonly totalShareMinor: number;
  readonly netBalanceMinor: number; // Positive = is owed, Negative = owes, 0 = settled
}

export interface GroupBalanceSummary {
  readonly totalGroupSpentMinor: number;
  readonly userBalances: Record<EntityId, UserBalance>;
  readonly pairwiseObligations: PairwiseDebt[]; // Netted direct obligations: debtor -> creditor
}

export class BalanceEngine {
  /**
   * Calculates net balances and bilateral netted debts for a group.
   *
   * Invariants guaranteed:
   * 1. Sum of all net balances === 0.
   * 2. Reciprocal bilateral debts are netted (A->B $500, B->A $200 => A->B $300).
   * 3. No global 3rd-party graph simplification is performed (preserving underlying ledger obligations).
   */
  public static calculateBalances(
    memberIds: readonly EntityId[],
    expenses: readonly ExpenseRecord[]
  ): Result<GroupBalanceSummary> {
    // 1. Calculate raw ledger obligations
    const ledgerResult = LedgerEngine.calculateObligations(expenses);
    if (!ledgerResult.success) {
      return ledgerResult;
    }

    const rawObligations = ledgerResult.data;

    // 2. Initialize balances for all group members
    const userBalances: Record<EntityId, { totalPaid: number; totalShare: number }> = {};
    for (const mId of memberIds) {
      userBalances[mId] = { totalPaid: 0, totalShare: 0 };
    }

    let totalGroupSpentMinor = 0;

    for (const exp of expenses) {
      totalGroupSpentMinor += exp.amountMinor;

      for (const p of exp.payers) {
        if (!userBalances[p.userId]) {
          userBalances[p.userId] = { totalPaid: 0, totalShare: 0 };
        }
        userBalances[p.userId]!.totalPaid += p.amountMinor;
      }

      for (const s of exp.splits) {
        if (!userBalances[s.userId]) {
          userBalances[s.userId] = { totalPaid: 0, totalShare: 0 };
        }
        userBalances[s.userId]!.totalShare += s.amountMinor;
      }
    }

    // 3. Form Net Balances
    const finalBalances: Record<EntityId, UserBalance> = {};
    let sumOfNetBalances = 0;

    for (const [uId, b] of Object.entries(userBalances)) {
      const net = b.totalPaid - b.totalShare;
      sumOfNetBalances += net;
      finalBalances[uId] = {
        userId: uId,
        totalPaidMinor: b.totalPaid,
        totalShareMinor: b.totalShare,
        netBalanceMinor: net,
      };
    }

    if (sumOfNetBalances !== 0) {
      return {
        success: false,
        error: new Error(
          `Balance invariant violated: sum of net balances is ${sumOfNetBalances}, expected 0.`
        ),
      };
    }

    // 4. Bilateral Netting of Pairwise Obligations (A owes B vs B owes A)
    // Directed graph adjacency matrix in integer minor units: matrix[from][to]
    const matrix: Record<EntityId, Record<EntityId, number>> = {};
    for (const mId of Object.keys(userBalances)) {
      matrix[mId] = {};
    }

    for (const ob of rawObligations) {
      if (!matrix[ob.debtorId]) matrix[ob.debtorId] = {};
      matrix[ob.debtorId]![ob.creditorId] =
        (matrix[ob.debtorId]![ob.creditorId] ?? 0) + ob.amountMinor;
    }

    const processedPairs = new Set<string>();
    const nettedObligations: PairwiseDebt[] = [];
    const allUsers = Object.keys(userBalances);

    for (let i = 0; i < allUsers.length; i++) {
      for (let j = i + 1; j < allUsers.length; j++) {
        const u1 = allUsers[i]!;
        const u2 = allUsers[j]!;

        const pairKey = `${u1}__${u2}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const u1OwesU2 = matrix[u1]?.[u2] ?? 0;
        const u2OwesU1 = matrix[u2]?.[u1] ?? 0;

        if (u1OwesU2 > u2OwesU1) {
          const diff = u1OwesU2 - u2OwesU1;
          if (diff > 0) {
            nettedObligations.push({
              debtorId: u1,
              creditorId: u2,
              amountMinor: diff,
            });
          }
        } else if (u2OwesU1 > u1OwesU2) {
          const diff = u2OwesU1 - u1OwesU2;
          if (diff > 0) {
            nettedObligations.push({
              debtorId: u2,
              creditorId: u1,
              amountMinor: diff,
            });
          }
        }
      }
    }

    return {
      success: true,
      data: {
        totalGroupSpentMinor,
        userBalances: finalBalances,
        pairwiseObligations: nettedObligations,
      },
    };
  }
}
