import { Request, Response, NextFunction } from 'express';
import { RecurringService } from './recurring.service';
import { createRecurringScheduleSchema, updateRecurringScheduleSchema } from './recurring.schemas';

export class RecurringController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.groupId as string;
      const input = createRecurringScheduleSchema.parse(req.body);
      const schedule = await RecurringService.createSchedule(groupId, req.user!.id, input);
      res.status(201).json({ success: true, data: schedule });
    } catch (err) {
      next(err);
    }
  }

  public static async listGroupSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groupId = req.params.groupId as string;
      // Trigger automatic catch-up on list query
      await RecurringService.processOverdueSchedules(groupId).catch((e) => console.warn('Catch-up warning:', e));
      const schedules = await RecurringService.getGroupSchedules(groupId);
      res.json({ success: true, data: schedules });
    } catch (err) {
      next(err);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const input = updateRecurringScheduleSchema.parse(req.body);
      const updated = await RecurringService.updateSchedule(id, input);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      await RecurringService.deleteSchedule(id);
      res.json({ success: true, message: 'Recurring schedule removed' });
    } catch (err) {
      next(err);
    }
  }

  public static async triggerProcess(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await RecurringService.processOverdueSchedules();
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
