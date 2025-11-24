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
// Server-side upload via API - no wallet SDK or HTTP API needed on client

export interface UploadProgress {
  stage: 'funding' | 'transcoding' | 'encrypting' | 'uploading' | 'registering' | 'complete';
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
  masterBlobObjectId?: string; // Mainnet only - for extend/delete operations
  poster?: string; // Base64 data URL for thumbnail
  posterWalrusUri?: string; // DEPRECATED: Legacy Walrus-based thumbnails
  posterBlobObjectId?: string; // Mainnet only - for extend/delete operations
  duration: number;
  renditions: Array<{
    quality: string;
    resolution: string;
    bitrate: number;
    walrusPlaylistUri: string;
    playlistBlobObjectId?: string; // Mainnet only - for extend/delete operations
    segmentCount: number;
    segments: Array<{
      segIdx: number;
      walrusUri: string;
      blobObjectId?: string; // Mainnet only - for extend/delete operations
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
  const { network = 'testnet', epochs = 5, onProgress } = options;

  console.log(`[Upload] Network configuration:`, {
    optionsNetwork: options.network,
    effectiveNetwork: network,
    epochs,
  });

  const aggregatorUrl =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ||
    (network === 'testnet'
      ? 'https://aggregator.walrus-testnet.walrus.space'
      : 'https://aggregator.mainnet.walrus.mirai.cloud');

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

  console.log(`[Upload] Uploading ${encryptedSegments.length} segments via server (no wallet signatures)...`);

  if (performance && (performance as any).memory) {
    const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    console.log(`[Upload Memory] Before upload: ${memMB}MB used`);
  }

  // Upload segments using wallet SDK (handles testnet/mainnet)
  console.log(`[Upload] Uploading ${encryptedSegments.length} segments using Walrus SDK...`);

  // Import wallet upload function
  const { uploadMultipleBlobsWithWallet } = await import('@/lib/client-walrus-sdk');

  // Prepare blobs for upload
  const blobsToUpload = encryptedSegments.map((seg) => ({
    contents: seg.data!,
    identifier: seg.identifier,
  }));

  // Upload all segments with progress tracking
  const segmentUploadResults: Array<{
    identifier: string;
    blobId: string;
    blobObjectId: string;
  }> = [];

  try {
    // Upload all segments using batched PTB (Programmable Transaction Blocks)
    // The wallet SDK batches register + certify calls into groups of 50 per transaction
    const BATCH_SIZE = 50;
    const expectedSignatures = Math.ceil(blobsToUpload.length / BATCH_SIZE) * 2;
    console.log(`[Upload] Uploading ${blobsToUpload.length} segments using batched PTB (~${expectedSignatures} signatures)...`);

    onProgress?.({
      stage: 'uploading',
      percent: 60,
      message: `Uploading ${blobsToUpload.length} segments (${expectedSignatures} signatures)...`,
    });

    const segmentUploadResults = await uploadMultipleBlobsWithWallet(
      blobsToUpload,
      signAndExecute,
      walletAddress,
      {
        network,
        epochs,
        deletable: true,
      }
    );

    // Free segment data after upload
    for (let j = 0; j < encryptedSegments.length; j++) {
      // @ts-ignore
      encryptedSegments[j].data = null;
    }

    console.log(`[Upload] ✓ Uploaded ${segmentUploadResults.length} segments in ${expectedSignatures} batched PTB signatures!`);

    // Log memory after upload
    if (performance && (performance as any).memory) {
      const memMB = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      console.log(`[Upload Memory] After all segments uploaded: ${memMB}MB used`);
    }

    // Convert poster to base64 for database storage (instead of uploading to Walrus)
    let posterBase64: string | undefined;
    if (transcoded.poster) {
      console.log(`[Upload] Converting poster to base64 (${(transcoded.poster.length / 1024).toFixed(2)}KB)...`);

      // Determine MIME type from poster data
      const mimeType = transcoded.poster[0] === 0xFF && transcoded.poster[1] === 0xD8
        ? 'image/jpeg'
        : transcoded.poster[0] === 0x89 && transcoded.poster[1] === 0x50
        ? 'image/png'
        : 'image/jpeg'; // Default to JPEG

      // Convert Uint8Array to base64 data URL
      // Process in chunks to avoid "Maximum call stack size exceeded" with large images
      const chunkSize = 8192;
      let binaryString = '';
      for (let i = 0; i < transcoded.poster.length; i += chunkSize) {
        const chunk = transcoded.poster.slice(i, i + chunkSize);
        binaryString += String.fromCharCode(...chunk);
      }
      const base64String = btoa(binaryString);
      posterBase64 = `data:${mimeType};base64,${base64String}`;

      console.log(`[Upload] ✓ Poster converted to base64 (${posterBase64.length} chars)`);
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

  // Step 5: Build master playlist content
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

  // Step 5: Upload all playlists + master in ONE batch for maximum efficiency
  // We need to upload quality playlists first to get their blob IDs, then build master
  onProgress?.({
    stage: 'uploading',
    percent: 85,
    message: 'Uploading playlists and master (batched PTB)...',
  });

  console.log(`[Upload] Step 1: Uploading ${playlistBlobs.length} quality playlists using PTB...`);

  const playlistResults = await uploadMultipleBlobsWithWallet(
    playlistBlobs,
    signAndExecute,
    walletAddress,
    { network, epochs, deletable: true }
  );

  const playlistSignatures = Math.ceil(playlistResults.length / 50) * 2;
  console.log(`[Upload] ✓ Quality playlists uploaded (${playlistSignatures} signatures)!`);

  // Build playlist blob ID map
  const playlistBlobIdMap = new Map<string, string>();
  playlistResults.forEach((result) => {
    playlistBlobIdMap.set(result.identifier, result.blobId);
  });

  // Build master playlist with quality playlist URLs
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

  console.log('[Upload] Step 2: Uploading master playlist using PTB...');

  const masterResults = await uploadMultipleBlobsWithWallet(
    [{ contents: new TextEncoder().encode(masterContent), identifier: 'master_playlist' }],
    signAndExecute,
    walletAddress,
    { network, epochs, deletable: true }
  );

  console.log(`[Upload] ✓ Master playlist uploaded (2 signatures)!`);

  onProgress?.({
    stage: 'uploading',
    percent: 95,
    message: 'Finalizing...',
  });

  const masterWalrusUri = `${aggregatorUrl}/v1/blobs/${masterResults[0].blobId}`;
  const masterBlobObjectId = masterResults[0].blobObjectId;

  // Use master playlist blob ID as the video ID for cleaner URLs
  const masterBlobId = masterResults[0].blobId;

  // Step 6: Build result for server registration
  onProgress?.({
    stage: 'registering',
    percent: 97,
    message: 'Preparing registration...',
  });

  // Build blob object ID maps
  const segmentBlobObjectIdMap = new Map<string, string>();
  segmentUploadResults.forEach((result) => {
    segmentBlobObjectIdMap.set(result.identifier, result.blobObjectId);
  });

  const playlistBlobObjectIdMap = new Map<string, string>();
  playlistResults.forEach((result) => {
    playlistBlobObjectIdMap.set(result.identifier, result.blobObjectId);
  });

  const renditions = qualities.map((quality) => {
    // Include ALL segments including init segment (segIdx: -1)
    const qualitySegments = encryptedSegments.filter(
      (s) => s.quality === quality
    );

    const playlistBlobId = playlistBlobIdMap.get(`${quality}_playlist`);
    const playlistBlobObjectId = playlistBlobObjectIdMap.get(`${quality}_playlist`);

    if (!playlistBlobId) {
      throw new Error(`Missing blob ID for ${quality}_playlist in rendition`);
    }

    return {
      quality,
      resolution: resolutionMap[quality] || '1280x720',
      bitrate: bitrateMap[quality] || 2800000,
      walrusPlaylistUri: `${aggregatorUrl}/v1/blobs/${playlistBlobId}`,
      playlistBlobObjectId: network === 'mainnet' ? playlistBlobObjectId : undefined,
      segmentCount: qualitySegments.length,
      segments: qualitySegments.map((seg) => {
        // Handle init segment (segIdx: -1) vs media segments (segIdx: 0+)
        const identifier = seg.segIdx === -1 ? `${quality}_init` : `${quality}_seg_${seg.segIdx}`;
        const segBlobId = blobIdMap.get(identifier);
        const segBlobObjectId = segmentBlobObjectIdMap.get(identifier);
        if (!segBlobId) {
          throw new Error(`Missing blob ID for ${identifier}`);
        }
        return {
          segIdx: seg.segIdx,
          walrusUri: `${aggregatorUrl}/v1/blobs/${segBlobId}`, // Use individual blob ID
          blobObjectId: network === 'mainnet' ? segBlobObjectId : undefined, // Mainnet only - for extend/delete
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
    masterBlobObjectId: network === 'mainnet' ? masterBlobObjectId : undefined, // Mainnet only
    poster: posterBase64, // Base64 thumbnail for database storage
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
