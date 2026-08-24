import { prisma } from '../../infrastructure/database/prisma';
import { GroupRole, GroupType } from '@prisma/client';
import { env } from '../../config/env';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../../errors/AppError';
import { TokenSecurity } from '../../utils/security';
import { BalanceService } from '../balances/balance.service';
import { CreateGroupInput, UpdateGroupInput, AddMemberInput } from './group.schemas';

export interface GroupMemberResponse {
  id: string;
  userId: string;
  name: string;
  email?: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

export interface GroupInvitationResponse {
  id: string;
  groupId: string;
  inviteCode: string;
  inviteLink: string;
  createdByUserId: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  groupType: GroupType;
  currency: string;
  createdBy: string;
  createdAt: string;
  isArchived: boolean;
  memberCount: number;
}

export interface GroupDetailsResponse extends GroupResponse {
  members: GroupMemberResponse[];
  activeInvite?: GroupInvitationResponse | null;
}

export interface InvitePreviewResponse {
  groupId: string;
  groupName: string;
  groupType: GroupType;
  currency: string;
  createdByName: string;
  memberCount: number;
  members: Array<{ id: string; name: string; avatarUrl: string | null }>;
  inviteCode: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GroupService {
  public static async verifyMembership(groupId: string, userId: string): Promise<GroupRole> {
    if (!UUID_REGEX.test(groupId) || !UUID_REGEX.test(userId)) {
      throw new NotFoundError('Group not found or invalid identifier', 'GROUP_NOT_FOUND');
    }

    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership || membership.leftAt) {
      throw new ForbiddenError('Access denied: You are not a member of this group', 'GROUP_ACCESS_DENIED');
    }

    return membership.role;
  }

  public static async createGroup(creatorUserId: string, input: CreateGroupInput): Promise<GroupDetailsResponse> {
    const uniqueMemberIds = Array.from(
      new Set([creatorUserId, ...(input.initialMemberUserIds || [])])
    );

    // Verify all member user IDs exist
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: uniqueMemberIds }, isActive: true },
      select: { id: true },
    });

    if (existingUsers.length !== uniqueMemberIds.length) {
      throw new ValidationError('One or more initial members do not exist', 'INVALID_PARTICIPANT');
    }

    // Generate initial invite code & token
    const inviteCode = TokenSecurity.generateInviteCode();
    const rawInviteToken = TokenSecurity.generateInviteToken();
    const tokenHash = TokenSecurity.hashToken(rawInviteToken);

    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.group.create({
        data: {
          name: input.name.trim(),
          groupType: (input.groupType as GroupType) || GroupType.OTHER,
          currency: input.currency || 'INR',
          createdBy: creatorUserId,
          members: {
            create: uniqueMemberIds.map((userId) => ({
              userId,
              role: userId === creatorUserId ? GroupRole.OWNER : GroupRole.MEMBER,
            })),
          },
          invitations: {
            create: {
              inviteCode,
              tokenHash,
              createdByUserId: creatorUserId,
            },
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
          },
          invitations: {
            where: { revokedAt: null },
            take: 1,
          },
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: creatorUserId,
          eventType: 'GROUP_CREATED',
          entityType: 'GROUP',
          entityId: created.id,
          metadata: { name: created.name, membersCount: uniqueMemberIds.length, groupType: created.groupType },
        },
      });

      return created;
    });

    const activeInvite = group.invitations[0];

    return {
      id: group.id,
      name: group.name,
      groupType: group.groupType,
      currency: group.currency,
      createdBy: group.createdBy,
      createdAt: group.createdAt.toISOString(),
      isArchived: group.isArchived,
      memberCount: group.members.length,
      activeInvite: activeInvite
        ? {
            id: activeInvite.id,
            groupId: activeInvite.groupId,
            inviteCode: activeInvite.inviteCode,
            inviteLink: `${env.CLIENT_URL}/invite/${activeInvite.inviteCode}`,
            createdByUserId: activeInvite.createdByUserId,
            expiresAt: activeInvite.expiresAt ? activeInvite.expiresAt.toISOString() : null,
            createdAt: activeInvite.createdAt.toISOString(),
          }
        : null,
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  public static async getUserGroups(userId: string): Promise<GroupResponse[]> {
    const memberships = await prisma.groupMember.findMany({
      where: { userId, leftAt: null, group: { isArchived: false } },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      groupType: m.group.groupType,
      currency: m.group.currency,
      createdBy: m.group.createdBy,
      createdAt: m.group.createdAt.toISOString(),
      isArchived: m.group.isArchived,
      memberCount: m.group._count.members,
    }));
  }

  public static async getGroupDetails(groupId: string, userId: string): Promise<GroupDetailsResponse> {
    await this.verifyMembership(groupId, userId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        invitations: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found', 'GROUP_NOT_FOUND');
    }

    const activeInvite = group.invitations[0];

    return {
      id: group.id,
      name: group.name,
      groupType: group.groupType,
      currency: group.currency,
      createdBy: group.createdBy,
      createdAt: group.createdAt.toISOString(),
      isArchived: group.isArchived,
      memberCount: group.members.length,
      activeInvite: activeInvite
        ? {
            id: activeInvite.id,
            groupId: activeInvite.groupId,
            inviteCode: activeInvite.inviteCode,
            inviteLink: `${env.CLIENT_URL}/invite/${activeInvite.inviteCode}`,
            createdByUserId: activeInvite.createdByUserId,
            expiresAt: activeInvite.expiresAt ? activeInvite.expiresAt.toISOString() : null,
            createdAt: activeInvite.createdAt.toISOString(),
          }
        : null,
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  public static async updateGroup(groupId: string, userId: string, input: UpdateGroupInput): Promise<GroupResponse> {
    const role = await this.verifyMembership(groupId, userId);
    if (role !== GroupRole.OWNER) {
      throw new ForbiddenError('Only group owners can modify group details', 'FORBIDDEN');
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.groupType ? { groupType: input.groupType as GroupType } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      groupType: updated.groupType,
      currency: updated.currency,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt.toISOString(),
      isArchived: updated.isArchived,
      memberCount: updated._count.members,
    };
  }

  public static async deleteGroup(groupId: string, userId: string): Promise<void> {
    const role = await this.verifyMembership(groupId, userId);
    if (role !== GroupRole.OWNER) {
      throw new ForbiddenError('Only group owners can archive or delete the group', 'FORBIDDEN');
    }

    await prisma.group.update({
      where: { id: groupId },
      data: { isArchived: true },
    });
  }

  public static async createInvite(groupId: string, requesterUserId: string): Promise<GroupInvitationResponse> {
    await this.verifyMembership(groupId, requesterUserId);

    const inviteCode = TokenSecurity.generateInviteCode();
    const rawInviteToken = TokenSecurity.generateInviteToken();
    const tokenHash = TokenSecurity.hashToken(rawInviteToken);

    // Revoke previous active invitations for this group
    await prisma.groupInvitation.updateMany({
      where: { groupId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const invite = await prisma.groupInvitation.create({
      data: {
        groupId,
        inviteCode,
        tokenHash,
        createdByUserId: requesterUserId,
      },
    });

    return {
      id: invite.id,
      groupId: invite.groupId,
      inviteCode: invite.inviteCode,
      inviteLink: `${env.CLIENT_URL}/invite/${rawInviteToken}`,
      createdByUserId: invite.createdByUserId,
      expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
      createdAt: invite.createdAt.toISOString(),
    };
  }

  public static async revokeInvite(groupId: string, inviteId: string, requesterUserId: string): Promise<void> {
    const role = await this.verifyMembership(groupId, requesterUserId);
    if (role !== GroupRole.OWNER) {
      throw new ForbiddenError('Only group owners can revoke group invitations', 'FORBIDDEN');
    }

    const invite = await prisma.groupInvitation.findFirst({
      where: { id: inviteId, groupId },
    });

    if (!invite) {
      throw new NotFoundError('Invitation not found', 'INVITE_NOT_FOUND');
    }

    await prisma.groupInvitation.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });
  }

  public static async resolveInvite(codeOrToken: string): Promise<InvitePreviewResponse> {
    const cleaned = codeOrToken.trim();
    const normalized = cleaned.toUpperCase();
    const hashed = TokenSecurity.hashToken(cleaned);

    const invite = await prisma.groupInvitation.findFirst({
      where: {
        OR: [{ inviteCode: normalized }, { tokenHash: hashed }],
      },
      include: {
        group: {
          include: {
            creator: { select: { name: true } },
            members: {
              where: { leftAt: null },
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    if (!invite || invite.group.isArchived) {
      throw new NotFoundError('Invalid invitation', 'INVITE_NOT_FOUND');
    }

    if (invite.revokedAt) {
      throw new ValidationError('This invitation is no longer active and has been revoked', 'INVITE_REVOKED');
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new ValidationError('This invitation has expired', 'INVITE_EXPIRED');
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new ValidationError('Invitation code has expired', 'INVITE_EXPIRED');
    }

    return {
      groupId: invite.group.id,
      groupName: invite.group.name,
      groupType: invite.group.groupType,
      currency: invite.group.currency,
      createdByName: invite.group.creator.name,
      memberCount: invite.group.members.length,
      members: invite.group.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
      })),
      inviteCode: invite.inviteCode,
    };
  }

  public static async joinGroupViaInvite(codeOrToken: string, userId: string): Promise<GroupDetailsResponse> {
    const cleaned = codeOrToken.trim();
    const normalized = cleaned.toUpperCase();
    const hashed = TokenSecurity.hashToken(cleaned);

    const invite = await prisma.groupInvitation.findFirst({
      where: {
        OR: [{ inviteCode: normalized }, { tokenHash: hashed }],
      },
      include: {
        group: true,
      },
    });

    if (!invite || invite.group.isArchived) {
      throw new NotFoundError('Invalid invitation', 'INVITE_NOT_FOUND');
    }

    if (invite.revokedAt) {
      throw new ValidationError('This invitation is no longer active and has been revoked', 'INVITE_REVOKED');
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      throw new ValidationError('This invitation has expired', 'INVITE_EXPIRED');
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: invite.groupId,
          userId,
        },
      },
    });

    if (existingMember && !existingMember.leftAt) {
      // User is already a member - return group details directly
      return this.getGroupDetails(invite.groupId, userId);
    }

    await prisma.$transaction(async (tx) => {
      if (existingMember) {
        await tx.groupMember.update({
          where: { id: existingMember.id },
          data: { leftAt: null, joinedAt: new Date() },
        });
      } else {
        await tx.groupMember.create({
          data: {
            groupId: invite.groupId,
            userId,
            role: GroupRole.MEMBER,
          },
        });
      }

      await tx.groupInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: userId,
          eventType: 'MEMBER_JOINED_VIA_INVITE',
          entityType: 'GROUP',
          entityId: invite.groupId,
          metadata: { inviteCode: invite.inviteCode },
        },
      });
    });

    return this.getGroupDetails(invite.groupId, userId);
  }

  public static async addMember(groupId: string, requesterUserId: string, input: AddMemberInput): Promise<GroupMemberResponse> {
    await this.verifyMembership(groupId, requesterUserId);

    const userToAdd = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, name: true, email: true, avatarUrl: true, isActive: true },
    });

    if (!userToAdd || !userToAdd.isActive) {
      throw new NotFoundError('User not found to add to group', 'NOT_FOUND');
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: input.userId,
        },
      },
    });

    if (existingMember && !existingMember.leftAt) {
      throw new ValidationError('User is already a member of this group', 'ALREADY_MEMBER');
    }

    const member = existingMember
      ? await prisma.groupMember.update({
          where: { id: existingMember.id },
          data: { leftAt: null, joinedAt: new Date() },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        })
      : await prisma.groupMember.create({
          data: {
            groupId,
            userId: input.userId,
            role: GroupRole.MEMBER,
          },
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        });

    return {
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  public static async removeMember(groupId: string, requesterUserId: string, memberUserId: string): Promise<void> {
    const requesterRole = await this.verifyMembership(groupId, requesterUserId);

    if (requesterRole !== GroupRole.OWNER && requesterUserId !== memberUserId) {
      throw new ForbiddenError('You can only remove yourself or be the group owner to remove members', 'FORBIDDEN');
    }

    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberUserId,
        },
      },
    });

    if (!member || member.leftAt) {
      throw new NotFoundError('Group membership not found', 'NOT_FOUND');
    }

    if (member.role === GroupRole.OWNER) {
      throw new ValidationError('Cannot remove group owner. Transfer ownership first.', 'CANNOT_REMOVE_OWNER');
    }

    // Financial Invariant: Member cannot be removed if they have non-zero balance
    const netMap = await BalanceService.calculateGroupNetBalances(groupId);
    const memberBalance = netMap.get(memberUserId) || 0n;

    if (memberBalance !== 0n) {
      throw new ConflictError(
        'Cannot remove member with outstanding unsettled balance in this group. Settle up first.',
        'MEMBER_HAS_UNSETTLED_BALANCE'
      );
    }

    await prisma.groupMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });
  }

  public static async getMembers(groupId: string, userId: string): Promise<GroupMemberResponse[]> {
    await this.verifyMembership(groupId, userId);

    const members = await prisma.groupMember.findMany({
      where: { groupId, leftAt: null },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }
}
