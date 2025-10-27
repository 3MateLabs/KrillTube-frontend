/**
 * API route for video transcoding with V2 encryption
 * POST /api/transcode
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { videoTranscoder } from '@/lib/transcoder';
import { encryptTranscodeResult, calculateEncryptionStats } from '@/lib/server/encryptor';
import { cacheEncryptedResult } from '@/lib/server/encryptedResultCache';
import type { RenditionQuality } from '@/lib/types';
import { generateAssetId } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const qualitiesParam = formData.get('qualities') as string;
    const segmentDuration = parseInt(formData.get('segmentDuration') as string || '4');

    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Parse qualities
    const qualities: RenditionQuality[] = qualitiesParam
      ? JSON.parse(qualitiesParam)
      : ['720p', '480p', '360p'];

    console.log(`[API] Received video: ${file.name} (${file.size} bytes)`);
    console.log(`[API] Qualities: ${qualities.join(', ')}`);

    // Save uploaded file to temporary directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log(`[API] Saved to: ${filepath}`);

    // Transcode video
    const transcodeResult = await videoTranscoder.transcodeToHLS(filepath, {
      qualities,
      segmentDuration,
      gopSize: 96,
    });

    console.log(`[API] Transcoding complete: ${transcodeResult.jobId}`);

    // V2: Encrypt all segments
    const videoId = generateAssetId();
    console.log(`[API] Starting encryption for video ${videoId}`);

    const encryptedResult = await encryptTranscodeResult(transcodeResult, videoId);

    // Cache the full encrypted result for later upload
    cacheEncryptedResult(videoId, encryptedResult);

    // Calculate encryption statistics
    const stats = calculateEncryptionStats(encryptedResult);
    console.log(`[API] Encryption complete:`);
    console.log(`[API]   - Segments: ${stats.totalSegments}`);
    console.log(`[API]   - Original size: ${Math.round(stats.totalOriginalSize / 1024 / 1024)} MB`);
    console.log(`[API]   - Encrypted size: ${Math.round(stats.totalEncryptedSize / 1024 / 1024)} MB`);
    console.log(`[API]   - Overhead: ${stats.overheadPercentage.toFixed(2)}%`);

    return NextResponse.json({
      success: true,
      videoId,
      transcodeResult,
      encryptedResult: {
        videoId: encryptedResult.videoId,
        renditions: encryptedResult.renditions.map((r) => ({
          quality: r.quality,
          resolution: r.resolution,
          bitrate: r.bitrate,
          playlistPath: r.playlistPath,
          segmentCount: r.segments.length,
          hasInitSegment: !!r.initSegment,
        })),
        masterPlaylistPath: encryptedResult.masterPlaylistPath,
        posterPath: encryptedResult.posterPath,
        duration: encryptedResult.duration,
        stats,
      },
      // Note: rootSecret and rootSecretEnc not included in response for security
    });
  } catch (error) {
    console.error('[API] Transcode error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Transcoding failed',
      },
      { status: 500 }
    );
  }
}

// Increase max file size for video uploads (500MB)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes
