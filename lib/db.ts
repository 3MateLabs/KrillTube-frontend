/**
 * Prisma database client singleton
 * Prevents multiple instances in development hot-reload
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add connection pool timeout settings for Neon
    // @ts-ignore - Prisma doesn't expose these types but they work
    __internal: {
      engine: {
        connectTimeout: 30000, // 30 seconds
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
