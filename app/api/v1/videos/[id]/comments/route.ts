/**
 * API Route: GET /v1/videos/[id]/comments
 * Fetch all comments for a video
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params;

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

    // Fetch comments ordered by creation date (newest first)
    const comments = await prisma.videoComment.findMany({
      where: { videoId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Try to fetch creator info for each comment
    const commentsWithCreatorInfo = await Promise.all(
      comments.map(async (comment) => {
        // Try to find creator info by wallet address
        const creator = await prisma.creator.findUnique({
          where: { walletAddress: comment.userId },
          select: {
            name: true,
            avatar: true,
          },
        });

        return {
          ...comment,
          userName: creator?.name || comment.userName || null,
          userAvatar: creator?.avatar || comment.userAvatar || null,
        };
      })
    );

    console.log(`[Comments API] Fetched ${comments.length} comments for video ${videoId}`);

    return NextResponse.json({
      success: true,
      comments: commentsWithCreatorInfo,
      count: comments.length,
    });

  } catch (error) {
    console.error('[API Videos/Comments GET] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch comments',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * API Route: POST /v1/videos/[id]/comments
 * Create a new comment on a video
 */
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

    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (body.content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment cannot exceed 1000 characters' },
        { status: 400 }
      );
    }

    const { userId, content } = body;

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

    // Try to fetch creator info for the commenter
    const creator = await prisma.creator.findUnique({
      where: { walletAddress: userId },
      select: {
        name: true,
        avatar: true,
      },
    });

    // Create comment
    const comment = await prisma.videoComment.create({
      data: {
        videoId,
        userId,
        content: content.trim(),
        userName: creator?.name || null,
        userAvatar: creator?.avatar || null,
      },
    });

    console.log(`[Comments API] User ${userId} commented on video ${videoId}`);

    return NextResponse.json({
      success: true,
      comment,
    });

  } catch (error) {
    console.error('[API Videos/Comments POST] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create comment',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
