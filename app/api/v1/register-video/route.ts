/**
 * API Route: /v1/register-video
 * Register video metadata after client-side Walrus upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDbConnected } from '@/lib/db';
import { getCachedWalPrice } from '@/lib/suivision/priceCache';
import { walToUsd, formatUsd } from '@/lib/utils/walPrice';
import { encryptDek } from '@/lib/kms/envelope';
import { walrusSDK } from '@/lib/walrus-sdk';

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
      masterBlobObjectId,
      posterWalrusUri,
      posterBlobObjectId,
      duration,
      network,
      renditions,
      paymentInfo,
    }: {
      videoId: string;
      title: string;
      creatorId: string;
      walrusMasterUri: string;
      masterBlobObjectId?: string; // Mainnet only - for extend/delete operations
      posterWalrusUri?: string;
      posterBlobObjectId?: string; // Mainnet only - for extend/delete operations
      duration: number;
      network?: 'mainnet' | 'testnet'; // Walrus network (optional, defaults to mainnet)
      renditions: Array<{
        name: string;
        resolution: string;
        bitrate: number;
        walrusPlaylistUri: string;
        playlistBlobObjectId?: string; // Mainnet only - for extend/delete operations
        segments: Array<{
          segIdx: number;
          walrusUri: string;
          blobObjectId?: string; // Mainnet only - for extend/delete operations
          dek: string; // Base64-encoded 16-byte DEK
          iv: string; // Base64-encoded 12-byte IV
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

    // Fetch WAL price and calculate USD value
    const walPrice = await getCachedWalPrice();
    const paidWalNum = parseFloat(paymentInfo.paidWal);
    const paidUsd = walToUsd(paidWalNum, walPrice);

    console.log(`[API Register Video] Payment: ${paymentInfo.paidWal} WAL (${formatUsd(paidUsd)}) from ${paymentInfo.walletAddress}`);

    // Encrypt all DEKs with master key before storage
    console.log(`[API Register Video] Encrypting ${renditions.reduce((sum, r) => sum + r.segments.length, 0)} segment DEKs with KMS...`);

    // Ensure database is connected (handles Neon cold starts)
    await ensureDbConnected();
    // For mainnet videos, fetch end epochs from blob metadata
    let masterEndEpoch: number | null = null;
    let posterEndEpoch: number | null = null;

    if (network === 'mainnet' && masterBlobObjectId) {
      try {
        console.log(`[API Register Video] Fetching mainnet blob metadata for extend/delete support...`);
        const masterMetadata = await walrusSDK.getBlobMetadata(masterBlobObjectId);
        masterEndEpoch = masterMetadata.endEpoch;
        console.log(`[API Register Video] Master playlist end epoch: ${masterEndEpoch}`);

        if (posterBlobObjectId) {
          const posterMetadata = await walrusSDK.getBlobMetadata(posterBlobObjectId);
          posterEndEpoch = posterMetadata.endEpoch;
          console.log(`[API Register Video] Poster end epoch: ${posterEndEpoch}`);
        }
      } catch (error) {
        console.error(`[API Register Video] Failed to fetch blob metadata:`, error);
        // Non-fatal: Continue without end epochs (extend/delete won't work but video still registers)
      }
    }

    // Store video metadata in database
    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        walrusMasterUri,
        masterBlobObjectId: masterBlobObjectId || null, // Mainnet only
        masterEndEpoch: masterEndEpoch, // Mainnet only
        posterWalrusUri: posterWalrusUri || null,
        posterBlobObjectId: posterBlobObjectId || null, // Mainnet only
        posterEndEpoch: posterEndEpoch, // Mainnet only
        duration,
        network: network || 'mainnet', // Save Walrus network (defaults to mainnet)
        creatorId,
        renditions: {
          create: await Promise.all(
            renditions.map(async (rendition) => ({
              name: rendition.name,
              resolution: rendition.resolution,
              bitrate: rendition.bitrate,
              walrusPlaylistUri: rendition.walrusPlaylistUri,
              playlistBlobObjectId: rendition.playlistBlobObjectId || null, // Mainnet only
              segments: {
                create: await Promise.all(
                  rendition.segments.map(async (segment) => {
                    // Decrypt base64 DEK and encrypt with KMS
                    const dekPlain = Buffer.from(segment.dek, 'base64');
                    if (dekPlain.length !== 16) {
                      throw new Error(`Invalid DEK size: ${dekPlain.length} bytes (expected 16)`);
                    }
                    const dekEncrypted = await encryptDek(new Uint8Array(dekPlain));

                    return {
                      segIdx: segment.segIdx,
                      walrusUri: segment.walrusUri,
                      blobObjectId: segment.blobObjectId || null, // Mainnet only
                      dekEnc: Buffer.from(dekEncrypted), // Store KMS-encrypted DEK
                      iv: Buffer.from(segment.iv, 'base64'),
                      duration: segment.duration,
                      size: segment.size,
                    };
                  })
                ),
              },
            }))
          ),
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

    console.log(`[API Register Video] ✓ All DEKs encrypted and stored`);

    console.log(`[API Register Video] ✓ Video registered: ${video.id}`);

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
      payment: {
        ...paymentInfo,
        // Add USD values
        paidUsd,
        walPriceUsd: walPrice,
        formattedTotal: `${paymentInfo.paidWal} WAL (~${formatUsd(paidUsd)})`,
        formattedUsd: formatUsd(paidUsd),
      },
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
