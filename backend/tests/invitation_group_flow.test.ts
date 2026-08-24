import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Group Creation + Member Invitation & Join Flow Test Suite', () => {
  let userKetan: { id: string; email: string; token: string; name: string };
  let userRohit: { id: string; email: string; token: string; name: string };
  let userRaj: { id: string; email: string; token: string; name: string };
  let userDave: { id: string; email: string; token: string; name: string };

  const registerUser = async (name: string, email: string) => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name, email, password: 'SecurePassword123!' });
    expect(res.status).toBe(201);
    return {
      id: res.body.data.user.id,
      email: res.body.data.user.email,
      name: res.body.data.user.name,
      token: res.body.data.tokens.accessToken,
    };
  };

  beforeAll(async () => {
    const timestamp = Date.now();
    userKetan = await registerUser('Ketan Flow', `ketan_flow_${timestamp}@settle.app`);
    userRohit = await registerUser('Rohit Flow', `rohit_flow_${timestamp}@settle.app`);
    userRaj = await registerUser('Raj Flow', `raj_flow_${timestamp}@settle.app`);
    userDave = await registerUser('Dave Flow', `dave_flow_${timestamp}@settle.app`);
  });

  describe('1. User Search API', () => {
    test('GET /api/v1/users/search finds users by substring and excludes requester', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=Rohit')
        .set('Authorization', `Bearer ${userKetan.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((u: any) => u.id === userRohit.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Rohit Flow');

      // Ensure requester is not in results
      const selfFound = res.body.data.find((u: any) => u.id === userKetan.id);
      expect(selfFound).toBeUndefined();
    });

    test('GET /api/v1/users/search returns empty list for queries < 2 chars', async () => {
      const res = await request(app)
        .get('/api/v1/users/search?q=a')
        .set('Authorization', `Bearer ${userKetan.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('2. Multi-Step Group Creation with Initial Members & GroupType', () => {
    let createdGroupId: string;
    let generatedInviteCode: string;

    test('POST /api/v1/groups creates group with groupType, creator, initial members, and invite code atomically', async () => {
      const res = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({
          name: 'Goa Trip 2026',
          groupType: 'TRIP',
          currency: 'INR',
          initialMemberUserIds: [userRohit.id, userRaj.id],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Goa Trip 2026');
      expect(res.body.data.groupType).toBe('TRIP');
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.memberCount).toBe(3);
      expect(res.body.data.activeInvite).toBeDefined();
      expect(res.body.data.activeInvite.inviteCode).toHaveLength(6);

      createdGroupId = res.body.data.id;
      generatedInviteCode = res.body.data.activeInvite.inviteCode;

      // Verify members
      const memberUserIds = res.body.data.members.map((m: any) => m.userId);
      expect(memberUserIds).toContain(userKetan.id);
      expect(memberUserIds).toContain(userRohit.id);
      expect(memberUserIds).toContain(userRaj.id);
    });

    test('Creator-only group creation creates a 1-member group with valid invite code', async () => {
      const res = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({
          name: 'Solo Startup Expenses',
          groupType: 'OTHER',
          currency: 'INR',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.memberCount).toBe(1);
      expect(res.body.data.activeInvite).toBeDefined();
      expect(res.body.data.activeInvite.inviteCode).toBeDefined();
    });

    test('GET /api/v1/groups/invites/:codeOrToken previews group without exposing financial data', async () => {
      // Unauthenticated preview
      const previewRes = await request(app).get(`/api/v1/groups/invites/${generatedInviteCode}`);

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.groupName).toBe('Goa Trip 2026');
      expect(previewRes.body.data.groupType).toBe('TRIP');
      expect(previewRes.body.data.createdByName).toBe('Ketan Flow');
      expect(previewRes.body.data.memberCount).toBe(3);
      expect(previewRes.body.data.members.length).toBe(3);
      // Zero financial balances or expense records exposed in public preview
      expect(previewRes.body.data.expenses).toBeUndefined();
      expect(previewRes.body.data.balances).toBeUndefined();
    });

    test('POST /api/v1/groups/invites/:codeOrToken/join allows User Dave to join group atomically', async () => {
      const joinRes = await request(app)
        .post(`/api/v1/groups/invites/${generatedInviteCode}/join`)
        .set('Authorization', `Bearer ${userDave.token}`)
        .send({});

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.data.id).toBe(createdGroupId);
      expect(joinRes.body.data.memberCount).toBe(4);

      const memberIds = joinRes.body.data.members.map((m: any) => m.userId);
      expect(memberIds).toContain(userDave.id);
    });

    test('Rejoining with same invite returns group details idempotently without duplicate membership', async () => {
      const secondJoinRes = await request(app)
        .post(`/api/v1/groups/invites/${generatedInviteCode}/join`)
        .set('Authorization', `Bearer ${userDave.token}`)
        .send({});

      expect(secondJoinRes.status).toBe(200);
      expect(secondJoinRes.body.data.memberCount).toBe(4);
    });

    test('POST /api/v1/groups/:groupId/invites creates a fresh invite and revokes previous invite', async () => {
      const newInviteRes = await request(app)
        .post(`/api/v1/groups/${createdGroupId}/invites`)
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({});

      expect(newInviteRes.status).toBe(201);
      expect(newInviteRes.body.data.inviteCode).toBeDefined();
      expect(newInviteRes.body.data.inviteLink).toContain('/invite/');

      const freshInviteCode = newInviteRes.body.data.inviteCode;

      // Old invite code must now be rejected as revoked
      const oldPreviewRes = await request(app).get(`/api/v1/groups/invites/${generatedInviteCode}`);
      expect(oldPreviewRes.status).toBe(400);
      expect(oldPreviewRes.body.error.code).toBe('INVITE_REVOKED');

      // Fresh invite code works
      const freshPreviewRes = await request(app).get(`/api/v1/groups/invites/${freshInviteCode}`);
      expect(freshPreviewRes.status).toBe(200);
      expect(freshPreviewRes.body.data.groupName).toBe('Goa Trip 2026');
    });

    test('DELETE /api/v1/groups/:groupId/invites/:inviteId revokes invitation', async () => {
      const inviteRes = await request(app)
        .post(`/api/v1/groups/${createdGroupId}/invites`)
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({});

      const inviteId = inviteRes.body.data.id;
      const inviteCode = inviteRes.body.data.inviteCode;

      const deleteRes = await request(app)
        .delete(`/api/v1/groups/${createdGroupId}/invites/${inviteId}`)
        .set('Authorization', `Bearer ${userKetan.token}`);

      expect(deleteRes.status).toBe(200);

      const previewRes = await request(app).get(`/api/v1/groups/invites/${inviteCode}`);
      expect(previewRes.status).toBe(400);
      expect(previewRes.body.error.code).toBe('INVITE_REVOKED');
    });

    test('Attempting to join with invalid/non-existent code returns 404', async () => {
      const invalidRes = await request(app)
        .post('/api/v1/groups/invites/INVALID99/join')
        .set('Authorization', `Bearer ${userDave.token}`)
        .send({});

      expect(invalidRes.status).toBe(404);
    });
  });

  describe('3. Financial Protection on Member Removal', () => {

    test('Removing member with 0 balance succeeds', async () => {
      const gRes = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({
          name: 'Clean Removal Group',
          groupType: 'APARTMENT',
        });
      const cleanGroupId = gRes.body.data.id;

      // Add Dave with 0 balance
      const addRes = await request(app)
        .post(`/api/v1/groups/${cleanGroupId}/members`)
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({ userId: userDave.id });
      expect(addRes.status).toBe(201);

      // Remove Dave
      const delRes = await request(app)
        .delete(`/api/v1/groups/${cleanGroupId}/members/${userDave.id}`)
        .set('Authorization', `Bearer ${userKetan.token}`);

      expect(delRes.status).toBe(200);
    });

    test('Removing member with unsettled balance fails with 409 Conflict', async () => {
      const gRes = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({
          name: 'Unsettled Removal Group',
          groupType: 'APARTMENT',
          initialMemberUserIds: [userRohit.id],
        });
      const unGroupId = gRes.body.data.id;

      // Create expense where Rohit owes money
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userKetan.token}`)
        .send({
          groupId: unGroupId,
          description: 'Electricity Bill',
          amountMinor: 20000,
          paidByUserId: userKetan.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userKetan.id }, { userId: userRohit.id }],
        });

      // Attempt to remove Rohit who owes ₹100
      const delRes = await request(app)
        .delete(`/api/v1/groups/${unGroupId}/members/${userRohit.id}`)
        .set('Authorization', `Bearer ${userKetan.token}`);

      expect(delRes.status).toBe(409);
      expect(delRes.body.error.code).toBe('MEMBER_HAS_UNSETTLED_BALANCE');
    });
  });
});
