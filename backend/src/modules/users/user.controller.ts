import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';

export class UserController {
  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await UserService.getProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await UserService.updateProfile(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await UserService.getPublicProfile(req.params.id as string);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getFriends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const friends = await UserService.getFriends(req.user!.id);
      res.status(200).json({
        success: true,
        data: friends,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = (req.query.q as string) || '';
      const users = await UserService.searchUsers(query, req.user!.id);
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async requestPasswordChangeOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const result = await UserService.sendPasswordChangeOtp(req.user!.id, clientIp);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { otp, newPassword } = req.body;
      const result = await UserService.changePasswordWithOtp(req.user!.id, otp, newPassword);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAccountDeletionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.getAccountDeletionStatus(req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.deleteAccount(req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
