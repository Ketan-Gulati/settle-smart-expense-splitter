import { EntityId, Result } from '../domain/common/types';
import { databaseService } from '../database/db';
import { CreateExpenseCommand, ExpenseEntity, ExpenseValidator } from '../domain/expense/expense';
import { groupRepository } from './groupRepository';
import { useAppStore } from '../store/appStore';

export class ExpenseRepository {
  public async create(command: CreateExpenseCommand): Promise<Result<ExpenseEntity>> {
    const group = await groupRepository.findById(command.groupId);
    if (!group || !group.members) {
      return { success: false, error: new Error('Group not found') };
    }

    const memberIdSet = new Set(group.members.map((m) => m.id));
    const validationResult = ExpenseValidator.validateCreateCommand(command, memberIdSet);
    if (!validationResult.success) {
      return validationResult;
    }

    const splits = validationResult.data;
    const db = await databaseService.getDb();
    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const currency = command.currency || group.currency || 'INR';
    const date = command.date || new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Insert expense row
      await db.runAsync(
        `INSERT INTO expenses (id, group_id, description, amount_minor, currency, category_id, date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          expenseId,
          command.groupId,
          command.description.trim(),
          command.amountMinor,
          currency,
          command.categoryId || null,
          date,
          command.notes || null,
          command.createdBy,
        ]
      );

      // 2. Insert payer row
      await db.runAsync(
        `INSERT INTO expense_payers (expense_id, user_id, amount_minor) VALUES (?, ?, ?);`,
        [expenseId, command.payerId, command.amountMinor]
      );

      // 3. Insert split rows
      for (const split of splits) {
        await db.runAsync(
          `INSERT INTO expense_splits (expense_id, user_id, amount_minor, split_method) VALUES (?, ?, ?, ?);`,
          [expenseId, split.userId, split.amountMinor, command.splitMethod]
        );
      }
    });

    const created = await this.findById(expenseId);
    if (!created) {
      return { success: false, error: new Error('Failed to retrieve newly created expense') };
    }

    useAppStore.getState().notifyDataChanged();
    return { success: true, data: created };
  }

  public async findById(id: EntityId): Promise<ExpenseEntity | null> {
    const db = await databaseService.getDb();
    const exp = await db.getFirstAsync<any>('SELECT * FROM expenses WHERE id = ?;', [id]);
    if (!exp) return null;

    const payer = await db.getFirstAsync<any>(
      'SELECT user_id FROM expense_payers WHERE expense_id = ?;',
      [id]
    );

    const splits = await db.getAllAsync<any>(
      'SELECT user_id, amount_minor, split_method FROM expense_splits WHERE expense_id = ?;',
      [id]
    );

    return {
      id: exp.id,
      groupId: exp.group_id,
      description: exp.description,
      amountMinor: exp.amount_minor,
      currency: exp.currency,
      categoryId: exp.category_id || undefined,
      date: exp.date,
      notes: exp.notes || undefined,
      receiptId: exp.receipt_id || undefined,
      createdBy: exp.created_by,
      createdAt: exp.created_at,
      payerId: payer?.user_id || exp.created_by,
      splitMethod: splits[0]?.split_method || 'equal',
      splits: splits.map((s) => ({
        userId: s.user_id,
        amountMinor: s.amount_minor,
      })),
    };
  }

  public async findByGroup(groupId: EntityId): Promise<ExpenseEntity[]> {
    const db = await databaseService.getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM expenses WHERE group_id = ? ORDER BY date DESC, created_at DESC;',
      [groupId]
    );

    const expenses: ExpenseEntity[] = [];
    for (const exp of rows) {
      const payer = await db.getFirstAsync<any>(
        'SELECT user_id FROM expense_payers WHERE expense_id = ?;',
        [exp.id]
      );
      const splits = await db.getAllAsync<any>(
        'SELECT user_id, amount_minor, split_method FROM expense_splits WHERE expense_id = ?;',
        [exp.id]
      );
      expenses.push({
        id: exp.id,
        groupId: exp.group_id,
        description: exp.description,
        amountMinor: exp.amount_minor,
        currency: exp.currency,
        categoryId: exp.category_id || undefined,
        date: exp.date,
        notes: exp.notes || undefined,
        receiptId: exp.receipt_id || undefined,
        createdBy: exp.created_by,
        createdAt: exp.created_at,
        payerId: payer?.user_id || exp.created_by,
        splitMethod: splits[0]?.split_method || 'equal',
        splits: splits.map((s) => ({
          userId: s.user_id,
          amountMinor: s.amount_minor,
        })),
      });
    }

    return expenses;
  }

  public async update(id: EntityId, command: CreateExpenseCommand): Promise<Result<ExpenseEntity>> {
    const group = await groupRepository.findById(command.groupId);
    if (!group || !group.members) {
      return { success: false, error: new Error('Group not found') };
    }

    const memberIdSet = new Set(group.members.map((m) => m.id));
    const validationResult = ExpenseValidator.validateCreateCommand(command, memberIdSet);
    if (!validationResult.success) {
      return validationResult;
    }

    const splits = validationResult.data;
    const db = await databaseService.getDb();
    const currency = command.currency || group.currency || 'INR';
    const date = command.date || new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Update expense row
      await db.runAsync(
        `UPDATE expenses SET group_id = ?, description = ?, amount_minor = ?, currency = ?, category_id = ?, date = ?, notes = ? WHERE id = ?;`,
        [
          command.groupId,
          command.description.trim(),
          command.amountMinor,
          currency,
          command.categoryId || null,
          date,
          command.notes || null,
          id,
        ]
      );

      // 2. Delete and recreate payers
      await db.runAsync('DELETE FROM expense_payers WHERE expense_id = ?;', [id]);
      await db.runAsync(
        `INSERT INTO expense_payers (expense_id, user_id, amount_minor) VALUES (?, ?, ?);`,
        [id, command.payerId, command.amountMinor]
      );

      // 3. Delete and recreate splits
      await db.runAsync('DELETE FROM expense_splits WHERE expense_id = ?;', [id]);
      for (const split of splits) {
        await db.runAsync(
          `INSERT INTO expense_splits (expense_id, user_id, amount_minor, split_method) VALUES (?, ?, ?, ?);`,
          [id, split.userId, split.amountMinor, command.splitMethod]
        );
      }
    });

    const updated = await this.findById(id);
    if (!updated) {
      return { success: false, error: new Error('Failed to retrieve updated expense') };
    }

    useAppStore.getState().notifyDataChanged();
    return { success: true, data: updated };
  }

  public async delete(id: EntityId): Promise<boolean> {
    const db = await databaseService.getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM expense_payers WHERE expense_id = ?;', [id]);
      await db.runAsync('DELETE FROM expense_splits WHERE expense_id = ?;', [id]);
      await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    });
    useAppStore.getState().notifyDataChanged();
    return true;
  }
}

export const expenseRepository = new ExpenseRepository();
