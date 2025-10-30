/**
 * API Route: /v1/estimate-cost
 * Estimate Walrus storage costs for a video upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedWalPrice } from '@/lib/suivision/priceCache';
import { walToUsd, formatUsd } from '@/lib/utils/walPrice';

const WALRUS_COST_PER_MB = 0.000145; // WAL per MB (approximate mainnet cost)
const WALRUS_WRITE_COST = 0.00001; // Fixed write cost per object

/**
 * POST /v1/estimate-cost
 * Estimate storage costs based on file size and qualities
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileSizeMB, qualities } = body as {
      fileSizeMB: number;
      qualities: string[];
    };

    if (!fileSizeMB || !qualities || qualities.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: fileSizeMB, qualities' },
        { status: 400 }
      );
    }

    // Estimate transcoded size based on quality
    // HLS segment size is approximately: bitrate * duration / 8
    // Average 4-second segments, multiple qualities
    const bitrateMap: Record<string, number> = {
      '1080p': 5000000, // 5 Mbps
      '720p': 2800000,  // 2.8 Mbps
      '480p': 1400000,  // 1.4 Mbps
      '360p': 800000,   // 0.8 Mbps
    };

    let totalTranscodedSizeMB = 0;
    for (const quality of qualities) {
      const bitrate = bitrateMap[quality] || 2800000;
      // Estimate: bitrate (bits/sec) * fileSizeMB / originalBitrate
      // Simplified: assume 1MB source = ~1MB at 720p
      const qualitySizeMB = (bitrate / bitrateMap['720p']) * fileSizeMB;
      totalTranscodedSizeMB += qualitySizeMB;
    }

    // Add overhead for playlists, init segments, poster (~10%)
    const totalStorageMB = totalTranscodedSizeMB * 1.1;

    // Calculate costs
    const storageCost = totalStorageMB * WALRUS_COST_PER_MB;
    const writeCost = WALRUS_WRITE_COST * (qualities.length + 2); // Playlists + master + poster
    const totalWal = storageCost + writeCost;

    // Get USD price
    const walPrice = await getCachedWalPrice();
    const totalUsd = walToUsd(totalWal, walPrice);
    const storageUsd = walToUsd(storageCost, walPrice);
    const writeUsd = walToUsd(writeCost, walPrice);

    console.log(`[API Estimate Cost] File: ${fileSizeMB.toFixed(2)} MB, Qualities: ${qualities.join(', ')}`);
    console.log(`[API Estimate Cost] Estimated storage: ${totalStorageMB.toFixed(2)} MB`);
    console.log(`[API Estimate Cost] Total cost: ${totalWal.toFixed(6)} WAL (~${formatUsd(totalUsd)})`);

    // Use more decimal places for very small USD amounts
    const formatSmallUsd = (usd: number) => {
      if (usd < 0.001) {
        return usd.toFixed(6); // Show more decimals for tiny amounts
      } else if (usd < 0.1) {
        return usd.toFixed(4); // Show 4 decimals for small amounts
      } else {
        return usd.toFixed(3); // Show 3 decimals for normal amounts
      }
    };

    return NextResponse.json({
      success: true,
      estimate: {
        totalWal: totalWal.toFixed(6),
        totalUsd: formatSmallUsd(totalUsd),
        totalMist: Math.floor(totalWal * 1_000_000_000).toString(),
        storageMB: totalStorageMB.toFixed(2),
        breakdown: {
          storage: {
            wal: storageCost.toFixed(6),
            usd: formatSmallUsd(storageUsd),
          },
          write: {
            wal: writeCost.toFixed(6),
            usd: formatSmallUsd(writeUsd),
          },
        },
        walPriceUsd: walPrice,
      },
    });
  } catch (error) {
    console.error('[API Estimate Cost] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to estimate cost',
      },
      { status: 500 }
    );
  }
}
