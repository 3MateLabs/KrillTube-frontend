/**
 * API Route: /v1/videos/[id]
 * Get individual encrypted video details
 * Delete mainnet videos and reclaim storage rebate
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
// Conditionally import walrusSDK only when needed (for DELETE operations)
// This avoids WASM loading issues on every GET request

/**
 * GET /v1/videos/[id]
 * Fetch encrypted video by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    // Fetch video with renditions and creator configs
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        renditions: {
          include: {
            segments: {
              orderBy: { segIdx: 'asc' },
            },
          },
        },
        creatorConfigs: true,
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Cast to any to access included relations
    const videoWithRelations = video as any;

    // Return video metadata (without root secret - that's provided by session API)
    return NextResponse.json({
      video: {
        id: video.id,
        title: video.title,
        walrusMasterUri: video.walrusMasterUri,
        posterWalrusUri: video.posterWalrusUri,
        duration: video.duration,
        creatorId: video.creatorId,
        createdAt: video.createdAt,
        network: video.network,
        encryptionType: video.encryptionType || 'per-video', // Encryption type for player
        sealObjectId: video.sealObjectId, // SEAL channel ID for subscription videos
        // Mainnet blob metadata (for storage management)
        masterBlobObjectId: video.masterBlobObjectId,
        masterEndEpoch: video.masterEndEpoch,
        posterBlobObjectId: video.posterBlobObjectId,
        posterEndEpoch: video.posterEndEpoch,
        // Creator configs for payment
        creatorConfigs: videoWithRelations.creatorConfigs.map((config: any) => ({
          id: config.id,
          objectId: config.objectId,
          chain: config.chain,
          coinType: config.coinType,
          pricePerView: config.pricePerView,
          decimals: config.decimals,
          metadata: config.metadata,
        })),
        renditions: videoWithRelations.renditions.map((rendition: any) => ({
          id: rendition.id,
          name: rendition.name,
          resolution: rendition.resolution,
          bitrate: rendition.bitrate,
          walrusPlaylistUri: rendition.walrusPlaylistUri,
          playlistBlobObjectId: rendition.playlistBlobObjectId,
          playlistEndEpoch: rendition.playlistEndEpoch,
          segmentCount: rendition.segments.length,
          segments: rendition.segments.map((segment: any) => ({
            segIdx: segment.segIdx,
            walrusUri: segment.walrusUri,
            blobObjectId: segment.blobObjectId,
            endEpoch: segment.endEpoch,
            duration: segment.duration,
            size: segment.size,
          })),
        })),
      },
    });
  } catch (error) {
    console.error('[API Videos/ID] Error fetching video:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch video',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /v1/videos/[id]
 * Delete mainnet video and reclaim storage rebate
 *
 * MAINNET ONLY: This endpoint only works for videos with network = "mainnet"
 *
 * Flow:
 * 1. Client requests deletion
 * 2. Server validates video ownership and mainnet network
 * 3. Server builds unsigned transaction for blob deletion (reclaims storage resource)
 * 4. Client signs transaction with Sui wallet
 * 5. Client executes signed transaction
 * 6. Client calls /finalize with transaction digest
 * 7. Server deletes video from database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const body = await request.json();

    // Validate request body
    if (!body.creatorId || typeof body.creatorId !== 'string') {
      return NextResponse.json(
        { error: 'Creator ID (Sui wallet address) is required' },
        { status: 400 }
      );
    }

    const { creatorId } = body;

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
          error: 'Blob deletion is only available for mainnet videos',
          network: video.network,
        },
        { status: 400 }
      );
    }

    // Verify ownership
    if (video.creatorId !== creatorId) {
      return NextResponse.json(
        { error: 'Only video creator can delete video' },
        { status: 403 }
      );
    }

    // Check if video has blob object IDs (required for delete operation)
    if (!video.masterBlobObjectId) {
      return NextResponse.json(
        {
          error: 'Video does not have blob object ID. Delete operation requires blob object metadata.',
          hint: 'This video may have been uploaded via quilt batch upload. Only single-blob uploads support delete operations.',
        },
        { status: 400 }
      );
    }

    // Collect all blob object IDs that will be deleted
    const blobObjectIds: string[] = [];

    // Master playlist
    if (video.masterBlobObjectId) {
      blobObjectIds.push(video.masterBlobObjectId);
    }

    // Poster image
    if (video.posterBlobObjectId) {
      blobObjectIds.push(video.posterBlobObjectId);
    }

    // Rendition playlists
    for (const rendition of video.renditions) {
      if (rendition.playlistBlobObjectId) {
        blobObjectIds.push(rendition.playlistBlobObjectId);
      }

      // Rendition segments
      for (const segment of rendition.segments) {
        if (segment.blobObjectId) {
          blobObjectIds.push(segment.blobObjectId);
        }
      }
    }

    if (blobObjectIds.length === 0) {
      return NextResponse.json(
        { error: 'No blob object IDs found for this video' },
        { status: 400 }
      );
    }

    // Lazy load walrusSDK only when needed (avoids WASM loading on GET requests)
    const { walrusSDK } = await import('@/lib/walrus-sdk');

    // Calculate total rebate for deleting all blobs
    const blobMetadata: Array<{
      blobObjectId: string;
      blobId: string;
      endEpoch: number;
      size: string;
      deletable: boolean;
    }> = [];

    for (const blobObjectId of blobObjectIds) {
      try {
        const metadata = await walrusSDK.getBlobMetadata(blobObjectId);
        blobMetadata.push(metadata);

        if (!metadata.deletable) {
          return NextResponse.json(
            {
              error: `Blob ${blobObjectId} is not deletable`,
              details: 'Only blobs created with deletable flag can be deleted',
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error(`[Delete] Failed to fetch metadata for blob ${blobObjectId}:`, error);
        return NextResponse.json(
          {
            error: `Failed to fetch metadata for blob ${blobObjectId}`,
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    // Build unsigned transaction for first blob (client will need to call this for each blob)
    // For MVP, we'll build transaction for master blob only
    let unsignedTransaction;
    try {
      unsignedTransaction = await walrusSDK.buildDeleteBlobTransaction({
        blobObjectId: video.masterBlobObjectId,
        owner: creatorId,
      });
    } catch (error) {
      console.error('[Delete] Failed to build delete transaction:', error);
      return NextResponse.json(
        {
          error: 'Failed to build delete transaction',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId: video.id,
      network: video.network,
      blobCount: blobObjectIds.length,
      blobsToDelete: blobMetadata.map((b) => ({
        blobObjectId: b.blobObjectId,
        blobId: b.blobId,
        endEpoch: b.endEpoch,
        size: b.size,
        deletable: b.deletable,
      })),
      unsignedTransaction, // Client must sign this with Sui wallet
      instructions: {
        steps: [
          '1. Sign the unsigned transaction with your Sui wallet',
          '2. Execute the signed transaction on Sui blockchain (reclaims storage resource)',
          '3. Call POST /v1/videos/:id/delete/finalize with transaction digest',
        ],
        note: 'This transaction deletes the master blob. You may need to delete other blobs separately (poster, renditions, segments).',
        warning: 'DELETION IS PERMANENT. Blobs cannot be recovered after deletion.',
      },
    });

  } catch (error) {
    console.error('[API Videos/Delete] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete video',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
