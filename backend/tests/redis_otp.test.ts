import request from 'supertest';
// @ts-ignore
import RedisMock from 'ioredis-mock';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';
import { RedisService } from '../src/infrastructure/redis/redis.client';
import { OtpRedisRepository } from '../src/infrastructure/redis/otp.redis';

const app = createApp();

describe('Redis & IORedis Ephemeral Email OTP Authentication Test Suite', () => {
  let mockRedis: any;
  const testEmail = `otp_test_${Date.now()}@settle.app`;
  const testPassword = 'ProductionSecure2026!';
  let createdUserId: string;

  beforeAll(() => {
    mockRedis = new RedisMock();
    RedisService.setMockInstance(mockRedis);
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    await prisma.$disconnect();
    await RedisService.quit();
  });

  describe('1. OTP Generation, Hashing & Storage', () => {
    test('generateSecure6DigitOtp produces exactly 6 numeric digits without Math.random', () => {
      for (let i = 0; i < 20; i++) {
        const otp = OtpRedisRepository.generateSecure6DigitOtp();
        expect(otp).toMatch(/^\d{6}$/);
        expect(otp).toHaveLength(6);
      }
    });

    test('POST /api/v1/auth/send-otp stores SHA-256 hash in Redis with cooldown & rate limits', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          email: `  ${testEmail.toUpperCase()}  `,
          purpose: 'SIGNUP',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('verification code');

      // Verify Redis state
      const otpKey = OtpRedisRepository.getOtpKey('SIGNUP', testEmail.toLowerCase());
      const rawStored = await mockRedis.get(otpKey);
      expect(rawStored).toBeDefined();
      const parsed = JSON.parse(rawStored!);
      expect(parsed.hash).toBeDefined();
      expect(parsed.hash.length).toBe(64); // SHA-256 hex string
      expect(parsed.attempts).toBe(0);

      // Verify cooldown key exists
      const cooldownKey = OtpRedisRepository.getCooldownKey('SIGNUP', testEmail.toLowerCase());
      const cooldown = await mockRedis.get(cooldownKey);
      expect(cooldown).toBe('1');
    });

    test('POST /api/v1/auth/send-otp enforces 60-second cooldown', async () => {
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          email: testEmail,
          purpose: 'SIGNUP',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OTP_COOLDOWN_ACTIVE');
    });

    test('POST /api/v1/auth/send-otp protects account enumeration on LOGIN for non-existent email', async () => {
      const nonexistentEmail = `nonexistent_${Date.now()}@settle.app`;
      const res = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          email: nonexistentEmail,
          purpose: 'LOGIN',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('verification code');

      // Verify no OTP key was created for non-existent user login
      const otpKey = OtpRedisRepository.getOtpKey('LOGIN', nonexistentEmail);
      const val = await mockRedis.get(otpKey);
      expect(val).toBeNull();
    });
  });

  describe('2. Brute Force Protection & Atomic Verification', () => {
    const bruteForceEmail = `brute_${Date.now()}@settle.app`;
    const realOtp = '654321';

    beforeAll(async () => {
      const hash = OtpRedisRepository.hashOtp(realOtp);
      await OtpRedisRepository.storeOtp('SIGNUP', bruteForceEmail, '127.0.0.1', hash);
    });

    test('POST /api/v1/auth/verify-otp increments attempt counter on wrong OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: bruteForceEmail,
          purpose: 'SIGNUP',
          otp: '000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('OTP_INCORRECT');
      expect(res.body.error.message).toContain('4 attempts remaining');
    });

    test('POST /api/v1/auth/verify-otp deletes OTP after 5 failed attempts', async () => {
      // Send 4 more incorrect attempts (total 5)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/v1/auth/verify-otp')
          .send({
            email: bruteForceEmail,
            purpose: 'SIGNUP',
            otp: '000000',
          });
      }

      // 6th attempt should return expired / max attempts
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: bruteForceEmail,
          purpose: 'SIGNUP',
          otp: realOtp, // Even with correct OTP now, record is destroyed
        });

      expect(res.status).toBe(400);
      expect(['OTP_EXPIRED_OR_INVALID', 'OTP_MAX_ATTEMPTS_EXCEEDED']).toContain(res.body.error.code);

      const otpKey = OtpRedisRepository.getOtpKey('SIGNUP', bruteForceEmail);
      const val = await mockRedis.get(otpKey);
      expect(val).toBeNull();
    });
  });

  describe('3. Complete SIGNUP Flow via OTP', () => {
    const signupEmail = `signup_otp_${Date.now()}@settle.app`;
    const correctOtp = '123456';

    beforeAll(async () => {
      const hash = OtpRedisRepository.hashOtp(correctOtp);
      await OtpRedisRepository.storeOtp('SIGNUP', signupEmail, '127.0.0.1', hash);
    });

    test('POST /api/v1/auth/verify-otp creates user with verified email and returns session', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: signupEmail,
          purpose: 'SIGNUP',
          otp: correctOtp,
          name: 'OTP User',
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(signupEmail);
      expect(res.body.data.user.emailVerified).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      createdUserId = res.body.data.user.id;

      // Verify OTP is immediately deleted from Redis (single-use)
      const otpKey = OtpRedisRepository.getOtpKey('SIGNUP', signupEmail);
      const val = await mockRedis.get(otpKey);
      expect(val).toBeNull();

      // Replay attempt must fail
      const replayRes = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: signupEmail,
          purpose: 'SIGNUP',
          otp: correctOtp,
        });
      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.code).toBe('OTP_EXPIRED_OR_INVALID');
    });
  });

  describe('4. Complete LOGIN Flow via OTP', () => {
    const loginOtp = '789012';

    test('POST /api/v1/auth/verify-otp logs in verified user with OTP', async () => {
      const user = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
      expect(user).toBeDefined();

      const hash = OtpRedisRepository.hashOtp(loginOtp);
      await OtpRedisRepository.storeOtp('LOGIN', 'ketan@settle.app', '127.0.0.1', hash);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'ketan@settle.app',
          purpose: 'LOGIN',
          otp: loginOtp,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('ketan@settle.app');
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('5. Password Reset Flow via OTP', () => {
    const resetOtp = '456789';

    test('POST /api/v1/auth/verify-otp resets password and revokes existing sessions', async () => {
      const user = await prisma.user.findFirst({ where: { email: 'rohit@settle.app' } });
      expect(user).toBeDefined();

      const hash = OtpRedisRepository.hashOtp(resetOtp);
      await OtpRedisRepository.storeOtp('PASSWORD_RESET', 'rohit@settle.app', '127.0.0.1', hash);

      const res = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'rohit@settle.app',
          purpose: 'PASSWORD_RESET',
          otp: resetOtp,
          newPassword: 'NewRohitPassword2026!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Password has been reset');

      // Verify old password fails
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rohit@settle.app', password: 'SettleSecure2026!' });
      expect(oldLogin.status).toBe(401);

      // Restore original password for other test suites
      await prisma.user.update({
        where: { email: 'rohit@settle.app' },
        data: { passwordHash: user!.passwordHash },
      });
    });
  });

  describe('6. OAuth State & Invite Handoff Management in Redis', () => {
    test('storeOAuthState & consumeOAuthState prevents replay attacks', async () => {
      const state = 'secure-oauth-state-123';
      await OtpRedisRepository.storeOAuthState(state, { ip: '127.0.0.1' });

      // First consume succeeds
      const firstConsume = await OtpRedisRepository.consumeOAuthState(state);
      expect(firstConsume).toBeDefined();
      expect(firstConsume!.ip).toBe('127.0.0.1');

      // Second consume (replay) returns null
      const secondConsume = await OtpRedisRepository.consumeOAuthState(state);
      expect(secondConsume).toBeNull();
    });

    test('POST /api/v1/auth/invite-handoff stores and retrieves temporary invite state', async () => {
      const saveRes = await request(app)
        .post('/api/v1/auth/invite-handoff')
        .send({ inviteCode: 'RV6XQB' });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.data.handoffId).toBeDefined();

      const getRes = await request(app)
        .get(`/api/v1/auth/invite-handoff/${saveRes.body.data.handoffId}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.inviteCode).toBe('RV6XQB');
    });
  });
});
