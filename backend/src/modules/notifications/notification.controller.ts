import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';

export class NotificationController {
  public static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifs = await NotificationService.getUserNotifications(req.user!.id);
      res.status(200).json({
        success: true,
        data: notifs,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async respondToNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'ACCEPT' | 'REJECT'
      const result = await NotificationService.respondToInvite(req.user!.id, id as string, action);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async dismissNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await NotificationService.dismissNotification(req.user!.id, id as string);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
