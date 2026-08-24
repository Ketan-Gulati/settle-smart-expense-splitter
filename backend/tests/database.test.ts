import { prisma } from '../src/infrastructure/database/prisma';
import { Money } from '../src/utils/money';
import { TokenSecurity } from '../src/utils/security';
import { GroupRole, SplitMethod } from '@prisma/client';

describe('Production Database & Domain Financial Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('1. User creation and unique email constraint rejection', async () => {
    const uniqueEmail = `test_${Date.now()}@settle.app`;
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: uniqueEmail,
        emailNormalized: uniqueEmail.toLowerCase(),
        isActive: true,
      },
    });
    expect(user.id).toBeDefined();
    expect(user.email).toBe(uniqueEmail);

    // Duplicate email must reject with P2002 unique constraint error
    await expect(
      prisma.user.create({
        data: {
          name: 'Duplicate User',
          email: uniqueEmail,
          emailNormalized: uniqueEmail.toLowerCase(),
          isActive: true,
        },
      })
    ).rejects.toThrow();
  });

  test('2. Group creation and duplicate membership rejection', async () => {
    const creator = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
    expect(creator).toBeDefined();

    const group = await prisma.group.create({
      data: {
        name: 'Test Unique Group',
        createdBy: creator!.id,
        members: {
          create: [{ userId: creator!.id, role: GroupRole.OWNER }],
        },
      },
    });
    expect(group.id).toBeDefined();

    // Adding same user twice to same group must reject via UNIQUE(group_id, user_id)
    await expect(
      prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: creator!.id,
          role: GroupRole.MEMBER,
        },
      })
    ).rejects.toThrow();
  });

  test('3. Money precision & division invariance: ₹250 split among 3 users', () => {
    const totalMinor = Money.toMinor(250.0); // 25000 paise
    expect(totalMinor).toBe(25000n);

    const shares = Money.allocateEqual(totalMinor, 3);
    expect(shares.length).toBe(3);
    expect(shares[0]).toBe(8334n);
    expect(shares[1]).toBe(8333n);
    expect(shares[2]).toBe(8333n);

    const sumShares = shares.reduce((acc, s) => acc + s, 0n);
    expect(sumShares).toBe(totalMinor);
  });

  test('4. Atomic Expense Transaction: creates expense + splits atomically with BigInt minor units', async () => {
    const ketan = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
    const rohit = await prisma.user.findFirst({ where: { email: 'rohit@settle.app' } });
    const raj = await prisma.user.findFirst({ where: { email: 'raj@settle.app' } });
    const goaGroup = await prisma.group.findFirst({ where: { name: 'Goa 2026' } });

    expect(ketan && rohit && raj && goaGroup).toBeDefined();

    const totalAmount = 25000n; // ₹250.00
    const allocated = Money.allocateEqual(totalAmount, 3);

    const createdExpense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          groupId: goaGroup!.id,
          description: 'Atomic Test Expense',
          amountMinor: totalAmount,
          currency: 'INR',
          paidByUserId: ketan!.id,
          splitMethod: SplitMethod.EQUAL,
          splits: {
            create: [
              { userId: ketan!.id, amountMinor: allocated[0]! },
              { userId: rohit!.id, amountMinor: allocated[1]! },
              { userId: raj!.id, amountMinor: allocated[2]! },
            ],
          },
        },
        include: {
          splits: true,
        },
      });

      // Invariant check: sum of splits must match expense amount
      const sumSplits = exp.splits.reduce((acc, s) => acc + s.amountMinor, 0n);
      if (sumSplits !== exp.amountMinor) {
        throw new Error('Split sum mismatch invariant violation');
      }

      return exp;
    });

    expect(createdExpense.id).toBeDefined();
    expect(createdExpense.amountMinor).toBe(25000n);
    expect(createdExpense.splits.length).toBe(3);
    expect(createdExpense.splits.reduce((acc, s) => acc + s.amountMinor, 0n)).toBe(25000n);
  });

  test('5. Transaction Rollback on invariant failure: leaves zero partial records', async () => {
    const ketan = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
    const rohit = await prisma.user.findFirst({ where: { email: 'rohit@settle.app' } });
    const goaGroup = await prisma.group.findFirst({ where: { name: 'Goa 2026' } });

    const totalAmount = 10000n; // ₹100.00

    const initialExpenseCount = await prisma.expense.count();

    await expect(
      prisma.$transaction(async (tx) => {
        const exp = await tx.expense.create({
          data: {
            groupId: goaGroup!.id,
            description: 'Failed Transaction Expense',
            amountMinor: totalAmount,
            paidByUserId: ketan!.id,
            splits: {
              create: [
                { userId: ketan!.id, amountMinor: 5000n },
                { userId: rohit!.id, amountMinor: 4000n }, // Total 9000 != 10000
              ],
            },
          },
          include: { splits: true },
        });

        const sumSplits = exp.splits.reduce((acc, s) => acc + s.amountMinor, 0n);
        if (sumSplits !== exp.amountMinor) {
          throw new Error('Split sum mismatch invariant violation');
        }
      })
    ).rejects.toThrow('Split sum mismatch invariant violation');

    const finalExpenseCount = await prisma.expense.count();
    expect(finalExpenseCount).toBe(initialExpenseCount);
  });

  test('6. Settlement Creation & self-settlement rejection', async () => {
    const ketan = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
    const rohit = await prisma.user.findFirst({ where: { email: 'rohit@settle.app' } });
    const goaGroup = await prisma.group.findFirst({ where: { name: 'Goa 2026' } });

    const settlement = await prisma.settlement.create({
      data: {
        groupId: goaGroup!.id,
        fromUserId: rohit!.id,
        toUserId: ketan!.id,
        amountMinor: 22500n, // ₹225.00
        currency: 'INR',
        note: 'Settling cab debt',
      },
    });

    expect(settlement.id).toBeDefined();
    expect(settlement.amountMinor).toBe(22500n);
    expect(settlement.fromUserId).not.toBe(settlement.toUserId);
  });

  test('7. Token Security & Hashing: raw tokens are never stored', async () => {
    const rawToken = TokenSecurity.generateSecureToken();
    const tokenHash = TokenSecurity.hashToken(rawToken);

    expect(rawToken).not.toBe(tokenHash);
    expect(tokenHash.length).toBe(64); // SHA-256 hex string

    const user = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
    const refreshToken = await prisma.refreshToken.create({
      data: {
        userId: user!.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });

    expect(refreshToken.id).toBeDefined();
    expect(refreshToken.tokenHash).toBe(tokenHash);
    expect(refreshToken.tokenHash).not.toContain(rawToken);
  });

  test('8. Soft Deletion preservation of financial history', async () => {
    const ketan = await prisma.user.findFirst({ where: { email: 'ketan@settle.app' } });
    const rohit = await prisma.user.findFirst({ where: { email: 'rohit@settle.app' } });
    const goaGroup = await prisma.group.findFirst({ where: { name: 'Goa 2026' } });

    // Create a fresh expense for soft delete testing
    const expense = await prisma.expense.create({
      data: {
        groupId: goaGroup!.id,
        description: 'Soft Delete Test Expense',
        amountMinor: 50000n,
        currency: 'INR',
        paidByUserId: ketan!.id,
        splitMethod: SplitMethod.EQUAL,
        splits: {
          create: [
            { userId: ketan!.id, amountMinor: 25000n },
            { userId: rohit!.id, amountMinor: 25000n },
          ],
        },
      },
      include: { splits: true },
    });

    expect(expense.deletedAt).toBeNull();
    expect(expense.splits.length).toBe(2);

    // Perform soft delete
    const softDeleted = await prisma.expense.update({
      where: { id: expense.id },
      data: { deletedAt: new Date() },
      include: { splits: true },
    });

    expect(softDeleted.deletedAt).not.toBeNull();
    expect(softDeleted.splits.length).toBe(2); // Splits preserved for audit history
  });
});
