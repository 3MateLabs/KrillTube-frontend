/**
 * Client-Side Upload Orchestrator
 * Handles complete flow: Transcode → Encrypt → Upload to Walrus → Register
 */

'use client';

import { transcodeVideo, type TranscodeResult } from '@/lib/transcode/clientTranscode';
import {
  generateRootSecret,
  generateIV,
  deriveSegmentDEK,
  encryptSegment,
  toBase64,
} from '@/lib/crypto/clientEncryption';
import { uploadQuiltWithWallet, uploadMultipleBlobsWithWallet } from '@/lib/client-walrus-sdk';

export interface UploadProgress {
  stage: 'transcoding' | 'encrypting' | 'uploading' | 'registering' | 'complete';
  percent: number;
  message: string;
}

export interface EncryptedSegment {
  identifier: string; // e.g., "720p_seg_0", "720p_init"
  data: Uint8Array; // encrypted data
  iv: string; // base64
  quality: string;
  segIdx: number;
  duration: number;
}

export interface ClientUploadResult {
  videoId: string;
  walrusMasterUri: string;
  posterWalrusUri?: string;
  rootSecretEnc: string; // base64 (NOT encrypted yet - will be encrypted with server pubkey)
  duration: number;
  renditions: Array<{
    quality: string;
    resolution: string;
    bitrate: number;
    walrusPlaylistUri: string;
    segmentCount: number;
    segments: Array<{
      segIdx: number;
      walrusUri: string;
      iv: string; // base64
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
}

/**
 * Complete client-side upload flow
 */
export async function uploadVideoClientSide(
  file: File,
  qualities: string[],
  signAndExecute: any,
  walletAddress: string,
  options: {
    network?: 'mainnet' | 'testnet';
    epochs?: number;
    onProgress?: (progress: UploadProgress) => void;
  }
): Promise<ClientUploadResult> {
  const { network = 'mainnet', epochs = 50, onProgress } = options;

  const aggregatorUrl =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
    'https://aggregator.mainnet.walrus.mirai.cloud';

  // Step 1: Transcode video
  onProgress?.({
    stage: 'transcoding',
    percent: 10,
    message: 'Transcoding video in browser...',
  });

  const transcoded = await transcodeVideo(file, {
    qualities,
    segmentDuration: 4,
    onProgress: (p) =>
      onProgress?.({
        stage: 'transcoding',
        percent: 10 + p * 0.3, // 10-40%
        message: `Transcoding... ${Math.round(p)}%`,
      }),
  });

  console.log(`[Upload] Transcoded ${transcoded.segments.length} segments`);

  // Step 2: Generate root secret and encrypt segments
  onProgress?.({
    stage: 'encrypting',
    percent: 40,
    message: 'Encrypting segments...',
  });

  const rootSecret = generateRootSecret();
  const encryptedSegments: EncryptedSegment[] = [];

  for (let i = 0; i < transcoded.segments.length; i++) {
    const seg = transcoded.segments[i];
    const identifier =
      seg.type === 'init' ? `${seg.quality}_init` : `${seg.quality}_seg_${seg.segIdx}`;

    // Derive DEK
    const dek = await deriveSegmentDEK(
      rootSecret,
      transcoded.videoId,
      seg.quality,
      seg.segIdx
    );

    // Generate IV
    const iv = generateIV();

    // Encrypt segment
    const encryptedData = await encryptSegment(dek, seg.data, iv);

    encryptedSegments.push({
      identifier,
      data: encryptedData,
      iv: toBase64(iv),
      quality: seg.quality,
      segIdx: seg.segIdx,
      duration: seg.duration,
    });

    const progress = 40 + ((i + 1) / transcoded.segments.length) * 20; // 40-60%
    onProgress?.({
      stage: 'encrypting',
      percent: progress,
      message: `Encrypted ${i + 1}/${transcoded.segments.length} segments`,
    });
  }

  console.log(`[Upload] Encrypted all segments`);

  // Step 3: Upload segments and poster first (to get patch IDs)
  onProgress?.({
    stage: 'uploading',
    percent: 60,
    message: 'Uploading segments to Walrus...',
  });

  // Collect segment blobs (NO playlists yet)
  const segmentBlobs: Array<{ contents: Uint8Array; identifier: string }> = [];

  encryptedSegments.forEach((seg) => {
    segmentBlobs.push({
      contents: seg.data,
      identifier: seg.identifier,
    });
  });

  // Add poster if exists
  if (transcoded.poster) {
    segmentBlobs.push({
      contents: transcoded.poster,
      identifier: 'poster',
    });
  }

  console.log(`[Upload] Uploading ${segmentBlobs.length} segments...`);
  console.log('[Upload] ⏳ Waiting for wallet signatures (2 required: register + certify)...');

  const segmentsQuilt = await uploadQuiltWithWallet(
    segmentBlobs,
    signAndExecute,
    walletAddress,
    { network, epochs }
  );

  console.log(`[Upload] ✓ Uploaded segments!`);

  // Build patch ID map from segments quilt
  const patchIdMap = new Map<string, string>();
  segmentsQuilt.index.patches.forEach((patch) => {
    patchIdMap.set(patch.identifier, patch.patchId);
  });

  // Step 4: Build playlists with REAL patch IDs
  onProgress?.({
    stage: 'uploading',
    percent: 75,
    message: 'Building playlists with real URLs...',
  });

  const qualityGroups = new Map<string, EncryptedSegment[]>();
  encryptedSegments.forEach((seg) => {
    if (!qualityGroups.has(seg.quality)) {
      qualityGroups.set(seg.quality, []);
    }
    qualityGroups.get(seg.quality)!.push(seg);
  });

  const playlistBlobs: Array<{ contents: Uint8Array; identifier: string }> = [];

  // Build quality playlists with REAL patch IDs
  for (const [quality, segments] of qualityGroups) {
    let playlistContent =
      '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:4\n#EXT-X-PLAYLIST-TYPE:VOD\n';

    // Init segment - use REAL patch ID
    const initPatchId = patchIdMap.get(`${quality}_init`);
    playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/${segmentsQuilt.blobObject.blobId}",BYTERANGE="${initPatchId?.split('@')[1]}"\n`;

    // Media segments - use REAL patch IDs
    const mediaSegments = segments.filter((s) => s.segIdx >= 0).sort((a, b) => a.segIdx - b.segIdx);
    for (const seg of mediaSegments) {
      const patchId = patchIdMap.get(`${quality}_seg_${seg.segIdx}`);
      const byteRange = patchId?.split('@')[1]; // Extract "start:end"
      playlistContent += `#EXTINF:${seg.duration},\n#EXT-X-BYTERANGE:${byteRange}\n${aggregatorUrl}/v1/blobs/${segmentsQuilt.blobObject.blobId}\n`;
    }

    playlistContent += '#EXT-X-ENDLIST\n';

    playlistBlobs.push({
      contents: new TextEncoder().encode(playlistContent),
      identifier: `${quality}_playlist`,
    });
  }

  console.log(`[Upload] Built ${qualityGroups.size} quality playlists with real URLs`);

  // Step 5: Upload playlists as INDIVIDUAL blobs (not quilt)
  onProgress?.({
    stage: 'uploading',
    percent: 85,
    message: 'Uploading playlists to Walrus...',
  });

  console.log(`[Upload] Uploading ${playlistBlobs.length} quality playlists individually...`);
  console.log(`[Upload] ⏳ Waiting for ${playlistBlobs.length * 2} wallet signatures...`);

  const playlistResults = await uploadMultipleBlobsWithWallet(
    playlistBlobs,
    signAndExecute,
    walletAddress,
    { network, epochs }
  );

  console.log(`[Upload] ✓ Uploaded ${playlistResults.length} playlists!`);

  // Build playlist blob ID map
  const playlistBlobIdMap = new Map<string, string>();
  playlistResults.forEach((result) => {
    playlistBlobIdMap.set(result.identifier, result.blobId);
  });

  // Build master playlist with REAL URLs (no placeholders needed)
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

  // Step 6: Upload master playlist as individual blob
  onProgress?.({
    stage: 'uploading',
    percent: 92,
    message: 'Uploading master playlist...',
  });

  console.log('[Upload] Uploading master playlist...');
  console.log('[Upload] ⏳ Waiting for 2 more wallet signatures...');

  const masterResults = await uploadMultipleBlobsWithWallet(
    [{
      contents: new TextEncoder().encode(masterContent),
      identifier: 'master_playlist',
    }],
    signAndExecute,
    walletAddress,
    { network, epochs }
  );

  console.log(`[Upload] ✓ Uploaded master playlist!`);

  onProgress?.({
    stage: 'uploading',
    percent: 95,
    message: 'Finalizing...',
  });

  const masterWalrusUri = `${aggregatorUrl}/v1/blobs/${masterResults[0].blobId}`;
  const posterWalrusUri = transcoded.poster
    ? `${aggregatorUrl}/v1/blobs/${segmentsQuilt.blobObject.blobId}`
    : undefined;

  // Step 6: Build result for server registration
  onProgress?.({
    stage: 'registering',
    percent: 97,
    message: 'Preparing registration...',
  });

  const renditions = qualities.map((quality) => {
    const qualitySegments = encryptedSegments.filter(
      (s) => s.quality === quality && s.segIdx >= 0
    );

    const playlistBlobId = playlistBlobIdMap.get(`${quality}_playlist`);

    if (!playlistBlobId) {
      throw new Error(`Missing blob ID for ${quality}_playlist in rendition`);
    }

    return {
      quality,
      resolution: resolutionMap[quality] || '1280x720',
      bitrate: bitrateMap[quality] || 2800000,
      walrusPlaylistUri: `${aggregatorUrl}/v1/blobs/${playlistBlobId}`,
      segmentCount: qualitySegments.length + 1, // +1 for init
      segments: qualitySegments.map((seg) => {
        const segPatchId = patchIdMap.get(`${quality}_seg_${seg.segIdx}`);
        const segByteRange = segPatchId?.split('@')[1];
        return {
          segIdx: seg.segIdx,
          walrusUri: `${aggregatorUrl}/v1/blobs/${segmentsQuilt.blobObject.blobId}`,
          iv: seg.iv,
          duration: seg.duration,
          size: seg.data.length,
        };
      }),
    };
  });

  // Calculate total cost (segments quilt only - playlists are individual blobs)
  const totalCost = Number(segmentsQuilt.cost.totalCost);

  return {
    videoId: transcoded.videoId,
    walrusMasterUri: masterWalrusUri,
    posterWalrusUri,
    rootSecretEnc: toBase64(rootSecret), // Plain root secret - server will KMS-encrypt before storage
    duration: transcoded.duration,
    renditions,
    paymentInfo: {
      paidWal: (totalCost / 1_000_000_000).toFixed(6),
      paidMist: totalCost.toString(),
      walletAddress,
      transactionIds: {
        segments: segmentsQuilt.blobObject.objectId,
        playlists: playlistResults.map(r => r.blobObjectId).join(','),
        master: masterResults[0].blobObjectId,
      },
    },
  };
}
