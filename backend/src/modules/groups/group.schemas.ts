import { z } from 'zod';

export const groupTypeEnum = z.enum(['TRIP', 'APARTMENT', 'HOME', 'COUPLE', 'FRIENDS', 'OTHER']);

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(255),
  groupType: groupTypeEnum.default('OTHER').optional(),
  currency: z.string().length(3).default('INR'),
  initialMemberUserIds: z.array(z.string().uuid()).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  groupType: groupTypeEnum.optional(),
  currency: z.string().length(3).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
