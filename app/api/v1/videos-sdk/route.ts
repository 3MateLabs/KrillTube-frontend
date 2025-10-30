/**
 * API Route: /v1/videos-sdk
 * Video upload using Walrus SDK with WAL token payment
 */

// Force dynamic rendering - don't pre-render this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEncryptedResult, clearEncryptedResult } from '@/lib/server/encryptedResultCache';
import { readFile } from 'fs/promises';

/**
 * POST /v1/videos-sdk
 * Register encrypted video using Walrus SDK (pays in WAL tokens)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, title, creatorId }: {
      videoId: string;
      title: string;
      creatorId: string;
    } = body;

    if (!videoId || !title || !creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, title, creatorId' },
        { status: 400 }
      );
    }

    console.log(`[API Videos SDK] Registering encrypted video: ${videoId}`);
    console.log(`[API Videos SDK] Payment: WAL tokens via Sui transaction`);

    // Dynamically import Walrus SDK and cost calculator
    const { uploadQuiltSDK, suiWalrusClient, getSigner } = await import('@/lib/walrus-sdk');
    const { estimateVideoCost, formatCost, getCostBreakdown } = await import('@/lib/walrus-cost');

    // Get signer for WAL payment
    let signer;
    try {
      signer = getSigner();
      const signerAddress = signer.toSuiAddress();
      console.log(`[API Videos SDK] Using wallet: ${signerAddress}`);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Wallet not configured. Set WALLET_MNEMONIC or WALLET_PRIVATE_KEY in .env',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Retrieve encrypted result from cache
    const encryptedResult = getEncryptedResult(videoId);
    if (!encryptedResult) {
      return NextResponse.json(
        { error: 'Encrypted result not found. Please transcode the video first.' },
        { status: 404 }
      );
    }

    // Step 1: Collect all encrypted files
    console.log(`[API Videos SDK] Preparing encrypted files...`);
    const segmentBlobs: Array<{
      contents: Uint8Array;
      identifier: string;
    }> = [];

    let totalSize = 0;
    const fileMap = new Map<string, {
      renditionIdx: number;
      type: 'init' | 'segment';
      segIdx?: number;
      iv: Buffer;
    }>();

    for (let rendIdx = 0; rendIdx < encryptedResult.renditions.length; rendIdx++) {
      const rendition = encryptedResult.renditions[rendIdx];

      // Add encrypted init segment
      if (rendition.initSegment) {
        const initData = await readFile(rendition.initSegment.encryptedPath);
        const identifier = `${rendition.quality}_init`;
        segmentBlobs.push({
          contents: new Uint8Array(initData),
          identifier,
        });
        fileMap.set(identifier, {
          renditionIdx: rendIdx,
          type: 'init',
          iv: rendition.initSegment.iv,
        });
        totalSize += initData.length;
      }

      // Add encrypted media segments
      for (const segment of rendition.segments) {
        const segData = await readFile(segment.encryptedPath);
        const identifier = `${rendition.quality}_seg_${segment.segIdx}`;
        segmentBlobs.push({
          contents: new Uint8Array(segData),
          identifier,
        });
        fileMap.set(identifier, {
          renditionIdx: rendIdx,
          type: 'segment',
          segIdx: segment.segIdx,
          iv: segment.iv,
        });
        totalSize += segData.length;
      }
    }

    // Add poster if exists
    let posterIdentifier: string | undefined;
    if (encryptedResult.posterPath) {
      const posterData = await readFile(encryptedResult.posterPath);
      posterIdentifier = 'poster';
      segmentBlobs.push({
        contents: new Uint8Array(posterData),
        identifier: posterIdentifier,
      });
      totalSize += posterData.length;
    }

    // Step 2: Calculate cost
    console.log(`[API Videos SDK] Calculating WAL cost...`);
    const costEstimate = await estimateVideoCost(totalSize);
    console.log(`[API Videos SDK] Estimated cost: ${formatCost(costEstimate)}`);
    const costBreakdown = getCostBreakdown(costEstimate);

    // Step 3: Upload segments as quilt (pays in WAL)
    console.log(`[API Videos SDK] Uploading ${segmentBlobs.length} encrypted files via SDK...`);
    console.log(`[API Videos SDK] This will deduct WAL from your wallet...`);

    const segmentQuilt = await uploadQuiltSDK(segmentBlobs, { signer });

    // Map segment patch IDs
    const segmentPatchIdMap = new Map<string, string>();
    for (const patch of segmentQuilt.index.patches) {
      segmentPatchIdMap.set(patch.identifier, patch.patchId);
    }

    // Get aggregator URL for building URIs
    const aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus.space';

    // Get poster URI
    let posterWalrusUri: string | undefined;
    if (posterIdentifier) {
      const posterPatchId = segmentPatchIdMap.get(posterIdentifier);
      if (posterPatchId) {
        posterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${posterPatchId}`;
      }
    }

    // Step 4: Build rendition playlists
    const renditionPlaylists: Array<{ content: string; identifier: string }> = [];

    for (let rendIdx = 0; rendIdx < encryptedResult.renditions.length; rendIdx++) {
      const rendition = encryptedResult.renditions[rendIdx];

      let playlistContent = '#EXTM3U\n';
      playlistContent += '#EXT-X-VERSION:7\n';
      playlistContent += '#EXT-X-TARGETDURATION:4\n';
      playlistContent += '#EXT-X-PLAYLIST-TYPE:VOD\n';
      playlistContent += '#EXT-X-MEDIA-SEQUENCE:0\n';

      // Add init segment
      if (rendition.initSegment) {
        const initPatchId = segmentPatchIdMap.get(`${rendition.quality}_init`);
        if (!initPatchId) {
          throw new Error(`Missing patch ID for ${rendition.quality}_init`);
        }
        const initUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}`;
        playlistContent += `#EXT-X-MAP:URI="${initUri}"\n`;
      }

      // Add media segments
      for (const segment of rendition.segments) {
        const segPatchId = segmentPatchIdMap.get(`${rendition.quality}_seg_${segment.segIdx}`);
        if (!segPatchId) {
          throw new Error(`Missing patch ID for ${rendition.quality}_seg_${segment.segIdx}`);
        }
        const segUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}`;
        playlistContent += `#EXTINF:4.0,\n`;
        playlistContent += `${segUri}\n`;
      }

      playlistContent += '#EXT-X-ENDLIST\n';
      renditionPlaylists.push({
        content: playlistContent,
        identifier: `${rendition.quality}_playlist`,
      });
    }

    // Step 5: Upload playlists as quilt (pays in WAL)
    console.log(`[API Videos SDK] Uploading ${renditionPlaylists.length} playlists...`);

    const playlistBlobs = renditionPlaylists.map((pl) => ({
      contents: new TextEncoder().encode(pl.content),
      identifier: pl.identifier,
    }));

    const playlistQuilt = await uploadQuiltSDK(playlistBlobs, { signer });

    // Map playlist patch IDs
    const playlistPatchIdMap = new Map<string, string>();
    for (const patch of playlistQuilt.index.patches) {
      playlistPatchIdMap.set(patch.identifier, patch.patchId);
    }

    // Step 6: Generate master playlist
    let masterContent = '#EXTM3U\n';
    masterContent += '#EXT-X-VERSION:7\n\n';

    for (const rendition of encryptedResult.renditions) {
      const playlistPatchId = playlistPatchIdMap.get(`${rendition.quality}_playlist`);
      if (!playlistPatchId) {
        throw new Error(`Missing playlist patch ID for ${rendition.quality}`);
      }
      const playlistUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchId}`;
      const [width, height] = rendition.resolution.split('x');
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},RESOLUTION=${width}x${height},CODECS="avc1.64001f,mp4a.40.2"\n`;
      masterContent += `${playlistUri}\n`;
    }

    // Step 7: Upload master playlist (pays in WAL)
    console.log(`[API Videos SDK] Uploading master playlist...`);

    const masterQuilt = await uploadQuiltSDK(
      [{
        contents: new TextEncoder().encode(masterContent),
        identifier: 'master_playlist',
      }],
      { signer }
    );

    const masterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuilt.index.patches[0].patchId}`;

    console.log(`[API Videos SDK] ✓ Master playlist uploaded: ${masterWalrusUri}`);

    // Step 8: Calculate actual costs
    const segmentCost = await suiWalrusClient.storageCost(
      segmentBlobs.reduce((sum, b) => sum + b.contents.length, 0),
      parseInt(process.env.WALRUS_EPOCHS || '200')
    );
    const playlistCost = await suiWalrusClient.storageCost(
      playlistBlobs.reduce((sum, b) => sum + b.contents.length, 0),
      parseInt(process.env.WALRUS_EPOCHS || '200')
    );
    const masterCost = await suiWalrusClient.storageCost(
      new TextEncoder().encode(masterContent).length,
      parseInt(process.env.WALRUS_EPOCHS || '200')
    );

    const totalPaidMist = segmentCost.totalCost + playlistCost.totalCost + masterCost.totalCost;
    const totalPaidWal = (Number(totalPaidMist) / 1_000_000_000).toFixed(6);

    // Step 9: Store video metadata in database
    console.log(`[API Videos SDK] Storing video metadata in database...`);

    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        walrusMasterUri: masterWalrusUri,
        posterWalrusUri,
        rootSecretEnc: new Uint8Array(encryptedResult.rootSecretEnc),
        duration: encryptedResult.duration,
        creatorId,
        renditions: {
          create: encryptedResult.renditions.map((rendition, rendIdx) => {
            const playlistPatchId = playlistPatchIdMap.get(`${rendition.quality}_playlist`);
            const playlistUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchId}`;

            const segmentsToCreate = [];

            // Add init segment
            if (rendition.initSegment) {
              const initPatchId = segmentPatchIdMap.get(`${rendition.quality}_init`);
              if (!initPatchId) {
                throw new Error(`Missing init patch ID for ${rendition.quality}`);
              }
              const initUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}`;
              segmentsToCreate.push({
                segIdx: -1,
                walrusUri: initUri,
                iv: new Uint8Array(rendition.initSegment.iv),
                duration: 0,
                size: rendition.initSegment.encryptedSize,
              });
            }

            // Add media segments
            for (const segment of rendition.segments) {
              const segPatchId = segmentPatchIdMap.get(`${rendition.quality}_seg_${segment.segIdx}`);
              const segUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}`;
              segmentsToCreate.push({
                segIdx: segment.segIdx,
                walrusUri: segUri,
                iv: new Uint8Array(segment.iv),
                duration: 4.0,
                size: segment.encryptedSize,
              });
            }

            return {
              name: rendition.quality,
              resolution: rendition.resolution,
              bitrate: rendition.bitrate,
              walrusPlaylistUri: playlistUri,
              segments: {
                create: segmentsToCreate,
              },
            };
          }),
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

    console.log(`[API Videos SDK] ✓ Video registered: ${video.id}`);
    console.log(`[API Videos SDK] ✓ Paid ${totalPaidWal} WAL for storage`);

    // Clear the cached encrypted result
    clearEncryptedResult(videoId);

    return NextResponse.json({
      success: true,
      paymentMethod: 'WAL tokens (Walrus SDK)',
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
        totalSize,
        totalSegments: video.renditions.reduce((sum, r) => sum + r.segments.length, 0),
      },
      payment: {
        paidWal: totalPaidWal,
        paidMist: totalPaidMist.toString(),
        walletAddress: signer.toSuiAddress(),
        transactionIds: {
          segments: segmentQuilt.blobObject.id.id,
          playlists: playlistQuilt.blobObject.id.id,
          master: masterQuilt.blobObject.id.id,
        },
      },
    });
  } catch (error) {
    console.error('[API Videos SDK] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register video',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
