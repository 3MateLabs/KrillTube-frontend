/**
 * API Route: /v1/register-video
 * Register video metadata after client-side Walrus upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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
      walrusBlobId,
      title,
      creatorId,
      walrusMasterUri,
      masterBlobObjectId,
      poster,
      posterWalrusUri,
      posterBlobObjectId,
      duration,
      network,
      encryptionType,
      sealObjectId,
      renditions,
      paymentInfo,
      creatorConfigs,
    }: {
      videoId: string; // Pre-generated UUID from frontend
      walrusBlobId?: string; // Optional: Walrus blob ID (for backwards compatibility)
      title: string;
      creatorId: string;
      walrusMasterUri: string;
      masterBlobObjectId?: string; // Mainnet only - for extend/delete operations
      poster?: string; // Base64 data URL for thumbnail
      posterWalrusUri?: string; // DEPRECATED: Legacy Walrus-based thumbnails
      posterBlobObjectId?: string; // Mainnet only - for extend/delete operations
      duration: number;
      network?: 'mainnet' | 'testnet'; // Walrus network (optional, defaults to mainnet)
      encryptionType?: 'per-video' | 'subscription-acl' | 'both'; // Encryption type
      sealObjectId?: string; // Creator's SEAL channel ID (for subscription videos)
      creatorConfigs?: Array<{
        objectId: string; // On-chain creator config object ID
        chain: string; // "iota", "sui", etc.
        coinType: string; // Coin type (e.g., "0x2::sui::SUI")
        pricePerView: string; // Raw price per view (in smallest unit with decimals)
        decimals: number; // Coin decimals for display/calculation
        metadata?: string;
      }>; // Multiple creator configs for different payment methods
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
          dek?: string; // Base64-encoded 16-byte DEK (for per-video encryption)
          iv?: string; // Base64-encoded 12-byte IV (for per-video encryption)
          sealDocumentId?: string; // SEAL document ID (for subscription-acl encryption)
          sealBlobId?: string; // SEAL blob ID (for subscription-acl encryption)
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
    if (walrusBlobId && walrusBlobId !== videoId) {
      console.log(`[API Register Video] Walrus blob ID: ${walrusBlobId}`);
    }
    if (creatorConfigs && creatorConfigs.length > 0) {
      console.log(`[API Register Video] Creator configs (${creatorConfigs.length}):`);
      creatorConfigs.forEach((config) => {
        const pricePerView = parseFloat(config.pricePerView) / Math.pow(10, config.decimals);
        console.log(`  - ${config.chain}: ${config.objectId}`);
        console.log(`    Coin: ${config.coinType}`);
        console.log(`    Price per view: ${pricePerView.toFixed(config.decimals)} (${config.pricePerView} raw)`);
      });
    }

    // Fetch WAL price and calculate USD value
    const walPrice = await getCachedWalPrice();
    const paidWalNum = parseFloat(paymentInfo.paidWal);
    const paidUsd = walToUsd(paidWalNum, walPrice);

    console.log(`[API Register Video] Payment: ${paymentInfo.paidWal} WAL (${formatUsd(paidUsd)}) from ${paymentInfo.walletAddress}`);

    // Encrypt all DEKs with master key before storage
    console.log(`[API Register Video] Encrypting ${renditions.reduce((sum, r) => sum + r.segments.length, 0)} segment DEKs with KMS...`);

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
        poster: poster || null, // Base64 thumbnail
        posterWalrusUri: posterWalrusUri || null, // DEPRECATED
        posterBlobObjectId: posterBlobObjectId || null, // Mainnet only
        posterEndEpoch: posterEndEpoch, // Mainnet only
        duration,
        network: network || 'mainnet', // Save Walrus network (defaults to mainnet)
        encryptionType: encryptionType || 'per-video', // Save encryption type (defaults to per-video)
        sealObjectId: sealObjectId || null, // Save SEAL channel ID for subscription videos
        creatorId,
        creatorConfigs: {
          create: creatorConfigs?.map((config) => ({
            objectId: config.objectId,
            chain: config.chain,
            coinType: config.coinType,
            pricePerView: config.pricePerView,
            decimals: config.decimals,
            metadata: config.metadata || null,
          })) || [],
        },
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
                    // Handle both DEK and SEAL encryption
                    let dekEnc: any = null;
                    let iv: any = null;
                    let sealDocumentId: string | null = null;
                    let sealBlobId: string | null = null;

                    if (segment.dek && segment.iv) {
                      // DEK encryption (per-video or both)
                      const dekPlain = Buffer.from(segment.dek, 'base64');
                      if (dekPlain.length !== 16) {
                        throw new Error(`Invalid DEK size: ${dekPlain.length} bytes (expected 16)`);
                      }
                      const dekEncrypted = await encryptDek(new Uint8Array(dekPlain));
                      dekEnc = Buffer.from(new Uint8Array(dekEncrypted)) as any;
                      iv = Buffer.from(new Uint8Array(Buffer.from(segment.iv, 'base64'))) as any;
                    }

                    if (segment.sealDocumentId && segment.sealBlobId) {
                      // SEAL encryption (subscription-acl or both)
                      sealDocumentId = segment.sealDocumentId;
                      sealBlobId = segment.sealBlobId;
                    }

                    return {
                      segIdx: segment.segIdx,
                      walrusUri: segment.walrusUri,
                      blobObjectId: segment.blobObjectId || null, // Mainnet only
                      dekEnc, // Store KMS-encrypted DEK (null for SEAL-only)
                      iv, // Store IV (null for SEAL-only)
                      sealDocumentId, // Store SEAL document ID (null for DEK-only)
                      sealBlobId, // Store SEAL blob ID (null for DEK-only)
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
        creatorConfigs: true,
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
        poster: video.poster,
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
