/**
 * API Route: POST /v1/videos/[id]/extend/finalize
 * Update database after successful blockchain extend transaction
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
    if (!body.digest || typeof body.digest !== 'string') {
      return NextResponse.json(
        { error: 'Transaction digest is required' },
        { status: 400 }
      );
    }

    if (!body.newEndEpoch || typeof body.newEndEpoch !== 'number') {
      return NextResponse.json(
        { error: 'New end epoch is required' },
        { status: 400 }
      );
    }

    if (!body.creatorId || typeof body.creatorId !== 'string') {
      return NextResponse.json(
        { error: 'Creator ID is required' },
        { status: 400 }
      );
    }

    const { digest, newEndEpoch, creatorId } = body;

    // Fetch video from database
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (video.creatorId !== creatorId) {
      return NextResponse.json(
        { error: 'Only video creator can update storage' },
        { status: 403 }
      );
    }

    // Update video with new end epoch
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        masterEndEpoch: newEndEpoch,
        updatedAt: new Date(),
      },
    });

    console.log(`[Finalize] Updated video ${videoId} with new end epoch: ${newEndEpoch}`);
    console.log(`[Finalize] Transaction digest: ${digest}`);

    return NextResponse.json({
      success: true,
      videoId: updatedVideo.id,
      oldEndEpoch: video.masterEndEpoch,
      newEndEpoch: updatedVideo.masterEndEpoch,
      digest,
    });

  } catch (error) {
    console.error('[API Videos/Extend/Finalize] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to finalize extend',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
