/**
 * Server-Side Upload API for Pre-Encrypted Segments (No Wallet Signatures)
 *
 * Flow:
 * 1. Client transcodes video to HLS segments (browser-side with ffmpeg.wasm)
 * 2. Client encrypts all segments (browser-side with Web Crypto API)
 * 3. Client sends encrypted segments to server
 * 4. Server uploads to Walrus via HTTP Publisher API (NO SIGNATURES)
 * 5. Server stores metadata in database
 * 6. Client can immediately watch video
 *
 * Security Benefits:
 * - Client-side encryption: Server never sees unencrypted video
 * - Root secret stays on client until server public key encryption
 * - Server only stores KMS-encrypted root secret
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusClient } from '@/lib/walrus';
import { prisma } from '@/lib/db';
import { encryptRootSecret } from '@/lib/kms/envelope';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

interface EncryptedSegmentData {
  identifier: string; // e.g., "720p_seg_0"
  quality: string;
  segIdx: number;
  iv: string; // base64
  duration: number;
}

interface RenditionData {
  quality: string;
  resolution: string;
  bitrate: number;
  segments: EncryptedSegmentData[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse JSON body with encrypted segment metadata
    const body = await request.json();
    const {
      videoId,
      title,
      creatorId,
      duration,
      rootSecretEnc, // Base64 encoded (NOT KMS encrypted yet)
      renditions,
      posterBase64,
    }: {
      videoId: string;
      title: string;
      creatorId: string;
      duration: number;
      rootSecretEnc: string;
      renditions: RenditionData[];
      posterBase64?: string;
    } = body;

    if (!videoId || !title || !creatorId || !rootSecretEnc || !renditions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('[Upload Encrypted API] Starting server-side upload...');
    console.log(`  Video ID: ${videoId}`);
    console.log(`  Title: ${title}`);
    console.log(`  Renditions: ${renditions.length}`);

    // Client will send encrypted segment blobs in a separate request
    // For now, we'll store the metadata and return blob upload URLs

    // Step 1: Encrypt root secret with KMS
    console.log('[Upload Encrypted API] Encrypting root secret with KMS...');
    const rootSecretBuffer = Buffer.from(rootSecretEnc, 'base64');
    const kmsEncryptedSecret = await encryptRootSecret(rootSecretBuffer);

    console.log('[Upload Encrypted API] ✓ Root secret encrypted');

    // Step 2: Return blob upload instructions
    // Client will upload encrypted segments directly to our blob upload endpoint
    console.log('[Upload Encrypted API] Preparing blob upload URLs...');

    const blobUploadUrl = '/api/v1/upload-blob';

    const duration_ms = Date.now() - startTime;
    console.log(`[Upload Encrypted API] ✓ Metadata prepared in ${duration_ms}ms`);

    return NextResponse.json({
      success: true,
      videoId,
      blobUploadUrl, // Client will POST encrypted blobs here
      message: 'Ready to receive encrypted segments',
    });
  } catch (error) {
    console.error('[Upload Encrypted API] Error:', error);

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
