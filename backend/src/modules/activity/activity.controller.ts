import { Request, Response, NextFunction } from 'express';
import { ActivityService } from './activity.service';

export class ActivityController {
  public static async getActivityFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ActivityService.getUserActivityFeed(req.user!.id, req.query as any);
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
