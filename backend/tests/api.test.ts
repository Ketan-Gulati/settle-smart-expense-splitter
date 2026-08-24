import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';

const app = createApp();

describe('Settle API Integration Test Suite', () => {
  let ketanToken: string;
  let rohitToken: string;
  let strangerToken: string;
  let ketanId: string;
  let rohitId: string;
  let rajId: string;
  let strangerId: string;
  let testGroupId: string;
  let createdExpenseId: string;

  beforeAll(async () => {
    // 1. Authenticate Ketan
    const ketanLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ketan@settle.app', password: 'SettleSecure2026!' });
    expect(ketanLogin.status).toBe(200);
    ketanToken = ketanLogin.body.data.tokens.accessToken;
    ketanId = ketanLogin.body.data.user.id;

    // 2. Authenticate Rohit
    const rohitLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rohit@settle.app', password: 'SettleSecure2026!' });
    expect(rohitLogin.status).toBe(200);
    rohitToken = rohitLogin.body.data.tokens.accessToken;
    rohitId = rohitLogin.body.data.user.id;

    // 3. Register Stranger (User with zero group memberships)
    const strangerEmail = `stranger_${Date.now()}@settle.app`;
    const strangerReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Stranger', email: strangerEmail, password: 'SettleSecure2026!' });
    expect(strangerReg.status).toBe(201);
    strangerToken = strangerReg.body.data.tokens.accessToken;
    strangerId = strangerReg.body.data.user.id;

    const raj = await prisma.user.findFirst({ where: { email: 'raj@settle.app' } });
    rajId = raj!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Authentication Endpoints', () => {
    test('POST /api/v1/auth/register rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Duplicate Ketan', email: 'ketan@settle.app', password: 'Password123!' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    test('POST /api/v1/auth/login rejects incorrect password without leaking user existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ketan@settle.app', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('POST /api/v1/auth/refresh rotates token and detects reuse', async () => {
      // Login fresh session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rohit@settle.app', password: 'SettleSecure2026!' });
      const initialRefreshToken = loginRes.body.data.tokens.refreshToken;

      // 1. First refresh (Valid)
      const refreshRes1 = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });
      expect(refreshRes1.status).toBe(200);
      expect(refreshRes1.body.data.accessToken).toBeDefined();
      expect(refreshRes1.body.data.refreshToken).toBeDefined();
      expect(refreshRes1.body.data.refreshToken).not.toBe(initialRefreshToken);

      // 2. Second refresh using OLD rotated token (Must detect reuse & reject)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefreshToken });
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');
    });

    test('GET /api/v1/auth/me returns authenticated user without password hash', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ketanToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('ketan@settle.app');
      expect(res.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('2. Groups & Authorization Endpoints', () => {
    test('POST /api/v1/groups creates a group with creator as OWNER', async () => {
      const res = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${ketanToken}`)
        .send({
          name: 'API Test Trip',
          currency: 'INR',
          initialMemberUserIds: [rohitId, rajId],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('API Test Trip');
      expect(res.body.data.memberCount).toBe(3);
      testGroupId = res.body.data.id;
    });

    test('GET /api/v1/groups/:groupId forbids non-members', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${testGroupId}`)
        .set('Authorization', `Bearer ${strangerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });

    test('POST /api/v1/groups/:groupId/members adds a member', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/${testGroupId}/members`)
        .set('Authorization', `Bearer ${ketanToken}`)
        .send({ userId: strangerId });

      expect(res.status).toBe(201);
      expect(res.body.data.userId).toBe(strangerId);
    });

    test('DELETE /api/v1/groups/:groupId/members/:userId removes a member', async () => {
      const res = await request(app)
        .delete(`/api/v1/groups/${testGroupId}/members/${strangerId}`)
        .set('Authorization', `Bearer ${ketanToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('3. Financial Expense & Split Math Endpoints (₹250 Split Scenario)', () => {
    test('POST /api/v1/expenses calculates ₹250 equal split (8334, 8333, 8333) server-side', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${ketanToken}`)
        .send({
          groupId: testGroupId,
          description: 'Special Dinner',
          amountMinor: 25000, // ₹250.00
          paidByUserId: ketanId,
          splitMethod: 'EQUAL',
          participants: [{ userId: ketanId }, { userId: rohitId }, { userId: rajId }],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amountMinor).toBe(25000);
      createdExpenseId = res.body.data.id;

      const splits = res.body.data.splits;
      expect(splits.length).toBe(3);
      expect(splits.find((s: any) => s.userId === ketanId).amountMinor).toBe(8334);
      expect(splits.find((s: any) => s.userId === rohitId).amountMinor).toBe(8333);
      expect(splits.find((s: any) => s.userId === rajId).amountMinor).toBe(8333);
    });

    test('GET /api/v1/groups/:groupId/balances derives Ketan +₹166.66, Rohit -₹83.33, Raj -₹83.33', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${testGroupId}/balances`)
        .set('Authorization', `Bearer ${ketanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.userNetBalanceMinor).toBe(16666); // +₹166.66

      const members = res.body.data.members;
      const rohitBal = members.find((m: any) => m.userId === rohitId);
      const rajBal = members.find((m: any) => m.userId === rajId);

      expect(rohitBal.netBalanceMinor).toBe(-8333);
      expect(rajBal.netBalanceMinor).toBe(-8333);
    });

    test('GET /api/v1/groups/:groupId/balances/:userId provides bilateral person breakdown', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${testGroupId}/balances/${rohitId}`)
        .set('Authorization', `Bearer ${ketanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.youPaidForPersonMinor).toBe(8333);
      expect(res.body.data.personPaidForYouMinor).toBe(0);
      expect(res.body.data.netBalanceWithPersonMinor).toBe(8333); // Rohit owes Ketan ₹83.33
      expect(res.body.data.sharedExpenseCount).toBe(1);
    });

    test('POST /api/v1/expenses rejects invalid split sum in EXACT mode', async () => {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${ketanToken}`)
        .send({
          groupId: testGroupId,
          description: 'Invalid Split Expense',
          amountMinor: 20000, // ₹200.00
          paidByUserId: ketanId,
          splitMethod: 'EXACT',
          participants: [
            { userId: ketanId, amountMinor: 10000 },
            { userId: rohitId, amountMinor: 5000 }, // Total 15000 != 20000
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_SPLIT_SUM');
    });

    test('PATCH /api/v1/expenses/:expenseId updates expense and recalculates splits atomically', async () => {
      const res = await request(app)
        .patch(`/api/v1/expenses/${createdExpenseId}`)
        .set('Authorization', `Bearer ${ketanToken}`)
        .send({
          description: 'Special Dinner (Updated)',
          amountMinor: 30000, // Updated to ₹300.00
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Special Dinner (Updated)');
      expect(res.body.data.amountMinor).toBe(30000);
      expect(res.body.data.splits[0].amountMinor).toBe(10000); // 30000 / 3
    });
  });

  describe('4. Settlement Recording & Balance Reduction', () => {
    test('POST /api/v1/groups/:groupId/settlements records payment and reduces outstanding debt', async () => {
      // Rohit pays Ketan ₹100.00 (10000 minor)
      const res = await request(app)
        .post(`/api/v1/groups/${testGroupId}/settlements`)
        .set('Authorization', `Bearer ${rohitToken}`)
        .send({
          toUserId: ketanId,
          amountMinor: 10000,
          note: 'Repaying dinner share via UPI',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.amountMinor).toBe(10000);
      expect(res.body.data.fromUserId).toBe(rohitId);
      expect(res.body.data.toUserId).toBe(ketanId);

      // Verify Rohit's balance updated from -10000 to 0
      const balRes = await request(app)
        .get(`/api/v1/groups/${testGroupId}/balances`)
        .set('Authorization', `Bearer ${rohitToken}`);

      expect(balRes.status).toBe(200);
      expect(balRes.body.data.userNetBalanceMinor).toBe(0); // Net 0 after paying ₹100
    });

    test('POST /api/v1/groups/:groupId/settlements rejects self-settlement', async () => {
      const res = await request(app)
        .post(`/api/v1/groups/${testGroupId}/settlements`)
        .set('Authorization', `Bearer ${ketanToken}`)
        .send({
          toUserId: ketanId,
          amountMinor: 5000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SELF_SETTLEMENT_PROHIBITED');
    });
  });

  describe('5. Activity Feed & Dashboard Invariance Endpoints', () => {
    test('GET /api/v1/activity returns chronological transactions', async () => {
      const res = await request(app)
        .get('/api/v1/activity')
        .set('Authorization', `Bearer ${ketanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].timestamp).toBeDefined();
    });

    test('GET /api/v1/dashboard totalNetBalanceMinor strictly equals sum of group balances', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${ketanToken}`);

      expect(res.status).toBe(200);
      const dashboard = res.body.data;
      const computedSum = dashboard.groups.reduce(
        (acc: number, g: any) => acc + g.userNetBalanceMinor,
        0
      );

      expect(dashboard.totalNetBalanceMinor).toBe(computedSum);
    });
  });
});
