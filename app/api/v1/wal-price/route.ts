/**
 * API Route: /v1/wal-price
 * Get current WAL token price in USD
 */

import { NextResponse } from 'next/server';
import { getCachedWalPrice } from '@/lib/suivision/priceCache';

/**
 * GET /v1/wal-price
 * Returns current WAL price in USD (cached)
 */
export async function GET() {
  try {
    const price = await getCachedWalPrice();

    return NextResponse.json({
      success: true,
      price,
      currency: 'USD',
      cached: true,
    });
  } catch (error) {
    console.error('[API WAL Price] Error:', error);
    return NextResponse.json(
      {
        success: false,
        price: 0,
        error: 'Failed to fetch price',
      },
      { status: 500 }
    );
  }
}
