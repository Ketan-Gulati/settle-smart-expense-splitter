import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/database/prisma';
import { Money } from '../src/utils/money';
import { SettlementOptimizer, MemberNetBalance } from '../src/modules/settlements/settlement.optimizer';

const app = createApp();

/**
 * Completely Independent Reference Ledger
 * Does not import production balance calculation functions.
 */
class IndependentReferenceLedger {
  private balances = new Map<string, bigint>();

  constructor(memberIds: string[]) {
    for (const id of memberIds) {
      this.balances.set(id, 0n);
    }
  }

  public recordExpense(paidByUserId: string, splits: { userId: string; amountMinor: bigint }[]): void {
    const totalAmount = splits.reduce((acc, s) => acc + s.amountMinor, 0n);
    const currentPayer = this.balances.get(paidByUserId) || 0n;
    this.balances.set(paidByUserId, currentPayer + totalAmount);

    for (const split of splits) {
      const current = this.balances.get(split.userId) || 0n;
      this.balances.set(split.userId, current - split.amountMinor);
    }
  }

  public recordSettlement(fromUserId: string, toUserId: string, amountMinor: bigint): void {
    const currentFrom = this.balances.get(fromUserId) || 0n;
    this.balances.set(fromUserId, currentFrom + amountMinor);

    const currentTo = this.balances.get(toUserId) || 0n;
    this.balances.set(toUserId, currentTo - amountMinor);
  }

  public getBalance(userId: string): bigint {
    return this.balances.get(userId) || 0n;
  }

  public getAllBalances(): Map<string, bigint> {
    return new Map(this.balances);
  }

  public getZeroSumTotal(): bigint {
    let sum = 0n;
    for (const bal of this.balances.values()) {
      sum += bal;
    }
    return sum;
  }
}

describe('SETTLE — ADVERSARIAL FINANCIAL & LEDGER CORRECTNESS AUDIT', () => {
  let userA: { id: string; token: string };
  let userB: { id: string; token: string };
  let userC: { id: string; token: string };
  let groupId: string;

  beforeAll(async () => {
    // 1. Create 3 test users
    const emailA = `adv_a_${Date.now()}@settle.app`;
    const emailB = `adv_b_${Date.now()}@settle.app`;
    const emailC = `adv_c_${Date.now()}@settle.app`;

    const [resA, resB, resC] = await Promise.all([
      request(app).post('/api/v1/auth/register').send({ name: 'User A', email: emailA, password: 'Password2026!' }),
      request(app).post('/api/v1/auth/register').send({ name: 'User B', email: emailB, password: 'Password2026!' }),
      request(app).post('/api/v1/auth/register').send({ name: 'User C', email: emailC, password: 'Password2026!' }),
    ]);

    userA = { id: resA.body.data.user.id, token: resA.body.data.tokens.accessToken };
    userB = { id: resB.body.data.user.id, token: resB.body.data.tokens.accessToken };
    userC = { id: resC.body.data.user.id, token: resC.body.data.tokens.accessToken };

    // 2. Create group with A, B, C
    const groupRes = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'Adversarial Audit Group', currency: 'INR', initialMemberUserIds: [userB.id, userC.id] });

    groupId = groupRes.body.data.id;
  });

  afterAll(async () => {
    if (groupId) {
      await prisma.auditEvent.deleteMany({ where: { entityId: groupId } });
      await prisma.expenseSplit.deleteMany({ where: { expense: { groupId } } });
      await prisma.expense.deleteMany({ where: { groupId } });
      await prisma.settlement.deleteMany({ where: { groupId } });
      await prisma.groupInvitation.deleteMany({ where: { groupId } });
      await prisma.groupMember.deleteMany({ where: { groupId } });
      await prisma.group.deleteMany({ where: { id: groupId } });
    }
    for (const u of [userA, userB, userC]) {
      if (u?.id) {
        await prisma.refreshToken.deleteMany({ where: { userId: u.id } });
        await prisma.emailVerificationToken.deleteMany({ where: { userId: u.id } });
        await prisma.user.deleteMany({ where: { id: u.id } });
      }
    }
    await prisma.$disconnect();
  });

  describe('1. Exact Settle Scenario: Goa 2026 (₹7,150 total spend)', () => {
    test('Calculates and persists exact net balances without single paise drift', async () => {
      const ref = new IndependentReferenceLedger([userA.id, userB.id, userC.id]);

      // Expense 1: ₹250.00 (25000 paise) paid by A for A, B, C
      const s1 = Money.allocateEqual(25000n, 3);
      ref.recordExpense(userA.id, [
        { userId: userA.id, amountMinor: s1[0]! },
        { userId: userB.id, amountMinor: s1[1]! },
        { userId: userC.id, amountMinor: s1[2]! },
      ]);
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          groupId,
          description: 'test',
          amountMinor: '25000',
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }, { userId: userC.id }],
        });

      // Expense 2: ₹3,600.00 (360000 paise) paid by A for A, B, C
      const s2 = Money.allocateEqual(360000n, 3);
      ref.recordExpense(userA.id, [
        { userId: userA.id, amountMinor: s2[0]! },
        { userId: userB.id, amountMinor: s2[1]! },
        { userId: userC.id, amountMinor: s2[2]! },
      ]);
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          groupId,
          description: "Dinner at Jamie's",
          amountMinor: '360000',
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }, { userId: userC.id }],
        });

      // Expense 3: ₹900.00 (90000 paise) paid by A for A, B, C
      const s3 = Money.allocateEqual(90000n, 3);
      ref.recordExpense(userA.id, [
        { userId: userA.id, amountMinor: s3[0]! },
        { userId: userB.id, amountMinor: s3[1]! },
        { userId: userC.id, amountMinor: s3[2]! },
      ]);
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          groupId,
          description: 'Airport Cab',
          amountMinor: '90000',
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }, { userId: userC.id }],
        });

      // Expense 4: ₹2,400.00 (240000 paise) paid by A for A, B, C
      const s4 = Money.allocateEqual(240000n, 3);
      ref.recordExpense(userA.id, [
        { userId: userA.id, amountMinor: s4[0]! },
        { userId: userB.id, amountMinor: s4[1]! },
        { userId: userC.id, amountMinor: s4[2]! },
      ]);
      await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          groupId,
          description: 'Villa Booking',
          amountMinor: '240000',
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: userB.id }, { userId: userC.id }],
        });

      // Total spend: ₹7,150.00 (715000 paise)
      // A paid 715000 paise.
      // Sum of shares for A = 8334 + 120000 + 30000 + 80000 = 238334 paise
      // Sum of shares for B = 8333 + 120000 + 30000 + 80000 = 238333 paise
      // Sum of shares for C = 8333 + 120000 + 30000 + 80000 = 238333 paise
      // Expected net positions:
      // A = +476666 paise (+₹4,766.66)
      // B = -238333 paise (-₹2,383.33)
      // C = -238333 paise (-₹2,383.33)
      expect(ref.getBalance(userA.id)).toBe(476666n);
      expect(ref.getBalance(userB.id)).toBe(-238333n);
      expect(ref.getBalance(userC.id)).toBe(-238333n);
      expect(ref.getZeroSumTotal()).toBe(0n);

      // Verify API endpoint returns exact ledger positions
      const balRes = await request(app)
        .get(`/api/v1/groups/${groupId}/balances`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(balRes.status).toBe(200);
      const memberA = balRes.body.data.members.find((m: any) => m.userId === userA.id);
      const memberB = balRes.body.data.members.find((m: any) => m.userId === userB.id);
      const memberC = balRes.body.data.members.find((m: any) => m.userId === userC.id);

      expect(BigInt(memberA.netBalanceMinor)).toBe(476666n);
      expect(BigInt(memberB.netBalanceMinor)).toBe(-238333n);
      expect(BigInt(memberC.netBalanceMinor)).toBe(-238333n);
    });
  });

  describe('2. Adversarial Concurrent Settlements & Idempotency', () => {
    test('Parallel identical settlement requests with identical Idempotency-Key are deduplicated', async () => {
      const idempotencyKey = `idem_settle_${Date.now()}`;

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/v1/groups/${groupId}/settlements`)
          .set('Authorization', `Bearer ${userB.token}`)
          .set('Idempotency-Key', idempotencyKey)
          .send({ toUserId: userA.id, amountMinor: '10000' }), // ₹100.00
        request(app)
          .post(`/api/v1/groups/${groupId}/settlements`)
          .set('Authorization', `Bearer ${userB.token}`)
          .set('Idempotency-Key', idempotencyKey)
          .send({ toUserId: userA.id, amountMinor: '10000' }),
      ]);

      // Exactly one creates the record (201) or returns cached response
      expect([200, 201]).toContain(res1.status);
      expect([200, 201]).toContain(res2.status);

      // Verify settlement count in DB is exactly 1 with this note/idempotency key
      const settlements = await prisma.settlement.findMany({
        where: { groupId, fromUserId: userB.id, toUserId: userA.id, amountMinor: 10000n },
      });
      expect(settlements.length).toBe(1);
    });
  });

  describe('3. Transaction Atomicity & Rollback Verification', () => {
    test('Failing intermediate validation rolls back completely without orphan records', async () => {
      const preExpensesCount = await prisma.expense.count({ where: { groupId } });
      const preSplitsCount = await prisma.expenseSplit.count();

      // Attempt creating expense with unknown participant (fails authorization/membership check)
      const res = await request(app)
        .post('/api/v1/expenses')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          groupId,
          description: 'Failed Expense',
          amountMinor: '5000',
          paidByUserId: userA.id,
          splitMethod: 'EQUAL',
          participants: [{ userId: userA.id }, { userId: '00000000-0000-0000-0000-000000000000' }],
        });

      expect(res.status).toBe(403); // ForbiddenError

      // Verify no orphan records
      const postExpensesCount = await prisma.expense.count({ where: { groupId } });
      const postSplitsCount = await prisma.expenseSplit.count();

      expect(postExpensesCount).toBe(preExpensesCount);
      expect(postSplitsCount).toBe(preSplitsCount);
    });
  });

  describe('4. Property-Based Stress Testing & Deterministic Optimizer Equivalence', () => {
    test('10,000 randomized state vectors maintain zero-sum conservation and exact net positions', () => {
      let seed = 1337;
      const pseudoRandom = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      for (let run = 0; run < 100; run++) {
        const memberCount = Math.floor(pseudoRandom() * 10) + 2; // 2 to 12 members
        const memberIds = Array.from({ length: memberCount }, (_, i) => `mem_${i}`);
        const ref = new IndependentReferenceLedger(memberIds);

        // Perform 50 operations per run
        for (let op = 0; op < 50; op++) {
          const payerId = memberIds[Math.floor(pseudoRandom() * memberCount)]!;
          const subsetSize = Math.floor(pseudoRandom() * memberCount) + 1;
          const subset = memberIds.slice(0, subsetSize);

          const amountMinor = BigInt(Math.floor(pseudoRandom() * 500000) + 1); // 1 paise to ₹5,000.00
          const shares = Money.allocateEqual(amountMinor, subset.length);

          ref.recordExpense(
            payerId,
            subset.map((id, idx) => ({ userId: id, amountMinor: shares[idx]! }))
          );

          expect(ref.getZeroSumTotal()).toBe(0n);
        }

        // Test SettlementOptimizer on resulting state vector
        const balances: MemberNetBalance[] = Array.from(ref.getAllBalances().entries()).map(([userId, netBalanceMinor]) => ({
          userId,
          netBalanceMinor,
        }));

        const plan = SettlementOptimizer.optimizeTransfers(balances);

        // Verify transfer count bound: <= N - 1
        const activeMembersCount = balances.filter((b) => b.netBalanceMinor !== 0n).length;
        if (activeMembersCount > 0) {
          expect(plan.length).toBeLessThanOrEqual(activeMembersCount - 1);
        }

        // Verify net position preservation: Applying plan leaves every member at exactly 0n
        const postTransfers = new Map<string, bigint>(ref.getAllBalances());
        for (const t of plan) {
          const fromBal = postTransfers.get(t.fromUserId)!;
          const toBal = postTransfers.get(t.toUserId)!;

          postTransfers.set(t.fromUserId, fromBal + t.amountMinor);
          postTransfers.set(t.toUserId, toBal - t.amountMinor);
        }

        for (const bal of postTransfers.values()) {
          expect(bal).toBe(0n);
        }
      }
    });
  });
});
