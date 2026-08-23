import { EntityId, Result } from '../domain/common/types';
import { groupRepository } from '../repositories/groupRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { ExpenseRecord } from '../domain/ledger/ledgerEngine';
import { BalanceEngine, GroupBalanceSummary } from '../domain/balance/balanceEngine';

export class BalanceService {
  public async getGroupBalances(groupId: EntityId): Promise<Result<GroupBalanceSummary>> {
    const group = await groupRepository.findById(groupId);
    if (!group || !group.members) {
      return { success: false, error: new Error('Group not found') };
    }

    const expenses = await expenseRepository.findByGroup(groupId);

    // Transform expenses to domain ExpenseRecords
    const records: ExpenseRecord[] = expenses.map((e) => ({
      id: e.id,
      amountMinor: e.amountMinor,
      payers: [{ userId: e.payerId, amountMinor: e.amountMinor }],
      splits: e.splits.map((s) => ({ userId: s.userId, amountMinor: s.amountMinor })),
    }));

    const memberIds = group.members.map((m) => m.id);
    return BalanceEngine.calculateBalances(memberIds, records);
  }
}

export const balanceService = new BalanceService();
