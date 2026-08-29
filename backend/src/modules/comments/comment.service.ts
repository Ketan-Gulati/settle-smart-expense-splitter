import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../infrastructure/database/prisma';
import { authenticate } from '../../middleware/auth.middleware';
import { NotFoundError, ForbiddenError } from '../../errors/AppError';
import { NotificationService } from '../notifications/notification.service';
import { RealtimeSyncService } from '../realtime/realtime.service';

export interface CommentResponseDTO {
  id: string;
  expenseId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
}

export class CommentService {
  /**
   * Get all active comments for an expense in chronological order
   */
  public static async getComments(expenseId: string, authenticatedUserId: string): Promise<CommentResponseDTO[]> {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { groupId: true, deletedAt: true },
    });

    if (!expense || expense.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    // Verify user belongs to the group
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: expense.groupId, userId: authenticatedUserId, leftAt: null },
    });

    if (!membership) {
      throw new ForbiddenError('You do not have access to this expense', 'FORBIDDEN');
    }

    const comments = await (prisma as any).expenseComment.findMany({
      where: {
        expenseId,
        deletedAt: null,
      },
      select: {
        id: true,
        expenseId: true,
        userId: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c: any) => ({
      id: c.id,
      expenseId: c.expenseId,
      userId: c.userId,
      userName: c.user?.name || 'A Member',
      userAvatarUrl: c.user?.avatarUrl || null,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * Post a new comment to an expense discussion thread
   */
  public static async createComment(
    expenseId: string,
    authenticatedUserId: string,
    content: string
  ): Promise<CommentResponseDTO> {
    const cleanContent = content.trim();
    if (!cleanContent) {
      throw new Error('Comment content cannot be empty');
    }

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        group: { select: { name: true } },
        splits: { select: { userId: true } },
      },
    });

    if (!expense || expense.deletedAt) {
      throw new NotFoundError('Expense not found', 'EXPENSE_NOT_FOUND');
    }

    const author = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      select: { name: true, avatarUrl: true },
    });

    const comment = await (prisma as any).expenseComment.create({
      data: {
        expenseId,
        userId: authenticatedUserId,
        content: cleanContent,
      },
    });

    const commentDto: CommentResponseDTO = {
      id: comment.id,
      expenseId,
      userId: authenticatedUserId,
      userName: author?.name || 'A Member',
      userAvatarUrl: author?.avatarUrl || null,
      content: cleanContent,
      createdAt: comment.createdAt.toISOString(),
    };

    // 1. Broadcast real-time SSE event to all group participants
    const participantIds = Array.from(
      new Set([expense.paidByUserId, ...expense.splits.map((s) => s.userId)])
    );

    RealtimeSyncService.notifyUsers(participantIds, {
      type: 'COMMENT_ADDED',
      entity: 'COMMENT',
      groupId: expense.groupId,
      payload: commentDto,
    });

    // 2. Notify other participants (except the author)
    const notifyUserIds = participantIds.filter((id) => id !== authenticatedUserId);
    for (const recipientId of notifyUserIds) {
      try {
        await NotificationService.createNotification({
          recipientUserId: recipientId,
          actorUserId: authenticatedUserId,
          type: 'GENERAL',
          groupId: expense.groupId,
          groupName: expense.group.name,
          expenseId,
          expenseTitle: expense.description,
          title: `New Comment on ${expense.description}`,
          message: `${author?.name || 'Someone'}: "${cleanContent.length > 50 ? cleanContent.slice(0, 47) + '...' : cleanContent}"`,
        });
      } catch {}
    }

    return commentDto;
  }

  /**
   * Delete a comment
   */
  public static async deleteComment(commentId: string, authenticatedUserId: string): Promise<void> {
    const comment = await (prisma as any).expenseComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundError('Comment not found', 'COMMENT_NOT_FOUND');
    }

    if (comment.userId !== authenticatedUserId) {
      throw new ForbiddenError('You can only delete your own comments', 'FORBIDDEN');
    }

    await (prisma as any).expenseComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
}

export const commentRoutes = Router();

// GET /api/v1/expenses/:id/comments
commentRoutes.get('/:id/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CommentService.getComments(req.params.id as string, req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/expenses/:id/comments
commentRoutes.post('/:id/comments', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await CommentService.createComment(req.params.id as string, req.user!.id, req.body.content);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/expenses/:id/comments/:commentId
commentRoutes.delete('/:id/comments/:commentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await CommentService.deleteComment(req.params.commentId as string, req.user!.id);
    res.status(200).json({ success: true, data: { message: 'Comment deleted' } });
  } catch (err) {
    next(err);
  }
});
