/**
 * Prisma database client singleton
 * Prevents multiple instances in development hot-reload
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  isDbReady: boolean;
  lastDbCheck: number;
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

/**
 * Ensure database is connected and awake (handles Neon cold starts)
 *
 * Neon databases go to sleep after inactivity and need time to wake up.
 * This function checks connectivity with retries and exponential backoff.
 *
 * @param maxRetries - Maximum number of retry attempts (default: 5)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @returns Promise that resolves when database is ready
 */
export async function ensureDbConnected(
  maxRetries: number = 5,
  initialDelay: number = 1000
): Promise<void> {
  const now = Date.now();
  const CHECK_INTERVAL = 60000; // Check every 60 seconds

  // If we checked recently and it was ready, skip
  if (globalForPrisma.isDbReady && globalForPrisma.lastDbCheck && (now - globalForPrisma.lastDbCheck) < CHECK_INTERVAL) {
    return;
  }

  let attempt = 0;
  let delay = initialDelay;

  while (attempt < maxRetries) {
    try {
      console.log(`[DB] Checking database connection (attempt ${attempt + 1}/${maxRetries})...`);

      // Simple query to check connectivity
      await prisma.$queryRaw`SELECT 1`;

      console.log('[DB] ✓ Database connection established');
      globalForPrisma.isDbReady = true;
      globalForPrisma.lastDbCheck = now;
      return;
    } catch (error) {
      attempt++;

      if (attempt >= maxRetries) {
        console.error('[DB] ✗ Failed to connect to database after', maxRetries, 'attempts');
        throw new Error(`Database connection failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }

      console.warn(`[DB] Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
      console.warn('[DB] Error:', error instanceof Error ? error.message : String(error));

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
}

/**
 * Wrapper for Prisma operations that ensures database is connected
 *
 * Usage:
 * ```typescript
 * const result = await withDb(async (db) => {
 *   return await db.video.create({ ... });
 * });
 * ```
 */
export async function withDb<T>(
  operation: (prismaClient: PrismaClient) => Promise<T>
): Promise<T> {
  await ensureDbConnected();
  return operation(prisma);
}

export default prisma;
