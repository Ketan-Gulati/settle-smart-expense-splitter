import { prisma } from '../../infrastructure/database/prisma';
import { CreateRecurringScheduleInput, UpdateRecurringScheduleInput, RecurringScheduleDTO } from './recurring.schemas';

export class RecurringService {
  /**
   * Helper to compute next occurrence date based on frequency and schedule settings
   */
  public static calculateNextOccurrence(
    fromDate: Date,
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY',
    dayOfMonth?: number | null,
    dayOfWeek?: number | null
  ): Date {
    const next = new Date(fromDate);

    switch (frequency) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        if (dayOfWeek !== undefined && dayOfWeek !== null) {
          const currentDay = next.getDay();
          const diff = (dayOfWeek - currentDay + 7) % 7;
          if (diff > 0) next.setDate(next.getDate() + diff);
        }
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        if (dayOfMonth) {
          const maxDays = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
          next.setDate(Math.min(dayOfMonth, maxDays));
        }
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Creates a new recurring expense schedule
   */
  public static async createSchedule(
    groupId: string,
    userId: string,
    input: CreateRecurringScheduleInput
  ): Promise<RecurringScheduleDTO> {
    const paidByUserId = input.paidByUserId || userId;
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const dayOfMonth = input.dayOfMonth || startDate.getDate();

    const schedule = await prisma.recurringExpenseSchedule.create({
      data: {
        groupId,
        title: input.title,
        amountMinor: BigInt(Math.round(input.amountMinor * 100)),
        currency: input.currency || 'INR',
        category: input.category || 'GENERAL',
        paidByUserId,
        splitMethod: input.splitMethod || 'EQUAL',
        frequency: input.frequency || 'MONTHLY',
        behavior: input.behavior || 'AUTO_ADD',
        dayOfMonth,
        dayOfWeek: input.dayOfWeek ?? null,
        startDate,
        endDate: input.endDate ? new Date(input.endDate) : null,
        nextOccurrenceAt: startDate,
        isActive: true,
      },
      include: {
        group: { select: { name: true } },
      },
    });

    const payer = await prisma.user.findUnique({ where: { id: paidByUserId } });

    return {
      id: schedule.id,
      groupId: schedule.groupId,
      groupName: schedule.group.name,
      title: schedule.title,
      amountMinor: Number(schedule.amountMinor) / 100,
      currency: schedule.currency,
      category: schedule.category,
      paidByUserId: schedule.paidByUserId,
      paidByUserName: payer?.name || 'Member',
      splitMethod: schedule.splitMethod,
      frequency: schedule.frequency as any,
      behavior: schedule.behavior as any,
      dayOfMonth: schedule.dayOfMonth,
      dayOfWeek: schedule.dayOfWeek,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate ? schedule.endDate.toISOString() : null,
      nextOccurrenceAt: schedule.nextOccurrenceAt.toISOString(),
      lastGeneratedAt: schedule.lastGeneratedAt ? schedule.lastGeneratedAt.toISOString() : null,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }

  /**
   * Get all recurring schedules for a group
   */
  public static async getGroupSchedules(groupId: string): Promise<RecurringScheduleDTO[]> {
    const schedules = await prisma.recurringExpenseSchedule.findMany({
      where: { groupId },
      orderBy: { nextOccurrenceAt: 'asc' },
      include: {
        group: { select: { name: true } },
      },
    });

    const userIds = Array.from(new Set(schedules.map((s) => s.paidByUserId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return schedules.map((s) => ({
      id: s.id,
      groupId: s.groupId,
      groupName: s.group.name,
      title: s.title,
      amountMinor: Number(s.amountMinor) / 100,
      currency: s.currency,
      category: s.category,
      paidByUserId: s.paidByUserId,
      paidByUserName: userMap.get(s.paidByUserId) || 'Member',
      splitMethod: s.splitMethod,
      frequency: s.frequency as any,
      behavior: s.behavior as any,
      dayOfMonth: s.dayOfMonth,
      dayOfWeek: s.dayOfWeek,
      startDate: s.startDate.toISOString(),
      endDate: s.endDate ? s.endDate.toISOString() : null,
      nextOccurrenceAt: s.nextOccurrenceAt.toISOString(),
      lastGeneratedAt: s.lastGeneratedAt ? s.lastGeneratedAt.toISOString() : null,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  /**
   * Generates overdue occurrences for active schedules (Idempotent catch-up)
   */
  public static async processOverdueSchedules(groupId?: string): Promise<{ generatedCount: number }> {
    const now = new Date();
    const whereClause: any = {
      isActive: true,
      nextOccurrenceAt: { lte: now },
    };
    if (groupId) whereClause.groupId = groupId;

    const overdueSchedules = await prisma.recurringExpenseSchedule.findMany({
      where: whereClause,
      include: {
        group: {
          include: {
            members: { where: { leftAt: null } },
          },
        },
      },
    });

    let generatedCount = 0;

    for (const schedule of overdueSchedules) {
      if (schedule.endDate && schedule.nextOccurrenceAt > schedule.endDate) {
        await prisma.recurringExpenseSchedule.update({
          where: { id: schedule.id },
          data: { isActive: false },
        });
        continue;
      }

      if (schedule.behavior === 'AUTO_ADD') {
        const occurrenceDate = new Date(schedule.nextOccurrenceAt);
        occurrenceDate.setHours(0, 0, 0, 0);

        // Check idempotency: UNIQUE(recurringScheduleId, occurrenceDate)
        const existing = await prisma.expense.findFirst({
          where: {
            recurringScheduleId: schedule.id,
            occurrenceDate,
          },
        });

        if (!existing) {
          const memberIds = schedule.group.members.map((m) => m.userId);
          const totalAmount = Number(schedule.amountMinor) / 100;
          const share = totalAmount / (memberIds.length || 1);

          await prisma.expense.create({
            data: {
              groupId: schedule.groupId,
              description: `${schedule.title} (Recurring)`,
              amountMinor: schedule.amountMinor,
              currency: schedule.currency,
              category: schedule.category || 'GENERAL',
              paidByUserId: schedule.paidByUserId,
              splitMethod: schedule.splitMethod,
              recurringScheduleId: schedule.id,
              occurrenceDate,
              splits: {
                create: memberIds.map((userId) => ({
                  userId,
                  amountMinor: BigInt(Math.round(share * 100)),
                })),
              },
            },
          });
          generatedCount++;
        }
      }

      // Compute next cycle
      const nextDate = this.calculateNextOccurrence(
        schedule.nextOccurrenceAt,
        schedule.frequency as any,
        schedule.dayOfMonth,
        schedule.dayOfWeek
      );

      await prisma.recurringExpenseSchedule.update({
        where: { id: schedule.id },
        data: {
          lastGeneratedAt: now,
          nextOccurrenceAt: nextDate,
        },
      });
    }

    return { generatedCount };
  }

  /**
   * Pause / Resume / Update schedule
   */
  public static async updateSchedule(
    scheduleId: string,
    input: UpdateRecurringScheduleInput
  ): Promise<RecurringScheduleDTO> {
    const schedule = await prisma.recurringExpenseSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.amountMinor && { amountMinor: BigInt(Math.round(input.amountMinor * 100)) }),
        ...(input.category && { category: input.category }),
        ...(input.frequency && { frequency: input.frequency }),
        ...(input.behavior && { behavior: input.behavior }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: { group: { select: { name: true } } },
    });

    const payer = await prisma.user.findUnique({ where: { id: schedule.paidByUserId } });

    return {
      id: schedule.id,
      groupId: schedule.groupId,
      groupName: schedule.group.name,
      title: schedule.title,
      amountMinor: Number(schedule.amountMinor) / 100,
      currency: schedule.currency,
      category: schedule.category,
      paidByUserId: schedule.paidByUserId,
      paidByUserName: payer?.name || 'Member',
      splitMethod: schedule.splitMethod,
      frequency: schedule.frequency as any,
      behavior: schedule.behavior as any,
      dayOfMonth: schedule.dayOfMonth,
      dayOfWeek: schedule.dayOfWeek,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate ? schedule.endDate.toISOString() : null,
      nextOccurrenceAt: schedule.nextOccurrenceAt.toISOString(),
      lastGeneratedAt: schedule.lastGeneratedAt ? schedule.lastGeneratedAt.toISOString() : null,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }

  /**
   * Delete schedule (preserves generated past historical expense records)
   */
  public static async deleteSchedule(scheduleId: string): Promise<void> {
    await prisma.recurringExpenseSchedule.delete({
      where: { id: scheduleId },
    });
  }
}
