import { z } from 'zod';

export const RecurrenceFrequencyEnum = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY']);
export const RecurringBehaviorEnum = z.enum(['AUTO_ADD', 'REMIND_CONFIRM']);
export const SplitMethodEnum = z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']);

export const createRecurringScheduleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  amountMinor: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('INR'),
  category: z.string().max(100).optional(),
  paidByUserId: z.string().uuid().optional(),
  splitMethod: SplitMethodEnum.default('EQUAL'),
  frequency: RecurrenceFrequencyEnum.default('MONTHLY'),
  behavior: RecurringBehaviorEnum.default('AUTO_ADD'),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional().nullable(),
});

export const updateRecurringScheduleSchema = createRecurringScheduleSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type CreateRecurringScheduleInput = z.infer<typeof createRecurringScheduleSchema>;
export type UpdateRecurringScheduleInput = z.infer<typeof updateRecurringScheduleSchema>;

export interface RecurringScheduleDTO {
  id: string;
  groupId: string;
  groupName?: string;
  title: string;
  amountMinor: number;
  currency: string;
  category: string | null;
  paidByUserId: string;
  paidByUserName: string;
  splitMethod: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
  behavior: 'AUTO_ADD' | 'REMIND_CONFIRM';
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  startDate: string;
  endDate: string | null;
  nextOccurrenceAt: string;
  lastGeneratedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
