import { EntityId, Result } from '../common/types';

export interface PayerShare {
  readonly userId: EntityId;
  readonly amountMinor: number;
}

export interface ParticipantShare {
  readonly userId: EntityId;
  readonly amountMinor: number;
}

export interface ExpenseRecord {
  readonly id: EntityId;
  readonly amountMinor: number;
  readonly payers: readonly PayerShare[];
  readonly splits: readonly ParticipantShare[];
}

export interface PairwiseDebt {
  readonly debtorId: EntityId; // Person who owes
  readonly creditorId: EntityId; // Person who is owed
  readonly amountMinor: number; // Positive integer minor units
}

export class LedgerEngine {
  /**
   * Processes a list of expenses and derives raw pairwise obligations.
   * Supports single or multiple payers per expense.
   *
   * Invariants:
   * 1. Total paid === Total split === Expense amountMinor.
   * 2. No debtor === creditor self-obligation.
   * 3. All debt amounts are positive integer minor units.
   */
  public static calculateObligations(expenses: readonly ExpenseRecord[]): Result<PairwiseDebt[]> {
    const obligations: PairwiseDebt[] = [];

    for (const exp of expenses) {
      const totalPaid = exp.payers.reduce((sum, p) => sum + p.amountMinor, 0);
      const totalSplit = exp.splits.reduce((sum, s) => sum + s.amountMinor, 0);

      if (totalPaid !== exp.amountMinor) {
        return {
          success: false,
          error: new Error(
            `Expense ${exp.id}: total paid (${totalPaid}) does not equal expense amount (${exp.amountMinor}).`
          ),
        };
      }

      if (totalSplit !== exp.amountMinor) {
        return {
          success: false,
          error: new Error(
            `Expense ${exp.id}: total split (${totalSplit}) does not equal expense amount (${exp.amountMinor}).`
          ),
        };
      }

      // If single payer:
      if (exp.payers.length === 1) {
        const payer = exp.payers[0]!;
        for (const split of exp.splits) {
          if (split.userId !== payer.userId && split.amountMinor > 0) {
            obligations.push({
              debtorId: split.userId,
              creditorId: payer.userId,
              amountMinor: split.amountMinor,
            });
          }
        }
        continue;
      }

      // Multi-payer scenario:
      // Proportionally assign participant split obligations to each payer based on their contribution.
      // Pro-rata factor = payer.amountMinor / totalPaid
      for (const split of exp.splits) {
        let allocatedSplitToPayers = 0;

        exp.payers.forEach((payer, idx) => {
          if (split.userId === payer.userId) {
            // Participant is one of the payers; they do not owe themselves
            return;
          }

          let payerPortion: number;
          if (idx === exp.payers.length - 1) {
            // Absorb any integer division remainder
            payerPortion = split.amountMinor - allocatedSplitToPayers;
          } else {
            payerPortion = Math.floor((split.amountMinor * payer.amountMinor) / exp.amountMinor);
            allocatedSplitToPayers += payerPortion;
          }

          if (payerPortion > 0) {
            obligations.push({
              debtorId: split.userId,
              creditorId: payer.userId,
              amountMinor: payerPortion,
            });
          }
        });
      }
    }

    return { success: true, data: obligations };
  }
}
