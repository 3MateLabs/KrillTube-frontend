/**
 * API Route: /v1/estimate-cost
 * Estimate Walrus storage cost before upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { estimateVideoCost, getCostBreakdown } from '@/lib/walrus-cost-simple';
import { getEncryptedResult } from '@/lib/server/encryptedResultCache';
import { readFile } from 'fs/promises';

/**
 * POST /v1/estimate-cost
 * Calculate cost for uploading encrypted video
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId }: { videoId: string } = body;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing required field: videoId' },
        { status: 400 }
      );
    }

    // Retrieve encrypted result from cache
    const encryptedResult = getEncryptedResult(videoId);
    if (!encryptedResult) {
      return NextResponse.json(
        { error: 'Encrypted result not found. Please transcode the video first.' },
        { status: 404 }
      );
    }

    // Calculate total size
    let totalSize = 0;
    for (const rendition of encryptedResult.renditions) {
      if (rendition.initSegment) {
        const initData = await readFile(rendition.initSegment.encryptedPath);
        totalSize += initData.length;
      }
      for (const segment of rendition.segments) {
        const segData = await readFile(segment.encryptedPath);
        totalSize += segData.length;
      }
    }

    // Add poster size if present
    if (encryptedResult.posterPath) {
      const posterData = await readFile(encryptedResult.posterPath);
      totalSize += posterData.length;
    }

    // Calculate cost
    const costEstimate = estimateVideoCost(totalSize);
    const costBreakdown = getCostBreakdown(costEstimate);

    console.log(`[API Estimate Cost] Video ${videoId}: ${costBreakdown.sizeFormatted}`);
    console.log(`[API Estimate Cost] Total: ${costBreakdown.total} WAL`);

    return NextResponse.json({
      success: true,
      videoId,
      cost: {
        totalWal: costBreakdown.total,
        storageWal: costBreakdown.storage,
        writeWal: costBreakdown.write,
        totalMist: costEstimate.totalCost.toString(),
        sizeFormatted: costBreakdown.sizeFormatted,
        sizeBytes: totalSize,
        epochs: costBreakdown.epochs,
        network: costBreakdown.network,
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
