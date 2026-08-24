import crypto from 'crypto';
import { prisma } from '../../infrastructure/database/prisma';
import { TokenSecurity } from '../../utils/security';
import { JWTUtil } from '../../utils/jwt';
import { EmailService } from '../../infrastructure/email/email.service';
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  FinancialInvariantError,
} from '../../errors/AppError';
import {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SendOtpInput,
  VerifyOtpInput,
} from './auth.schemas';
import { OtpService } from './otp.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export class AuthService {
  /**
   * Registers a new user with Argon2id hashed password, generates email verification token,
   * sends verification email via Resend, and creates initial session.
   */
  public static async register(
    input: RegisterInput,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const emailNormalized = input.email.toLowerCase().trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailNormalized }, { emailNormalized }],
      },
    });

    if (existingUser) {
      throw new ValidationError('Email address is already registered', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await TokenSecurity.hashPassword(input.password);
    const rawVerificationToken = TokenSecurity.generateRandomToken();
    const verificationTokenHash = TokenSecurity.hashToken(rawVerificationToken);
    const verificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name.trim(),
          email: emailNormalized,
          emailNormalized,
          passwordHash,
        },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash: verificationTokenHash,
          expiresAt: verificationExpiresAt,
        },
      });

      return created;
    });

    // Send verification email asynchronously
    EmailService.sendVerificationEmail(user.email, user.name, rawVerificationToken).catch((err) =>
      console.error('Error sending verification email:', err)
    );

    const tokens = await this.createSession(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        emailVerified: Boolean(user.emailVerifiedAt),
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * Verifies an email token and marks user.emailVerifiedAt.
   */
  public static async verifyEmail(input: VerifyEmailInput): Promise<{ message: string }> {
    const tokenHash = TokenSecurity.hashToken(input.token.trim());

    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.consumedAt) {
      throw new ValidationError('Verification link is invalid or has already been used', 'INVALID_TOKEN');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new ValidationError('Verification link has expired. Please request a new one.', 'TOKEN_EXPIRED');
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      prisma.auditEvent.create({
        data: {
          actorUserId: tokenRecord.userId,
          eventType: 'EMAIL_VERIFIED',
          entityType: 'USER',
          entityId: tokenRecord.userId,
        },
      }),
    ]);

    return { message: 'Email address verified successfully' };
  }

  /**
   * Resends verification email with rate-limit and invalidates older unused tokens.
   */
  public static async resendVerification(input: ResendVerificationInput): Promise<{ message: string }> {
    const emailNormalized = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailNormalized }, { emailNormalized }] },
    });

    // Prevent account enumeration: return success even if user not found or already verified
    if (user && !user.emailVerifiedAt) {
      const rawVerificationToken = TokenSecurity.generateRandomToken();
      const verificationTokenHash = TokenSecurity.hashToken(rawVerificationToken);
      const verificationExpiresAt = new Date(Date.now() + 24 * 3600 * 1000);

      // Invalidate existing tokens
      await prisma.emailVerificationToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: verificationTokenHash,
          expiresAt: verificationExpiresAt,
        },
      });

      EmailService.sendVerificationEmail(user.email, user.name, rawVerificationToken).catch((err) =>
        console.error('Error sending verification email:', err)
      );
    }

    return { message: 'If an unverified account with that email exists, a verification link has been sent.' };
  }

  /**
   * Initiates forgot password flow with cryptographic reset token hash.
   */
  public static async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const emailNormalized = input.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailNormalized }, { emailNormalized }] },
    });

    // Prevent enumeration: always return identical generic success message
    if (user && user.isActive) {
      const rawResetToken = TokenSecurity.generateRandomToken();
      const resetTokenHash = TokenSecurity.hashToken(rawResetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate old active reset tokens
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: resetTokenHash,
          expiresAt,
        },
      });

      EmailService.sendPasswordResetEmail(user.email, user.name, rawResetToken).catch((err) =>
        console.error('Error sending password reset email:', err)
      );
    }

    return { message: 'If an account with that email exists, password reset instructions have been sent.' };
  }

  /**
   * Resets password using valid token, updates Argon2id password hash, and revokes all active sessions.
   */
  public static async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const tokenHash = TokenSecurity.hashToken(input.token.trim());

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.consumedAt) {
      throw new ValidationError('Password reset link is invalid or has already been used', 'INVALID_TOKEN');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new ValidationError('Password reset link has expired. Please request a new one.', 'TOKEN_EXPIRED');
    }

    const newPasswordHash = await TokenSecurity.hashPassword(input.newPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          emailVerifiedAt: tokenRecord.user.emailVerifiedAt || new Date(), // Resetting password also verifies email ownership
        },
      }),
      // Revoke all sessions across all devices for security
      prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.auditEvent.create({
        data: {
          actorUserId: tokenRecord.userId,
          eventType: 'PASSWORD_RESET_COMPLETED',
          entityType: 'USER',
          entityId: tokenRecord.userId,
        },
      }),
    ]);

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  /**
   * Authenticates user via email + password with generic error reporting and family session issuance.
   */
  public static async login(
    input: LoginInput,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const emailNormalized = input.email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailNormalized }, { emailNormalized }] },
    });

    // Generic error prevents account enumeration
    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await TokenSecurity.verifyPassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.createSession(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        emailVerified: Boolean(user.emailVerifiedAt),
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * Rotates refresh tokens and detects token reuse to revoke the entire session family lineage.
   */
  public static async refresh(
    rawRefreshToken: string,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<AuthTokens> {
    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);

    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existingToken) {
      throw new UnauthorizedError('Invalid refresh token', 'TOKEN_INVALID');
    }

    // REUSE DETECTION: If token was already revoked, invalidate entire token lineage/family
    if (existingToken.revokedAt) {
      const familyFilter = existingToken.familyId
        ? { familyId: existingToken.familyId }
        : { userId: existingToken.userId };

      await prisma.refreshToken.updateMany({
        where: { ...familyFilter, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await prisma.auditEvent.create({
        data: {
          actorUserId: existingToken.userId,
          eventType: 'REFRESH_TOKEN_REUSE_DETECTED',
          entityType: 'SESSION',
          entityId: existingToken.id,
          metadata: { familyId: existingToken.familyId },
        },
      });

      throw new UnauthorizedError(
        'Refresh token reuse detected. All sessions revoked.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    // Check expiration
    if (new Date() > existingToken.expiresAt) {
      throw new UnauthorizedError('Refresh token has expired', 'TOKEN_EXPIRED');
    }

    if (!existingToken.user.isActive) {
      throw new UnauthorizedError('User account is deactivated', 'UNAUTHORIZED');
    }

    // Token Rotation: revoke current token and create new replacement within same familyId
    const newRawRefreshToken = TokenSecurity.generateSecureToken();
    const newTokenHash = TokenSecurity.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days
    const familyId = existingToken.familyId || crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
          familyId,
        },
      });

      const replacement = await tx.refreshToken.create({
        data: {
          userId: existingToken.userId,
          tokenHash: newTokenHash,
          familyId,
          expiresAt,
          ipAddress: deviceInfo?.ip,
          userAgent: deviceInfo?.userAgent,
        },
      });

      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: { replacedByTokenId: replacement.id },
      });
    });

    const accessToken = JWTUtil.generateAccessToken({
      userId: existingToken.userId,
      email: existingToken.user.email,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  /**
   * Google OAuth Login / Safe Account Linking.
   * Finds or creates user based on verified Google Subject / Provider Account ID.
   */
  public static async handleGoogleOAuth(
    googleProfile: {
      providerAccountId: string;
      email: string;
      name: string;
      avatarUrl?: string;
      emailVerified: boolean;
    },
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const emailNormalized = googleProfile.email.toLowerCase().trim();

    // 1. Check if OAuth account already exists
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'GOOGLE',
          providerAccountId: googleProfile.providerAccountId,
        },
      },
      include: { user: true },
    });

    let userId: string;

    if (existingAccount) {
      // Existing Google account link
      userId = existingAccount.userId;
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          avatarUrl: existingAccount.user.avatarUrl || googleProfile.avatarUrl,
        },
      });
    } else {
      // 2. Safe Account Linking: Check if user with same verified email exists
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email: emailNormalized }, { emailNormalized }] },
      });

      if (existingUser) {
        // Link Google OAuth account to existing user
        userId = existingUser.id;
        await prisma.$transaction([
          prisma.account.create({
            data: {
              userId,
              provider: 'GOOGLE',
              providerAccountId: googleProfile.providerAccountId,
              providerEmail: emailNormalized,
            },
          }),
          prisma.user.update({
            where: { id: userId },
            data: {
              emailVerifiedAt: existingUser.emailVerifiedAt || (googleProfile.emailVerified ? new Date() : null),
              avatarUrl: existingUser.avatarUrl || googleProfile.avatarUrl,
              lastLoginAt: new Date(),
            },
          }),
          prisma.auditEvent.create({
            data: {
              actorUserId: userId,
              eventType: 'ACCOUNT_LINKED',
              entityType: 'ACCOUNT',
              entityId: googleProfile.providerAccountId,
              metadata: { provider: 'GOOGLE' },
            },
          }),
        ]);
      } else {
        // 3. New user registration via Google OAuth
        const newUser = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              name: googleProfile.name.trim() || emailNormalized.split('@')[0] || 'User',
              email: emailNormalized,
              emailNormalized,
              avatarUrl: googleProfile.avatarUrl,
              emailVerifiedAt: googleProfile.emailVerified ? new Date() : null,
              lastLoginAt: new Date(),
            },
          });

          await tx.account.create({
            data: {
              userId: created.id,
              provider: 'GOOGLE',
              providerAccountId: googleProfile.providerAccountId,
              providerEmail: emailNormalized,
            },
          });

          return created;
        });

        userId = newUser.id;
      }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found after OAuth exchange');

    const tokens = await this.createSession(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        emailVerified: Boolean(user.emailVerifiedAt),
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };
  }

  /**
   * Generates and dispatches a 6-digit email OTP using OtpService with Resend templates,
   * rate-limiting, cooldown, and account-enumeration protection.
   */
  public static async sendOtp(
    input: SendOtpInput,
    ip: string = '127.0.0.1'
  ): Promise<{ message: string }> {
    const emailNormalized = input.email.toLowerCase().trim();
    const purpose = input.purpose || 'email_verification';

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: emailNormalized }, { emailNormalized }] },
    });

    const firstName = existingUser?.name || 'Settle User';

    // Account enumeration protection for login and password reset:
    // If user does not exist, return generic success without generating OTP
    if ((purpose === 'LOGIN' || purpose === 'login' || purpose === 'PASSWORD_RESET' || purpose === 'password_reset') && !existingUser) {
      return { message: 'If this email can receive a verification code, one has been sent.' };
    }

    const result = await OtpService.generateAndSendOtp(emailNormalized, purpose, ip, firstName);
    return { message: result.message };
  }

  /**
   * Atomically verifies 6-digit OTP via OtpService and converges into unified user identity model.
   */
  public static async verifyOtp(
    input: VerifyOtpInput,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<{ user?: UserResponse; tokens?: AuthTokens; message?: string }> {
    const emailNormalized = input.email.toLowerCase().trim();
    const purpose = input.purpose || 'email_verification';

    // Verify OTP using dedicated OtpService
    await OtpService.verifyOtp(emailNormalized, purpose, input.otp);

    // Continue into the existing authentication system
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: emailNormalized }, { emailNormalized }] },
    });

    if (purpose === 'PASSWORD_RESET' || purpose === 'password_reset') {
      if (!input.newPassword || input.newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters', 'VALIDATION_ERROR');
      }
      if (!existingUser) {
        throw new ValidationError('User account not found', 'USER_NOT_FOUND');
      }

      const newPasswordHash = await TokenSecurity.hashPassword(input.newPassword);

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash: newPasswordHash,
            emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
          },
        });

        await tx.refreshToken.updateMany({
          where: { userId: existingUser.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      });

      return { message: 'Password has been reset successfully. Please log in with your new password.' };
    }

    let user = existingUser;

    if (!user) {
      // Create new user account
      const userName = input.name?.trim() || emailNormalized.split('@')[0] || 'User';
      const passwordHash = input.password
        ? await TokenSecurity.hashPassword(input.password)
        : null;

      user = await prisma.user.create({
        data: {
          name: userName,
          email: emailNormalized,
          emailNormalized,
          passwordHash,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Authenticate existing user
      if (!user.isActive) {
        throw new UnauthorizedError('Invalid email or account is inactive', 'INVALID_CREDENTIALS');
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    }

    const tokens = await this.createSession(user.id, deviceInfo);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        emailVerified: true,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };
  }

  public static async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  public static async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private static async createSession(
    userId: string,
    deviceInfo?: { ip?: string; userAgent?: string }
  ): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new FinancialInvariantError('User not found during session creation');

    const accessToken = JWTUtil.generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const rawRefreshToken = TokenSecurity.generateSecureToken();
    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days
    const familyId = crypto.randomUUID();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        familyId,
        expiresAt,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }
}


