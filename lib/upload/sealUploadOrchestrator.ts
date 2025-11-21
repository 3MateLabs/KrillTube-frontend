/**
 * SEAL Upload Orchestrator
 * Handles encryption and upload for subscription-based videos
 *
 * Parallel flow to DEK upload:
 * - Uses same transcoded segments
 * - Encrypts with SEAL (threshold encryption)
 * - Uploads to Walrus
 * - Returns SEAL metadata instead of DEK/IV
 */

'use client';

import { TranscodeResult } from '@/lib/transcode/clientTranscode';
import {
  initializeSealClient,
  generateSealDocumentId,
  encryptWithSeal,
} from '@/lib/seal';
import { SEAL_CONFIG } from '@/lib/seal/config';
import { UploadProgress } from './clientUploadOrchestrator';

export interface SealSegment {
  identifier: string; // e.g., "720p_seg_0", "720p_init"
  data: Uint8Array | null; // encrypted data (nullable after upload)
  sealDocumentId: string; // Document ID for SEAL
  backupKey: string; // Hex-encoded backup key
  quality: string;
  segIdx: number;
  duration: number;
  size: number;
}

export interface SealUploadResult {
  videoId: string;
  walrusMasterUri: string;
  masterBlobObjectId?: string;
  posterWalrusUri?: string;
  posterBlobObjectId?: string;
  duration: number;
  renditions: Array<{
    quality: string;
    resolution: string;
    bitrate: number;
    walrusPlaylistUri: string;
    playlistBlobObjectId?: string;
    segmentCount: number;
    segments: Array<{
      segIdx: number;
      walrusUri: string;
      blobObjectId?: string;
      sealDocumentId: string; // SEAL metadata
      sealBlobId: string; // SEAL metadata
      duration: number;
      size: number;
    }>;
  }>;
  sealObjectId: string; // Creator's channel ID
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
}

/**
 * Upload video with SEAL encryption for subscription-based access
 */
export async function uploadVideoWithSEAL(
  transcoded: TranscodeResult,
  creatorSealObjectId: string,
  qualities: string[],
  signAndExecute: any,
  walletAddress: string,
  options: {
    network?: 'mainnet' | 'testnet';
    epochs?: number;
    onProgress?: (progress: UploadProgress) => void;
  }
): Promise<SealUploadResult> {
  const { network = 'mainnet', epochs = 5, onProgress } = options;

  console.log('[SEAL Upload] Starting SEAL upload flow:', {
    channelId: creatorSealObjectId,
    network,
    epochs,
    segmentCount: transcoded.segments.length,
  });

  const aggregatorUrl =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ||
    (network === 'testnet'
      ? 'https://aggregator.walrus-testnet.walrus.space'
      : 'https://aggregator.mainnet.walrus.mirai.cloud');

  // Validate SEAL configuration
  const packageId = SEAL_CONFIG.PACKAGE_ID;
  if (!packageId || packageId === '0x0') {
    throw new Error('SEAL package ID not configured');
  }

  // Initialize SEAL client
  const sealClient = initializeSealClient({
    network,
    packageId,
  });

  console.log('[SEAL Upload] SEAL client initialized');

  // Step 1: Encrypt segments with SEAL
  onProgress?.({
    stage: 'encrypting',
    percent: 40,
    message: 'Encrypting segments with SEAL...',
  });

  const sealSegments: SealSegment[] = [];
  const videoId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  console.log('[SEAL Upload] Generated video ID:', videoId);
  console.log('[SEAL Upload] Encrypting segments...');

  try {
    for (let i = 0; i < transcoded.segments.length; i++) {
      const seg = transcoded.segments[i];
      const identifier =
        seg.type === 'init' ? `${seg.quality}_init` : `${seg.quality}_seg_${seg.segIdx}`;

      console.log(
        `[SEAL Upload] Encrypting segment ${i + 1}/${transcoded.segments.length}: ${identifier} (${(seg.data.length / 1024).toFixed(2)}KB)`
      );

      // Generate SEAL document ID: [channel_id][video_id][segment_identifier][nonce]
      const documentId = generateSealDocumentId(
        creatorSealObjectId,
        `${videoId}_${identifier}`
      );

      console.log(`[SEAL Upload] Document ID: ${documentId.slice(0, 16)}...`);

      // Encrypt with SEAL (1-of-1 threshold)
      const { encryptedData, backupKey } = await encryptWithSeal(
        sealClient,
        packageId,
        documentId,
        seg.data,
        1 // 1-of-1 threshold
      );

      console.log(
        `[SEAL Upload] ✓ Encrypted ${identifier} (${(encryptedData.length / 1024).toFixed(2)}KB encrypted)`
      );

      sealSegments.push({
        identifier,
        data: encryptedData,
        sealDocumentId: documentId,
        backupKey,
        quality: seg.quality,
        segIdx: seg.segIdx,
        duration: seg.duration,
        size: encryptedData.length,
      });

      const progress = 40 + ((i + 1) / transcoded.segments.length) * 20; // 40-60%
      onProgress?.({
        stage: 'encrypting',
        percent: progress,
        message: `SEAL encrypted ${i + 1}/${transcoded.segments.length} segments`,
      });
    }

    console.log('[SEAL Upload] ✓ All segments encrypted with SEAL');
  } catch (encryptError) {
    console.error('[SEAL Upload] Encryption failed:', encryptError);
    throw new Error(
      `SEAL encryption failed: ${encryptError instanceof Error ? encryptError.message : String(encryptError)}`
    );
  }

  // Step 2: Upload SEAL-encrypted segments to Walrus
  onProgress?.({
    stage: 'uploading',
    percent: 60,
    message: 'Uploading SEAL-encrypted segments to Walrus...',
  });

  console.log('[SEAL Upload] Uploading segments via Walrus SDK...');

  const { uploadMultipleBlobsWithWallet } = await import('@/lib/client-walrus-sdk');

  // Prepare blobs for upload
  const blobsToUpload = sealSegments.map((seg) => ({
    contents: seg.data!,
    identifier: seg.identifier,
  }));

  const segmentUploadResults: Array<{
    identifier: string;
    blobId: string;
    blobObjectId: string;
  }> = [];

  try {
    // Upload segments in parallel batches
    const PARALLEL_BATCHES = 4;
    const SEGMENTS_PER_BATCH = 5;
    const TOTAL_BATCH_SIZE = PARALLEL_BATCHES * SEGMENTS_PER_BATCH;

    console.log(
      `[SEAL Upload] Parallel upload: ${PARALLEL_BATCHES} batches × ${SEGMENTS_PER_BATCH} segments = ${TOTAL_BATCH_SIZE} at once`
    );

    for (let i = 0; i < blobsToUpload.length; i += TOTAL_BATCH_SIZE) {
      const parallelBatches: Array<typeof blobsToUpload> = [];
      for (let j = 0; j < PARALLEL_BATCHES; j++) {
        const batchStart = i + j * SEGMENTS_PER_BATCH;
        const batchEnd = Math.min(batchStart + SEGMENTS_PER_BATCH, blobsToUpload.length);

        if (batchStart < blobsToUpload.length) {
          parallelBatches.push(blobsToUpload.slice(batchStart, batchEnd));
        }
      }

      const progress =
        60 +
        ((i + parallelBatches.reduce((sum, b) => sum + b.length, 0)) / blobsToUpload.length) *
          25; // 60-85%

      onProgress?.({
        stage: 'uploading',
        percent: progress,
        message: `Uploading SEAL segments ${i + 1}-${Math.min(i + TOTAL_BATCH_SIZE, blobsToUpload.length)}/${blobsToUpload.length}...`,
      });

      console.log(`[SEAL Upload] Starting ${parallelBatches.length} parallel uploads...`);

      const allResults = await Promise.all(
        parallelBatches.map((batch, idx) => {
          console.log(`[SEAL Upload] Batch ${idx + 1}: Uploading ${batch.length} segments...`);
          return uploadMultipleBlobsWithWallet(batch, signAndExecute, walletAddress, {
            network,
            epochs,
            deletable: true,
          });
        })
      );

      // Flatten results
      allResults.forEach((results) => {
        segmentUploadResults.push(...results);
      });

      // Free segment data
      const uploadedCount = parallelBatches.reduce((sum, b) => sum + b.length, 0);
      for (let j = i; j < i + uploadedCount; j++) {
        // @ts-ignore
        sealSegments[j].data = null;
      }

      console.log(`[SEAL Upload] ✓ Uploaded ${uploadedCount} SEAL segments`);
    }

    // Upload poster if exists
    let posterBlobId: string | undefined;
    let posterBlobObjectId: string | undefined;
    if (transcoded.poster) {
      console.log(`[SEAL Upload] Uploading poster...`);
      const posterResults = await uploadMultipleBlobsWithWallet(
        [{ contents: transcoded.poster, identifier: 'poster' }],
        signAndExecute,
        walletAddress,
        { network, epochs, deletable: true }
      );
      posterBlobId = posterResults[0].blobId;
      posterBlobObjectId = posterResults[0].blobObjectId;
      console.log('[SEAL Upload] ✓ Poster uploaded');
    }

    console.log('[SEAL Upload] ✓ All SEAL segments uploaded');
  } catch (uploadError) {
    console.error('[SEAL Upload] Upload failed:', uploadError);
    throw uploadError;
  }

  // Build blob ID map
  const blobIdMap = new Map<string, string>();
  segmentUploadResults.forEach((result) => {
    blobIdMap.set(result.identifier, result.blobId);
  });

  // Step 3: Build playlists
  onProgress?.({
    stage: 'uploading',
    percent: 85,
    message: 'Building SEAL playlists...',
  });

  const qualityGroups = new Map<string, SealSegment[]>();
  sealSegments.forEach((seg) => {
    if (!qualityGroups.has(seg.quality)) {
      qualityGroups.set(seg.quality, []);
    }
    qualityGroups.get(seg.quality)!.push(seg);
  });

  const playlistBlobs: Array<{ contents: Uint8Array; identifier: string }> = [];

  for (const [quality, segments] of qualityGroups) {
    let playlistContent =
      '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:4\n#EXT-X-PLAYLIST-TYPE:VOD\n';

    const initBlobId = blobIdMap.get(`${quality}_init`);
    if (!initBlobId) {
      throw new Error(`Missing blob ID for ${quality}_init`);
    }
    playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/${initBlobId}"\n`;

    const mediaSegments = segments.filter((s) => s.segIdx >= 0).sort((a, b) => a.segIdx - b.segIdx);
    for (const seg of mediaSegments) {
      const blobId = blobIdMap.get(`${quality}_seg_${seg.segIdx}`);
      if (!blobId) {
        throw new Error(`Missing blob ID for ${quality}_seg_${seg.segIdx}`);
      }
      playlistContent += `#EXTINF:${seg.duration},\n${aggregatorUrl}/v1/blobs/${blobId}\n`;
    }

    playlistContent += '#EXT-X-ENDLIST\n';

    playlistBlobs.push({
      contents: new TextEncoder().encode(playlistContent),
      identifier: `${quality}_playlist`,
    });
  }

  console.log(`[SEAL Upload] Built ${qualityGroups.size} SEAL playlists`);

  // Step 4: Upload playlists
  onProgress?.({
    stage: 'uploading',
    percent: 90,
    message: 'Uploading SEAL playlists...',
  });

  const playlistResults = await uploadMultipleBlobsWithWallet(
    playlistBlobs,
    signAndExecute,
    walletAddress,
    { network, epochs, deletable: true }
  );

  console.log('[SEAL Upload] ✓ Playlists uploaded');

  const playlistBlobIdMap = new Map<string, string>();
  playlistResults.forEach((result) => {
    playlistBlobIdMap.set(result.identifier, result.blobId);
  });

  // Build master playlist
  const resolutionMap: Record<string, string> = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480',
    '360p': '640x360',
  };
  const bitrateMap: Record<string, number> = {
    '1080p': 5000000,
    '720p': 2800000,
    '480p': 1400000,
    '360p': 800000,
  };

  let masterContent = '#EXTM3U\n#EXT-X-VERSION:7\n\n';
  for (const quality of qualities) {
    const resolution = resolutionMap[quality] || '1280x720';
    const bitrate = bitrateMap[quality] || 2800000;
    const playlistBlobId = playlistBlobIdMap.get(`${quality}_playlist`);

    if (!playlistBlobId) {
      throw new Error(`Missing blob ID for ${quality}_playlist`);
    }

    const playlistUrl = `${aggregatorUrl}/v1/blobs/${playlistBlobId}`;
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate},RESOLUTION=${resolution}\n${playlistUrl}\n`;
  }

  // Step 5: Upload master playlist
  onProgress?.({
    stage: 'uploading',
    percent: 95,
    message: 'Uploading master playlist...',
  });

  const masterResults = await uploadMultipleBlobsWithWallet(
    [{ contents: new TextEncoder().encode(masterContent), identifier: 'master_playlist' }],
    signAndExecute,
    walletAddress,
    { network, epochs, deletable: true }
  );

  console.log('[SEAL Upload] ✓ Master playlist uploaded');

  const masterWalrusUri = `${aggregatorUrl}/v1/blobs/${masterResults[0].blobId}`;
  const masterBlobObjectId = masterResults[0].blobObjectId;
  const posterWalrusUri = posterBlobId ? `${aggregatorUrl}/v1/blobs/${posterBlobId}` : undefined;
  const masterBlobId = masterResults[0].blobId;

  // Build result
  onProgress?.({
    stage: 'registering',
    percent: 97,
    message: 'Preparing SEAL metadata...',
  });

  const segmentBlobObjectIdMap = new Map<string, string>();
  segmentUploadResults.forEach((result) => {
    segmentBlobObjectIdMap.set(result.identifier, result.blobObjectId);
  });

  const playlistBlobObjectIdMap = new Map<string, string>();
  playlistResults.forEach((result) => {
    playlistBlobObjectIdMap.set(result.identifier, result.blobObjectId);
  });

  const renditions = qualities.map((quality) => {
    const qualitySegments = sealSegments.filter((s) => s.quality === quality);
    const playlistBlobId = playlistBlobIdMap.get(`${quality}_playlist`);
    const playlistBlobObjectId = playlistBlobObjectIdMap.get(`${quality}_playlist`);

    if (!playlistBlobId) {
      throw new Error(`Missing blob ID for ${quality}_playlist`);
    }

    return {
      quality,
      resolution: resolutionMap[quality] || '1280x720',
      bitrate: bitrateMap[quality] || 2800000,
      walrusPlaylistUri: `${aggregatorUrl}/v1/blobs/${playlistBlobId}`,
      playlistBlobObjectId: network === 'mainnet' ? playlistBlobObjectId : undefined,
      segmentCount: qualitySegments.length,
      segments: qualitySegments.map((seg) => {
        const identifier =
          seg.segIdx === -1 ? `${quality}_init` : `${quality}_seg_${seg.segIdx}`;
        const segBlobId = blobIdMap.get(identifier);
        const segBlobObjectId = segmentBlobObjectIdMap.get(identifier);
        if (!segBlobId) {
          throw new Error(`Missing blob ID for ${identifier}`);
        }
        return {
          segIdx: seg.segIdx,
          walrusUri: `${aggregatorUrl}/v1/blobs/${segBlobId}`,
          blobObjectId: network === 'mainnet' ? segBlobObjectId : undefined,
          sealDocumentId: seg.sealDocumentId, // SEAL metadata
          sealBlobId: segBlobId, // SEAL metadata
          duration: seg.duration,
          size: seg.size,
        };
      }),
    };
  });

  const result: SealUploadResult = {
    videoId: masterBlobId,
    walrusMasterUri: masterWalrusUri,
    masterBlobObjectId: network === 'mainnet' ? masterBlobObjectId : undefined,
    posterWalrusUri,
    posterBlobObjectId: network === 'mainnet' ? posterBlobObjectId : undefined,
    duration: transcoded.duration,
    renditions,
    sealObjectId: creatorSealObjectId,
    paymentInfo: {
      paidWal: '0',
      paidMist: '0',
      walletAddress,
      transactionIds: {
        segments: segmentUploadResults.map((r) => r.blobObjectId).join(','),
        playlists: playlistResults.map((r) => r.blobObjectId).join(','),
        master: masterResults[0].blobObjectId,
      },
    },
  };

  console.log('[SEAL Upload] ✓ SEAL upload complete!');
  console.log('[SEAL Upload] Video ID:', result.videoId);
  console.log('[SEAL Upload] Channel ID:', result.sealObjectId);

  return result;
}
