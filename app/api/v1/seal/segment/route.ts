/**
 * API Route: /v1/seal/segment
 * Get SEAL segment metadata for decryption
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * GET /api/v1/seal/segment?videoId=...&segIdx=...
 * Get SEAL metadata for a specific segment
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const segIdxParam = searchParams.get('segIdx');

    if (!videoId || segIdxParam === null) {
      return NextResponse.json(
        { error: 'videoId and segIdx are required' },
        { status: 400 }
      );
    }

    const segIdx = parseInt(segIdxParam);
    if (isNaN(segIdx)) {
      return NextResponse.json(
        { error: 'segIdx must be a number' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const cookieStore = await cookies();
    const userAddress = cookieStore.get('signature_address')?.value;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get video metadata
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        encryptionType: true,
        sealObjectId: true,
        creatorId: true,
        creator: {
          select: {
            walletAddress: true,
            sealObjectId: true,
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

    // Verify video uses SEAL encryption
    if (video.encryptionType !== 'subscription-acl' && video.encryptionType !== 'both') {
      return NextResponse.json(
        { error: 'This video does not use SEAL encryption' },
        { status: 400 }
      );
    }

    // Verify creator has a channel
    if (!video.creator?.sealObjectId) {
      return NextResponse.json(
        { error: 'Creator channel not found' },
        { status: 404 }
      );
    }

    // Check if user is subscribed (optional - SEAL will verify on-chain)
    const subscription = await prisma.subscription.findFirst({
      where: {
        subscriberAddress: userAddress,
        creator: {
          walletAddress: video.creatorId,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'You must be subscribed to this creator to watch this video',
          creatorAddress: video.creatorId,
        },
        { status: 403 }
      );
    }

    // Get segment metadata (through rendition)
    const segment = await prisma.videoSegment.findFirst({
      where: {
        rendition: {
          videoId,
        },
        segIdx,
      },
      select: {
        segIdx: true,
        sealDocumentId: true,
        sealBlobId: true,
        walrusUri: true,
        duration: true,
      },
    });

    if (!segment) {
      return NextResponse.json(
        { error: 'Segment not found' },
        { status: 404 }
      );
    }

    // Verify segment has SEAL metadata
    if (!segment.sealDocumentId || !segment.sealBlobId) {
      return NextResponse.json(
        { error: 'SEAL metadata not found for this segment' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      segIdx: segment.segIdx,
      sealDocumentId: segment.sealDocumentId,
      sealBlobId: segment.sealBlobId,
      walrusUri: segment.walrusUri,
      duration: segment.duration || 0,
      channelId: video.creator.sealObjectId,
      creatorAddress: video.creatorId,
    });

  } catch (error) {
    console.error('[SEAL Segment API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch segment metadata',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/seal/segment
 * Get metadata for multiple segments (batch request)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, segmentIndices } = body;

    if (!videoId || !Array.isArray(segmentIndices)) {
      return NextResponse.json(
        { error: 'videoId and segmentIndices array are required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const cookieStore = await cookies();
    const userAddress = cookieStore.get('signature_address')?.value;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get video metadata
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        encryptionType: true,
        sealObjectId: true,
        creatorId: true,
        creator: {
          select: {
            walletAddress: true,
            sealObjectId: true,
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

    // Verify video uses SEAL encryption
    if (video.encryptionType !== 'subscription-acl' && video.encryptionType !== 'both') {
      return NextResponse.json(
        { error: 'This video does not use SEAL encryption' },
        { status: 400 }
      );
    }

    // Verify creator has a channel
    if (!video.creator?.sealObjectId) {
      return NextResponse.json(
        { error: 'Creator channel not found' },
        { status: 404 }
      );
    }

    // Check subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        subscriberAddress: userAddress,
        creator: {
          walletAddress: video.creatorId,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          error: 'Subscription required',
          message: 'You must be subscribed to this creator to watch this video',
          creatorAddress: video.creatorId,
        },
        { status: 403 }
      );
    }

    // Get all requested segments (through rendition)
    const segments = await prisma.videoSegment.findMany({
      where: {
        rendition: {
          videoId,
        },
        segIdx: {
          in: segmentIndices,
        },
      },
      select: {
        segIdx: true,
        sealDocumentId: true,
        sealBlobId: true,
        walrusUri: true,
        duration: true,
      },
    });

    // Filter segments that have SEAL metadata
    const sealSegments = segments.filter(
      seg => seg.sealDocumentId && seg.sealBlobId
    );

    return NextResponse.json({
      videoId,
      channelId: video.creator.sealObjectId,
      creatorAddress: video.creatorId,
      segments: sealSegments.map(seg => ({
        segIdx: seg.segIdx,
        sealDocumentId: seg.sealDocumentId,
        sealBlobId: seg.sealBlobId,
        walrusUri: seg.walrusUri,
        duration: seg.duration || 0,
      })),
    });

  } catch (error) {
    console.error('[SEAL Segment API] Batch error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch segments metadata',
      },
      { status: 500 }
    );
  }
}
