import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';

const app = createApp();

describe('Settle Security & User Data Isolation Test Suite', () => {
  let userAToken: string;
  let userBToken: string;
  let userCToken: string; // Attacker / Stranger

  let userAId: string;
  let userBId: string;
  let userCId: string;

  let groupAId: string; // User A (Owner) & User B (Member)
  let groupBId: string; // User B only

  let expenseAId: string; // Belongs to groupA
  let settlementAId: string; // Belongs to groupA
  let inviteCodeA: string; // Invite for groupA

  beforeAll(async () => {
    // 1. Create and Authenticate User A
    const userAEmail = `sec_user_a_${Date.now()}@settle.app`;
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Alice Security', email: userAEmail, password: 'SecurePassword2026!' });
    expect(resA.status).toBe(201);
    userAToken = resA.body.data.tokens.accessToken;
    userAId = resA.body.data.user.id;

    // 2. Create and Authenticate User B
    const userBEmail = `sec_user_b_${Date.now()}@settle.app`;
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Bob Security', email: userBEmail, password: 'SecurePassword2026!' });
    expect(resB.status).toBe(201);
    userBToken = resB.body.data.tokens.accessToken;
    userBId = resB.body.data.user.id;

    // 3. Create and Authenticate User C (Attacker / Unrelated User)
    const userCEmail = `sec_user_c_${Date.now()}@settle.app`;
    const resC = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Charlie Attacker', email: userCEmail, password: 'SecurePassword2026!' });
    expect(resC.status).toBe(201);
    userCToken = resC.body.data.tokens.accessToken;
    userCId = resC.body.data.user.id;

    // 4. User A creates Group A and adds User B
    const groupARes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'Alice & Bob Secret Trip', currency: 'INR', initialMemberUserIds: [userBId] });
    expect(groupARes.status).toBe(201);
    groupAId = groupARes.body.data.id;
    inviteCodeA = groupARes.body.data.activeInvite?.inviteCode;

    // 5. User B creates Group B (User A and User C are NOT members)
    const groupBRes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: "Bob's Private Vault", currency: 'INR' });
    expect(groupBRes.status).toBe(201);
    groupBId = groupBRes.body.data.id;

    // 6. User A creates Expense in Group A
    const expRes = await request(app)
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        groupId: groupAId,
        description: 'Private Villa Booking',
        amountMinor: 10000,
        paidByUserId: userAId,
        splitMethod: 'EQUAL',
        participants: [{ userId: userAId }, { userId: userBId }],
      });
    expect(expRes.status).toBe(201);
    expenseAId = expRes.body.data.id;

    // 7. User B records a settlement in Group A
    const setRes = await request(app)
      .post(`/api/v1/groups/${groupAId}/settlements`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        toUserId: userAId,
        amountMinor: 5000,
        note: 'Villa half share',
      });
    expect(setRes.status).toBe(201);
    settlementAId = setRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (groupAId) {
      await prisma.auditEvent.deleteMany({ where: { entityId: { in: [groupAId, expenseAId, settlementAId] } } });
      await prisma.settlement.deleteMany({ where: { groupId: groupAId } });
      await prisma.expenseSplit.deleteMany({ where: { expenseId: expenseAId } });
      await prisma.expense.deleteMany({ where: { groupId: groupAId } });
      await prisma.groupInvitation.deleteMany({ where: { groupId: groupAId } });
      await prisma.groupMember.deleteMany({ where: { groupId: groupAId } });
      await prisma.group.deleteMany({ where: { id: groupAId } });
    }
    if (groupBId) {
      await prisma.groupMember.deleteMany({ where: { groupId: groupBId } });
      await prisma.group.deleteMany({ where: { id: groupBId } });
    }
    for (const uId of [userAId, userBId, userCId]) {
      if (uId) {
        await prisma.refreshToken.deleteMany({ where: { userId: uId } });
        await prisma.emailVerificationToken.deleteMany({ where: { userId: uId } });
        await prisma.user.deleteMany({ where: { id: uId } });
      }
    }
    await prisma.$disconnect();
  });

  describe('1. User Profile & Search Isolation (DTO Hardening)', () => {
    test('GET /api/v1/users/me returns authenticated user only without passwordHash or tokens', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(userAId);
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.tokenHash).toBeUndefined();
      expect(res.body.data.refreshTokenHash).toBeUndefined();
    });

    test('GET /api/v1/users/:id exposes only public profile (id, name, avatarUrl) and NO email/hashes', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(userBId);
      expect(res.body.data.name).toBe('Bob Security');
      expect(res.body.data.email).toBeUndefined(); // Email is private
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    test('GET /api/v1/users/search returns only public identity fields without email leaks', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=Bob')
        .set('Authorization', `Bearer ${userCToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const bob = res.body.data.find((u: any) => u.id === userBId);
      expect(bob).toBeDefined();
      expect(bob.name).toBe('Bob Security');
      expect(bob.email).toBeUndefined();
      expect(bob.passwordHash).toBeUndefined();
    });
  });

  describe('2. Group Data Isolation & IDOR Protection', () => {
    test('GET /api/v1/groups returns only groups where the user has active membership', async () => {
      // User C is in no groups
      const resC = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(200);
      expect(resC.body.data.length).toBe(0);

      // User A is in Group A only
      const resA = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.length).toBe(1);
      expect(resA.body.data[0].id).toBe(groupAId);
    });

    test('GET /api/v1/groups/:id rejects non-member with 403 GROUP_ACCESS_DENIED', async () => {
      // User C attempts IDOR access to Group A
      const resC = await request(app)
        .get(`/api/v1/groups/${groupAId}`)
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
      expect(resC.body.data).toBeUndefined();
    });

    test('GET /api/v1/groups/:id/members rejects non-member with 403', async () => {
      const resC = await request(app)
        .get(`/api/v1/groups/${groupAId}/members`)
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });
  });

  describe('3. Expense Authorization & Mutation Isolation', () => {
    test('GET /api/v1/expenses/:id rejects non-member with 403', async () => {
      const resC = await request(app)
        .get(`/api/v1/expenses/${expenseAId}`)
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });

    test('POST /api/v1/expenses prevents non-member from creating an expense in another group', async () => {
      const resC = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userCToken}`)
        .send({
          groupId: groupAId,
          description: 'Hacked Dinner',
          amountMinor: 5000,
          paidByUserId: userCId,
          splitMethod: 'EQUAL',
          participants: [{ userId: userAId }, { userId: userBId }],
        });

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });

    test('PATCH /api/v1/expenses/:id prevents non-member from modifying group expense', async () => {
      const resC = await request(app)
        .patch(`/api/v1/expenses/${expenseAId}`)
        .set('Authorization', `Bearer ${userCToken}`)
        .send({ description: 'Tampered Description' });

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });

    test('DELETE /api/v1/expenses/:id prevents non-member from deleting group expense', async () => {
      const resC = await request(app)
        .delete(`/api/v1/expenses/${expenseAId}`)
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });
  });

  describe('4. Balances, Settlements, and Activity Feed Scoping', () => {
    test('GET /api/v1/groups/:id/balances rejects non-member with 403', async () => {
      const resC = await request(app)
        .get(`/api/v1/groups/${groupAId}/balances`)
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });

    test('POST /api/v1/groups/:id/settlements prevents non-member from recording settlement', async () => {
      const resC = await request(app)
        .post(`/api/v1/groups/${groupAId}/settlements`)
        .set('Authorization', `Bearer ${userCToken}`)
        .send({
          toUserId: userAId,
          amountMinor: 5000,
        });

      expect(resC.status).toBe(403);
      expect(resC.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });

    test('GET /api/v1/activity only returns events from groups current user belongs to', async () => {
      // User C feed must be empty
      const resC = await request(app)
        .get('/api/v1/activity')
        .set('Authorization', `Bearer ${userCToken}`);

      expect(resC.status).toBe(200);
      expect(resC.body.data.length).toBe(0);

      // User A feed must contain the Villa expense and settlement
      const resA = await request(app)
        .get('/api/v1/activity')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.length).toBeGreaterThan(0);
      const groupAEvents = resA.body.data.filter((e: any) => e.groupId === groupAId);
      expect(groupAEvents.length).toBe(2); // 1 expense + 1 settlement
    });
  });

  describe('5. Invitation Public vs Authorized Boundary', () => {
    test('GET /api/v1/groups/invites/:code exposes only preview metadata (no expenses or balances)', async () => {
      if (!inviteCodeA) return;

      // Unauthenticated request
      const res = await request(app).get(`/api/v1/groups/invites/${inviteCodeA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.groupName).toBe('Alice & Bob Secret Trip');
      expect(res.body.data.memberCount).toBe(2);
      expect(res.body.data.expenses).toBeUndefined(); // Crucial: No financial records
      expect(res.body.data.balances).toBeUndefined();
      expect(res.body.data.settlements).toBeUndefined();
    });
  });

  describe('6. Access Revocation on Member Removal', () => {
    test('User B is removed from Group A and immediately loses all data access', async () => {
      // 1. User A (Owner) removes User B
      const removeRes = await request(app)
        .delete(`/api/v1/groups/${groupAId}/members/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(removeRes.status).toBe(200);

      // 2. User B tries to access Group A details -> 403 Forbidden
      const groupRes = await request(app)
        .get(`/api/v1/groups/${groupAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(groupRes.status).toBe(403);
      expect(groupRes.body.error.code).toBe('GROUP_ACCESS_DENIED');

      // 3. User B tries to fetch Group A expenses -> 403 Forbidden
      const expRes = await request(app)
        .get(`/api/v1/groups/${groupAId}/expenses`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(expRes.status).toBe(403);
      expect(expRes.body.error.code).toBe('GROUP_ACCESS_DENIED');

      // 4. User B tries to fetch Group A balances -> 403 Forbidden
      const balRes = await request(app)
        .get(`/api/v1/groups/${groupAId}/balances`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(balRes.status).toBe(403);
      expect(balRes.body.error.code).toBe('GROUP_ACCESS_DENIED');
    });
  });
});
