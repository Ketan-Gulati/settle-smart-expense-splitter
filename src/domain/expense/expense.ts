import { EntityId, Result } from '../common/types';
import { SplitMethod, ParticipantShare, SplitEngine } from '../split/splitEngine';

export interface ExpenseEntity {
  id: EntityId;
  groupId: EntityId;
  description: string;
  amountMinor: number;
  currency: string;
  categoryId?: string;
  date: string;
  notes?: string;
  receiptId?: string;
  createdBy: EntityId;
  createdAt: string;
  payerId: EntityId;
  splitMethod?: SplitMethod;
  splits: ParticipantShare[];
}

export interface CreateExpenseCommand {
  groupId: EntityId;
  description: string;
  amountMinor: number;
  currency?: string;
  categoryId?: string;
  date?: string;
  notes?: string;
  payerId: EntityId;
  participantIds: EntityId[];
  splitMethod: SplitMethod;
  exactAmounts?: Record<EntityId, number>;
  percentages?: Record<EntityId, number>;
  shares?: Record<EntityId, number>;
  createdBy: EntityId;
}

export class ExpenseValidator {
  public static validateCreateCommand(
    command: CreateExpenseCommand,
    groupMemberIds: Set<EntityId>
  ): Result<ParticipantShare[]> {
    if (!command.description.trim()) {
      return { success: false, error: new Error('Expense description is required.') };
    }

    if (command.amountMinor <= 0) {
      return { success: false, error: new Error('Expense amount must be greater than zero.') };
    }

    if (!groupMemberIds.has(command.payerId)) {
      return {
        success: false,
        error: new Error('Payer must be a registered member of this group.'),
      };
    }

    if (command.participantIds.length === 0) {
      return { success: false, error: new Error('At least one participant must be selected.') };
    }

    for (const pId of command.participantIds) {
      if (!groupMemberIds.has(pId)) {
        return {
          success: false,
          error: new Error(`Participant ${pId} is not a member of this group.`),
        };
      }
    }

    return SplitEngine.calculateSplits({
      method: command.splitMethod,
      totalAmountMinor: command.amountMinor,
      participantIds: command.participantIds,
      exactAmounts: command.exactAmounts,
      percentages: command.percentages,
      shares: command.shares,
    });
  }
}
