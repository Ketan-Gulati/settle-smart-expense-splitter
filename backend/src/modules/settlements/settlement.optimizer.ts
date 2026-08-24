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
   * Prepares service boundary for future debt simplification algorithms.
   * Consumes normalized member balances and produces simplified transfers.
   */
  public static optimizeTransfers(_balances: MemberNetBalance[]): OptimizedTransferPlan[] {
    // Service boundary prepared; will implement algorithm in settlement optimizer phase
    return [];
  }
}
