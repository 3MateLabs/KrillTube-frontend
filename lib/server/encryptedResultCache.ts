/**
 * Server-side cache for encrypted transcode results
 *
 * Stores full encrypted results temporarily after transcoding
 * so they can be used by the /api/v1/videos endpoint without
 * passing sensitive file paths through the frontend.
 */

import type { EncryptedTranscodeResult } from './encryptor';

/**
 * In-memory cache for encrypted results
 * Key: videoId, Value: EncryptedTranscodeResult
 *
 * Using global to persist across hot reloads in development
 */
const globalForCache = global as unknown as {
  encryptedResultCache: Map<string, EncryptedTranscodeResult> | undefined;
};

const encryptedResultCache =
  globalForCache.encryptedResultCache ?? new Map<string, EncryptedTranscodeResult>();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.encryptedResultCache = encryptedResultCache;
}

/**
 * Cache TTL: 1 hour (results should be uploaded within this time)
 */
const CACHE_TTL = 60 * 60 * 1000;

/**
 * Store encrypted result in cache
 */
export function cacheEncryptedResult(
  videoId: string,
  result: EncryptedTranscodeResult
): void {
  console.log(`[EncryptedCache] Caching result for video ${videoId}`);
  encryptedResultCache.set(videoId, result);
  console.log(`[EncryptedCache] Cache now has ${encryptedResultCache.size} entries`);

  // Auto-expire after TTL
  setTimeout(() => {
    if (encryptedResultCache.has(videoId)) {
      console.log(`[EncryptedCache] Expiring cached result for video ${videoId}`);
      encryptedResultCache.delete(videoId);
    }
  }, CACHE_TTL);
}

/**
 * Retrieve encrypted result from cache
 */
export function getEncryptedResult(videoId: string): EncryptedTranscodeResult | null {
  console.log(`[EncryptedCache] Looking up ${videoId}, cache has ${encryptedResultCache.size} entries`);
  console.log(`[EncryptedCache] Cache keys: ${Array.from(encryptedResultCache.keys()).join(', ')}`);
  const result = encryptedResultCache.get(videoId);
  if (!result) {
    console.warn(`[EncryptedCache] No cached result for video ${videoId}`);
    return null;
  }
  console.log(`[EncryptedCache] ✓ Found cached result for video ${videoId}`);
  return result;
}

/**
 * Remove encrypted result from cache (called after successful upload)
 */
export function clearEncryptedResult(videoId: string): void {
  console.log(`[EncryptedCache] Clearing cached result for video ${videoId}`);
  encryptedResultCache.delete(videoId);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  videoIds: string[];
} {
  return {
    size: encryptedResultCache.size,
    videoIds: Array.from(encryptedResultCache.keys()),
  };
}
