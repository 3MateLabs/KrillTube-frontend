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

    // Don't build the transaction on the server - WASM doesn't work server-side
    // Instead, return the blob metadata and let the client build the PTB
    console.log(`[Extend] Returning blob metadata for client-side PTB construction...`);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      network: video.network,
      epochs,
      currentEndEpoch: video.masterEndEpoch,
      newEndEpoch: video.masterEndEpoch ? video.masterEndEpoch + epochs : null,
      blobCount: blobObjectIds.length,
      blobObjectIds, // Send blob IDs to client for PTB construction
      batchMode: true, // Indicates this supports batch PTB
      instructions: {
        steps: [
          '1. Client builds PTB transaction with Walrus SDK (browser-side)',
          '2. Sign the PTB transaction with your Sui wallet (cost will be shown in wallet)',
          '3. Execute the signed transaction on Sui blockchain',
        ],
        note: `Client will build a PTB to extend ALL ${blobObjectIds.length} blobs (master, poster, renditions, segments) in a SINGLE transaction. Only 1 signature and 1 gas fee required!`,
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
