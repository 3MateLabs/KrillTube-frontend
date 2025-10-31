/**
 * Register Video API
 *
 * Registers uploaded video with encrypted segments in database.
 * Client has already:
 * 1. Transcoded video
 * 2. Encrypted segments
 * 3. Uploaded blobs to Walrus (via /api/v1/upload-blob)
 *
 * This endpoint:
 * 1. Encrypts root secret with KMS
 * 2. Stores video metadata in database
 * 3. Returns video ID for playback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encryptRootSecret } from '@/lib/kms/envelope';

export const dynamic = 'force-dynamic';

interface RenditionData {
  quality: string;
  resolution: string;
  bitrate: number;
  segments: Array<{
    segIdx: number;
    walrusUri: string;
    iv: string; // base64
    duration: number;
    size: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoId,
      title,
      creatorId,
      walrusMasterUri,
      posterWalrusUri,
      rootSecretEnc, // Base64 (not KMS-encrypted yet)
      duration,
      renditions,
    }: {
      videoId: string;
      title: string;
      creatorId: string;
      walrusMasterUri: string;
      posterWalrusUri?: string;
      rootSecretEnc: string;
      duration: number;
      renditions: RenditionData[];
    } = body;

    console.log('[Register Video] Registering video...');
    console.log(`  Video ID: ${videoId}`);
    console.log(`  Title: ${title}`);
    console.log(`  Creator: ${creatorId}`);
    console.log(`  Renditions: ${renditions.length}`);

    // Validate required fields
    if (!videoId || !title || !creatorId || !rootSecretEnc || !renditions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Encrypt root secret with KMS
    console.log('[Register Video] Encrypting root secret with KMS...');
    const rootSecretBuffer = Buffer.from(rootSecretEnc, 'base64');
    const kmsEncryptedSecret = await encryptRootSecret(rootSecretBuffer);
    console.log('[Register Video] ✓ Root secret encrypted');

    // Step 2: Store in database
    console.log('[Register Video] Saving to database...');

    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        creatorId,
        walrusRootUri: walrusMasterUri,
        posterWalrusUri: posterWalrusUri || null,
        rootSecretEnc: Buffer.from(kmsEncryptedSecret),
        duration,
        renditions: {
          create: renditions.map((r) => ({
            name: r.quality,
            resolution: r.resolution,
            bitrate: r.bitrate,
            walrusPlaylistUri: '', // Will be generated during playback
            segments: {
              create: r.segments.map((s) => ({
                segIdx: s.segIdx,
                walrusUri: s.walrusUri,
                iv: Buffer.from(s.iv, 'base64'),
                duration: s.duration,
                size: s.size,
              })),
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

    console.log(`[Register Video] ✓ Video registered: ${video.id}`);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        walrusRootUri: video.walrusRootUri,
        posterWalrusUri: video.posterWalrusUri,
        createdAt: video.createdAt,
      },
    });
  } catch (error) {
    console.error('[Register Video] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}
