import { Request, Response, NextFunction } from 'express';
import { ExpenseService } from './expense.service';

export class ExpenseController {
  public static async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey = req.header('Idempotency-Key');
      const expense = await ExpenseService.createExpense(
        req.user!.id,
        req.body,
        idempotencyKey
      );
      res.status(201).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getExpenseDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.getExpenseDetails(
        req.params.expenseId as string,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const expense = await ExpenseService.updateExpense(
        req.params.expenseId as string,
        req.user!.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data: expense,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ExpenseService.deleteExpense(req.params.expenseId as string, req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'Expense deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getGroupExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ExpenseService.getGroupExpenses(
        req.params.groupId as string,
        req.user!.id,
        req.query as any
      );
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}
