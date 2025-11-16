/**
 * API Route: /v1/iota/coin-price/[coinType]
 * Get current IOTA token price in USD using Blockberry API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIotaCoinPrice } from '@/lib/blockberry/iotaPriceApi';

/**
 * GET /v1/iota/coin-price/[coinType]
 * Returns current IOTA coin price in USD (cached by Vercel for 5 minutes)
 *
 * @param coinType - URL-encoded coin type (e.g., 0x2::iota::IOTA)
 *
 * @example
 * GET /api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA
 *
 * Response:
 * {
 *   "success": true,
 *   "coinType": "0x2::iota::IOTA",
 *   "price": 0.132,
 *   "currency": "USD",
 *   "source": "blockberry"
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ coinType: string }> }
) {
  try {
    const { coinType: rawCoinType } = await context.params;
    const coinType = decodeURIComponent(rawCoinType);

    console.log(`[API IOTA Coin Price] Fetching price for: ${coinType}`);

    if (!coinType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coin type is required',
        },
        { status: 400 }
      );
    }

    const price = await getIotaCoinPrice(coinType);

    return NextResponse.json(
      {
        success: true,
        coinType,
        price,
        currency: 'USD',
        source: 'blockberry',
      },
      {
        headers: {
          // Cache for 5 minutes on Vercel Edge
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[API IOTA Coin Price] Error:', error);
    return NextResponse.json(
      {
        success: false,
        price: 0,
        error: 'Failed to fetch IOTA price',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
