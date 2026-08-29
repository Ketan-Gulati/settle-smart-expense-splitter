import { z } from 'zod';

export const splitMethodEnum = z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']);

export const participantSplitSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  amountMinor: z.coerce.bigint().optional(), // For EXACT
  percentage: z.coerce.number().optional(), // For PERCENTAGE
  shares: z.coerce.number().int().positive().optional(), // For SHARES
});

export const createExpenseSchema = z.object({
  groupId: z.string().uuid('Valid group ID required'),
  description: z.string().min(1, 'Description is required').max(255),
  amountMinor: z.coerce.bigint().positive('Amount must be > 0'),
  currency: z.string().max(3).optional(),
  originalAmountMinor: z.coerce.bigint().positive().optional(),
  originalCurrency: z.string().max(3).optional(),
  exchangeRate: z.coerce.number().positive().optional(),
  paidByUserId: z.string().uuid('Valid payer user ID required'),
  splitMethod: splitMethodEnum.default('EQUAL'),
  category: z.string().max(100).optional(),
  notes: z.string().optional(),
  isLocked: z.boolean().optional(),
  participants: z.array(participantSplitSchema).min(1, 'At least one participant required'),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1).max(255).optional(),
  amountMinor: z.coerce.bigint().positive().optional(),
  currency: z.string().max(3).optional(),
  originalAmountMinor: z.coerce.bigint().positive().optional(),
  originalCurrency: z.string().max(3).optional(),
  exchangeRate: z.coerce.number().positive().optional(),
  paidByUserId: z.string().uuid().optional(),
  splitMethod: splitMethodEnum.optional(),
  category: z.string().max(100).optional(),
  notes: z.string().optional(),
  isLocked: z.boolean().optional(),
  participants: z.array(participantSplitSchema).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
