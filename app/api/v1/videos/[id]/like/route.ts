/**
 * API Route: POST /v1/videos/[id]/like
 * Toggle like status for a video
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
    if (!body.userId || typeof body.userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID (wallet address) is required' },
        { status: 400 }
      );
    }

    const { userId } = body;

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if user already liked this video
    const existingLike = await prisma.videoLike.findUnique({
      where: {
        videoId_userId: {
          videoId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.videoLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Get updated like count
      const likeCount = await prisma.videoLike.count({
        where: { videoId },
      });

      console.log(`[Like API] User ${userId} unliked video ${videoId}`);

      return NextResponse.json({
        success: true,
        liked: false,
        likeCount,
      });
    } else {
      // Like: Create new like
      await prisma.videoLike.create({
        data: {
          videoId,
          userId,
        },
      });

      // Get updated like count
      const likeCount = await prisma.videoLike.count({
        where: { videoId },
      });

      console.log(`[Like API] User ${userId} liked video ${videoId}`);

      return NextResponse.json({
        success: true,
        liked: true,
        likeCount,
      });
    }

  } catch (error) {
    console.error('[API Videos/Like] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to toggle like',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * API Route: GET /v1/videos/[id]/like
 * Get like status and count for a video
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get like count
    const likeCount = await prisma.videoLike.count({
      where: { videoId },
    });

    // Check if user liked this video (if userId provided)
    let liked = false;
    if (userId) {
      const existingLike = await prisma.videoLike.findUnique({
        where: {
          videoId_userId: {
            videoId,
            userId,
          },
        },
      });
      liked = !!existingLike;
    }

    return NextResponse.json({
      success: true,
      liked,
      likeCount,
    });

  } catch (error) {
    console.error('[API Videos/Like GET] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get like status',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
