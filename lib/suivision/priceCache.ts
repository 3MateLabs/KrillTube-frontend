/**
 * In-memory cache for WAL token price
 * Caches price for 5 minutes to avoid rate limiting
 */

import { getWalPrice } from './priceApi';

interface PriceCache {
  price: number;
  timestamp: number;
}

// 5 minutes cache duration
const CACHE_DURATION_MS = 5 * 60 * 1000;

let cache: PriceCache | null = null;

/**
 * Get cached WAL price in USD
 * Fetches fresh price if cache is stale or empty
 */
export async function getCachedWalPrice(): Promise<number> {
  const now = Date.now();

  // Check if cache is valid
  if (cache && now - cache.timestamp < CACHE_DURATION_MS) {
    console.log(`[PriceCache] Using cached WAL price: $${cache.price}`);
    return cache.price;
  }

  // Fetch fresh price
  console.log('[PriceCache] Cache stale or empty, fetching fresh price...');
  const price = await getWalPrice();

  // Update cache
  cache = {
    price,
    timestamp: now,
  };

  return price;
}

/**
 * Clear the price cache (useful for testing or manual refresh)
 */
export function clearPriceCache(): void {
  cache = null;
  console.log('[PriceCache] Cache cleared');
}

/**
 * Get cache status for debugging
 */
export function getCacheStatus(): { isCached: boolean; age?: number; price?: number } {
  if (!cache) {
    return { isCached: false };
  }

  const age = Date.now() - cache.timestamp;
  return {
    isCached: true,
    age,
    price: cache.price,
  };
}
