/**
 * API Route: GET /v1/videos/creator/[address]
 * Get all videos by creator address
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Creator address is required' },
        { status: 400 }
      );
    }

    // Fetch videos by creator
    console.log(`[API Videos/Creator] Fetching videos for creator: ${address}`);

    const videos = await prisma.video.findMany({
      where: {
        creatorId: address,
      },
      include: {
        renditions: {
          include: {
            segments: {
              select: {
                id: true,
                segIdx: true,
                blobObjectId: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[API Videos/Creator] Found ${videos.length} total videos`);

    // Count blob objects
    const videosWithBlobs = videos.filter(v => v.masterBlobObjectId);
    const videosWithoutBlobs = videos.filter(v => !v.masterBlobObjectId);

    console.log(`[API Videos/Creator] Videos WITH masterBlobObjectId: ${videosWithBlobs.length}`);
    console.log(`[API Videos/Creator] Videos WITHOUT masterBlobObjectId: ${videosWithoutBlobs.length}`);

    // Log details for each video
    videos.forEach((video, index) => {
      const totalSegments = video.renditions.reduce((sum, r) => sum + r.segments.length, 0);
      const segmentsWithBlobs = video.renditions.reduce(
        (sum, r) => sum + r.segments.filter(s => s.blobObjectId).length,
        0
      );

      console.log(`[API Videos/Creator] Video ${index + 1}/${videos.length}:`);
      console.log(`  - ID: ${video.id}`);
      console.log(`  - Title: ${video.title}`);
      console.log(`  - Network: ${video.network}`);
      console.log(`  - masterBlobObjectId: ${video.masterBlobObjectId ? 'YES (' + video.masterBlobObjectId.slice(0, 10) + '...)' : 'NO'}`);
      console.log(`  - posterBlobObjectId: ${video.posterBlobObjectId ? 'YES' : 'NO'}`);
      console.log(`  - Renditions: ${video.renditions.length}`);
      console.log(`  - Total segments: ${totalSegments}`);
      console.log(`  - Segments with blobObjectId: ${segmentsWithBlobs}/${totalSegments}`);
    });

    return NextResponse.json({
      success: true,
      count: videos.length,
      videos: videos.map(video => ({
        id: video.id,
        title: video.title,
        creatorId: video.creatorId,
        network: video.network,
        masterBlobObjectId: video.masterBlobObjectId,
        masterEndEpoch: video.masterEndEpoch,
        posterBlobObjectId: video.posterBlobObjectId,
        posterEndEpoch: video.posterEndEpoch,
        duration: video.duration,
        encryptionType: video.encryptionType,
        createdAt: video.createdAt,
        renditions: video.renditions.map(r => ({
          id: r.id,
          name: r.name,
          resolution: r.resolution,
          playlistBlobObjectId: r.playlistBlobObjectId,
          segments: r.segments.map(s => ({
            id: s.id,
            segIdx: s.segIdx,
            blobObjectId: s.blobObjectId,
          })),
        })),
      })),
    });
  } catch (error) {
    console.error('[API Videos/Creator] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch creator videos',
      },
      { status: 500 }
    );
  }
}
