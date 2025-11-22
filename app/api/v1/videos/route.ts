/**
 * API Route: /v1/videos
 * List videos from database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /v1/videos
 * List videos with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          renditions: {
            select: {
              id: true,
              name: true,
              resolution: true,
              bitrate: true,
            },
          },
        },
      }),
      prisma.video.count(),
    ]);

    // Fetch creator profiles for all videos with subscriber counts
    const creatorIds = [...new Set(videos.map(v => v.creatorId))];
    const creators = await prisma.creator.findMany({
      where: {
        walletAddress: {
          in: creatorIds,
        },
      },
      select: {
        walletAddress: true,
        name: true,
        avatar: true,
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    // Create a map for quick lookup with subscriber count
    const creatorMap = new Map(
      creators.map(c => [
        c.walletAddress,
        {
          name: c.name,
          avatar: c.avatar,
          subscriberCount: c._count.subscriptions,
        },
      ])
    );

    // Attach creator info to videos
    const videosWithCreators = videos.map(video => ({
      ...video,
      creator: creatorMap.get(video.creatorId) || null,
    }));

    return NextResponse.json({
      success: true,
      videos: videosWithCreators,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[API Videos] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch videos',
      },
      { status: 500 }
    );
  }
}
