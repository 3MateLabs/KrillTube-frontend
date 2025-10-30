/**
 * Batch key fetching API endpoint
 *
 * Fetches multiple segment encryption keys in a single request.
 * Optimized for aggressive prefetching during video playback.
 *
 * POST /api/v1/key/batch
 * Body (Format 1): { keys: [{ rendition, segIdx }] }
 * Body (Format 2): { rendition, segIndices: [0, 1, 2] }
 * Returns: { keys: [{ rendition, segIdx, wrappedKey, iv }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { deriveSegmentDek } from '@/lib/crypto/keyDerivation';
import { wrapKey } from '@/lib/crypto/primitives';
import { deriveSessionKek as deriveSessionKekServer } from '@/lib/crypto/keyDerivation';
import { decryptRootSecret, loadSessionPrivateKey } from '@/lib/kms/envelope';

interface BatchKeyRequest {
  // Format 1: Array of {rendition, segIdx}
  keys?: Array<{
    rendition: string;
    segIdx: number;
  }>;
  // Format 2: Single rendition with array of segment indices
  rendition?: string;
  segIndices?: number[];
  videoId?: string; // Optional, can get from session
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: BatchKeyRequest = await request.json();

    // Normalize request format - convert Format 2 to Format 1
    let keysToFetch: Array<{ rendition: string; segIdx: number }>;

    if (body.keys && Array.isArray(body.keys)) {
      // Format 1: Already in correct format
      keysToFetch = body.keys;
    } else if (body.rendition && body.segIndices && Array.isArray(body.segIndices)) {
      // Format 2: Convert { rendition, segIndices } to { keys }
      keysToFetch = body.segIndices.map((segIdx) => ({
        rendition: body.rendition!,
        segIdx,
      }));
    } else {
      return NextResponse.json(
        { error: 'Invalid request: either keys array or (rendition + segIndices) required' },
        { status: 400 }
      );
    }

    if (keysToFetch.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: no keys to fetch' },
        { status: 400 }
      );
    }

    if (keysToFetch.length > 100) {
      return NextResponse.json(
        { error: 'Too many keys requested (max 100)' },
        { status: 400 }
      );
    }

    // Get session from cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('sessionToken')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // Fetch session from database
    const session = await prisma.playbackSession.findUnique({
      where: { cookieValue: sessionToken },
      include: {
        video: {
          include: {
            renditions: {
              include: {
                segments: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Check session expiration
    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const { video } = session;

    // Load ephemeral private key from memory
    const serverPrivJwk = loadSessionPrivateKey(session.id);

    // Derive session KEK (for wrapping DEKs)
    const sessionKek = await deriveSessionKekServer(
      serverPrivJwk,
      new Uint8Array(session.clientPubKey),
      new Uint8Array(session.serverNonce)
    );

    // Decrypt video root secret
    const rootSecret = await decryptRootSecret(
      Buffer.from(video.rootSecretEnc)
    );

    // Process all key requests
    const results = await Promise.all(
      keysToFetch.map(async ({ rendition, segIdx }) => {
        try {
          // Find rendition
          const renditionData = video.renditions.find(
            (r) => r.name === rendition
          );

          if (!renditionData) {
            return {
              rendition,
              segIdx,
              error: `Rendition ${rendition} not found`,
            };
          }

          // Find segment
          const segment = renditionData.segments.find((s) => s.segIdx === segIdx);

          if (!segment) {
            return {
              rendition,
              segIdx,
              error: `Segment ${segIdx} not found in ${rendition}`,
            };
          }

          // Derive DEK for this segment
          const dek = await deriveSegmentDek(
            rootSecret,
            video.id,
            rendition,
            segIdx
          );

          // Wrap DEK with session KEK
          const { wrappedKey, iv: wrapIv } = await wrapKey(sessionKek, dek);

          return {
            rendition,
            segIdx,
            wrappedKey: Buffer.from(wrappedKey).toString('base64'),
            iv: Buffer.from(segment.iv).toString('base64'),
            wrapIv: Buffer.from(wrapIv).toString('base64'),
          };
        } catch (error) {
          console.error(
            `[Batch Key API] Error processing ${rendition}:${segIdx}:`,
            error
          );
          return {
            rendition,
            segIdx,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Update last activity
    await prisma.playbackSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    // Return all keys (including errors for individual keys)
    return NextResponse.json({
      keys: results,
    });
  } catch (error) {
    console.error('[Batch Key API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
