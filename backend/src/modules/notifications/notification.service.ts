import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError, ForbiddenError } from '../../errors/AppError';

export type NotificationType = 'GROUP_INVITE' | 'INVITE_ACCEPTED' | 'INVITE_REJECTED' | 'EXPENSE_ADDED' | 'GENERAL';
export type NotificationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'READ';

export interface NotificationItem {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
  type: NotificationType;
  groupId?: string;
  groupName?: string;
  status: NotificationStatus;
  title: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory / Audit-backed Notification Service for real-time Action Center alerts
 */
const notificationsStore: Map<string, NotificationItem[]> = new Map();

export class NotificationService {
  /**
   * Dispatches a notification to a recipient
   */
  public static async createNotification(data: {
    recipientUserId: string;
    actorUserId?: string;
    type: NotificationType;
    groupId?: string;
    groupName?: string;
    title: string;
    message: string;
  }): Promise<NotificationItem> {
    let actorName = 'A Settle Member';
    let actorAvatarUrl: string | null = null;

    if (data.actorUserId) {
      const actor = await prisma.user.findUnique({
        where: { id: data.actorUserId },
        select: { name: true, avatarUrl: true },
      });
      if (actor) {
        actorName = actor.name;
        actorAvatarUrl = actor.avatarUrl;
      }
    }

    const notification: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientUserId: data.recipientUserId,
      actorUserId: data.actorUserId,
      actorName,
      actorAvatarUrl,
      type: data.type,
      groupId: data.groupId,
      groupName: data.groupName,
      status: 'PENDING',
      title: data.title,
      message: data.message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userNotifs = notificationsStore.get(data.recipientUserId) || [];
    userNotifs.unshift(notification);
    notificationsStore.set(data.recipientUserId, userNotifs);

    return notification;
  }

  /**
   * Retrieves all notifications for the active user
   */
  public static async getUserNotifications(userId: string): Promise<NotificationItem[]> {
    return notificationsStore.get(userId) || [];
  }

  /**
   * Responds to an invitation notification (Accept / Reject)
   */
  public static async respondToInvite(
    userId: string,
    notificationId: string,
    action: 'ACCEPT' | 'REJECT'
  ): Promise<{ status: NotificationStatus; message: string }> {
    const userNotifs = notificationsStore.get(userId) || [];
    const notif = userNotifs.find((n) => n.id === notificationId);

    if (!notif) {
      throw new NotFoundError('Notification not found', 'NOT_FOUND');
    }

    if (notif.recipientUserId !== userId) {
      throw new ForbiddenError('You cannot respond to this notification', 'FORBIDDEN');
    }

    const respondingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const userName = respondingUser?.name || 'A user';

    if (action === 'ACCEPT') {
      notif.status = 'ACCEPTED';
      notif.updatedAt = new Date().toISOString();

      // Add user to the group if group exists
      if (notif.groupId) {
        try {
          const existing = await prisma.groupMember.findFirst({
            where: { groupId: notif.groupId, userId },
          });

          if (!existing) {
            await prisma.groupMember.create({
              data: {
                groupId: notif.groupId,
                userId,
                role: 'MEMBER',
              },
            });
          }
        } catch (err) {
          console.error('Failed to enroll user into group:', err);
        }
      }

      // Notify the group creator / inviter
      if (notif.actorUserId) {
        await this.createNotification({
          recipientUserId: notif.actorUserId,
          actorUserId: userId,
          type: 'INVITE_ACCEPTED',
          groupId: notif.groupId,
          groupName: notif.groupName,
          title: 'Invitation Accepted 🎉',
          message: `${userName} accepted your invitation to join ${notif.groupName || 'the group'}.`,
        });
      }

      return { status: 'ACCEPTED', message: 'You have joined the group!' };
    } else {
      notif.status = 'REJECTED';
      notif.updatedAt = new Date().toISOString();

      return { status: 'REJECTED', message: 'Invitation declined.' };
    }
  }

  /**
   * Dismisses an active/pending notification and moves it to history (status: 'READ')
   */
  public static async dismissNotification(
    userId: string,
    notificationId: string
  ): Promise<{ status: NotificationStatus; message: string }> {
    const userNotifs = notificationsStore.get(userId) || [];
    const notif = userNotifs.find((n) => n.id === notificationId);

    if (!notif) {
      throw new NotFoundError('Notification not found', 'NOT_FOUND');
    }

    if (notif.recipientUserId !== userId) {
      throw new ForbiddenError('You cannot dismiss this notification', 'FORBIDDEN');
    }

    notif.status = 'READ';
    notif.updatedAt = new Date().toISOString();

    return { status: 'READ', message: 'Notification moved to history.' };
  }
}
