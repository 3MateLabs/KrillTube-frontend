/**
 * API Route: POST /v1/videos/[id]/extend
 * Extend mainnet video storage duration
 *
 * MAINNET ONLY: This endpoint only works for videos with network = "mainnet"
 *
 * Flow:
 * 1. Client requests extension with desired number of epochs
 * 2. Server validates video ownership and mainnet network
 * 3. Server builds unsigned transaction for blob storage extension
 * 4. Client signs transaction with Sui wallet
 * 5. Client executes signed transaction
 * 6. Client calls /finalize with transaction digest
 * 7. Server updates database with new end epoch
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { walrusSDK } from '@/lib/walrus-sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();

    // Validate request body
    if (!body.epochs || typeof body.epochs !== 'number' || body.epochs < 1) {
      return NextResponse.json(
        { error: 'Valid number of epochs is required (minimum 1)' },
        { status: 400 }
      );
    }

    if (!body.creatorId || typeof body.creatorId !== 'string') {
      return NextResponse.json(
        { error: 'Creator ID (Sui wallet address) is required' },
        { status: 400 }
      );
    }

    const { epochs, creatorId } = body;

    // Fetch video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        renditions: {
          include: {
            segments: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // MAINNET ONLY: Check network
    if (video.network !== 'mainnet') {
      return NextResponse.json(
        {
          error: 'Storage extension is only available for mainnet videos',
          network: video.network,
        },
        { status: 400 }
      );
    }

    // Verify ownership
    if (video.creatorId !== creatorId) {
      return NextResponse.json(
        { error: 'Only video creator can extend storage' },
        { status: 403 }
      );
    }

    // Check if video has blob object IDs (required for extend operation)
    if (!video.masterBlobObjectId) {
      return NextResponse.json(
        {
          error: 'Video does not have blob object ID. Extend operation requires blob object metadata.',
          hint: 'This video may have been uploaded via quilt batch upload. Only single-blob uploads support extend/delete operations.',
        },
        { status: 400 }
      );
    }

    // Collect all blob object IDs that need extension
    const blobObjectIds: string[] = [];
    const blobSizes: number[] = [];

    // Master playlist
    if (video.masterBlobObjectId) {
      blobObjectIds.push(video.masterBlobObjectId);
      // Estimate master playlist size (typically small, ~1KB)
      blobSizes.push(1024);
    }

    // Poster image
    if (video.posterBlobObjectId) {
      blobObjectIds.push(video.posterBlobObjectId);
      // Estimate poster size (typically ~100KB)
      blobSizes.push(102400);
    }

    // Rendition playlists
    for (const rendition of video.renditions) {
      if (rendition.playlistBlobObjectId) {
        blobObjectIds.push(rendition.playlistBlobObjectId);
        blobSizes.push(2048); // Estimate playlist size
      }

      // Rendition segments
      for (const segment of rendition.segments) {
        if (segment.blobObjectId) {
          blobObjectIds.push(segment.blobObjectId);
          blobSizes.push(segment.size);
        }
      }
    }

    if (blobObjectIds.length === 0) {
      return NextResponse.json(
        { error: 'No blob object IDs found for this video' },
        { status: 400 }
      );
    }

    // Calculate total cost for extending all blobs
    let totalCostMist = BigInt(0);
    const blobCosts: { blobObjectId: string; costMist: string; size: number }[] = [];

    for (let i = 0; i < blobObjectIds.length; i++) {
      const blobObjectId = blobObjectIds[i];
      const size = blobSizes[i];

      try {
        // Calculate cost for this blob
        const costMist = await walrusSDK.calculateExtendCost(size, epochs);
        totalCostMist += costMist;

        blobCosts.push({
          blobObjectId,
          costMist: costMist.toString(),
          size,
        });
      } catch (error) {
        console.error(`[Extend] Failed to calculate cost for blob ${blobObjectId}:`, error);
        return NextResponse.json(
          {
            error: `Failed to calculate cost for blob ${blobObjectId}`,
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // Build unsigned transaction for first blob (client will need to call this for each blob)
    // For MVP, we'll build transaction for master blob only and return cost summary
    let unsignedTransaction;
    try {
      unsignedTransaction = await walrusSDK.buildExtendBlobTransaction({
        blobObjectId: video.masterBlobObjectId,
        epochs,
      });
    } catch (error) {
      console.error('[Extend] Failed to build extend transaction:', error);
      return NextResponse.json(
        {
          error: 'Failed to build extend transaction',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    // Convert MIST to WAL (1 WAL = 1_000_000_000 MIST)
    const totalCostWal = Number(totalCostMist) / 1_000_000_000;

    return NextResponse.json({
      success: true,
      videoId: video.id,
      network: video.network,
      epochs,
      currentEndEpoch: video.masterEndEpoch,
      newEndEpoch: video.masterEndEpoch ? video.masterEndEpoch + epochs : null,
      blobCount: blobObjectIds.length,
      totalCost: {
        mist: totalCostMist.toString(),
        wal: totalCostWal.toFixed(9),
        usd: null, // Client should fetch WAL price separately
      },
      blobCosts,
      unsignedTransaction, // Client must sign this with Sui wallet
      instructions: {
        steps: [
          '1. Sign the unsigned transaction with your Sui wallet',
          '2. Execute the signed transaction on Sui blockchain',
          '3. Call POST /v1/videos/:id/extend/finalize with transaction digest',
        ],
        note: 'This transaction extends the master blob. You may need to extend other blobs separately (poster, renditions, segments).',
      },
    });

  } catch (error) {
    console.error('[API Videos/Extend] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to extend storage',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
