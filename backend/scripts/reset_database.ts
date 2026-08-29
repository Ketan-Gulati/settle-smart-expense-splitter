import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_vnCk79OWipMh@ep-misty-leaf-az1m8xom.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function resetAllData(retries = 3) {
  try {
    console.log('🧹 Starting clean database wipe...');

    // Truncate all tables in proper relational order
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE 
        "expense_comments",
        "expense_splits",
        "expenses",
        "settlements",
        "group_invitations",
        "group_members",
        "groups",
        "accounts",
        "refresh_tokens",
        "email_verification_tokens",
        "password_reset_tokens",
        "audit_events",
        "users"
      CASCADE;
    `);

    console.log('✅ All users, groups, expenses, comments, settlements, and sessions successfully wiped!');
    await prisma.$disconnect();
  } catch (err) {
    if (retries > 0) {
      console.log(`Retrying connection in 2 seconds (${retries} attempts left)...`);
      await new Promise((r) => setTimeout(r, 2000));
      return resetAllData(retries - 1);
    }
    throw err;
  }
}

resetAllData().catch((err) => {
  console.error('❌ Failed to reset database:', err);
  process.exit(1);
});
