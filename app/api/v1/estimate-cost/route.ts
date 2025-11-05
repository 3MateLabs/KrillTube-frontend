/**
 * API Route: /v1/estimate-cost
 * Estimate Walrus storage costs for a video upload using actual Walrus SDK pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCachedWalPrice } from '@/lib/suivision/priceCache';
import { walToUsd, formatUsd } from '@/lib/utils/walPrice';
import { calculateStorageCost } from '@/lib/server-walrus-sdk';

/**
 * POST /v1/estimate-cost
 * Estimate storage costs based on file size and qualities using Walrus SDK
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileSizeMB, qualities, epochs = 1, network = 'mainnet' } = body as {
      fileSizeMB: number;
      qualities: string[];
      epochs?: number;
      network?: 'mainnet' | 'testnet';
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
    const totalStorageBytes = Math.ceil(totalStorageMB * 1024 * 1024);

    // Use actual Walrus SDK to calculate costs
    const cost = await calculateStorageCost(totalStorageBytes, {
      network,
      epochs,
    });

    // Convert from MIST to WAL
    const totalCostWal = Number(cost.totalCost) / 1_000_000_000;
    const storageCostWal = Number(cost.storageCost) / 1_000_000_000;
    const writeCostWal = Number(cost.writeCost) / 1_000_000_000;

    // Get USD price
    const walPrice = await getCachedWalPrice();
    const totalUsd = walToUsd(totalCostWal, walPrice);
    const storageUsd = walToUsd(storageCostWal, walPrice);
    const writeUsd = walToUsd(writeCostWal, walPrice);

    console.log(`[API Estimate Cost] File: ${fileSizeMB.toFixed(2)} MB, Qualities: ${qualities.join(', ')}, Epochs: ${epochs}, Network: ${network}`);
    console.log(`[API Estimate Cost] Estimated storage: ${totalStorageMB.toFixed(2)} MB (${totalStorageBytes} bytes)`);
    console.log(`[API Estimate Cost] Walrus SDK cost: ${totalCostWal.toFixed(6)} WAL (~${formatUsd(totalUsd)})`);
    console.log(`[API Estimate Cost] Breakdown: Storage=${storageCostWal.toFixed(6)} WAL, Write=${writeCostWal.toFixed(6)} WAL`);

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
        totalWal: totalCostWal.toFixed(6),
        totalUsd: formatSmallUsd(totalUsd),
        totalMist: cost.totalCost.toString(),
        storageMB: totalStorageMB.toFixed(2),
        epochs,
        network,
        breakdown: {
          storage: {
            wal: storageCostWal.toFixed(6),
            usd: formatSmallUsd(storageUsd),
            mist: cost.storageCost.toString(),
          },
          write: {
            wal: writeCostWal.toFixed(6),
            usd: formatSmallUsd(writeUsd),
            mist: cost.writeCost.toString(),
          },
        },
        walPriceUsd: walPrice,
        // Note: This uses estimated transcoded size - actual size may vary
        note: 'Cost calculated using empirical Walrus pricing formula (Jan 2025). Includes erasure coding expansion. Add 50x buffer for safety.',
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
