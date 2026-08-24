import { Request, Response, NextFunction } from 'express';
import { BalanceService } from './balance.service';

export class BalanceController {
  public static async getGroupBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const balances = await BalanceService.getGroupBalances(
        req.params.groupId as string,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: balances,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPersonBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const detail = await BalanceService.getPersonBalanceDetail(
        req.params.groupId as string,
        req.user!.id,
        req.params.userId as string
      );
      res.status(200).json({
        success: true,
        data: detail,
      });
    } catch (error) {
      next(error);
    }
  }
}
