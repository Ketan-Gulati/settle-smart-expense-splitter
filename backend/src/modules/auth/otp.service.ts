import { OtpRedisRepository, OtpPurpose } from '../../infrastructure/redis/otp.redis';
import { EmailService } from '../../infrastructure/email/email.service';
import { Logger } from '../../utils/logger';
import { ValidationError, AppError } from '../../errors/AppError';

export class OtpService {
  /**
   * Generates a cryptographically secure 6-digit OTP, stores its SHA-256 hash in Redis,
   * dispatches the Resend template email, and ensures atomic rollback if email dispatch fails.
   */
  public static async generateAndSendOtp(
    email: string,
    purpose: OtpPurpose | string,
    ip: string = '127.0.0.1',
    firstName: string = 'Settle User'
  ): Promise<{ success: boolean; message: string }> {
    const emailNormalized = email.toLowerCase().trim();
    const normalizedPurpose = OtpRedisRepository.normalizePurpose(purpose);

    Logger.info('OTP_REQUESTED', {
      event: 'OTP_REQUESTED',
      purpose: normalizedPurpose,
      emailNormalized,
      ip,
    });

    // 1. Rate limiting & Cooldown check
    const limitCheck = await OtpRedisRepository.checkSendLimits(normalizedPurpose, emailNormalized, ip);
    if (!limitCheck.allowed) {
      Logger.warn('OTP_RATE_LIMITED', {
        event: 'OTP_RATE_LIMITED',
        purpose: normalizedPurpose,
        emailNormalized,
        reason: limitCheck.reason,
        retryAfterSeconds: limitCheck.retryAfterSeconds,
      });

      if (limitCheck.reason === 'COOLDOWN_ACTIVE') {
        throw new ValidationError(
          `Please wait ${limitCheck.retryAfterSeconds} seconds before requesting a new verification code.`,
          'OTP_COOLDOWN_ACTIVE'
        );
      }
      throw new ValidationError(
        'Too many verification code requests. Please try again later.',
        'OTP_RATE_LIMIT_EXCEEDED'
      );
    }

    // 2. Generate secure 6-digit OTP (leading zeroes supported)
    const rawOtp = OtpRedisRepository.generateSecure6DigitOtp();
    const otpHash = OtpRedisRepository.hashOtp(rawOtp);

    // 3. Store hashed OTP in Redis
    await OtpRedisRepository.storeOtp(normalizedPurpose, emailNormalized, ip, otpHash);

    // 4. Dispatch Resend template email
    const emailResult = await EmailService.sendOtpEmail(emailNormalized, rawOtp, firstName);

    if (!emailResult.success) {
      // Invalidate OTP immediately if email delivery fails
      await OtpRedisRepository.deleteOtp(normalizedPurpose, emailNormalized);

      Logger.error('OTP_SEND_FAILURE', {
        event: 'OTP_SEND_FAILURE',
        purpose: normalizedPurpose,
        emailNormalized,
      });

      throw new AppError(
        'Failed to deliver verification email. Please try again.',
        500,
        'EMAIL_DELIVERY_FAILED'
      );
    }

    Logger.info('OTP_SEND_SUCCESS', {
      event: 'OTP_SEND_SUCCESS',
      purpose: normalizedPurpose,
      emailNormalized,
      providerMessageId: emailResult.messageId,
    });

    return {
      success: true,
      message: 'If this email can receive a verification code, one has been sent.',
    };
  }

  /**
   * Verifies the submitted OTP against Redis using atomic Lua script and timing-safe checks.
   */
  public static async verifyOtp(
    email: string,
    purpose: OtpPurpose | string,
    submittedOtp: string
  ): Promise<{ valid: boolean }> {
    const emailNormalized = email.toLowerCase().trim();
    const normalizedPurpose = OtpRedisRepository.normalizePurpose(purpose);
    const submittedOtpHash = OtpRedisRepository.hashOtp(submittedOtp);

    const verificationResult = await OtpRedisRepository.verifyOtpAtomically(
      normalizedPurpose,
      emailNormalized,
      submittedOtpHash
    );

    if (verificationResult.status === 'NOT_FOUND') {
      Logger.warn('OTP_VERIFICATION_FAILURE', {
        event: 'OTP_VERIFICATION_FAILURE',
        purpose: normalizedPurpose,
        emailNormalized,
        reason: 'NOT_FOUND_OR_EXPIRED',
      });
      throw new ValidationError('Invalid or expired verification code.', 'OTP_EXPIRED_OR_INVALID');
    }

    if (verificationResult.status === 'MAX_ATTEMPTS_EXCEEDED') {
      Logger.warn('OTP_VERIFICATION_FAILURE', {
        event: 'OTP_VERIFICATION_FAILURE',
        purpose: normalizedPurpose,
        emailNormalized,
        reason: 'MAX_ATTEMPTS_EXCEEDED',
      });
      throw new ValidationError(
        'Too many failed attempts. This verification code has been invalidated. Please request a new code.',
        'OTP_MAX_ATTEMPTS_EXCEEDED'
      );
    }

    if (verificationResult.status === 'INVALID_OTP') {
      Logger.warn('OTP_VERIFICATION_FAILURE', {
        event: 'OTP_VERIFICATION_FAILURE',
        purpose: normalizedPurpose,
        emailNormalized,
        reason: 'INCORRECT_OTP',
        attemptsLeft: verificationResult.attemptsLeft,
      });
      throw new ValidationError(
        `Invalid or expired verification code. (${verificationResult.attemptsLeft ?? 0} attempts remaining)`,
        'OTP_INCORRECT'
      );
    }

    // verificationResult.status === 'SUCCESS'
    Logger.info('OTP_VERIFICATION_SUCCESS', {
      event: 'OTP_VERIFICATION_SUCCESS',
      purpose: normalizedPurpose,
      emailNormalized,
    });

    return { valid: true };
  }

  /**
   * Explicitly invalidates an active OTP for an email and purpose.
   */
  public static async invalidateOtp(email: string, purpose: OtpPurpose | string): Promise<void> {
    const emailNormalized = email.toLowerCase().trim();
    const normalizedPurpose = OtpRedisRepository.normalizePurpose(purpose);
    await OtpRedisRepository.deleteOtp(normalizedPurpose, emailNormalized);
  }
}
