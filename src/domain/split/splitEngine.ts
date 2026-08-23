import { EntityId, Result } from '../common/types';

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ParticipantShare {
  readonly userId: EntityId;
  readonly amountMinor: number;
}

export interface SplitInput {
  readonly method: SplitMethod;
  readonly totalAmountMinor: number;
  readonly participantIds: readonly EntityId[];
  readonly exactAmounts?: Record<EntityId, number>;
  readonly percentages?: Record<EntityId, number>; // e.g. 25 for 25%
  readonly shares?: Record<EntityId, number>; // e.g. 2 for 2 shares
}

export class SplitEngine {
  /**
   * Calculates individual participant obligations in minor units deterministically.
   * Preserves invariant: Sum of participant obligations === total expense amountMinor.
   */
  public static calculateSplits(input: SplitInput): Result<ParticipantShare[]> {
    const { method, totalAmountMinor, participantIds } = input;

    if (totalAmountMinor <= 0) {
      return {
        success: false,
        error: new Error('Expense amount must be strictly greater than 0.'),
      };
    }

    if (participantIds.length === 0) {
      return {
        success: false,
        error: new Error('At least one participant is required.'),
      };
    }

    switch (method) {
      case 'equal':
        return this.splitEqual(totalAmountMinor, participantIds);
      case 'exact':
        return this.splitExact(totalAmountMinor, participantIds, input.exactAmounts || {});
      case 'percentage':
        return this.splitPercentage(totalAmountMinor, participantIds, input.percentages || {});
      case 'shares':
        return this.splitShares(totalAmountMinor, participantIds, input.shares || {});
      default:
        return {
          success: false,
          error: new Error(`Unsupported split method: ${method}`),
        };
    }
  }

  private static splitEqual(
    totalAmountMinor: number,
    participantIds: readonly EntityId[]
  ): Result<ParticipantShare[]> {
    const count = participantIds.length;
    const baseShare = Math.floor(totalAmountMinor / count);
    const remainder = totalAmountMinor % count;

    // Distribute baseShare to everyone, and remainder 1 unit to the first N participants deterministically
    const shares: ParticipantShare[] = participantIds.map((userId, index) => ({
      userId,
      amountMinor: baseShare + (index < remainder ? 1 : 0),
    }));

    return { success: true, data: shares };
  }

  private static splitExact(
    totalAmountMinor: number,
    participantIds: readonly EntityId[],
    exactAmounts: Record<EntityId, number>
  ): Result<ParticipantShare[]> {
    let sum = 0;
    const shares: ParticipantShare[] = [];

    for (const userId of participantIds) {
      const amount = exactAmounts[userId] ?? 0;
      if (amount < 0) {
        return {
          success: false,
          error: new Error(`Amount for participant cannot be negative.`),
        };
      }
      sum += amount;
      shares.push({ userId, amountMinor: amount });
    }

    if (sum !== totalAmountMinor) {
      const diff = totalAmountMinor - sum;
      return {
        success: false,
        error: new Error(
          `Exact split amounts sum to ${sum / 100}, which does not match total ${
            totalAmountMinor / 100
          } (difference: ${diff > 0 ? '+' : ''}${diff / 100}).`
        ),
      };
    }

    return { success: true, data: shares };
  }

  private static splitPercentage(
    totalAmountMinor: number,
    participantIds: readonly EntityId[],
    percentages: Record<EntityId, number>
  ): Result<ParticipantShare[]> {
    let totalPercentage = 0;
    for (const userId of participantIds) {
      const pct = percentages[userId] ?? 0;
      if (pct < 0) {
        return {
          success: false,
          error: new Error(`Percentage cannot be negative.`),
        };
      }
      totalPercentage += pct;
    }

    // Must sum to exactly 100%
    if (Math.round(totalPercentage * 100) !== 10000) {
      return {
        success: false,
        error: new Error(`Percentages must add up to 100%. Current total: ${totalPercentage}%.`),
      };
    }

    // Allocate amounts in minor units
    let allocatedSum = 0;
    const shares: ParticipantShare[] = [];

    participantIds.forEach((userId, index) => {
      if (index === participantIds.length - 1) {
        // Last participant absorbs any single-paise rounding discrepancy
        const remaining = totalAmountMinor - allocatedSum;
        shares.push({ userId, amountMinor: remaining });
      } else {
        const pct = percentages[userId] ?? 0;
        const amount = Math.round((totalAmountMinor * pct) / 100);
        allocatedSum += amount;
        shares.push({ userId, amountMinor: amount });
      }
    });

    return { success: true, data: shares };
  }

  private static splitShares(
    totalAmountMinor: number,
    participantIds: readonly EntityId[],
    sharesInput: Record<EntityId, number>
  ): Result<ParticipantShare[]> {
    let totalShares = 0;
    for (const userId of participantIds) {
      const count = sharesInput[userId] ?? 0;
      if (count < 0) {
        return {
          success: false,
          error: new Error(`Shares cannot be negative.`),
        };
      }
      totalShares += count;
    }

    if (totalShares <= 0) {
      return {
        success: false,
        error: new Error(`Total shares must be greater than 0.`),
      };
    }

    let allocatedSum = 0;
    const shares: ParticipantShare[] = [];

    participantIds.forEach((userId, index) => {
      if (index === participantIds.length - 1) {
        // Final participant absorbs rounding remainder
        const remaining = totalAmountMinor - allocatedSum;
        shares.push({ userId, amountMinor: remaining });
      } else {
        const shareCount = sharesInput[userId] ?? 0;
        const amount = Math.floor((totalAmountMinor * shareCount) / totalShares);
        allocatedSum += amount;
        shares.push({ userId, amountMinor: amount });
      }
    });

    return { success: true, data: shares };
  }
}
