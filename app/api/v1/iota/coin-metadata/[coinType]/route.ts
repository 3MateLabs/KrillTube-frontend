/**
 * API Route: /v1/iota/coin-metadata/[coinType]
 * Get IOTA token metadata using Blockberry API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getIotaCoinMetadata } from '@/lib/blockberry/iotaPriceApi';

/**
 * GET /v1/iota/coin-metadata/[coinType]
 * Returns IOTA coin metadata including decimals, symbol, icon, etc.
 *
 * @param coinType - URL-encoded coin type (e.g., 0x2::iota::IOTA)
 *
 * @example
 * GET /api/v1/iota/coin-metadata/0x2%3A%3Aiota%3A%3AIOTA
 *
 * Response:
 * {
 *   "success": true,
 *   "metadata": {
 *     "decimals": 9,
 *     "name": "IOTA",
 *     "symbol": "IOTA",
 *     "description": "The main (gas)token of the IOTA Network.",
 *     "iconUrl": "https://iota.org/logo.png"
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ coinType: string }> }
) {
  try {
    const { coinType: rawCoinType } = await context.params;
    const coinType = decodeURIComponent(rawCoinType);

    console.log(`[API IOTA Coin Metadata] Fetching metadata for: ${coinType}`);

    if (!coinType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coin type is required',
        },
        { status: 400 }
      );
    }

    const fullMetadata = await getIotaCoinMetadata(coinType);

    if (!fullMetadata) {
      return NextResponse.json(
        {
          success: false,
          error: 'Metadata not found',
        },
        { status: 404 }
      );
    }

    // Return metadata in a format compatible with Sui metadata
    const metadata = {
      decimals: fullMetadata.decimals,
      name: fullMetadata.coinName,
      symbol: fullMetadata.coinSymbol,
      description: fullMetadata.description || '',
      iconUrl: fullMetadata.imgUrl,
    };

    return NextResponse.json(
      {
        success: true,
        metadata,
        fullMetadata, // Include full Blockberry data for advanced use
      },
      {
        headers: {
          // Cache for 1 hour (metadata doesn't change often)
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API IOTA Coin Metadata] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch IOTA metadata',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
