import { EntityId, Result } from '../domain/common/types';
import { groupRepository } from '../repositories/groupRepository';
import { balanceService } from './balanceService';
import {
  SettlementOptimizer,
  SettlementPlan,
  SettlementExplanation,
  SettlementTransfer,
} from '../domain/settlement/settlementOptimizer';

export class SettlementService {
  public async getOptimizedSettlementPlan(groupId: EntityId): Promise<Result<SettlementPlan>> {
    const group = await groupRepository.findById(groupId);
    if (!group) {
      return { success: false, error: new Error('Group not found') };
    }

    const balancesResult = await balanceService.getGroupBalances(groupId);
    if (!balancesResult.success) {
      return balancesResult;
    }

    const summary = balancesResult.data;
    return SettlementOptimizer.optimizeSettlement(
      summary.userBalances,
      summary.pairwiseObligations.length
    );
  }

  public async explainTransfer(
    groupId: EntityId,
    transfer: SettlementTransfer
  ): Promise<Result<SettlementExplanation>> {
    const balancesResult = await balanceService.getGroupBalances(groupId);
    if (!balancesResult.success) {
      return balancesResult;
    }

    const summary = balancesResult.data;
    const directDebtorDebts = summary.pairwiseObligations
      .filter((o) => o.debtorId === transfer.fromUserId)
      .map((o) => ({ toUserId: o.creditorId, amountMinor: o.amountMinor }));

    const directCreditorCredits = summary.pairwiseObligations
      .filter((o) => o.creditorId === transfer.toUserId)
      .map((o) => ({ fromUserId: o.debtorId, amountMinor: o.amountMinor }));

    const isDirect = summary.pairwiseObligations.some(
      (o) => o.debtorId === transfer.fromUserId && o.creditorId === transfer.toUserId
    );

    const group = await groupRepository.findById(groupId);
    const debtorUser = group?.members?.find((m) => m.id === transfer.fromUserId);
    const creditorUser = group?.members?.find((m) => m.id === transfer.toUserId);
    const debtorName = debtorUser?.name || 'Debtor';
    const creditorName = creditorUser?.name || 'Creditor';

    let rationale = '';
    if (isDirect) {
      rationale = `${debtorName} directly owes ${creditorName} ₹${(transfer.amountMinor / 100).toLocaleString('en-IN')} across shared expenses in this group.`;
    } else {
      rationale = `This payment of ₹${(transfer.amountMinor / 100).toLocaleString('en-IN')} from ${debtorName} to ${creditorName} resolves multi-person chain obligations in a single optimized transfer.`;
    }

    return {
      success: true,
      data: {
        transfer,
        directDebtorDebts,
        directCreditorCredits,
        rationale,
      },
    };
  }
}

export const settlementService = new SettlementService();
