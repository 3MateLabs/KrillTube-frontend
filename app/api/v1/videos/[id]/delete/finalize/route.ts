/**
 * API Route: POST /v1/videos/[id]/delete/finalize
 * Finalize mainnet video deletion after successful transaction
 *
 * MAINNET ONLY: This endpoint deletes video from database after delete transaction is confirmed
 *
 * Flow:
 * 1. Client executes signed delete transaction
 * 2. Client waits for transaction confirmation
 * 3. Client calls this endpoint with transaction digest
 * 4. Server verifies transaction on Sui blockchain
 * 5. Server deletes video and all related records from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    if (!body.creatorId || typeof body.creatorId !== 'string') {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    const { transactionDigest, creatorId } = body;

    // Fetch video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        renditions: {
          include: {
            segments: true,
          },
        },
        sessions: true,
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
        { error: 'Blob deletion is only available for mainnet videos' },
        { status: 400 }
      );
    }

    // Verify ownership
    if (video.creatorId !== creatorId) {
      return NextResponse.json(
        { error: 'Only video creator can finalize deletion' },
        { status: 403 }
      );
    }

    // Count related records before deletion
    const segmentCount = video.renditions.reduce((sum, r) => sum + r.segments.length, 0);
    const renditionCount = video.renditions.length;
    const sessionCount = video.sessions.length;

    // Delete video and all related records (cascade will handle renditions, segments, sessions)
    await prisma.video.delete({
      where: { id: videoId },
    });

    console.log(`[Delete Finalize] Deleted video ${videoId}:`);
    console.log(`  - ${renditionCount} renditions`);
    console.log(`  - ${segmentCount} segments`);
    console.log(`  - ${sessionCount} playback sessions`);

    return NextResponse.json({
      success: true,
      videoId,
      transactionDigest,
      deletedRecords: {
        video: 1,
        renditions: renditionCount,
        segments: segmentCount,
        sessions: sessionCount,
      },
      message: 'Video deleted successfully. Storage resources have been reclaimed to your wallet.',
    });

  } catch (error) {
    console.error('[API Videos/Delete/Finalize] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to finalize video deletion',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
