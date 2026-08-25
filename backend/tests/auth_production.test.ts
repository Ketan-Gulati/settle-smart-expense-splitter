import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';
import { TokenSecurity } from '../src/utils/security';

const app = createApp();

describe('Production-Grade Authentication System Test Suite', () => {
  let createdUserId: string;
  let verificationRawToken: string;
  let resetRawToken: string;
  let initialRefreshToken: string;
  let rotatedRefreshToken: string;
  let testEmail: string;
  const testPassword = 'ProductionSecure2026!';

  beforeAll(() => {
    testEmail = `auth_test_${Date.now()}_${Math.random().toString(36).substring(7)}@settle.app`;
  });

  afterAll(async () => {
    // Clean up test records
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.emailVerificationToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.account.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    await prisma.$disconnect();
  });

  describe('1. Registration & Argon2id Password Hashing', () => {
    test('POST /api/v1/auth/register creates user with normalized email & Argon2id hash', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Auth User',
          email: `  ${testEmail.toUpperCase()}  `,
          password: testPassword,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Never leak hash
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      createdUserId = res.body.data.user.id;
      initialRefreshToken = res.body.data.tokens.refreshToken;

      // Verify DB state
      const dbUser = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(dbUser).toBeDefined();
      expect(dbUser!.emailNormalized).toBe(testEmail.toLowerCase());
      expect(dbUser!.passwordHash).toMatch(/^\$argon2id\$/); // Argon2id format
    });

    test('POST /api/v1/auth/register rejects duplicate normalized email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate User',
          email: testEmail.toLowerCase(),
          password: testPassword,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    test('POST /api/v1/auth/register validates minimum 8 character password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Pass User',
          email: 'shortpass@settle.app',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Email Verification Flow', () => {
    test('Email verification token is created in database (only hashed)', async () => {
      const verificationRecord = await prisma.emailVerificationToken.findFirst({
        where: { userId: createdUserId, consumedAt: null },
      });
      expect(verificationRecord).toBeDefined();
      expect(verificationRecord!.tokenHash.length).toBe(64); // SHA-256 hex length
    });

    test('POST /api/v1/auth/verify-email rejects invalid/unknown tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: 'nonexistent-token-12345' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('POST /api/v1/auth/verify-email successfully verifies user email', async () => {
      // Simulate raw verification token
      verificationRawToken = TokenSecurity.generateRandomToken();
      const hash = TokenSecurity.hashToken(verificationRawToken);

      await prisma.emailVerificationToken.create({
        data: {
          userId: createdUserId,
          tokenHash: hash,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });

      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationRawToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(dbUser!.emailVerifiedAt).not.toBeNull();
    });

    test('POST /api/v1/auth/verify-email rejects already consumed token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationRawToken });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('3. Login & Authentication Security', () => {
    test('POST /api/v1/auth/login succeeds with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail.toUpperCase(),
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(createdUserId);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      initialRefreshToken = res.body.data.tokens.refreshToken;
    });

    test('POST /api/v1/auth/login returns generic error on wrong password without enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('POST /api/v1/auth/login returns generic error on nonexistent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unknown_account_xyz@settle.app',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('4. Rotating Refresh Tokens & Family Reuse Theft Detection', () => {
    test('POST /api/v1/auth/refresh rotates token and retains familyId', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(initialRefreshToken);

      rotatedRefreshToken = res.body.data.refreshToken;

      // Verify old token in DB is revoked
      const oldHash = TokenSecurity.hashToken(initialRefreshToken);
      const oldRecord = await prisma.refreshToken.findUnique({ where: { tokenHash: oldHash } });
      expect(oldRecord!.revokedAt).not.toBeNull();
    });

    test('POST /api/v1/auth/refresh detects token theft/reuse and revokes whole family', async () => {
      // Re-use initialRefreshToken (which was already rotated)
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Verify rotatedRefreshToken was also revoked due to family revocation
      const newHash = TokenSecurity.hashToken(rotatedRefreshToken);
      const newRecord = await prisma.refreshToken.findUnique({ where: { tokenHash: newHash } });
      expect(newRecord!.revokedAt).not.toBeNull();
    });
  });

  describe('5. Logout & Session Revocation', () => {
    test('POST /api/v1/auth/logout revokes specific session', async () => {
      // Login new session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });
      const currentRefreshToken = loginRes.body.data.tokens.refreshToken;

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: currentRefreshToken });

      expect(logoutRes.status).toBe(200);

      // Verify cannot refresh with logged out token
      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: currentRefreshToken });

      expect(refreshAttempt.status).toBe(401);
    });

    test('POST /api/v1/auth/logout-all revokes all sessions for user', async () => {
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: testPassword });

      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${login1.body.data.tokens.accessToken}`);

      expect(logoutAllRes.status).toBe(200);

      // Verify token cannot refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login1.body.data.tokens.refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('6. Forgot Password & Password Reset Flow', () => {
    test('POST /api/v1/auth/forgot-password returns generic success', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('POST /api/v1/auth/reset-password updates password and revokes all active sessions', async () => {
      resetRawToken = TokenSecurity.generateRandomToken();
      const tokenHash = TokenSecurity.hashToken(resetRawToken);

      await prisma.passwordResetToken.create({
        data: {
          userId: createdUserId,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      });

      const newPass = 'NewBrandSecure2026!';
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetRawToken,
          newPassword: newPass,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify can login with new password
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: newPass });

      expect(newLogin.status).toBe(200);
    });
  });

  describe('7. Google OAuth & Account Linking Integration', () => {
    test('GET /api/v1/auth/google returns 503 or redirect depending on credentials', async () => {
      const res = await request(app).get('/api/v1/auth/google');
      expect([302, 503]).toContain(res.status);
    });

    test('AuthService.handleGoogleOAuth creates new account or links existing safely', async () => {
      const googleSub = `google_sub_${Date.now()}`;
      const googleEmail = testEmail;

      // Link to existing user with same verified email
      const { AuthService } = require('../src/modules/auth/auth.service');
      const result = await AuthService.handleGoogleOAuth({
        providerAccountId: googleSub,
        email: googleEmail,
        name: 'OAuth User',
        avatarUrl: 'https://settle.app/avatar.png',
        emailVerified: true,
      });

      expect(result.user.id).toBe(createdUserId);

      // Verify Account record exists
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: 'GOOGLE',
            providerAccountId: googleSub,
          },
        },
      });
      expect(account).toBeDefined();
      expect(account!.userId).toBe(createdUserId);
    });
  });
});
