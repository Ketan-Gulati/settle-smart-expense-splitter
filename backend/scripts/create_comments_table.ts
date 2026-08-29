import { prisma } from '../src/infrastructure/database/prisma';

async function main() {
  console.log('Ensuring expense_comments table exists in database...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "expense_comments" (
      "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "expense_id" UUID NOT NULL REFERENCES "expenses"("id") ON DELETE CASCADE,
      "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "content" TEXT NOT NULL,
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deleted_at" TIMESTAMPTZ(6)
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "expense_comments_expense_id_created_at_idx" 
    ON "expense_comments" ("expense_id", "created_at" ASC);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "expense_comments_user_id_idx" 
    ON "expense_comments" ("user_id");
  `);

  console.log('✅ expense_comments table and indexes verified successfully.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
