import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { prisma } from '../../infrastructure/database/prisma';

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

  public static async sendPaymentReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recipientUserId, groupId, groupName, amountMinor, durationText, expenseSummary } = req.body;
      const actorUserId = req.user!.id;
      const actor = await prisma.user.findUnique({
        where: { id: actorUserId },
        select: { name: true },
      });
      const actorName = actor?.name || 'Someone';
      const formattedAmt = `₹${((amountMinor || 0) / 100).toFixed(2)}`;
      const durationInfo = durationText ? ` from ${durationText} ago` : '';
      const contextInfo = expenseSummary ? ` for ${expenseSummary}` : (groupName ? ` in ${groupName}` : '');

      const notif = await NotificationService.createNotification({
        recipientUserId,
        actorUserId,
        type: 'PAYMENT_REMINDER',
        groupId,
        groupName,
        amountMinor,
        title: `Payment Reminder: ${formattedAmt}`,
        message: `Hey, you owe ${actorName} ${formattedAmt}${contextInfo}${durationInfo}. Tap below to pay directly via UPI.`,
      });

      res.status(200).json({
        success: true,
        data: notif,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async registerPushToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { pushToken } = req.body;
      if (pushToken && typeof pushToken === 'string') {
        NotificationService.registerPushToken(req.user!.id, pushToken);
      }
      res.json({ success: true, message: 'Push token registered' });
    } catch (error) {
      next(error);
    }
  }
}
