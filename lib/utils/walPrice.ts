/**
 * WAL to USD price conversion utilities
 */

import { getCachedWalPrice } from '../suivision/priceCache';

// WAL uses 9 decimals (like SUI)
const WAL_DECIMALS = 9;

/**
 * Convert WAL amount (in MIST - smallest unit) to WAL tokens
 * @param amountMist - Amount in MIST (1 WAL = 10^9 MIST)
 * @returns Amount in WAL tokens
 */
export function mistToWal(amountMist: string | number | bigint): number {
  const mist = typeof amountMist === 'bigint' ? amountMist : BigInt(amountMist);
  return Number(mist) / Math.pow(10, WAL_DECIMALS);
}

/**
 * Convert WAL tokens to MIST (smallest unit)
 * @param amountWal - Amount in WAL tokens
 * @returns Amount in MIST
 */
export function walToMist(amountWal: number): bigint {
  return BigInt(Math.floor(amountWal * Math.pow(10, WAL_DECIMALS)));
}

/**
 * Convert WAL amount to USD
 * @param amountWal - Amount in WAL tokens (not MIST)
 * @param walPriceUsd - Current WAL price in USD
 * @returns USD value
 */
export function walToUsd(amountWal: number, walPriceUsd: number): number {
  return amountWal * walPriceUsd;
}

/**
 * Convert MIST to USD
 * @param amountMist - Amount in MIST
 * @param walPriceUsd - Current WAL price in USD
 * @returns USD value
 */
export function mistToUsd(amountMist: string | number | bigint, walPriceUsd: number): number {
  const wal = mistToWal(amountMist);
  return walToUsd(wal, walPriceUsd);
}

/**
 * Format WAL amount with USD equivalent
 * @param amountWal - Amount in WAL tokens
 * @param walPriceUsd - Current WAL price in USD (optional, will fetch if not provided)
 * @returns Formatted string like "0.5 WAL (~$1.25)"
 */
export async function formatWalWithUsd(
  amountWal: number,
  walPriceUsd?: number
): Promise<string> {
  const price = walPriceUsd ?? (await getCachedWalPrice());

  if (price === 0) {
    // If price fetch failed, show WAL only
    return `${amountWal.toFixed(6)} WAL`;
  }

  const usd = walToUsd(amountWal, price);
  return `${amountWal.toFixed(6)} WAL (~$${usd.toFixed(2)})`;
}

/**
 * Format MIST amount with USD equivalent
 * @param amountMist - Amount in MIST
 * @param walPriceUsd - Current WAL price in USD (optional, will fetch if not provided)
 * @returns Formatted string like "0.5 WAL (~$1.25)"
 */
export async function formatMistWithUsd(
  amountMist: string | number | bigint,
  walPriceUsd?: number
): Promise<string> {
  const wal = mistToWal(amountMist);
  return formatWalWithUsd(wal, walPriceUsd);
}

/**
 * Format USD value
 * @param usdAmount - Amount in USD
 * @returns Formatted string like "$1.25"
 */
export function formatUsd(usdAmount: number): string {
  return `$${usdAmount.toFixed(2)}`;
}

/**
 * Get WAL price and convert amount to USD in one call
 * @param amountWal - Amount in WAL tokens
 * @returns Object with WAL amount, USD value, and formatted strings
 */
export async function getWalValueInUsd(amountWal: number): Promise<{
  wal: number;
  usd: number;
  walPrice: number;
  formatted: string;
  formattedUsd: string;
}> {
  const walPrice = await getCachedWalPrice();
  const usd = walToUsd(amountWal, walPrice);

  return {
    wal: amountWal,
    usd,
    walPrice,
    formatted: await formatWalWithUsd(amountWal, walPrice),
    formattedUsd: formatUsd(usd),
  };
}

/**
 * Get MIST value in USD
 * @param amountMist - Amount in MIST
 * @returns Object with WAL amount, USD value, and formatted strings
 */
export async function getMistValueInUsd(amountMist: string | number | bigint): Promise<{
  wal: number;
  usd: number;
  walPrice: number;
  formatted: string;
  formattedUsd: string;
}> {
  const wal = mistToWal(amountMist);
  return getWalValueInUsd(wal);
}
