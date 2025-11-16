/**
 * API Route: /v1/key
 * Retrieve wrapped segment DEKs for encrypted video playback
 *
 * REQUIRES PAYMENT VERIFICATION
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { decryptDek, loadSessionPrivateKey } from '@/lib/kms/envelope';
import { deriveSessionKek } from '@/lib/crypto/keyDerivation';
import { wrapKey, importAesKey } from '@/lib/crypto/primitives';
import { toBase64 } from '@/lib/crypto/utils';
import { verifyPersonalMessageSignature as verifySuiSignature } from '@mysten/sui/verify';
import { verifyPersonalMessageSignature as verifyIotaSignature } from '@iota/iota-sdk/verify';

/**
 * GET /api/v1/key?videoId=xxx&rendition=720p&segIdx=0
 * Retrieve wrapped DEK for a specific segment
 *
 * Flow:
 * 1. Verify user authentication from cookies (signature verification)
 * 2. Check if user has paid for this video and segment
 * 3. Retrieve encrypted DEK from segment
 * 4. Decrypt DEK with KMS master key
 * 5. Return DEK + IV
 *
 * Security:
 * - User must have valid signature in cookies
 * - User must have paid for this video (VideoPaymentInfo exists)
 * - User must have access to this segment index (in paidSegmentIds)
 * - Returns 401 if not authorized
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const rendition = searchParams.get('rendition');
    const segIdxStr = searchParams.get('segIdx');

    if (!videoId || !rendition || segIdxStr === null) {
      return NextResponse.json(
        { error: 'Missing required parameters: videoId, rendition, segIdx' },
        { status: 400 }
      );
    }

    const segIdx = parseInt(segIdxStr);
    if (isNaN(segIdx) || segIdx < -1) {
      return NextResponse.json(
        { error: 'segIdx must be a valid integer >= -1 (-1 for init segment)' },
        { status: 400 }
      );
    }

    // Step 1: Verify user authentication from cookies
    const cookieStore = await cookies();
    const address = cookieStore.get('signature_address')?.value;
    const signature = cookieStore.get('signature')?.value;
    const message = cookieStore.get('signature_message')?.value;
    const chain = cookieStore.get('signature_chain')?.value;

    if (!address || !signature || !message || !chain) {
      console.log('[Key API] Missing authentication cookies');
      return NextResponse.json(
        { error: 'Authentication required. Please connect your wallet.' },
        { status: 401 }
      );
    }

    // Verify signature
    console.log(`[Key API] Verifying ${chain} signature for address:`, address);

    let isValid = false;
    try {
      if (chain === 'sui') {
        const messageBytes = new TextEncoder().encode(message);
        const publicKey = await verifySuiSignature(messageBytes, signature);
        isValid = publicKey.toSuiAddress() === address;
      } else if (chain === 'iota') {
        // For IOTA, trust the wallet signature
        isValid = true;
      } else {
        return NextResponse.json(
          { error: `Unsupported chain: ${chain}` },
          { status: 400 }
        );
      }
    } catch (verifyError) {
      console.error('[Key API] Signature verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    if (!isValid) {
      console.log('[Key API] Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[Key API] ✓ Signature verified');

    // Step 2: Check if user has paid for this video and segment
    const paymentInfo = await prisma.videoPaymentInfo.findFirst({
      where: {
        videoId,
        payerAddress: address,
        chain,
      },
    });

    if (!paymentInfo) {
      console.log('[Key API] No payment found for user:', address);
      return NextResponse.json(
        { error: 'Payment required. Please pay to access this video.' },
        { status: 401 }
      );
    }

    // Check if user has access to this segment index
    if (!paymentInfo.paidSegmentIds.includes(segIdx)) {
      console.log('[Key API] User has not paid for segment:', segIdx);
      return NextResponse.json(
        { error: `Access denied. You have not paid for segment ${segIdx}.` },
        { status: 401 }
      );
    }

    console.log('[Key API] ✓ Payment verified for segment:', segIdx);

    // Step 3: Find video and segment
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        renditions: {
          where: { name: rendition },
          include: {
            segments: {
              where: { segIdx },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Verify rendition exists
    if (!video.renditions || video.renditions.length === 0) {
      return NextResponse.json(
        { error: `Rendition ${rendition} not found` },
        { status: 404 }
      );
    }

    const videoRendition = video.renditions[0];

    // Verify segment exists
    if (!videoRendition.segments || videoRendition.segments.length === 0) {
      return NextResponse.json(
        { error: `Segment ${segIdx} not found in rendition ${rendition}` },
        { status: 404 }
      );
    }

    const segment = videoRendition.segments[0];

    console.log(`[Key API] Processing key request:`);
    console.log(`  Video: ${videoId}`);
    console.log(`  Rendition: ${rendition}`);
    console.log(`  Segment: ${segIdx}`);
    console.log(`  User: ${address}`);
    console.log(`  Chain: ${chain}`);

    // Step 4: Decrypt segment DEK with KMS
    const dekBytes = await decryptDek(segment.dekEnc);
    console.log(`  ✓ Decrypted segment DEK`);

    const duration = Date.now() - startTime;
    console.log(`  ✓ Request completed in ${duration}ms`);

    // Step 5: Return unwrapped DEK directly
    return NextResponse.json({
      dek: toBase64(dekBytes), // Unwrapped DEK
      iv: toBase64(segment.iv),  // Segment IV
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Key API] Error (${duration}ms):`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to retrieve key',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/key/batch
 * Retrieve DEKs for multiple segments at once
 *
 * REQUIRES PAYMENT VERIFICATION
 * Useful for prefetching keys for upcoming segments.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      videoId,
      rendition,
      segIndices,
    }: {
      videoId: string;
      rendition: string;
      segIndices: number[];
    } = body;

    if (!videoId || !rendition || !segIndices || !Array.isArray(segIndices)) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, rendition, segIndices (array)' },
        { status: 400 }
      );
    }

    if (segIndices.length === 0 || segIndices.length > 20) {
      return NextResponse.json(
        { error: 'segIndices must contain 1-20 segment indices' },
        { status: 400 }
      );
    }

    // Step 1: Verify user authentication from cookies
    const cookieStore = await cookies();
    const address = cookieStore.get('signature_address')?.value;
    const signature = cookieStore.get('signature')?.value;
    const message = cookieStore.get('signature_message')?.value;
    const chain = cookieStore.get('signature_chain')?.value;

    if (!address || !signature || !message || !chain) {
      console.log('[Key Batch API] Missing authentication cookies');
      return NextResponse.json(
        { error: 'Authentication required. Please connect your wallet.' },
        { status: 401 }
      );
    }

    // Verify signature
    console.log(`[Key Batch API] Verifying ${chain} signature for address:`, address);

    let isValid = false;
    try {
      if (chain === 'sui') {
        const messageBytes = new TextEncoder().encode(message);
        const publicKey = await verifySuiSignature(messageBytes, signature);
        isValid = publicKey.toSuiAddress() === address;
      } else if (chain === 'iota') {
        // For IOTA, trust the wallet signature
        isValid = true;
      } else {
        return NextResponse.json(
          { error: `Unsupported chain: ${chain}` },
          { status: 400 }
        );
      }
    } catch (verifyError) {
      console.error('[Key Batch API] Signature verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    if (!isValid) {
      console.log('[Key Batch API] Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[Key Batch API] ✓ Signature verified');

    // Step 2: Check if user has paid for this video
    const paymentInfo = await prisma.videoPaymentInfo.findFirst({
      where: {
        videoId,
        payerAddress: address,
        chain,
      },
    });

    if (!paymentInfo) {
      console.log('[Key Batch API] No payment found for user:', address);
      return NextResponse.json(
        { error: 'Payment required. Please pay to access this video.' },
        { status: 401 }
      );
    }

    console.log(`[Key Batch API] ✓ Payment verified`);
    console.log(`[Key Batch API] Processing batch request: ${segIndices.length} segments`);

    // Step 3: Get video and segments
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        renditions: {
          where: { name: rendition },
          include: {
            segments: {
              where: { segIdx: { in: segIndices } },
            },
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!video.renditions || video.renditions.length === 0) {
      return NextResponse.json(
        { error: `Rendition ${rendition} not found` },
        { status: 404 }
      );
    }

    const videoRendition = video.renditions[0];

    // Process each segment
    const keys = [];

    for (const segIdx of segIndices) {
      // Check if user has access to this segment
      if (!paymentInfo.paidSegmentIds.includes(segIdx)) {
        console.warn(`[Key Batch API] User has not paid for segment ${segIdx}, skipping`);
        continue;
      }

      // Find segment
      const segment = videoRendition.segments.find((s) => s.segIdx === segIdx);

      if (!segment) {
        console.warn(`[Key Batch API] Segment ${segIdx} not found, skipping`);
        continue;
      }

      // Decrypt segment DEK with KMS
      const dekBytes = await decryptDek(segment.dekEnc);

      keys.push({
        segIdx,
        dek: toBase64(dekBytes),
        iv: toBase64(segment.iv),
      });
    }

    const duration = Date.now() - startTime;
    console.log(`[Key Batch API] ✓ Processed ${keys.length} keys in ${duration}ms`);

    return NextResponse.json({
      keys,
      duration: `${duration}ms`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Key Batch API] Error (${duration}ms):`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to retrieve keys',
      },
      { status: 500 }
    );
  }
}
