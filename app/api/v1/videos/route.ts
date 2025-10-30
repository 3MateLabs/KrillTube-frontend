/**
 * API Route: /v1/videos (V2 Encrypted Videos)
 * Register and list encrypted videos
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { walrusClient } from '@/lib/walrus';
import { getEncryptedResult, clearEncryptedResult } from '@/lib/server/encryptedResultCache';
import { estimateVideoCost, formatCost, getCostBreakdown } from '@/lib/walrus-cost-simple';
import { readFile } from 'fs/promises';

/**
 * POST /v1/videos
 * Register a new encrypted video after transcoding and encryption
 *
 * Expected flow:
 * 1. Client uploads video to /api/transcode (gets back encrypted segments)
 * 2. Client calls this endpoint with the encrypted result
 * 3. We upload encrypted segments to Walrus
 * 4. We store video metadata + encrypted root secret in database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      videoId,
      title,
      creatorId,
    }: {
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

    console.log(`[API Videos] Registering encrypted video: ${videoId}`);
    console.log(`[API Videos] Title: ${title}`);

    // Retrieve full encrypted result from cache
    const encryptedResult = getEncryptedResult(videoId);
    if (!encryptedResult) {
      return NextResponse.json(
        { error: 'Encrypted result not found. Please transcode the video first.' },
        { status: 404 }
      );
    }

    console.log(`[API Videos] Renditions: ${encryptedResult.renditions.length}`);

    // Step 1: Upload encrypted segments to Walrus using quilts
    console.log(`[API Videos] Starting Walrus upload...`);

    const formData = new FormData();
    const fileMap = new Map<
      string,
      {
        renditionIdx: number;
        type: 'init' | 'segment';
        segIdx?: number;
        iv: Buffer;
        originalSize: number;
        encryptedSize: number;
      }
    >();

    // Collect all encrypted segments
    let totalSize = 0;
    for (let rendIdx = 0; rendIdx < encryptedResult.renditions.length; rendIdx++) {
      const rendition = encryptedResult.renditions[rendIdx];
      console.log(`[API Videos] Preparing ${rendition.quality} encrypted files...`);

      // Add encrypted init segment if present
      if (rendition.initSegment) {
        const initData = await readFile(rendition.initSegment.encryptedPath);
        const identifier = `${rendition.quality}_init`;
        formData.append(identifier, new Blob([initData]));
        fileMap.set(identifier, {
          renditionIdx: rendIdx,
          type: 'init',
          iv: rendition.initSegment.iv,
          originalSize: rendition.initSegment.originalSize,
          encryptedSize: rendition.initSegment.encryptedSize,
        });
        totalSize += initData.length;
      }

      // Add encrypted media segments
      for (const segment of rendition.segments) {
        const segData = await readFile(segment.encryptedPath);
        const identifier = `${rendition.quality}_seg_${segment.segIdx}`;
        formData.append(identifier, new Blob([segData]));
        fileMap.set(identifier, {
          renditionIdx: rendIdx,
          type: 'segment',
          segIdx: segment.segIdx,
          iv: segment.iv,
          originalSize: segment.originalSize,
          encryptedSize: segment.encryptedSize,
        });
        totalSize += segData.length;
      }
    }

    // Upload poster if present (not encrypted)
    let posterWalrusUri: string | undefined;
    if (encryptedResult.posterPath) {
      const posterData = await readFile(encryptedResult.posterPath);
      const posterIdentifier = 'poster';
      formData.append(posterIdentifier, new Blob([posterData]));
      totalSize += posterData.length;
    }

    // Calculate estimated cost before upload
    console.log(`[API Videos] Calculating storage cost...`);
    const costEstimate = estimateVideoCost(totalSize);
    console.log(`[API Videos] Estimated cost: ${formatCost(costEstimate)}`);
    const costBreakdown = getCostBreakdown(costEstimate);
    console.log(`[API Videos] Cost breakdown - Storage: ${costBreakdown.storage} SUI, Write: ${costBreakdown.write} SUI`);

    // Upload all files as a quilt to Walrus
    console.log(`[API Videos] Uploading ${fileMap.size} encrypted files to Walrus...`);
    console.log(`[API Videos] File identifiers:`, Array.from(fileMap.keys()));
    const publisherUrl = walrusClient['publisherUrl'];
    const aggregatorUrl = walrusClient['aggregatorUrl'];

    const quiltResponse = await fetch(`${publisherUrl}/v1/quilts?epochs=1`, {
      method: 'PUT',
      body: formData,
    });

    if (!quiltResponse.ok) {
      const errorText = await quiltResponse.text();
      throw new Error(`Walrus quilt upload failed: ${quiltResponse.status} - ${errorText}`);
    }

    const quiltResult = (await quiltResponse.json()) as {
      storedQuiltBlobs?: Array<{ identifier: string; quiltPatchId: string }>;
    };

    if (!quiltResult.storedQuiltBlobs || quiltResult.storedQuiltBlobs.length === 0) {
      throw new Error('No quilt blobs in Walrus response');
    }

    console.log(
      `[API Videos] ✓ Uploaded ${quiltResult.storedQuiltBlobs.length} files to Walrus`
    );
    console.log(`[API Videos] Returned identifiers:`, quiltResult.storedQuiltBlobs.map(b => b.identifier));

    // Step 2: Map quilt patch IDs to files
    const patchIdMap = new Map<string, string>();
    for (const blob of quiltResult.storedQuiltBlobs) {
      patchIdMap.set(blob.identifier, blob.quiltPatchId);
    }

    // Get poster URI if uploaded
    if (encryptedResult.posterPath) {
      const posterPatchId = patchIdMap.get('poster');
      if (posterPatchId) {
        posterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${posterPatchId}`;
      }
    }

    // Step 3: Build rendition playlists with Walrus URIs
    const renditionPlaylists: string[] = [];
    for (let rendIdx = 0; rendIdx < encryptedResult.renditions.length; rendIdx++) {
      const rendition = encryptedResult.renditions[rendIdx];

      let playlistContent = '#EXTM3U\n';
      playlistContent += '#EXT-X-VERSION:7\n';
      playlistContent += '#EXT-X-TARGETDURATION:4\n';
      playlistContent += '#EXT-X-PLAYLIST-TYPE:VOD\n';
      playlistContent += '#EXT-X-MEDIA-SEQUENCE:0\n';

      // Add init segment if present
      if (rendition.initSegment) {
        const initPatchId = patchIdMap.get(`${rendition.quality}_init`);
        if (!initPatchId) {
          console.error(`[API Videos] Missing init patch ID for ${rendition.quality} in playlist`);
          console.error(`[API Videos] Available patch IDs:`, Array.from(patchIdMap.keys()));
          throw new Error(`Missing Walrus patch ID for init segment: ${rendition.quality}_init`);
        }
        const initUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}`;
        playlistContent += `#EXT-X-MAP:URI="${initUri}"\n`;
      }

      // Add media segments
      for (const segment of rendition.segments) {
        const segPatchId = patchIdMap.get(`${rendition.quality}_seg_${segment.segIdx}`);
        if (!segPatchId) {
          throw new Error(
            `Missing patch ID for ${rendition.quality}_seg_${segment.segIdx}`
          );
        }
        const segUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}`;
        playlistContent += `#EXTINF:4.0,\n`;
        playlistContent += `${segUri}\n`;
      }

      playlistContent += '#EXT-X-ENDLIST\n';
      renditionPlaylists.push(playlistContent);
    }

    // Step 4: Upload rendition playlists as a second quilt
    const playlistFormData = new FormData();
    for (let i = 0; i < renditionPlaylists.length; i++) {
      const rendition = encryptedResult.renditions[i];
      const identifier = `${rendition.quality}_playlist`;
      playlistFormData.append(identifier, new Blob([renditionPlaylists[i]]));
    }

    console.log(`[API Videos] Uploading ${renditionPlaylists.length} playlists...`);
    const playlistQuiltResponse = await fetch(`${publisherUrl}/v1/quilts?epochs=1`, {
      method: 'PUT',
      body: playlistFormData,
    });

    if (!playlistQuiltResponse.ok) {
      const errorText = await playlistQuiltResponse.text();
      throw new Error(
        `Playlist quilt upload failed: ${playlistQuiltResponse.status} - ${errorText}`
      );
    }

    const playlistQuiltResult = (await playlistQuiltResponse.json()) as {
      storedQuiltBlobs?: Array<{ identifier: string; quiltPatchId: string }>;
    };

    if (!playlistQuiltResult.storedQuiltBlobs) {
      throw new Error('No playlist quilt blobs in response');
    }

    console.log(
      `[API Videos] ✓ Uploaded ${playlistQuiltResult.storedQuiltBlobs.length} playlists`
    );

    // Map playlist patch IDs
    const playlistPatchIdMap = new Map<string, string>();
    for (const blob of playlistQuiltResult.storedQuiltBlobs) {
      playlistPatchIdMap.set(blob.identifier, blob.quiltPatchId);
    }

    // Step 5: Generate master playlist with real playlist URLs
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

    // Step 6: Upload master playlist
    console.log(`[API Videos] Uploading master playlist...`);
    const masterFormData = new FormData();
    masterFormData.append('master_playlist', new Blob([masterContent]));

    const masterQuiltResponse = await fetch(`${publisherUrl}/v1/quilts?epochs=1`, {
      method: 'PUT',
      body: masterFormData,
    });

    if (!masterQuiltResponse.ok) {
      const errorText = await masterQuiltResponse.text();
      throw new Error(
        `Master playlist upload failed: ${masterQuiltResponse.status} - ${errorText}`
      );
    }

    const masterQuiltResult = (await masterQuiltResponse.json()) as {
      storedQuiltBlobs?: Array<{ identifier: string; quiltPatchId: string }>;
    };

    if (!masterQuiltResult.storedQuiltBlobs || masterQuiltResult.storedQuiltBlobs.length === 0) {
      throw new Error('No master playlist quilt blob in response');
    }

    const masterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuiltResult.storedQuiltBlobs[0].quiltPatchId}`;

    console.log(`[API Videos] ✓ Master playlist uploaded: ${masterWalrusUri}`);

    // Step 7: Store video metadata in database
    console.log(`[API Videos] Storing video metadata in database...`);

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

            // Build segments array with init segment (-1) and media segments
            const segmentsToCreate = [];

            // Add init segment if present
            if (rendition.initSegment) {
              const initPatchId = patchIdMap.get(`${rendition.quality}_init`);
              if (!initPatchId) {
                console.error(`[API Videos] Missing init patch ID for ${rendition.quality}`);
                console.error(`[API Videos] Available patch IDs:`, Array.from(patchIdMap.keys()));
                throw new Error(`Missing Walrus patch ID for init segment: ${rendition.quality}_init`);
              }
              const initUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}`;
              segmentsToCreate.push({
                segIdx: -1, // Init segments use -1
                walrusUri: initUri,
                iv: new Uint8Array(rendition.initSegment.iv),
                duration: 0, // Init segments have no duration
                size: rendition.initSegment.encryptedSize,
              });
            }

            // Add media segments
            for (const segment of rendition.segments) {
              const segPatchId = patchIdMap.get(
                `${rendition.quality}_seg_${segment.segIdx}`
              );
              const segUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}`;
              segmentsToCreate.push({
                segIdx: segment.segIdx,
                walrusUri: segUri,
                iv: new Uint8Array(segment.iv),
                duration: 4.0, // TODO: Get actual duration from transcoder
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

    console.log(`[API Videos] ✓ Video registered: ${video.id}`);

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
        totalSize,
        totalSegments: video.renditions.reduce((sum, r) => sum + r.segments.length, 0),
      },
      cost: {
        totalSui: costBreakdown.total,
        storageSui: costBreakdown.storage,
        writeSui: costBreakdown.write,
        sizeFormatted: costBreakdown.sizeFormatted,
        epochs: costBreakdown.epochs,
        network: costBreakdown.network,
      },
    });
  } catch (error) {
    console.error('[API Videos] Error registering video:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register video',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /v1/videos
 * List encrypted videos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (creatorId) where.creatorId = creatorId;

    // Query videos
    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          renditions: {
            select: {
              id: true,
              name: true,
              resolution: true,
              bitrate: true,
            },
          },
        },
      }),
      prisma.video.count({ where }),
    ]);

    return NextResponse.json({
      videos: videos.map((video) => ({
        id: video.id,
        title: video.title,
        creatorId: video.creatorId,
        walrusMasterUri: video.walrusMasterUri,
        posterWalrusUri: video.posterWalrusUri,
        duration: video.duration,
        createdAt: video.createdAt,
        renditions: video.renditions,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + videos.length < total,
      },
    });
  } catch (error) {
    console.error('[API Videos] Error listing videos:', error);
    return NextResponse.json(
      { error: 'Failed to list videos' },
      { status: 500 }
    );
  }
}
