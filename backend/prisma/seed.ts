import { PrismaClient, GroupRole, SplitMethod } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

export async function seed() {
  console.log('🌱 Starting Settle database seed on Neon PostgreSQL...');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditEvent.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.expenseSplit.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing records.');

  // 2. Create Core Users
  const passwordHash = await bcrypt.hash('SettleSecure2026!', 12);

  const ketan = await prisma.user.create({
    data: {
      name: 'Ketan',
      email: 'ketan@settle.app',
      emailNormalized: 'ketan@settle.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const rohit = await prisma.user.create({
    data: {
      name: 'Rohit',
      email: 'rohit@settle.app',
      emailNormalized: 'rohit@settle.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const raj = await prisma.user.create({
    data: {
      name: 'Raj',
      email: 'raj@settle.app',
      emailNormalized: 'raj@settle.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const aman = await prisma.user.create({
    data: {
      name: 'Aman',
      email: 'aman@settle.app',
      emailNormalized: 'aman@settle.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const sneha = await prisma.user.create({
    data: {
      name: 'Sneha',
      email: 'sneha@settle.app',
      emailNormalized: 'sneha@settle.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  const pooja = await prisma.user.create({
    data: {
      name: 'Pooja',
      email: 'pooja@settle.app',
      emailNormalized: 'pooja@settle.app',
      passwordHash,
      emailVerifiedAt: new Date(),
      isActive: true,
    },
  });

  console.log('👤 Created 6 users: Ketan, Rohit, Raj, Aman, Sneha, Pooja.');

  // 3. Create Group 1: Goa 2026
  const goaGroup = await prisma.group.create({
    data: {
      name: 'Goa 2026',
      currency: 'INR',
      createdBy: ketan.id,
      members: {
        create: [
          { userId: ketan.id, role: GroupRole.OWNER },
          { userId: rohit.id, role: GroupRole.MEMBER },
          { userId: raj.id, role: GroupRole.MEMBER },
          { userId: aman.id, role: GroupRole.MEMBER },
        ],
      },
    },
  });

  // Goa Expense 1: Dinner at Jamie's — ₹3,600 (360000 minor) paid by Ketan, split equally among 4 (90000 each)
  await prisma.expense.create({
    data: {
      groupId: goaGroup.id,
      description: "Dinner at Jamie's",
      amountMinor: 360000n,
      currency: 'INR',
      paidByUserId: ketan.id,
      splitMethod: SplitMethod.EQUAL,
      category: 'dining',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      splits: {
        create: [
          { userId: ketan.id, amountMinor: 90000n },
          { userId: rohit.id, amountMinor: 90000n },
          { userId: raj.id, amountMinor: 90000n },
          { userId: aman.id, amountMinor: 90000n },
        ],
      },
    },
  });

  // Goa Expense 2: Airport Cab — ₹900 (90000 minor) paid by Ketan, split equally among 4 (22500 each)
  await prisma.expense.create({
    data: {
      groupId: goaGroup.id,
      description: 'Airport Cab',
      amountMinor: 90000n,
      currency: 'INR',
      paidByUserId: rohit.id,
      splitMethod: SplitMethod.EQUAL,
      category: 'transport',
      createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      splits: {
        create: [
          { userId: ketan.id, amountMinor: 22500n },
          { userId: rohit.id, amountMinor: 22500n },
          { userId: raj.id, amountMinor: 22500n },
          { userId: aman.id, amountMinor: 22500n },
        ],
      },
    },
  });

  // Goa Expense 3: Villa Booking — ₹2,400 (240000 minor) paid by Ketan, split with Raj (120000 each)
  await prisma.expense.create({
    data: {
      groupId: goaGroup.id,
      description: 'Villa Booking',
      amountMinor: 240000n,
      currency: 'INR',
      paidByUserId: ketan.id,
      splitMethod: SplitMethod.EQUAL,
      category: 'accommodation',
      createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      splits: {
        create: [
          { userId: ketan.id, amountMinor: 120000n },
          { userId: raj.id, amountMinor: 120000n },
        ],
      },
    },
  });

  // 4. Create Group 2: Apartment Bills
  const aptGroup = await prisma.group.create({
    data: {
      name: 'Apartment Bills',
      currency: 'INR',
      createdBy: ketan.id,
      members: {
        create: [
          { userId: ketan.id, role: GroupRole.OWNER },
          { userId: raj.id, role: GroupRole.MEMBER },
          { userId: aman.id, role: GroupRole.MEMBER },
        ],
      },
    },
  });

  // Apt Expense 1: Internet Bill — ₹1,140 (114000 minor) paid by Raj, split 3 ways (38000 each)
  await prisma.expense.create({
    data: {
      groupId: aptGroup.id,
      description: 'Internet Bill',
      amountMinor: 114000n,
      currency: 'INR',
      paidByUserId: raj.id,
      splitMethod: SplitMethod.EQUAL,
      category: 'utilities',
      createdAt: new Date(Date.now() - 72 * 3600 * 1000),
      splits: {
        create: [
          { userId: ketan.id, amountMinor: 38000n },
          { userId: raj.id, amountMinor: 38000n },
          { userId: aman.id, amountMinor: 38000n },
        ],
      },
    },
  });

  // Apt Expense 2: Electricity Bill — ₹1,350 (135000 minor) paid by Raj, split 3 ways (45000 each)
  await prisma.expense.create({
    data: {
      groupId: aptGroup.id,
      description: 'Electricity Bill',
      amountMinor: 135000n,
      currency: 'INR',
      paidByUserId: raj.id,
      splitMethod: SplitMethod.EQUAL,
      category: 'utilities',
      createdAt: new Date(Date.now() - 96 * 3600 * 1000),
      splits: {
        create: [
          { userId: ketan.id, amountMinor: 45000n },
          { userId: raj.id, amountMinor: 45000n },
          { userId: aman.id, amountMinor: 45000n },
        ],
      },
    },
  });

  // 5. Create Group 3: Weekend Dinner
  const dinnerGroup = await prisma.group.create({
    data: {
      name: 'Weekend Dinner',
      currency: 'INR',
      createdBy: ketan.id,
      members: {
        create: [
          { userId: ketan.id, role: GroupRole.OWNER },
          { userId: rohit.id, role: GroupRole.MEMBER },
          { userId: sneha.id, role: GroupRole.MEMBER },
          { userId: aman.id, role: GroupRole.MEMBER },
          { userId: pooja.id, role: GroupRole.MEMBER },
        ],
      },
    },
  });

  // Dinner Expense 1: Dinner at Dishoom — ₹2,700 (270000 minor) paid by Rohit, split equally among 5 (54000 each)
  await prisma.expense.create({
    data: {
      groupId: dinnerGroup.id,
      description: 'Dinner at Dishoom',
      amountMinor: 270000n,
      currency: 'INR',
      paidByUserId: rohit.id,
      splitMethod: SplitMethod.EQUAL,
      category: 'dining',
      createdAt: new Date(Date.now() - 5 * 3600 * 1000),
      splits: {
        create: [
          { userId: ketan.id, amountMinor: 54000n },
          { userId: rohit.id, amountMinor: 54000n },
          { userId: sneha.id, amountMinor: 54000n },
          { userId: aman.id, amountMinor: 54000n },
          { userId: pooja.id, amountMinor: 54000n },
        ],
      },
    },
  });

  // 6. Record Audit Event
  await prisma.auditEvent.create({
    data: {
      actorUserId: ketan.id,
      eventType: 'SYSTEM_SEED_EXECUTED',
      entityType: 'DATABASE',
      entityId: 'neondb_seed',
      metadata: {
        usersCount: 6,
        groupsCount: 3,
        expensesCount: 6,
        seedVersion: '1.0.0',
      },
    },
  });

  console.log('✅ Deterministic seed completed successfully on Neon PostgreSQL.');
}

if (require.main === module) {
  seed()
    .catch((e) => {
      console.error('❌ Seed failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
