/**
 * Server-Side Upload API (No Wallet Signatures Required)
 *
 * Flow:
 * 1. Client sends video file to server
 * 2. Server transcodes video to HLS segments
 * 3. Server encrypts all segments
 * 4. Server uploads to Walrus via HTTP Publisher API (no signatures)
 * 5. Server stores metadata in database
 * 6. Server returns video ID for playback
 *
 * Benefits:
 * - No wallet signatures required from users
 * - Works in all browsers (no wallet extension needed)
 * - Server pays for storage (not users)
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { transcodeVideoServer } from '@/lib/transcode/serverTranscode';
import { encryptSegments } from '@/lib/server/encryptor';
import { walrusClient } from '@/lib/walrus';
import { prisma } from '@/lib/db';
import { encryptRootSecret } from '@/lib/kms/envelope';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let tempDir: string | null = null;

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const creatorId = formData.get('creatorId') as string;
    const qualitiesStr = formData.get('qualities') as string;

    if (!file || !title || !creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, title, creatorId' },
        { status: 400 }
      );
    }

    const qualities = qualitiesStr ? qualitiesStr.split(',') : ['720p'];

    console.log('[Upload API] Starting server-side upload...');
    console.log(`  File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`  Title: ${title}`);
    console.log(`  Qualities: ${qualities.join(', ')}`);

    // Create temporary directory
    tempDir = join(tmpdir(), `walplayer-upload-${randomBytes(8).toString('hex')}`);
    await mkdir(tempDir, { recursive: true });

    const inputPath = join(tempDir, file.name);

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    await writeFile(inputPath, Buffer.from(bytes));

    console.log(`[Upload API] ✓ Saved to temp: ${inputPath}`);

    // Step 1: Transcode video
    console.log('[Upload API] Transcoding video...');
    const transcoded = await transcodeVideoServer(inputPath, {
      outputDir: tempDir,
      qualities,
      segmentDuration: 4,
    });

    console.log(`[Upload API] ✓ Transcoded ${transcoded.renditions.length} renditions`);

    // Step 2: Encrypt segments
    console.log('[Upload API] Encrypting segments...');
    const { encryptedSegments, rootSecret } = await encryptSegments(
      transcoded,
      transcoded.jobId
    );

    console.log(`[Upload API] ✓ Encrypted ${encryptedSegments.length} segments`);

    // Step 3: Upload to Walrus via HTTP Publisher API (NO SIGNATURES)
    console.log('[Upload API] Uploading to Walrus (HTTP Publisher API - no signatures)...');
    const manifest = await walrusClient.uploadAsset(transcoded, {
      title,
      description: `Uploaded by ${creatorId}`,
      uploadedBy: creatorId,
    });

    console.log(`[Upload API] ✓ Uploaded to Walrus: ${manifest.assetId}`);

    // Step 4: Store encrypted root secret in KMS
    console.log('[Upload API] Encrypting root secret with KMS...');
    const rootSecretEnc = await encryptRootSecret(rootSecret);

    console.log('[Upload API] ✓ Root secret encrypted and stored');

    // Step 5: Save video metadata to database
    console.log('[Upload API] Saving to database...');

    const video = await prisma.video.create({
      data: {
        id: manifest.assetId,
        title,
        creatorId,
        walrusRootUri: manifest.masterPlaylist.blobId,
        posterWalrusUri: manifest.poster?.blobId,
        rootSecretEnc: Buffer.from(rootSecretEnc),
        duration: manifest.duration,
        renditions: {
          create: manifest.renditions.map((r) => ({
            name: r.quality,
            resolution: r.resolution,
            bitrate: r.bitrate,
            walrusPlaylistUri: r.playlist.blobId,
            segments: {
              create: r.segments.map((s, idx) => {
                const encSeg = encryptedSegments.find(
                  (es) => es.quality === r.quality && es.segIdx === idx
                );
                return {
                  segIdx: idx,
                  walrusUri: s.blobId,
                  iv: Buffer.from(encSeg?.iv || '', 'base64'),
                  duration: 4.0,
                  size: s.size,
                };
              }),
            },
          })),
        },
      },
      include: {
        renditions: {
          include: {
            segments: true,
          },
        },
      },
    });

    console.log(`[Upload API] ✓ Video saved: ${video.id}`);

    // Cleanup temp directory
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      console.log('[Upload API] ✓ Cleaned up temp files');
    }

    const duration = Date.now() - startTime;
    console.log(`[Upload API] ✓ Upload complete in ${(duration / 1000).toFixed(1)}s`);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        posterUrl: manifest.poster?.url,
        playbackUrl: `/watch/${video.id}`,
      },
      manifest,
      processingTime: `${(duration / 1000).toFixed(1)}s`,
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);

    // Cleanup on error
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('[Upload API] Cleanup error:', cleanupError);
      }
    }

    const duration = Date.now() - startTime;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
        processingTime: `${(duration / 1000).toFixed(1)}s`,
      },
      { status: 500 }
    );
  }
}
