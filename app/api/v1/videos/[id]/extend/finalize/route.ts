/**
 * API Route: POST /v1/videos/[id]/extend/finalize
 * Finalize mainnet video storage extension after successful transaction
 *
 * MAINNET ONLY: This endpoint updates database after extend transaction is confirmed
 *
 * Flow:
 * 1. Client executes signed extend transaction
 * 2. Client waits for transaction confirmation
 * 3. Client calls this endpoint with transaction digest
 * 4. Server verifies transaction on Sui blockchain
 * 5. Server updates database with new end epochs
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
    if (!body.transactionDigest || typeof body.transactionDigest !== 'string') {
      return NextResponse.json(
        { error: 'Transaction digest is required' },
        { status: 400 }
      );
    }

    if (!body.blobObjectId || typeof body.blobObjectId !== 'string') {
      return NextResponse.json(
        { error: 'Blob object ID is required' },
        { status: 400 }
      );
    }

    if (!body.creatorId || typeof body.creatorId !== 'string') {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    if (!body.additionalEpochs || typeof body.additionalEpochs !== 'number') {
      return NextResponse.json(
        { error: 'Additional epochs is required' },
        { status: 400 }
      );
    }

    const { transactionDigest, blobObjectId, creatorId, additionalEpochs } = body;

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
        { error: 'Storage extension is only available for mainnet videos' },
        { status: 400 }
      );
    }

    // Verify ownership
    if (video.creatorId !== creatorId) {
      return NextResponse.json(
        { error: 'Only video creator can finalize extension' },
        { status: 403 }
      );
    }

    // Fetch updated blob metadata from blockchain
    let blobMetadata;
    try {
      blobMetadata = await walrusSDK.getBlobMetadata(blobObjectId);
    } catch (error) {
      console.error('[Extend Finalize] Failed to fetch blob metadata:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch updated blob metadata from blockchain',
          details: error instanceof Error ? error.message : String(error),
          hint: 'Transaction may not be confirmed yet. Please wait a few seconds and try again.',
        },
        { status: 500 }
      );
    }

    const newEndEpoch = blobMetadata.endEpoch;

    // Update database based on which blob was extended
    let updateResult;

    if (blobObjectId === video.masterBlobObjectId) {
      // Master playlist extended
      updateResult = await prisma.video.update({
        where: { id: videoId },
        data: {
          masterEndEpoch: newEndEpoch,
        },
      });

      console.log(`[Extend Finalize] Updated master blob end epoch: ${newEndEpoch}`);
    } else if (blobObjectId === video.posterBlobObjectId) {
      // Poster extended
      updateResult = await prisma.video.update({
        where: { id: videoId },
        data: {
          posterEndEpoch: newEndEpoch,
        },
      });

      console.log(`[Extend Finalize] Updated poster blob end epoch: ${newEndEpoch}`);
    } else {
      // Check rendition playlists
      let foundRendition = false;
      for (const rendition of video.renditions) {
        if (rendition.playlistBlobObjectId === blobObjectId) {
          updateResult = await prisma.videoRendition.update({
            where: { id: rendition.id },
            data: {
              playlistEndEpoch: newEndEpoch,
            },
          });
          foundRendition = true;
          console.log(`[Extend Finalize] Updated rendition ${rendition.name} playlist end epoch: ${newEndEpoch}`);
          break;
        }

        // Check segments
        for (const segment of rendition.segments) {
          if (segment.blobObjectId === blobObjectId) {
            updateResult = await prisma.videoSegment.update({
              where: { id: segment.id },
              data: {
                endEpoch: newEndEpoch,
              },
            });
            foundRendition = true;
            console.log(`[Extend Finalize] Updated segment ${rendition.name}:${segment.segIdx} end epoch: ${newEndEpoch}`);
            break;
          }
        }

        if (foundRendition) break;
      }

      if (!foundRendition) {
        return NextResponse.json(
          {
            error: 'Blob object ID does not belong to this video',
            blobObjectId,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      videoId: video.id,
      blobObjectId,
      transactionDigest,
      oldEndEpoch: blobMetadata.endEpoch - additionalEpochs,
      newEndEpoch,
      epochsAdded: additionalEpochs,
      message: 'Storage extension finalized successfully',
    });

  } catch (error) {
    console.error('[API Videos/Extend/Finalize] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to finalize storage extension',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
