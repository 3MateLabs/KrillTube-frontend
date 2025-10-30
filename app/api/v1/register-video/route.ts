/**
 * API Route: /v1/register-video
 * Register video metadata after client-side Walrus upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clearEncryptedResult } from '@/lib/server/encryptedResultCache';

/**
 * POST /v1/register-video
 * Register a video after it has been uploaded to Walrus by the client
 *
 * Expected flow:
 * 1. Client transcodes video (POST /api/transcode)
 * 2. Client gets cost estimate (POST /v1/estimate-cost)
 * 3. Client uploads to Walrus using SDK with user signature
 * 4. Client calls this endpoint with Walrus URIs and metadata
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoId,
      title,
      creatorId,
      walrusMasterUri,
      posterWalrusUri,
      rootSecretEnc,
      duration,
      renditions,
      paymentInfo,
    }: {
      videoId: string;
      title: string;
      creatorId: string;
      walrusMasterUri: string;
      posterWalrusUri?: string;
      rootSecretEnc: string; // Base64 encoded
      duration: number;
      renditions: Array<{
        name: string;
        resolution: string;
        bitrate: number;
        walrusPlaylistUri: string;
        segments: Array<{
          segIdx: number;
          walrusUri: string;
          iv: string; // Base64 encoded
          duration: number;
          size: number;
        }>;
      }>;
      paymentInfo: {
        paidWal: string;
        paidMist: string;
        walletAddress: string;
        transactionIds: {
          segments: string;
          playlists: string;
          master: string;
        };
      };
    } = body;

    if (!videoId || !title || !creatorId || !walrusMasterUri || !renditions) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[API Register Video] Registering video: ${videoId}`);
    console.log(`[API Register Video] Payment: ${paymentInfo.paidWal} WAL from ${paymentInfo.walletAddress}`);

    // Convert root secret from base64
    const rootSecretBuffer = Buffer.from(rootSecretEnc, 'base64');

    // Store video metadata in database
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        walrusMasterUri,
        posterWalrusUri: posterWalrusUri || null,
        rootSecretEnc: rootSecretBuffer,
        duration,
        creatorId,
        renditions: {
          create: renditions.map((rendition) => ({
            name: rendition.name,
            resolution: rendition.resolution,
            bitrate: rendition.bitrate,
            walrusPlaylistUri: rendition.walrusPlaylistUri,
            segments: {
              create: rendition.segments.map((segment) => ({
                segIdx: segment.segIdx,
                walrusUri: segment.walrusUri,
                iv: Buffer.from(segment.iv, 'base64'),
                duration: segment.duration,
                size: segment.size,
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

    console.log(`[API Register Video] ✓ Video registered: ${video.id}`);

    // Clear the cached encrypted result
    clearEncryptedResult(videoId);

    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        walrusMasterUri: video.walrusMasterUri,
        posterWalrusUri: video.posterWalrusUri,
        duration: video.duration,
        createdAt: video.createdAt,
        renditions: video.renditions.map((r) => ({
          id: r.id,
          name: r.name,
          resolution: r.resolution,
          bitrate: r.bitrate,
          segmentCount: r.segments.length,
        })),
      },
      stats: {
        totalSegments: video.renditions.reduce((sum, r) => sum + r.segments.length, 0),
      },
      payment: paymentInfo,
    });
  } catch (error) {
    console.error('[API Register Video] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register video',
      },
      { status: 500 }
    );
  }
}
