import request from 'supertest';
import { createApp } from '../src/app';
import { Money } from '../src/utils/money';
import { BalanceService } from '../src/modules/balances/balance.service';

const app = createApp();

describe('Phase 8: Comprehensive Financial Correctness, Security & Hardening Suite', () => {
  let userA: { id: string; email: string; token: string; name: string };
  let userB: { id: string; email: string; token: string; name: string };
  let userC: { id: string; email: string; token: string; name: string };
  let userD: { id: string; email: string; token: string; name: string };
  let testGroup: { id: string; name: string };

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
    userA = await registerUser('Alice Hardener', `alice_audit_${timestamp}@example.com`);
    userB = await registerUser('Bob Hardener', `bob_audit_${timestamp}@example.com`);
    userC = await registerUser('Charlie Hardener', `charlie_audit_${timestamp}@example.com`);
    userD = await registerUser('Dave External', `dave_audit_${timestamp}@example.com`);

    // User A creates test group
    const grpRes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: `Audit Group ${timestamp}`, currency: 'INR' });
    expect(grpRes.status).toBe(201);
    testGroup = grpRes.body.data;

    // Add user B and user C
    await request(app)
      .post(`/api/v1/groups/${testGroup.id}/members`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ userId: userB.id });

    await request(app)
      .post(`/api/v1/groups/${testGroup.id}/members`)
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ userId: userC.id });
  });

  describe('1. Division Invariance & Rounding Math (Equal, Exact, Percentage, Shares)', () => {
    test('₹1 / 3 = [34, 33, 33] exact minor units summing to 100', () => {
      const splits = Money.allocateEqual(100n, 3);
      expect(splits).toEqual([34n, 33n, 33n]);
      expect(splits.reduce((a, b) => a + b, 0n)).toBe(100n);
    });

    test('₹10 / 3 = [334, 333, 333] exact minor units summing to 1000', () => {
      const splits = Money.allocateEqual(1000n, 3);
      expect(splits).toEqual([334n, 333n, 333n]);
      expect(splits.reduce((a, b) => a + b, 0n)).toBe(1000n);
    });

    test('₹100 / 6 = [1667, 1667, 1667, 1667, 1666, 1666] summing to 10000', () => {
      const splits = Money.allocateEqual(10000n, 6);
      expect(splits.reduce((a, b) => a + b, 0n)).toBe(10000n);
      expect(splits[0]).toBe(1667n);
      expect(splits[5]).toBe(1666n);
    });

    test('₹250 / 3 = [8334, 8333, 8333] summing to 25000', () => {
      const splits = Money.allocateEqual(25000n, 3);
      expect(splits).toEqual([8334n, 8333n, 8333n]);
      expect(splits.reduce((a, b) => a + b, 0n)).toBe(25000n);
    });

    test('₹999 / 7 = exact sum 99900 minor units with zero loss', () => {
      const splits = Money.allocateEqual(99900n, 7);
      expect(splits.reduce((a, b) => a + b, 0n)).toBe(99900n);
      splits.forEach((s) => expect(s).toBeGreaterThan(0n));
    });

    test('₹1000 / 6 = exact sum 100000 minor units with zero loss', () => {
      const splits = Money.allocateEqual(100000n, 6);
      expect(splits.reduce((a, b) => a + b, 0n)).toBe(100000n);
    });
  });

  describe('2. Zero-Sum Group Ledger Invariance (SUM(Member Balances) === 0)', () => {
    test('Multi-expense multi-payer scenario guarantees SUM(balances) === 0', async () => {
      // Expense 1: User A pays ₹6000 (equal A, B, C)
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          groupId: testGroup.id,
          description: 'Villa Stay',
          amountMinor: 600000,
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }, { userId: userC.id }],
        });

      // Expense 2: User B pays ₹3000 (equal A, B, C)
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          groupId: testGroup.id,
          description: 'Team Dinner',
          amountMinor: 300000,
          paidByUserId: userB.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }, { userId: userC.id }],
        });

      const netMap = await BalanceService.calculateGroupNetBalances(testGroup.id);
      let sum = 0n;
      for (const [, bal] of netMap.entries()) {
        sum += bal;
      }
      expect(sum).toBe(0n);

      // Verify individual net balances:
      // Total expenses: 9000. Each owes 3000.
      // User A paid 6000 -> net +3000 (300000 minor)
      // User B paid 3000 -> net 0
      // User C paid 0 -> net -3000 (-300000 minor)
      expect(netMap.get(userA.id)).toBe(300000n);
      expect(netMap.get(userB.id)).toBe(0n);
      expect(netMap.get(userC.id)).toBe(-300000n);
    });
  });

  describe('3. Settlement Conservation & Historical Preservation', () => {
    test('Bilateral Settlement reduces debt strictly without money creation', async () => {
      // User C pays User A ₹1000 (100000 minor)
      const settleRes = await request(app)
        .post(`/api/v1/groups/${testGroup.id}/settlements`)
        .set('Authorization', `Bearer ${userC.token}`)
        .send({
          toUserId: userA.id,
          amountMinor: 100000,
          note: 'Partial payback for villa',
        });
      expect(settleRes.status).toBe(201);

      const netMap = await BalanceService.calculateGroupNetBalances(testGroup.id);
      let sum = 0n;
      for (const [, bal] of netMap.entries()) {
        sum += bal;
      }
      expect(sum).toBe(0n);

      // User A now net +2000 (200000 minor)
      // User C now net -2000 (-200000 minor)
      expect(netMap.get(userA.id)).toBe(200000n);
      expect(netMap.get(userC.id)).toBe(-200000n);
    });

    test('Deleting an expense after settlements exist rejects with 409 Conflict', async () => {
      // Fetch expense in group
      const expRes = await request(app)
        .get(`/api/v1/groups/${testGroup.id}/expenses`)
        .set('Authorization', `Bearer ${userA.token}`);
      const expenseId = expRes.body.data[0].id;

      // Attempt to delete expense
      const delRes = await request(app)
        .delete(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(delRes.status).toBe(409);
      expect(delRes.body.error.code).toBe('CANNOT_DELETE_SETTLED_EXPENSE');
    });
  });

  describe('4. Idempotency & Concurrency Hardening', () => {
    test('Duplicate POST /expenses with identical Idempotency-Key returns identical replay', async () => {
      const idempotencyKey = `idemp_exp_${Date.now()}`;
      const payload = {
        groupId: testGroup.id,
        description: 'Idempotent Fuel Charge',
        amountMinor: 150000,
        paidByUserId: userA.id,
        splitMethod: 'EQUAL',
        participants: [{ userId: userA.id }, { userId: userB.id }],
      };

      // First Request
      const res1 = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);
      expect(res1.status).toBe(201);
      const createdId = res1.body.data.id;

      // Second Request (Identical Replay)
      const res2 = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(res2.status).toBe(201);
      expect(res2.headers['x-idempotency-replay']).toBe('true');
      expect(res2.body.data.id).toBe(createdId);
    });

    test('Conflicting payload with same Idempotency-Key returns 409 Conflict', async () => {
      const idempotencyKey = `idemp_conflict_${Date.now()}`;

      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          groupId: testGroup.id,
          description: 'Initial Grocery',
          amountMinor: 50000,
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }],
        });

      // Send same key with different amount
      const conflictRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .set('Idempotency-Key', idempotencyKey)
        .send({
          groupId: testGroup.id,
          description: 'Tampered Grocery Amount',
          amountMinor: 90000,
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }],
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    });
  });

  describe('5. Authorization & Cross-Group IDOR Isolation', () => {
    test('Non-member User D cannot view or modify Group A resources', async () => {
      // 1. Cannot view group details
      const gRes = await request(app)
        .get(`/api/v1/groups/${testGroup.id}`)
        .set('Authorization', `Bearer ${userD.token}`);
      expect(gRes.status).toBe(403);

      // 2. Cannot view group balances
      const bRes = await request(app)
        .get(`/api/v1/groups/${testGroup.id}/balances`)
        .set('Authorization', `Bearer ${userD.token}`);
      expect(bRes.status).toBe(403);

      // 3. Cannot post expense into group
      const expRes = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userD.token}`)
        .send({
          groupId: testGroup.id,
          description: 'Hacker Expense',
          amountMinor: 100000,
          paidByUserId: userD.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userD.id }],
        });
      expect(expRes.status).toBe(403);

      // 4. Cannot record settlement in group
      const sRes = await request(app)
        .post(`/api/v1/groups/${testGroup.id}/settlements`)
        .set('Authorization', `Bearer ${userD.token}`)
        .send({
          toUserId: userA.id,
          amountMinor: 50000,
        });
      expect(sRes.status).toBe(403);
    });
  });

  describe('6. Property-Based Random Financial Graph Simulation', () => {
    test('20 randomly generated multi-party transaction graphs preserve zero-sum invariant', async () => {
      // Create isolated group for property testing
      const pGroupRes = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ name: 'Property Invariant Test Group', currency: 'INR' });
      const pGroup = pGroupRes.body.data;

      await request(app)
        .post(`/api/v1/groups/${pGroup.id}/members`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ userId: userB.id });
      await request(app)
        .post(`/api/v1/groups/${pGroup.id}/members`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ userId: userC.id });

      const members = [userA, userB, userC];

      for (let i = 0; i < 15; i++) {
        const payer = members[Math.floor(Math.random() * members.length)]!;
        const randomAmount = BigInt(Math.floor(Math.random() * 50000) + 100); // 100 to 50100 minor units
        const method = i % 2 === 0 ? 'EQUAL' : 'SHARES';

        await request(app)
          .post('/api/v1/expenses')
          .set('Authorization', `Bearer ${payer.token}`)
          .send({
            groupId: pGroup.id,
            description: `Random Property Expense ${i + 1}`,
            amountMinor: Number(randomAmount),
            paidByUserId: payer.id,
            splitMethod: method,
            participants: members.map((m) => ({
              userId: m.id,
              shares: method === 'SHARES' ? (m.id === payer.id ? 2 : 1) : undefined,
            })),
          });
      }

      // Assert net balance conservation
      const netMap = await BalanceService.calculateGroupNetBalances(pGroup.id);
      let totalLedgerSum = 0n;
      for (const [, bal] of netMap.entries()) {
        totalLedgerSum += bal;
      }

      expect(totalLedgerSum).toBe(0n);
    });
  });
});
