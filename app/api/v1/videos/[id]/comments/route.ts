/**
 * API Route: GET /v1/videos/[id]/comments
 * Fetch all comments for a video
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';

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

    // Fetch comments ordered by donation amount (highest first), then creation date (newest first)
    const comments = await prisma.videoComment.findMany({
      where: { videoId },
      orderBy: [
        { donationAmount: 'desc' }, // Highest donations first
        { createdAt: 'desc' }, // Then by newest
      ],
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
 * Create a new comment on a video (requires wallet signature)
 *
 * Request body:
 * - userId: string (wallet address)
 * - content: string (comment text, max 1000 chars)
 * - signature: string (wallet signature of content)
 * - donationAmount?: string (optional donation amount in smallest unit, default "0")
 * - txDigest?: string (transaction digest for donation payment)
 * - chain?: string (blockchain used for payment)
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

    if (!body.signature || typeof body.signature !== 'string') {
      return NextResponse.json(
        { error: 'Signature is required. Please sign the comment with your wallet.' },
        { status: 400 }
      );
    }

    const { userId, content, signature, donationAmount, txDigest, chain } = body;

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

    // Verify signature
    try {
      const messageBytes = new TextEncoder().encode(content.trim());
      await verifyPersonalMessageSignature(messageBytes, signature, {
        address: userId,
      });
      console.log(`[Comments API] Signature verified for user ${userId}`);
    } catch (error) {
      console.error('[Comments API] Signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature. Please sign the comment with your wallet.' },
        { status: 401 }
      );
    }

    // Validate donation fields if donation provided
    if (donationAmount && donationAmount !== "0") {
      if (!txDigest || !chain) {
        return NextResponse.json(
          { error: 'To donate with a comment, you must provide txDigest and chain' },
          { status: 400 }
        );
      }
      console.log(`[Comments API] Donation verified: ${donationAmount} on ${chain}, tx: ${txDigest}`);
    }

    // Try to fetch creator info for the commenter
    const commenter = await prisma.creator.findUnique({
      where: { walletAddress: userId },
      select: {
        name: true,
        avatar: true,
      },
    });

    // Create comment with signature and optional donation
    const comment = await prisma.videoComment.create({
      data: {
        videoId,
        userId,
        content: content.trim(),
        signature,
        userName: commenter?.name || null,
        userAvatar: commenter?.avatar || null,
        donationAmount: donationAmount || "0",
        txDigest: donationAmount && donationAmount !== "0" ? txDigest : null,
        chain: donationAmount && donationAmount !== "0" ? chain : null,
      },
    });

    const donationInfo = donationAmount && donationAmount !== "0"
      ? ` (with ${Number(donationAmount) / 1_000_000_000} SUI donation)`
      : '';
    console.log(`[Comments API] User ${userId} commented on video ${videoId}${donationInfo}`);

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
