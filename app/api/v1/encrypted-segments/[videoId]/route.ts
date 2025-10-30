/**
 * API Route: /v1/encrypted-segments/[videoId]
 * Get encrypted video segments for client-side SDK upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEncryptedResult } from '@/lib/server/encryptedResultCache';
import { readFile } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    // Get encrypted result from cache
    const encryptedResult = getEncryptedResult(videoId);
    if (!encryptedResult) {
      return NextResponse.json(
        { error: 'Encrypted result not found' },
        { status: 404 }
      );
    }

    // Read all encrypted segments
    const segmentsData = [];

    for (const rendition of encryptedResult.renditions) {
      // Init segment
      if (rendition.initSegment) {
        const initData = await readFile(rendition.initSegment.encryptedPath);
        segmentsData.push({
          identifier: `${rendition.quality}_init`,
          data: Array.from(initData),
          dek: rendition.initSegment.dek.toString('base64'),
          iv: rendition.initSegment.iv.toString('base64'),
          size: rendition.initSegment.encryptedSize,
        });
      }

      // Media segments
      for (const segment of rendition.segments) {
        const segData = await readFile(segment.encryptedPath);
        segmentsData.push({
          identifier: `${rendition.quality}_seg_${segment.segIdx}`,
          data: Array.from(segData),
          dek: segment.dek.toString('base64'),
          iv: segment.iv.toString('base64'),
          size: segment.encryptedSize,
        });
      }
    }

    // Poster if exists
    let posterData = null;
    if (encryptedResult.posterPath) {
      const poster = await readFile(encryptedResult.posterPath);
      posterData = {
        identifier: 'poster',
        data: Array.from(poster),
      };
    }

    return NextResponse.json({
      videoId,
      duration: encryptedResult.duration,
      renditions: encryptedResult.renditions.map(r => ({
        quality: r.quality,
        resolution: r.resolution,
        bitrate: r.bitrate,
        segmentCount: r.segments.length + (r.initSegment ? 1 : 0),
      })),
      segments: segmentsData,
      poster: posterData,
    });
  } catch (error) {
    console.error('[API Encrypted Segments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get encrypted segments' },
      { status: 500 }
    );
  }
}
