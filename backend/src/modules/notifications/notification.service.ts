import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError, ForbiddenError } from '../../errors/AppError';
import { RealtimeSyncService } from '../realtime/realtime.service';

export type NotificationType =
  | 'GROUP_MEMBER_JOINED'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_EDIT_REQUEST'
  | 'EXPENSE_EDIT_GRANTED'
  | 'EXPENSE_EDIT_DENIED'
  | 'PAYMENT_RECEIVED'
  | 'GROUP_SETTLED_UP'
  | 'GROUP_INVITE'
  | 'INVITE_ACCEPTED'
  | 'INVITE_REJECTED'
  | 'PAYMENT_REMINDER'
  | 'RECURRING_BILL_DUE'
  | 'GENERAL';

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
  expenseId?: string;
  expenseTitle?: string;
  amountMinor?: number;
  status: NotificationStatus;
  title: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mobile Push Notification Payload
 */
export interface PushNotificationPayload {
  to: string; // Expo Push Token or User ID
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  priority?: 'high' | 'normal';
}

/**
 * Global store across development hot reloads and worker cycles
 */
const globalForNotifications = globalThis as unknown as {
  notificationsStore: Map<string, NotificationItem[]>;
  userPushTokens: Map<string, Set<string>>;
};

if (!globalForNotifications.notificationsStore) {
  globalForNotifications.notificationsStore = new Map();
}
if (!globalForNotifications.userPushTokens) {
  globalForNotifications.userPushTokens = new Map();
}

const notificationsStore = globalForNotifications.notificationsStore;
const userPushTokens = globalForNotifications.userPushTokens;

export class NotificationService {
  /**
   * Register an Expo Push Token for mobile push notifications
   */
  public static registerPushToken(userId: string, pushToken: string): void {
    if (!pushToken) return;
    const tokens = userPushTokens.get(userId) || new Set<string>();
    tokens.add(pushToken);
    userPushTokens.set(userId, tokens);
  }

  /**
   * Send Expo Mobile Push Notification to device(s)
   */
  private static async sendMobilePushNotification(payload: PushNotificationPayload): Promise<void> {
    try {
      if (!payload.to || !payload.to.startsWith('ExponentPushToken')) return;
      // In production or Expo Go, push payload to Expo's Push API endpoint: https://exp.host/--/api/v2/push/send
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: payload.sound || 'default',
          priority: payload.priority || 'high',
        }),
      }).catch(() => null);

      if (response && !response.ok) {
        console.warn('Expo Push Service responded with status:', response.status);
      }
    } catch (pushErr) {
      console.warn('Mobile Push Notification delivery exception:', pushErr);
    }
  }
  /**
   * Dispatches a notification to a recipient
   */
  public static async createNotification(data: {
    recipientUserId: string;
    actorUserId?: string;
    type: NotificationType;
    groupId?: string;
    groupName?: string;
    expenseId?: string;
    expenseTitle?: string;
    amountMinor?: number;
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
      expenseId: data.expenseId,
      expenseTitle: data.expenseTitle,
      amountMinor: data.amountMinor,
      status: 'PENDING',
      title: data.title,
      message: data.message,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userNotifs = notificationsStore.get(data.recipientUserId) || [];
    userNotifs.unshift(notification);
    notificationsStore.set(data.recipientUserId, userNotifs);

    // 1. Dispatch Real-time SSE event to recipient for instant live UI update
    try {
      RealtimeSyncService.notifyUsers(data.recipientUserId, {
        type: 'NOTIFICATION_RECEIVED',
        entity: 'NOTIFICATION',
        payload: notification,
      });
    } catch (sseErr) {
      console.warn('Failed to broadcast realtime notification SSE:', sseErr);
    }

    // 2. Dispatch Mobile Push Notification for critical events
    const tokens = userPushTokens.get(data.recipientUserId);
    if (tokens && tokens.size > 0) {
      tokens.forEach((token) => {
        this.sendMobilePushNotification({
          to: token,
          title: data.title,
          body: data.message,
          data: {
            notificationId: notification.id,
            type: data.type,
            groupId: data.groupId,
          },
          priority: 'high',
        });
      });
    }

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

      // Handle Expense Edit Access Request Approval
      if (notif.type === 'EXPENSE_EDIT_REQUEST' && notif.expenseId && notif.actorUserId) {
        try {
          const exp = (await (prisma.expense as any).findUnique({
            where: { id: notif.expenseId },
            select: { allowedEditorIds: true, description: true },
          })) as { allowedEditorIds?: string[]; description?: string } | null;

          if (exp) {
            const currentEditors = new Set<string>(exp.allowedEditorIds || []);
            currentEditors.add(notif.actorUserId);

            await (prisma.expense as any).update({
              where: { id: notif.expenseId },
              data: { allowedEditorIds: Array.from(currentEditors) },
            });
          }

          // Notify the requester that edit access was granted
          await NotificationService.createNotification({
            recipientUserId: notif.actorUserId,
            actorUserId: userId,
            type: 'EXPENSE_EDIT_GRANTED',
            groupId: notif.groupId,
            groupName: notif.groupName,
            expenseId: notif.expenseId,
            expenseTitle: notif.expenseTitle || exp?.description,
            title: 'Edit Access Granted',
            message: `You have been granted access to edit "${notif.expenseTitle || exp?.description || 'expense'}". Tap to edit.`,
          });

          return { status: 'ACCEPTED', message: 'Edit access granted!' };
        } catch (editErr) {
          console.error('Failed to grant expense edit access:', editErr);
        }
      }

      // Add user to the group if group exists
      if (notif.groupId && notif.type === 'GROUP_INVITE') {
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
      if (notif.actorUserId && notif.type === 'GROUP_INVITE') {
        await this.createNotification({
          recipientUserId: notif.actorUserId,
          actorUserId: userId,
          type: 'INVITE_ACCEPTED',
          groupId: notif.groupId,
          groupName: notif.groupName,
          title: 'Invitation Accepted',
          message: `${userName} accepted your invitation to join ${notif.groupName || 'the group'}.`,
        });
      }

      return { status: 'ACCEPTED', message: 'You have joined the group!' };
    } else {
      notif.status = 'REJECTED';
      notif.updatedAt = new Date().toISOString();

      if (notif.type === 'EXPENSE_EDIT_REQUEST' && notif.actorUserId) {
        await this.createNotification({
          recipientUserId: notif.actorUserId,
          actorUserId: userId,
          type: 'EXPENSE_EDIT_DENIED',
          groupId: notif.groupId,
          groupName: notif.groupName,
          expenseId: notif.expenseId,
          expenseTitle: notif.expenseTitle,
          title: 'Edit Access Denied',
          message: `Your request to edit "${notif.expenseTitle || 'expense'}" was denied by ${userName}.`,
        });
        return { status: 'REJECTED', message: 'Edit request denied.' };
      }

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

    try {
      RealtimeSyncService.notifyUsers(userId, {
        type: 'NOTIFICATION_UPDATED',
        entity: 'NOTIFICATION',
        payload: notif,
      });
    } catch { }

    return { status: 'READ', message: 'Notification moved to history.' };
  }

  public static async markAsRead(userId: string, notificationId: string): Promise<void> {
    const userNotifs = notificationsStore.get(userId) || [];
    const notif = userNotifs.find((n) => n.id === notificationId);
    if (notif) {
      notif.status = 'READ';
      notif.updatedAt = new Date().toISOString();
      notificationsStore.set(userId, userNotifs);

      try {
        RealtimeSyncService.notifyUsers(userId, {
          type: 'NOTIFICATION_UPDATED',
          entity: 'NOTIFICATION',
          payload: notif,
        });
      } catch { }
    }
  }

  public static async markAllAsRead(userId: string): Promise<void> {
    const userNotifs = notificationsStore.get(userId) || [];
    userNotifs.forEach((n) => {
      if (n.status === 'PENDING') {
        n.status = 'READ';
        n.updatedAt = new Date().toISOString();
      }
    });
    notificationsStore.set(userId, userNotifs);

    try {
      RealtimeSyncService.notifyUsers(userId, {
        type: 'NOTIFICATION_UPDATED',
        entity: 'NOTIFICATION',
      });
    } catch { }
  }
}
