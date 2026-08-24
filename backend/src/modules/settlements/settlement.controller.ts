import { Request, Response, NextFunction } from 'express';
import { SettlementService } from './settlement.service';

export class SettlementController {
  public static async recordSettlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const idempotencyKey = req.header('Idempotency-Key');
      const settlement = await SettlementService.recordSettlement(
        req.params.groupId as string,
        req.user!.id,
        req.body,
        idempotencyKey
      );
      res.status(201).json({
        success: true,
        data: settlement,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getGroupSettlements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SettlementService.getGroupSettlements(
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
