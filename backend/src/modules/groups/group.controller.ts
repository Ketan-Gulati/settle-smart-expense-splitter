import { Request, Response, NextFunction } from 'express';
import { GroupService } from './group.service';

export class GroupController {
  public static async createGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await GroupService.createGroup(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUserGroups(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const groups = await GroupService.getUserGroups(req.user!.id);
      res.status(200).json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getGroupDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await GroupService.getGroupDetails(req.params.groupId as string, req.user!.id);
      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await GroupService.updateGroup(
        req.params.groupId as string,
        req.user!.id,
        req.body
      );
      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await GroupService.deleteGroup(req.params.groupId as string, req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'Group archived successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await GroupService.addMember(
        req.params.groupId as string,
        req.user!.id,
        req.body
      );
      res.status(201).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await GroupService.removeMember(
        req.params.groupId as string,
        req.user!.id,
        req.params.userId as string
      );
      res.status(200).json({
        success: true,
        data: { message: 'Member removed successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invite = await GroupService.createInvite(req.params.groupId as string, req.user!.id);
      res.status(201).json({
        success: true,
        data: invite,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async revokeInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await GroupService.revokeInvite(
        req.params.groupId as string,
        req.params.inviteId as string,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: { message: 'Invitation revoked successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resolveInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preview = await GroupService.resolveInvite(req.params.codeOrToken as string);
      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async joinGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const group = await GroupService.joinGroupViaInvite(
        req.params.codeOrToken as string,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }
}
