import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
  inviteHandoffSchema,
} from './auth.schemas';

const router = Router();

// Ephemeral Redis Email OTP Endpoints
router.post(
  '/send-otp',
  validateRequest({ body: sendOtpSchema }),
  AuthController.sendOtp
);

router.post(
  '/verify-otp',
  validateRequest({ body: verifyOtpSchema }),
  AuthController.verifyOtp
);

// Ephemeral Invite Handoff Endpoints
router.post(
  '/invite-handoff',
  validateRequest({ body: inviteHandoffSchema }),
  AuthController.saveInviteHandoff
);

router.get(
  '/invite-handoff/:handoffId',
  AuthController.getInviteHandoff
);

router.post(
  '/register',
  authRateLimiter,
  validateRequest({ body: registerSchema }),
  AuthController.register
);

router.post(
  '/verify-email',
  authRateLimiter,
  validateRequest({ body: verifyEmailSchema }),
  AuthController.verifyEmail
);

router.post(
  '/resend-verification',
  authRateLimiter,
  validateRequest({ body: resendVerificationSchema }),
  AuthController.resendVerification
);

router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest({ body: forgotPasswordSchema }),
  AuthController.forgotPassword
);

router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest({ body: resetPasswordSchema }),
  AuthController.resetPassword
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  AuthController.login
);

router.post(
  '/refresh',
  authRateLimiter,
  validateRequest({ body: refreshSchema }),
  AuthController.refresh
);

router.post(
  '/logout',
  validateRequest({ body: refreshSchema }),
  AuthController.logout
);

router.post(
  '/logout-all',
  authenticate,
  AuthController.logoutAll
);

router.get(
  '/me',
  authenticate,
  AuthController.me
);

// Google OAuth 2.0 endpoints
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);

export const authRoutes = router;

