/**
 * API Route: /v1/coin-price/[coinType]
 * Get current token price in USD for any Sui coin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCoinPrice } from '@/lib/suivision/genericPriceApi';

/**
 * GET /v1/coin-price/[coinType]
 * Returns current coin price in USD (cached by Vercel for 5 minutes)
 *
 * @param coinType - URL-encoded coin type (e.g., 0x2::sui::SUI)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ coinType: string }> }
) {
  try {
    const { coinType: rawCoinType } = await context.params;
    const coinType = decodeURIComponent(rawCoinType);

    if (!coinType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coin type is required',
        },
        { status: 400 }
      );
    }

    const price = await getCoinPrice(coinType);

    return NextResponse.json(
      {
        success: true,
        coinType,
        price,
        currency: 'USD',
      },
      {
        headers: {
          // Cache for 5 minutes on Vercel Edge
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('[API Coin Price] Error:', error);
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
