/**
 * API Route: /v1/videos/[id]
 * Get individual encrypted video details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    // Fetch video with renditions
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
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

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
        renditions: video.renditions.map((rendition) => ({
          id: rendition.id,
          name: rendition.name,
          resolution: rendition.resolution,
          bitrate: rendition.bitrate,
          walrusPlaylistUri: rendition.walrusPlaylistUri,
          segmentCount: rendition.segments.length,
          segments: rendition.segments.map((segment) => ({
            segIdx: segment.segIdx,
            walrusUri: segment.walrusUri,
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
