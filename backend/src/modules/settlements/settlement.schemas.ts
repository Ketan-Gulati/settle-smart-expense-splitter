import { z } from 'zod';

export const createSettlementSchema = z.object({
  toUserId: z.string().uuid('Valid recipient user ID required'),
  amountMinor: z.coerce.bigint().positive('Settlement amount must be > 0'),
  note: z.string().max(255).optional(),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
