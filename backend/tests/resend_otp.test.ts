import request from 'supertest';
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';
import { RedisService } from '../src/infrastructure/redis/redis.client';
import { OtpRedisRepository } from '../src/infrastructure/redis/otp.redis';
import { ResendClient } from '../src/infrastructure/email/resend.client';

const app = createApp();

describe('Production-Grade Resend + Redis Email OTP Authentication Suite', () => {
  let mockRedis: any;
  const mockResend = {
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'mock-resend-msg-123' }, error: null }),
    },
  };

  beforeAll(async () => {
    mockRedis = new RedisMock();
    RedisService.setMockInstance(mockRedis);
    ResendClient.setMockInstance(mockResend as any);
  });

  afterAll(async () => {
    await RedisService.quit();
  });

  beforeEach(async () => {
    await mockRedis.flushall();
    jest.clearAllMocks();
  });

  describe('1. OTP Generation & Security Requirements', () => {
    it('generates a 6-digit numeric OTP and supports leading zeroes', () => {
      for (let i = 0; i < 50; i++) {
        const otp = OtpRedisRepository.generateSecure6DigitOtp();
        expect(otp).toHaveLength(6);
        expect(/^\d{6}$/.test(otp)).toBe(true);
      }
    });

    it('hashes the OTP with SHA-256 and never exposes plaintext in Redis', async () => {
      const email = 'security_test@settle.co';
      const rawOtp = '000421';
      const otpHash = OtpRedisRepository.hashOtp(rawOtp);

      await OtpRedisRepository.storeOtp('email_verification', email, '127.0.0.1', otpHash);

      const key = OtpRedisRepository.getOtpKey('email_verification', email);
      expect(key).toBe('auth:otp:v1:email_verification:security_test@settle.co');

      const storedJson = await mockRedis.get(key);
      expect(storedJson).toBeDefined();

      const parsed = JSON.parse(storedJson!);
      expect(parsed.hash).toBe(otpHash);
      expect(parsed.attempts).toBe(0);
      expect(storedJson).not.toContain('000421'); // No plaintext OTP persisted
    });
  });

  describe('2. POST /api/v1/auth/send-otp Flow & Resend Template Integration', () => {
    it('dispatches OTP using Resend template and returns generic safe response', async () => {
      const email = `otp_user_${Date.now()}@settle.co`;

      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'email_verification' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('If this email can receive a verification code, one has been sent.');
      expect(res.body.data.otp).toBeUndefined(); // Never return OTP in response

      // Check that Resend email was called
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1);
      const callArgs = mockResend.emails.send.mock.calls[0][0];
      expect(callArgs.to).toBe(email);
    });

    it('enforces 60-second cooldown per email/purpose', async () => {
      const email = `cooldown_${Date.now()}@settle.co`;

      // 1st request succeeds
      const first = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'email_verification' });
      expect(first.status).toBe(200);

      // Immediate 2nd request is blocked by cooldown
      const second = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'email_verification' });
      expect(second.status).toBe(400);
      expect(second.body.error.code).toBe('OTP_COOLDOWN_ACTIVE');
    });

    it('enforces maximum 5 requests per hour limit per email', async () => {
      const email = `hourly_${Date.now()}@settle.co`;

      // Simulate 5 requests (bypassing cooldown key between requests to test the hourly counter)
      for (let i = 0; i < 5; i++) {
        await mockRedis.del(OtpRedisRepository.getCooldownKey('email_verification', email));
        const res = await request(app)
          .post('/api/v1/auth/send-otp')
          .send({ email, purpose: 'email_verification' });
        expect(res.status).toBe(200);
      }

      // 6th request must be rejected
      await mockRedis.del(OtpRedisRepository.getCooldownKey('email_verification', email));
      const sixth = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'email_verification' });
      expect(sixth.status).toBe(400);
      expect(sixth.body.error.code).toBe('OTP_RATE_LIMIT_EXCEEDED');
    });

    it('invalidates Redis OTP if Resend delivery fails', async () => {
      const email = `resend_fail_${Date.now()}@settle.co`;

      // Make Resend fail
      mockResend.emails.send.mockResolvedValueOnce({
        data: null,
        error: { message: 'Provider connection error', name: 'provider_error' },
      });

      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email, purpose: 'email_verification' });

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');

      // Verify OTP key was cleaned up
      const key = OtpRedisRepository.getOtpKey('email_verification', email);
      const stored = await mockRedis.get(key);
      expect(stored).toBeNull();
    });

    it('prevents account enumeration for non-existent user on login or password reset', async () => {
      const nonExistentEmail = `ghost_${Date.now()}@settle.co`;

      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ email: nonExistentEmail, purpose: 'login' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('If this email can receive a verification code, one has been sent.');
      // Resend should not be dispatched for ghost user
      expect(mockResend.emails.send).not.toHaveBeenCalled();
    });
  });

  describe('3. POST /api/v1/auth/verify-otp Flow & Authentication Convergence', () => {
    it('creates new user account and returns JWT session on valid verification', async () => {
      const email = `new_verified_${Date.now()}@settle.co`;
      const rawOtp = '719302';
      const otpHash = OtpRedisRepository.hashOtp(rawOtp);

      await OtpRedisRepository.storeOtp('email_verification', email, '127.0.0.1', otpHash);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email,
          purpose: 'email_verification',
          otp: rawOtp,
          name: 'Verified User',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.emailVerified).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Ensure OTP was deleted atomically from Redis
      const key = OtpRedisRepository.getOtpKey('email_verification', email);
      expect(await mockRedis.get(key)).toBeNull();
    });

    it('increments attempt counter on wrong OTP and deletes after 5 failures', async () => {
      const email = `brute_test_${Date.now()}@settle.co`;
      const rawOtp = '884920';
      const otpHash = OtpRedisRepository.hashOtp(rawOtp);

      await OtpRedisRepository.storeOtp('email_verification', email, '127.0.0.1', otpHash);

      // Attempt 1 to 4: returns invalid OTP with remaining counter
      for (let attempt = 1; attempt <= 4; attempt++) {
        const res = await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({ email, purpose: 'email_verification', otp: '111111' });
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('OTP_INCORRECT');
      }

      // 5th failed attempt: max attempts exceeded and record deleted
      const fifth = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, purpose: 'email_verification', otp: '111111' });
      expect(fifth.status).toBe(400);
      expect(fifth.body.error.code).toBe('OTP_MAX_ATTEMPTS_EXCEEDED');

      // 6th attempt: OTP no longer exists
      const sixth = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, purpose: 'email_verification', otp: rawOtp });
      expect(sixth.status).toBe(400);
      expect(sixth.body.error.code).toBe('OTP_EXPIRED_OR_INVALID');
    });

    it('authenticates existing user without creating duplicates', async () => {
      const email = `existing_auth_${Date.now()}@settle.co`;

      // Pre-create user
      const existingUser = await prisma.user.create({
        data: {
          name: 'Existing Member',
          email,
          emailNormalized: email,
          emailVerifiedAt: new Date(),
        },
      });

      const rawOtp = '502914';
      const otpHash = OtpRedisRepository.hashOtp(rawOtp);
      await OtpRedisRepository.storeOtp('login', email, '127.0.0.1', otpHash);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ email, purpose: 'login', otp: rawOtp });

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(existingUser.id);
      expect(res.body.data.tokens.accessToken).toBeDefined();

      // Check user count in DB hasn't duplicated
      const count = await prisma.user.count({ where: { email } });
      expect(count).toBe(1);
    });
  });
});
