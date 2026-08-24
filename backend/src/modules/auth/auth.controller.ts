import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { env } from '../../config/env';
import { OtpRedisRepository } from '../../infrastructure/redis/otp.redis';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body, {
        ip: req.ip,
        userAgent: req.header('user-agent'),
      });
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifyEmail(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resendVerification(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body, {
        ip: req.ip,
        userAgent: req.header('user-agent'),
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.refresh(req.body.refreshToken, {
        ip: req.ip,
        userAgent: req.header('user-agent'),
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logout(req.body.refreshToken);
      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.logoutAll(req.user!.id);
      res.status(200).json({
        success: true,
        data: { message: 'All sessions logged out successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        data: {
          id: req.user!.id,
          name: req.user!.name,
          email: req.user!.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.sendOtp(req.body, req.ip);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifyOtp(req.body, {
        ip: req.ip,
        userAgent: req.header('user-agent'),
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async saveInviteHandoff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const handoffId = await OtpRedisRepository.storeInviteHandoff(req.body.inviteCode);
      res.status(200).json({
        success: true,
        data: { handoffId },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getInviteHandoff(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inviteCode = await OtpRedisRepository.getInviteHandoff(req.params.handoffId as string);
      res.status(200).json({
        success: true,
        data: { inviteCode },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Initiates Google OAuth redirection to Google Auth consent screen.
   * Generates and stores temporary OAuth state in Redis (10m TTL).
   */
  public static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!env.GOOGLE_CLIENT_ID) {
        res.status(503).json({
          success: false,
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'Google OAuth is not configured in this environment.',
          },
        });
        return;
      }

      const rawReturnUrl = (req.query.state as string) || '';
      const stateId = crypto.randomUUID();
      await OtpRedisRepository.storeOAuthState(stateId, {
        ip: req.ip,
        returnUrl: rawReturnUrl,
        createdAt: Date.now(),
      });

      const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
        state: stateId,
      });

      res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Handles Google OAuth callback code exchange and session issuance.
   * Validates and single-use consumes OAuth state from Redis.
   */
  public static async googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = req.query.code as string;
      const state = (req.query.state as string) || '';

      if (!code) {
        res.redirect(`${env.FRONTEND_URL}/auth?error=${encodeURIComponent('Google login was cancelled or failed')}`);
        return;
      }

      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        res.redirect(`${env.FRONTEND_URL}/auth?error=${encodeURIComponent('Google OAuth is not configured on backend')}`);
        return;
      }

      // Single-use state verification in Redis
      let returnUrl = '';
      if (state) {
        const stateRecord = await OtpRedisRepository.consumeOAuthState(state);
        if (stateRecord && stateRecord.returnUrl) {
          returnUrl = stateRecord.returnUrl;
        }
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }).toString(),
      });

      if (!tokenRes.ok) {
        throw new Error('Failed to exchange authorization code with Google');
      }

      const tokenData = await tokenRes.json();

      // Fetch user profile from Google OpenID userinfo
      const userinfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userinfoRes.ok) {
        throw new Error('Failed to fetch verified user identity from Google');
      }

      const profile = await userinfoRes.json();

      const result = await AuthService.handleGoogleOAuth(
        {
          providerAccountId: profile.sub,
          email: profile.email,
          name: profile.name || profile.given_name || profile.email.split('@')[0],
          avatarUrl: profile.picture,
          emailVerified: Boolean(profile.email_verified),
        },
        {
          ip: req.ip,
          userAgent: req.header('user-agent'),
        }
      );

      // Redirect to frontend auth callback with access & refresh tokens
      const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
      redirectUrl.searchParams.set('accessToken', result.tokens.accessToken);
      redirectUrl.searchParams.set('refreshToken', result.tokens.refreshToken);
      if (returnUrl) {
        redirectUrl.searchParams.set('returnUrl', returnUrl);
      }

      res.redirect(redirectUrl.toString());
    } catch (error) {
      next(error);
    }
  }
}


