import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/AppError';
import { UpdateUserInput } from './user.schemas';
import { CacheService } from '../../infrastructure/redis/redis.service';
import { CacheKeys } from '../../infrastructure/redis/redis.keys';
import { OtpService } from '../auth/otp.service';
import { TokenSecurity } from '../../utils/security';
import { BalanceService } from '../balances/balance.service';

export interface PublicUserProfile {
  id: string;
  name: string;
  email?: string;
  settleId: string;
  avatarUrl: string | null;
}

export interface DetailedUserProfile extends PublicUserProfile {
  email: string;
  createdAt: string;
}

/**
 * Computes simple, memorable, human-friendly Settle ID based on user name/id
 * e.g. "ketan_21" or "rohit_94"
 */
export function generateSettleId(name: string, userId: string): string {
  const firstName = name
    .trim()
    .split(' ')[0]!
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') || 'settler';

  // Extract a deterministic 2-digit number from userId hex
  const hex = userId.replace(/[^0-9a-f]/gi, '').slice(0, 4);
  const num = (parseInt(hex, 16) % 90) + 10; // Guarantees clean 2-digit number (10..99)
  return `${firstName}_${num}`;
}

export class UserService {
  public static async getProfile(userId: string): Promise<DetailedUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found', 'NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      settleId: generateSettleId(user.name, user.id),
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }

  public static async updateProfile(userId: string, input: UpdateUserInput): Promise<DetailedUserProfile> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      settleId: generateSettleId(updated.name, updated.id),
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  public static async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    const cacheKey = CacheKeys.userPublicProfile(userId);
    const cached = await CacheService.get<PublicUserProfile>(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found', 'NOT_FOUND');
    }

    const profile: PublicUserProfile = {
      id: user.id,
      name: user.name,
      settleId: generateSettleId(user.name, user.id),
      avatarUrl: user.avatarUrl,
    };

    await CacheService.set(cacheKey, profile, 600); // 10 mins TTL
    return profile;
  }

  public static async getFriends(currentUserId: string): Promise<PublicUserProfile[]> {
    // Find all group IDs where current user is an active member
    const userMemberships = await prisma.groupMember.findMany({
      where: { userId: currentUserId, leftAt: null, group: { isArchived: false } },
      select: { groupId: true },
    });

    const groupIds = userMemberships.map((m) => m.groupId);
    if (groupIds.length === 0) {
      return [];
    }

    // Find all distinct other members in these groups
    const coMembers = await prisma.groupMember.findMany({
      where: {
        groupId: { in: groupIds },
        userId: { not: currentUserId },
        leftAt: null,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, email: true },
        },
      },
    });

    const seenUserIds = new Set<string>();
    const friends: PublicUserProfile[] = [];

    for (const cm of coMembers) {
      if (cm.user && !seenUserIds.has(cm.user.id)) {
        seenUserIds.add(cm.user.id);
        friends.push({
          id: cm.user.id,
          name: cm.user.name,
          email: cm.user.email,
          settleId: generateSettleId(cm.user.name, cm.user.id),
          avatarUrl: cm.user.avatarUrl,
        });
      }
    }

    return friends;
  }

  /**
   * Search users strictly by Settle ID or Email address.
   * General random name search is prohibited to prevent data enumeration.
   */
  public static async searchUsers(query: string, currentUserId: string): Promise<PublicUserProfile[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery || normalizedQuery.length < 3) {
      return [];
    }

    // 1. Direct Email Match (exact or prefix for email)
    const isEmailQuery = normalizedQuery.includes('@');

    // 2. Direct Settle ID match check
    // Settle IDs are in format prefix_xxxx (where xxxx is 4-character hex/id suffix)
    const settleIdMatch = normalizedQuery.match(/^([a-z0-9]+)_([a-z0-9]{4})$/);

    const orConditions: any[] = [];
    if (isEmailQuery) {
      orConditions.push({ email: { equals: normalizedQuery, mode: 'insensitive' } });
      orConditions.push({ emailNormalized: { equals: normalizedQuery } });
    }

    // If query has settleId format or suffix search
    if (settleIdMatch) {
      const shortId = settleIdMatch[2];
      orConditions.push({
        id: { startsWith: shortId },
      });
    }

    // Also allow finding all active users and filtering if exact settleId matches
    const candidates = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: currentUserId },
        ...(orConditions.length > 0 ? { OR: orConditions } : { email: { equals: normalizedQuery, mode: 'insensitive' } }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      take: 10,
    });

    // Also check if any candidate matches the exact computed Settle ID
    let matches: PublicUserProfile[] = [];
    for (const c of candidates) {
      const candidateSettleId = generateSettleId(c.name, c.id);
      if (
        c.email.toLowerCase() === normalizedQuery ||
        candidateSettleId.toLowerCase() === normalizedQuery ||
        (settleIdMatch && settleIdMatch[2] && candidateSettleId.endsWith(settleIdMatch[2]))
      ) {
        matches.push({
          id: c.id,
          name: c.name,
          email: c.email,
          settleId: candidateSettleId,
          avatarUrl: c.avatarUrl,
        });
      }
    }

    // Fallback: If searching by exact settleId, scan recent users to match computed settleId
    if (matches.length === 0 && normalizedQuery.includes('_')) {
      const recentUsers = await prisma.user.findMany({
        where: { isActive: true, id: { not: currentUserId } },
        select: { id: true, name: true, email: true, avatarUrl: true },
        take: 50,
      });

      for (const u of recentUsers) {
        const sid = generateSettleId(u.name, u.id);
        if (sid.toLowerCase() === normalizedQuery) {
          matches.push({
            id: u.id,
            name: u.name,
            email: u.email,
            settleId: sid,
            avatarUrl: u.avatarUrl,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Sends a 6-digit OTP to the authenticated user's registered email address for password change confirmation
   */
  public static async sendPasswordChangeOtp(userId: string, ip: string = '127.0.0.1'): Promise<{ message: string; emailMasked: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User account not found', 'NOT_FOUND');
    }

    await OtpService.generateAndSendOtp(user.email, 'password_change', ip, user.name);

    // Mask email for privacy (e.g. k***g@gmail.com)
    const emailParts = user.email.split('@');
    const local = emailParts[0] || 'user';
    const domain = emailParts[1] || 'settle.app';
    const maskedLocal = local.length > 2 ? `${local[0]}***${local[local.length - 1]}` : `${local[0]}***`;
    const emailMasked = `${maskedLocal}@${domain}`;

    return {
      message: `A 6-digit verification code has been sent to ${emailMasked}.`,
      emailMasked,
    };
  }

  /**
   * Verifies OTP and actually updates the user's password with Argon2id hash
   */
  public static async changePasswordWithOtp(
    userId: string,
    otp: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User account not found', 'NOT_FOUND');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long', 'INVALID_PASSWORD');
    }

    // 1. Verify OTP against Redis store
    await OtpService.verifyOtp(user.email, 'password_change', otp.trim());

    // 2. Hash new password securely with Argon2id
    const newPasswordHash = await TokenSecurity.hashPassword(newPassword);

    // 3. Atomically update password and log audit event
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing sessions for security
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: userId,
          eventType: 'PASSWORD_CHANGED',
          entityType: 'USER',
          entityId: userId,
        },
      });
    });

    return { message: 'Password has been successfully updated. Please keep your new credentials safe.' };
  }

  /**
   * Evaluates user's net debt status across all groups prior to account deletion
   */
  public static async getAccountDeletionStatus(userId: string): Promise<{
    canDelete: boolean;
    totalOwedByYouMinor: number;
    totalOwedToYouMinor: number;
    reason?: string;
  }> {
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null, group: { isArchived: false } },
      select: { groupId: true },
    });

    let totalOwedByYouMinor = 0n; // You owe others (negative balance)
    let totalOwedToYouMinor = 0n; // Others owe you (positive balance)

    for (const m of memberships) {
      const netMap = await BalanceService.calculateGroupNetBalances(m.groupId);
      const userBalance = netMap.get(userId) || 0n;

      if (userBalance < 0n) {
        totalOwedByYouMinor += -userBalance; // Accumulate debt you owe
      } else if (userBalance > 0n) {
        totalOwedToYouMinor += userBalance; // Accumulate credits owed to you
      }
    }

    if (totalOwedByYouMinor > 0n) {
      const formattedDebt = (Number(totalOwedByYouMinor) / 100).toFixed(2);
      return {
        canDelete: false,
        totalOwedByYouMinor: Number(totalOwedByYouMinor),
        totalOwedToYouMinor: Number(totalOwedToYouMinor),
        reason: `You have pending unsettled debts totaling ₹${formattedDebt}. You must settle up with your groups before you can delete your account.`,
      };
    }

    return {
      canDelete: true,
      totalOwedByYouMinor: 0,
      totalOwedToYouMinor: Number(totalOwedToYouMinor),
    };
  }

  /**
   * Permanently deletes user account, revokes all tokens, anonymizes identity, and marks isActive: false.
   * Hard financial guard: Prohibits deletion if user has pending debts owed to others.
   */
  public static async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User account not found', 'NOT_FOUND');
    }

    // 1. Verify that user does not owe money to anyone
    const status = await this.getAccountDeletionStatus(userId);
    if (!status.canDelete) {
      throw new ConflictError(
        status.reason || 'You cannot delete your account while you have pending unsettled debts.',
        'PENDING_DEBTS_EXIST'
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete user's active refresh tokens & verification tokens
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });

      // 2. Delete comments made by user
      await (tx as any).expenseComment.deleteMany({ where: { userId } });

      // 3. Remove user splits & expenses where user paid
      await tx.expenseSplit.deleteMany({ where: { userId } });
      await tx.expense.deleteMany({ where: { paidByUserId: userId } });

      // 4. Remove settlements involving user
      await tx.settlement.deleteMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
      });

      // 5. Remove group memberships & invitations created
      await tx.groupMember.deleteMany({ where: { userId } });
      await tx.groupInvitation.deleteMany({ where: { createdByUserId: userId } });

      // 6. Transfer or delete groups created by user if empty
      const userGroups = await tx.group.findMany({ where: { createdBy: userId } });
      for (const g of userGroups) {
        const remainingMembers = await tx.groupMember.findMany({
          where: { groupId: g.id },
          take: 1,
        });
        if (remainingMembers.length > 0 && remainingMembers[0]) {
          await tx.group.update({
            where: { id: g.id },
            data: { createdBy: remainingMembers[0].userId },
          });
        } else {
          await tx.group.delete({ where: { id: g.id } });
        }
      }

      // 7. Delete user audit events
      await tx.auditEvent.deleteMany({ where: { actorUserId: userId } });

      // 8. Permanently delete the user row from the database
      await tx.user.delete({ where: { id: userId } });
    });

    return { message: 'Your account and all associated data have been permanently deleted.' };
  }
}
