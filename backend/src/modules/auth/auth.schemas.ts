import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const sendOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  purpose: z.string().trim().optional().default('email_verification'),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  purpose: z.string().trim().optional().default('email_verification'),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  // Optional parameters for signup and password reset completion
  name: z.string().trim().min(1).max(255).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
});

export const inviteHandoffSchema = z.object({
  inviteCode: z.string().trim().min(4, 'Invite code is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type InviteHandoffInput = z.infer<typeof inviteHandoffSchema>;

