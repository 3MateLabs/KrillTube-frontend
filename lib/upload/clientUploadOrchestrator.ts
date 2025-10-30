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
import { uploadQuiltWithWallet } from '@/lib/client-walrus-sdk';

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

  // Step 3: Upload encrypted segments to Walrus
  onProgress?.({
    stage: 'uploading',
    percent: 60,
    message: '1/3: Uploading segments to Walrus...',
  });

  const segmentBlobs = encryptedSegments.map((seg) => ({
    contents: seg.data,
    identifier: seg.identifier,
  }));

  // Add poster if exists
  if (transcoded.poster) {
    segmentBlobs.push({
      contents: transcoded.poster,
      identifier: 'poster',
    });
  }

  console.log(`[Upload] Uploading ${segmentBlobs.length} blobs to Walrus (${(segmentBlobs.reduce((sum, b) => sum + b.contents.length, 0) / 1024 / 1024).toFixed(2)} MB)...`);
  console.log('[Upload] Waiting for wallet approval...');

  const segmentQuilt = await uploadQuiltWithWallet(
    segmentBlobs,
    signAndExecute,
    walletAddress,
    { network, epochs }
  );

  console.log(`[Upload] ✓ Uploaded segments to Walrus`);

  // Build patch ID map
  const patchIdMap = new Map<string, string>();
  segmentQuilt.index.patches.forEach((patch) => {
    patchIdMap.set(patch.identifier, patch.patchId);
  });

  // Step 4: Build and upload playlists
  onProgress?.({
    stage: 'uploading',
    percent: 75,
    message: '2/3: Uploading playlists to Walrus...',
  });

  // Group segments by quality
  const qualityGroups = new Map<string, EncryptedSegment[]>();
  encryptedSegments.forEach((seg) => {
    if (!qualityGroups.has(seg.quality)) {
      qualityGroups.set(seg.quality, []);
    }
    qualityGroups.get(seg.quality)!.push(seg);
  });

  const playlistBlobs = [];
  for (const [quality, segments] of qualityGroups) {
    let playlistContent =
      '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:4\n#EXT-X-PLAYLIST-TYPE:VOD\n';

    // Add init segment
    const initPatchId = patchIdMap.get(`${quality}_init`);
    if (initPatchId) {
      playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}"\n`;
    }

    // Add media segments
    const mediaSegments = segments.filter((s) => s.segIdx >= 0).sort((a, b) => a.segIdx - b.segIdx);
    for (const seg of mediaSegments) {
      const patchId = patchIdMap.get(`${quality}_seg_${seg.segIdx}`);
      playlistContent += `#EXTINF:${seg.duration},\n${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${patchId}\n`;
    }

    playlistContent += '#EXT-X-ENDLIST\n';

    playlistBlobs.push({
      contents: new TextEncoder().encode(playlistContent),
      identifier: `${quality}_playlist`,
    });
  }

  const playlistQuilt = await uploadQuiltWithWallet(
    playlistBlobs,
    signAndExecute,
    walletAddress,
    { network, epochs }
  );

  console.log(`[Upload] ✓ Uploaded playlists to Walrus`);

  // Build playlist patch ID map
  const playlistPatchIdMap = new Map<string, string>();
  playlistQuilt.index.patches.forEach((patch) => {
    playlistPatchIdMap.set(patch.identifier, patch.patchId);
  });

  // Step 5: Build and upload master playlist
  onProgress?.({
    stage: 'uploading',
    percent: 90,
    message: '3/3: Uploading master playlist to Walrus...',
  });

  let masterContent = '#EXTM3U\n#EXT-X-VERSION:7\n\n';
  for (const quality of qualities) {
    const playlistPatchId = playlistPatchIdMap.get(`${quality}_playlist`);
    const playlistUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchId}`;

    // Get resolution and bitrate from quality settings
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

    const resolution = resolutionMap[quality] || '1280x720';
    const bitrate = bitrateMap[quality] || 2800000;

    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${bitrate},RESOLUTION=${resolution}\n${playlistUri}\n`;
  }

  const masterQuilt = await uploadQuiltWithWallet(
    [{ contents: new TextEncoder().encode(masterContent), identifier: 'master_playlist' }],
    signAndExecute,
    walletAddress,
    { network, epochs }
  );

  console.log(`[Upload] ✓ Uploaded master playlist to Walrus`);

  const masterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuilt.index.patches[0].patchId}`;
  const posterWalrusUri = transcoded.poster
    ? `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${patchIdMap.get('poster')}`
    : undefined;

  // Step 6: Build result for server registration
  onProgress?.({
    stage: 'registering',
    percent: 95,
    message: 'Preparing registration...',
  });

  const renditions = qualities.map((quality) => {
    const qualitySegments = encryptedSegments.filter(
      (s) => s.quality === quality && s.segIdx >= 0
    );

    return {
      quality,
      resolution: { '1080p': '1920x1080', '720p': '1280x720', '480p': '854x480', '360p': '640x360' }[quality] || '1280x720',
      bitrate: { '1080p': 5000000, '720p': 2800000, '480p': 1400000, '360p': 800000 }[quality] || 2800000,
      walrusPlaylistUri: `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchIdMap.get(`${quality}_playlist`)}`,
      segmentCount: qualitySegments.length + 1, // +1 for init
      segments: qualitySegments.map((seg) => ({
        segIdx: seg.segIdx,
        walrusUri: `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${patchIdMap.get(`${quality}_seg_${seg.segIdx}`)}`,
        iv: seg.iv,
        duration: seg.duration,
        size: seg.data.length,
      })),
    };
  });

  const totalCost =
    Number(segmentQuilt.cost.totalCost) +
    Number(playlistQuilt.cost.totalCost) +
    Number(masterQuilt.cost.totalCost);

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
        segments: segmentQuilt.blobObject.objectId,
        playlists: playlistQuilt.blobObject.objectId,
        master: masterQuilt.blobObject.objectId,
      },
    },
  };
}
