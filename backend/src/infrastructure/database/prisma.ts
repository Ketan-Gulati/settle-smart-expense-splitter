import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';

// Prevent multiple Prisma instances in development (hot reload safety)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
  });

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Validates database connectivity and runs a lightweight ping query.
 */
export const checkDatabaseConnection = async (maxRetries = 5, delayMs = 2000): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
};

/**
 * Gracefully disconnects Prisma client on process termination.
 */
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
