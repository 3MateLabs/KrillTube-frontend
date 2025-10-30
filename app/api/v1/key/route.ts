/**
 * API Route: /v1/key
 * Retrieve wrapped segment DEKs for encrypted video playback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { deriveSessionKek } from '@/lib/crypto/keyDerivation';
import { wrapKey } from '@/lib/crypto/primitives';
import { toBase64 } from '@/lib/crypto/utils';

/**
 * GET /api/v1/key?videoId=xxx&rendition=720p&segIdx=0
 * Retrieve wrapped DEK for a specific segment
 *
 * Flow:
 * 1. Validate session cookie
 * 2. Fetch segment DEK from database (stored in plaintext)
 * 3. Derive session KEK from ECDH shared secret
 * 4. Wrap segment DEK with session KEK
 * 5. Return wrapped DEK + IVs
 *
 * Security:
 * - Session must be valid and not expired
 * - Session must be for the requested video
 * - Only segments from authorized renditions
 * - DEK is wrapped with session KEK for secure transmission
 * - Rate limiting should be applied (TODO)
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

    // Validate session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    // Find session with video and segment info
    const session = await prisma.playbackSession.findUnique({
      where: { cookieValue: sessionToken },
      include: {
        video: {
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
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check session expiration
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Verify session is for this video
    if (session.videoId !== videoId) {
      return NextResponse.json(
        { error: 'Session is not authorized for this video' },
        { status: 403 }
      );
    }

    // Verify video exists
    if (!session.video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Verify rendition exists
    if (!session.video.renditions || session.video.renditions.length === 0) {
      return NextResponse.json(
        { error: `Rendition ${rendition} not found` },
        { status: 404 }
      );
    }

    const videoRendition = session.video.renditions[0];

    // Verify segment exists and get DEK + IV
    if (!videoRendition.segments || videoRendition.segments.length === 0) {
      return NextResponse.json(
        { error: `Segment ${segIdx} not found in rendition ${rendition}` },
        { status: 404 }
      );
    }

    const segment = videoRendition.segments[0];
    const segmentDek = new Uint8Array(segment.dek);
    const segmentIv = segment.iv;

    console.log(`[Key API] Processing key request:`);
    console.log(`  Video: ${videoId}`);
    console.log(`  Rendition: ${rendition}`);
    console.log(`  Segment: ${segIdx}`);
    console.log(`  Session: ${session.id}`);
    console.log(`  ✓ Fetched segment DEK from database`);

    // Step 2: Derive session KEK from ECDH shared secret
    const serverPrivateKeyJwk = JSON.parse(session.serverPrivJwk) as JsonWebKey;
    const sessionKek = await deriveSessionKek(
      serverPrivateKeyJwk,
      new Uint8Array(session.clientPubKey),
      new Uint8Array(session.serverNonce)
    );
    console.log(`  ✓ Derived session KEK`);

    // Step 3: Wrap segment DEK with session KEK
    const { wrappedKey, iv: wrapIv } = await wrapKey(sessionKek, segmentDek);
    console.log(`  ✓ Wrapped segment DEK`);

    // Step 4: Log playback activity (optional - for analytics)
    await prisma.playbackLog.create({
      data: {
        sessionId: session.id,
        videoId,
        segIdx,
        rendition,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Update session last activity
    await prisma.playbackSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    const duration = Date.now() - startTime;
    console.log(`  ✓ Request completed in ${duration}ms`);

    // Return wrapped DEK and IVs
    if (!segmentIv) {
      throw new Error('Segment IV not found');
    }

    return NextResponse.json({
      wrappedDek: toBase64(wrappedKey),
      wrapIv: toBase64(wrapIv),
      segmentIv: toBase64(segmentIv),
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
 * Retrieve wrapped DEKs for multiple segments at once
 *
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

    // Validate session
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No active session' }, { status: 401 });
    }

    const session = await prisma.playbackSession.findUnique({
      where: { cookieValue: sessionToken },
      include: {
        video: {
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
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    if (session.videoId !== videoId) {
      return NextResponse.json(
        { error: 'Session is not authorized for this video' },
        { status: 403 }
      );
    }

    console.log(`[Key Batch API] Processing batch request: ${segIndices.length} segments`);

    // Derive session KEK
    const serverPrivateKeyJwk = JSON.parse(session.serverPrivJwk) as JsonWebKey;
    const sessionKek = await deriveSessionKek(
      serverPrivateKeyJwk,
      new Uint8Array(session.clientPubKey),
      new Uint8Array(session.serverNonce)
    );

    // Process each segment
    const keys = [];
    const videoRendition = session.video.renditions[0];

    for (const segIdx of segIndices) {
      // Find segment with DEK
      const segment = videoRendition.segments.find((s) => s.segIdx === segIdx);

      if (!segment) {
        console.warn(`[Key Batch API] Segment ${segIdx} not found, skipping`);
        continue;
      }

      // Get DEK from database
      const segmentDek = new Uint8Array(segment.dek);

      // Wrap DEK
      const { wrappedKey, iv: wrapIv } = await wrapKey(sessionKek, segmentDek);

      keys.push({
        segIdx,
        wrappedDek: toBase64(wrappedKey),
        wrapIv: toBase64(wrapIv),
        segmentIv: toBase64(segment.iv),
      });
    }

    // Update session last activity
    await prisma.playbackSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

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
