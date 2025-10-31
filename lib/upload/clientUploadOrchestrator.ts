/**
 * Client-Side Upload Orchestrator
 * Handles complete flow: Transcode → Encrypt → Upload to Walrus → Register
 */

'use client';

import { transcodeVideo, type TranscodeResult } from '@/lib/transcode/clientTranscode';
import {
  generateDEK,
  generateIV,
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
  data: Uint8Array | null; // encrypted data (nullable after copying to upload)
  dek: string; // base64-encoded 16-byte DEK
  iv: string; // base64-encoded 12-byte IV
  quality: string;
  segIdx: number;
  duration: number;
  size: number; // Store size to avoid accessing data after nullification
}

export interface ClientUploadResult {
  videoId: string;
  walrusMasterUri: string;
  posterWalrusUri?: string;
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
      dek: string; // base64-encoded 16-byte DEK
      iv: string; // base64-encoded 12-byte IV
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
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ||
    (network === 'testnet'
      ? 'https://aggregator.walrus-testnet.walrus.space'
      : 'https://aggregator.walrus.space');

  // Step 1: Transcode video
  onProgress?.({
    stage: 'transcoding',
    percent: 10,
    message: 'Transcoding video in browser...',
  });

  const transcoded = await transcodeVideo(file, {
    qualities,
    segmentDuration: 4,
    onProgress: (p) => {
      // p.overall is 0-100, map to 10-40% of total upload flow
      const overallPercent = 10 + (p.overall / 100) * 30;

      let message = p.message;
      if (p.estimatedTimeRemaining && p.estimatedTimeRemaining > 0) {
        const totalSeconds = Math.floor(p.estimatedTimeRemaining);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        // Format as HH:MM:SS
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        message += ` (~${timeStr} left)`;
      }

      onProgress?.({
        stage: 'transcoding',
        percent: overallPercent,
        message,
      });
    },
  });

  console.log(`[Upload] Transcoded ${transcoded.segments.length} segments`);

  // Log memory usage before encryption
  if (performance && (performance as any).memory) {
    const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    console.log(`[Upload Memory] Before encryption: ${memMB}MB used`);
  }

  // Step 2: Encrypt segments (each with unique random DEK)
  // IMPORTANT: Process segments in smaller batches to avoid memory overflow
  onProgress?.({
    stage: 'encrypting',
    percent: 40,
    message: 'Encrypting segments...',
  });

  const encryptedSegments: EncryptedSegment[] = [];

  console.log(`[Upload] Starting encryption of ${transcoded.segments.length} segments...`);

  try {
    for (let i = 0; i < transcoded.segments.length; i++) {
      const seg = transcoded.segments[i];
      const identifier =
        seg.type === 'init' ? `${seg.quality}_init` : `${seg.quality}_seg_${seg.segIdx}`;

      console.log(`[Upload] Encrypting segment ${i + 1}/${transcoded.segments.length}: ${identifier} (${(seg.data.length / 1024).toFixed(2)}KB)`);

      try {
        // Generate random DEK for this segment (16 bytes)
        const dek = generateDEK();

        // Generate random IV (12 bytes)
        const iv = generateIV();

        // Encrypt segment with DEK
        const encryptedData = await encryptSegment(dek, seg.data, iv);

        encryptedSegments.push({
          identifier,
          data: encryptedData,
          dek: toBase64(dek), // Include DEK in metadata
          iv: toBase64(iv),
          quality: seg.quality,
          segIdx: seg.segIdx,
          duration: seg.duration,
          size: encryptedData.length, // Store size before potentially nullifying data
        });

        // Clear the original unencrypted data from memory
        // @ts-ignore - intentionally setting to null to free memory
        transcoded.segments[i].data = null;

        // Log progress every 10 segments or at important milestones
        if ((i + 1) % 10 === 0 || i === 0 || i === transcoded.segments.length - 1) {
          if (performance && (performance as any).memory) {
            const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
            console.log(`[Upload Memory] After ${i + 1} segments encrypted: ${memMB}MB used`);
          }
        }

        const progress = 40 + ((i + 1) / transcoded.segments.length) * 20; // 40-60%
        onProgress?.({
          stage: 'encrypting',
          percent: progress,
          message: `Encrypted ${i + 1}/${transcoded.segments.length} segments`,
        });

      } catch (segError) {
        console.error(`[Upload] ERROR encrypting segment ${identifier}:`, segError);
        console.error(`[Upload] Segment size: ${(seg.data?.length || 0) / 1024}KB`);
        throw new Error(`Failed to encrypt segment ${identifier}: ${segError instanceof Error ? segError.message : String(segError)}`);
      }
    }

    console.log(`[Upload] ✓ Encrypted all segments with random DEKs`);

    if (performance && (performance as any).memory) {
      const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      console.log(`[Upload Memory] After all encryption: ${memMB}MB used`);
    }

  } catch (encryptError) {
    console.error(`[Upload] ENCRYPTION PHASE FAILED:`, encryptError);
    if (performance && (performance as any).memory) {
      const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = ((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      console.error(`[Upload Memory] At failure: ${memMB}MB used of ${limitMB}MB limit`);
    }
    throw encryptError;
  }

  // Step 3: Upload segments individually (not as quilt to avoid memory overflow)
  onProgress?.({
    stage: 'uploading',
    percent: 60,
    message: 'Uploading segments to Walrus...',
  });

  console.log(`[Upload] Uploading ${encryptedSegments.length} segments individually...`);
  console.log(`[Upload] ⏳ This will require ${encryptedSegments.length * 2} wallet signatures (2 per segment)...`);

  if (performance && (performance as any).memory) {
    const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    console.log(`[Upload Memory] Before upload: ${memMB}MB used`);
  }

  // Upload segments individually to avoid combining into one giant blob
  const segmentUploadResults: Array<{
    identifier: string;
    blobId: string;
    blobObjectId: string;
  }> = [];

  try {
    for (let i = 0; i < encryptedSegments.length; i++) {
      const seg = encryptedSegments[i];
      const progress = 60 + ((i + 1) / encryptedSegments.length) * 25; // 60-85%

      onProgress?.({
        stage: 'uploading',
        percent: progress,
        message: `Uploading segment ${i + 1}/${encryptedSegments.length}...`,
      });

      console.log(`[Upload] Uploading ${seg.identifier} (${(seg.size / 1024).toFixed(2)}KB)...`);

      const results = await uploadMultipleBlobsWithWallet(
        [{
          contents: seg.data!,
          identifier: seg.identifier,
        }],
        signAndExecute,
        walletAddress,
        { network, epochs }
      );

      segmentUploadResults.push(results[0]);

      // Free segment data immediately after upload
      // @ts-ignore
      seg.data = null;

      console.log(`[Upload] ✓ Uploaded ${seg.identifier}: ${results[0].blobId}`);

      // Log memory every 10 segments
      if ((i + 1) % 10 === 0 && performance && (performance as any).memory) {
        const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        console.log(`[Upload Memory] After ${i + 1} segments uploaded: ${memMB}MB used`);
      }
    }

    // Upload poster separately if exists
    let posterBlobId: string | undefined;
    if (transcoded.poster) {
      console.log(`[Upload] Uploading poster (${(transcoded.poster.length / 1024).toFixed(2)}KB)...`);

      const posterResults = await uploadMultipleBlobsWithWallet(
        [{
          contents: transcoded.poster,
          identifier: 'poster',
        }],
        signAndExecute,
        walletAddress,
        { network, epochs }
      );

      posterBlobId = posterResults[0].blobId;
      console.log(`[Upload] ✓ Uploaded poster: ${posterBlobId}`);
    }

    console.log(`[Upload] ✓ All segments uploaded!`);

  // Build blob ID map from upload results
  const blobIdMap = new Map<string, string>();
  segmentUploadResults.forEach((result) => {
    blobIdMap.set(result.identifier, result.blobId);
  });

  // Step 4: Build playlists with individual blob URLs
  onProgress?.({
    stage: 'uploading',
    percent: 85,
    message: 'Building playlists...',
  });

  const qualityGroups = new Map<string, EncryptedSegment[]>();
  encryptedSegments.forEach((seg) => {
    if (!qualityGroups.has(seg.quality)) {
      qualityGroups.set(seg.quality, []);
    }
    qualityGroups.get(seg.quality)!.push(seg);
  });

  const playlistBlobs: Array<{ contents: Uint8Array; identifier: string }> = [];

  // Build quality playlists with individual blob URLs
  for (const [quality, segments] of qualityGroups) {
    let playlistContent =
      '#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:4\n#EXT-X-PLAYLIST-TYPE:VOD\n';

    // Init segment - use individual blob ID
    const initBlobId = blobIdMap.get(`${quality}_init`);
    if (!initBlobId) {
      throw new Error(`Missing blob ID for ${quality}_init`);
    }
    playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/${initBlobId}"\n`;

    // Media segments - use individual blob IDs
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

  console.log(`[Upload] Built ${qualityGroups.size} quality playlists`);

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
  const posterWalrusUri = posterBlobId
    ? `${aggregatorUrl}/v1/blobs/${posterBlobId}`
    : undefined;

  // Use master playlist blob ID as the video ID for cleaner URLs
  const masterBlobId = masterResults[0].blobId;

  // Step 6: Build result for server registration
  onProgress?.({
    stage: 'registering',
    percent: 97,
    message: 'Preparing registration...',
  });

  const renditions = qualities.map((quality) => {
    // Include ALL segments including init segment (segIdx: -1)
    const qualitySegments = encryptedSegments.filter(
      (s) => s.quality === quality
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
      segmentCount: qualitySegments.length,
      segments: qualitySegments.map((seg) => {
        // Handle init segment (segIdx: -1) vs media segments (segIdx: 0+)
        const identifier = seg.segIdx === -1 ? `${quality}_init` : `${quality}_seg_${seg.segIdx}`;
        const segBlobId = blobIdMap.get(identifier);
        if (!segBlobId) {
          throw new Error(`Missing blob ID for ${identifier}`);
        }
        return {
          segIdx: seg.segIdx,
          walrusUri: `${aggregatorUrl}/v1/blobs/${segBlobId}`, // Use individual blob ID
          dek: seg.dek, // Include DEK for backend storage
          iv: seg.iv,
          duration: seg.duration,
          size: seg.size, // Use stored size instead of accessing nullified data
        };
      }),
    };
  });

  // Calculate total cost - sum up all individual segment uploads + playlists + master
  // Note: This is an approximation since we don't track individual costs
  const totalCost = 0; // We'll set this to 0 for now, server can recalculate if needed

  const result = {
    videoId: masterBlobId, // Use blob ID for clean URLs like /watch/{blobId}
    walrusMasterUri: masterWalrusUri,
    posterWalrusUri,
    duration: transcoded.duration,
    renditions,
    paymentInfo: {
      paidWal: (totalCost / 1_000_000_000).toFixed(6),
      paidMist: totalCost.toString(),
      walletAddress,
      transactionIds: {
        segments: segmentUploadResults.map(r => r.blobObjectId).join(','),
        playlists: playlistResults.map(r => r.blobObjectId).join(','),
        master: masterResults[0].blobObjectId,
      },
    },
  };

  return result;

  } catch (uploadError) {
    console.error(`[Upload] UPLOAD PHASE FAILED:`, uploadError);

    if (performance && (performance as any).memory) {
      const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      const limitMB = ((performance as any).memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
      console.error(`[Upload Memory] At failure: ${memMB}MB used of ${limitMB}MB limit`);
    }

    // Try to identify which phase failed
    if (uploadError instanceof Error) {
      console.error(`[Upload] Error name: ${uploadError.name}`);
      console.error(`[Upload] Error message: ${uploadError.message}`);
      console.error(`[Upload] Error stack:`, uploadError.stack);
    }

    throw uploadError;
  }
}
