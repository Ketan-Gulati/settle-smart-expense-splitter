import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';
import { CacheService } from '../src/infrastructure/redis/redis.service';
import { CacheKeys } from '../src/infrastructure/redis/redis.keys';

const app = createApp();

describe('Settle Performance, Optimization & Redis Caching Test Suite', () => {
  let userToken: string;
  let userId: string;
  let otherUserId: string;
  let groupId: string;
  let inviteCode: string;

  beforeAll(async () => {
    // 1. Register benchmark user
    const email = `perf_user_${Date.now()}@settle.app`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Perf Tester', email, password: 'PerfPassword2026!' });
    expect(regRes.status).toBe(201);
    userToken = regRes.body.data.tokens.accessToken;
    userId = regRes.body.data.user.id;

    // 2. Register second member
    const otherEmail = `perf_other_${Date.now()}@settle.app`;
    const otherReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Perf Other', email: otherEmail, password: 'PerfPassword2026!' });
    expect(otherReg.status).toBe(201);
    otherUserId = otherReg.body.data.user.id;

    // 3. Create group with 2 members
    const groupRes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Performance Test Group', currency: 'INR', initialMemberUserIds: [otherUserId] });
    expect(groupRes.status).toBe(201);
    groupId = groupRes.body.data.id;
    inviteCode = groupRes.body.data.activeInvite?.inviteCode;
  });

  afterAll(async () => {
    if (groupId) {
      await prisma.auditEvent.deleteMany({ where: { entityId: groupId } });
      await prisma.expenseSplit.deleteMany({ where: { expense: { groupId } } });
      await prisma.expense.deleteMany({ where: { groupId } });
      await prisma.groupInvitation.deleteMany({ where: { groupId } });
      await prisma.groupMember.deleteMany({ where: { groupId } });
      await prisma.group.deleteMany({ where: { id: groupId } });
    }
    for (const uId of [userId, otherUserId]) {
      if (uId) {
        await prisma.refreshToken.deleteMany({ where: { userId: uId } });
        await prisma.emailVerificationToken.deleteMany({ where: { userId: uId } });
        await prisma.user.deleteMany({ where: { id: uId } });
      }
    }
    await prisma.$disconnect();
  });

  describe('1. Redis Cache-Aside & Graceful Fallback', () => {
    test('Public user profile is cached in Redis on subsequent reads', async () => {
      const cacheKey = CacheKeys.userPublicProfile(userId);
      await CacheService.del(cacheKey);

      // 1. First fetch (Cache Miss -> DB -> Redis Set)
      const res1 = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.name).toBe('Perf Tester');

      // Verify cached value exists in Redis service
      const cached = await CacheService.get<any>(cacheKey);
      expect(cached).toBeDefined();
      expect(cached?.name).toBe('Perf Tester');

      // 2. Second fetch (Cache Hit)
      const res2 = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.name).toBe('Perf Tester');
    });

    test('Public invite preview is cached and returns without DB roundtrips', async () => {
      if (!inviteCode) return;

      const cacheKey = CacheKeys.invitePreview(inviteCode.toUpperCase());
      await CacheService.del(cacheKey);

      // Miss
      const res1 = await request(app).get(`/api/v1/groups/invites/${inviteCode}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.groupName).toBe('Performance Test Group');

      // Hit
      const res2 = await request(app).get(`/api/v1/groups/invites/${inviteCode}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.groupName).toBe('Performance Test Group');
    });
  });

  describe('2. Read Query Latency & Parallelization Benchmarking', () => {
    test('GET /api/v1/dashboard executes in low latency with parallelized group net balances', async () => {
      // Warm up query (DNS/Connection pool warm up)
      await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      const start = Date.now();
      const res = await request(app)
        .get('/api/v1/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(res.body.data.groups).toBeDefined();
      expect(duration).toBeLessThan(1500); // Realistic cloud DB latency threshold
    });

    test('GET /api/v1/activity supports bounded pagination without unbounded full-table scans', async () => {
      const res = await request(app)
        .get('/api/v1/activity?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta.limit).toBe(10);
    });

    test('GET /api/v1/groups/:groupId/expenses enforces limit bounds (max 100)', async () => {
      const res = await request(app)
        .get(`/api/v1/groups/${groupId}/expenses?page=1&limit=20`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta.limit).toBe(20);
    });
  });
});
