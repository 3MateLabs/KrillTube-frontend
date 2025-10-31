/**
 * Hybrid Upload Orchestrator
 *
 * Client-Side: Transcode + Encrypt (security)
 * Server-Side: HTTP Publisher Upload (no signatures)
 *
 * Benefits:
 * - Client-side encryption: Server never sees unencrypted video
 * - Server-side upload: No wallet signatures required
 * - Best of both worlds
 */

'use client';

import { transcodeVideo } from '@/lib/transcode/clientTranscode';
import {
  generateRootSecret,
  generateIV,
  deriveSegmentDEK,
  encryptSegment,
  toBase64,
} from '@/lib/crypto/clientEncryption';

export interface UploadProgress {
  stage: 'transcoding' | 'encrypting' | 'uploading' | 'registering' | 'complete';
  percent: number;
  message: string;
}

export interface UploadResult {
  videoId: string;
  walrusMasterUri: string;
  posterWalrusUri?: string;
  duration: number;
}

/**
 * Upload video with client-side encryption + server-side HTTP Publisher upload
 */
export async function uploadVideoEncrypted(
  file: File,
  qualities: string[],
  userAddress: string,
  options: {
    onProgress?: (progress: UploadProgress) => void;
  }
): Promise<UploadResult> {
  const { onProgress } = options;

  const aggregatorUrl =
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
    'https://aggregator.testnet.walrus.space';

  // Step 1: Transcode video in browser
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
        percent: 10 + p * 0.3,
        message: `Transcoding... ${Math.round(p)}%`,
      }),
  });

  console.log(`[Upload] Transcoded ${transcoded.segments.length} segments`);

  // Step 2: Generate root secret and encrypt segments (CLIENT-SIDE)
  onProgress?.({
    stage: 'encrypting',
    percent: 40,
    message: 'Encrypting segments...',
  });

  const rootSecret = generateRootSecret();
  const encryptedSegments: Array<{
    identifier: string;
    data: Uint8Array;
    iv: string;
    quality: string;
    segIdx: number;
    duration: number;
  }> = [];

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

    // Encrypt segment (CLIENT-SIDE - server never sees unencrypted data)
    const encryptedData = await encryptSegment(dek, seg.data, iv);

    encryptedSegments.push({
      identifier,
      data: encryptedData,
      iv: toBase64(iv),
      quality: seg.quality,
      segIdx: seg.segIdx,
      duration: seg.duration,
    });

    const progress = 40 + ((i + 1) / transcoded.segments.length) * 20;
    onProgress?.({
      stage: 'encrypting',
      percent: progress,
      message: `Encrypted ${i + 1}/${transcoded.segments.length} segments`,
    });
  }

  console.log(`[Upload] Encrypted all segments (client-side)`);

  // Step 3: Upload encrypted segments to server (SERVER UPLOADS TO WALRUS VIA HTTP API)
  onProgress?.({
    stage: 'uploading',
    percent: 60,
    message: 'Uploading encrypted segments to Walrus...',
  });

  // Upload segments via server proxy (server uses HTTP Publisher API - no signatures)
  const blobResults: Array<{ identifier: string; blobId: string; url: string }> = [];

  for (let i = 0; i < encryptedSegments.length; i++) {
    const seg = encryptedSegments[i];

    const formData = new FormData();
    formData.append('blob', new Blob([seg.data]));
    formData.append('identifier', seg.identifier);

    const response = await fetch('/api/v1/upload-blob', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload ${seg.identifier}`);
    }

    const result = await response.json();
    blobResults.push({
      identifier: seg.identifier,
      blobId: result.blobId,
      url: result.url,
    });

    const progress = 60 + ((i + 1) / encryptedSegments.length) * 25;
    onProgress?.({
      stage: 'uploading',
      percent: progress,
      message: `Uploaded ${i + 1}/${encryptedSegments.length} segments`,
    });
  }

  console.log(`[Upload] ✓ Uploaded all encrypted segments via HTTP Publisher API`);

  // Step 4: Upload poster if exists
  let posterBlobId: string | undefined;
  if (transcoded.poster) {
    const posterFormData = new FormData();
    posterFormData.append('blob', new Blob([transcoded.poster]));
    posterFormData.append('identifier', 'poster');

    const posterResponse = await fetch('/api/v1/upload-blob', {
      method: 'POST',
      body: posterFormData,
    });

    if (posterResponse.ok) {
      const posterResult = await posterResponse.json();
      posterBlobId = posterResult.blobId;
    }
  }

  // Step 5: Build rendition data
  const qualityGroups = new Map<string, typeof encryptedSegments>();
  encryptedSegments.forEach((seg) => {
    if (!qualityGroups.has(seg.quality)) {
      qualityGroups.set(seg.quality, []);
    }
    qualityGroups.get(seg.quality)!.push(seg);
  });

  const renditions = Array.from(qualityGroups.entries()).map(([quality, segments]) => {
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

    const segmentData = segments
      .filter((s) => s.segIdx >= 0)
      .sort((a, b) => a.segIdx - b.segIdx)
      .map((seg) => {
        const blobInfo = blobResults.find((b) => b.identifier === seg.identifier);
        return {
          segIdx: seg.segIdx,
          walrusUri: blobInfo!.blobId,
          iv: seg.iv,
          duration: seg.duration,
          size: seg.data.length,
        };
      });

    return {
      quality,
      resolution: resolutionMap[quality] || '1280x720',
      bitrate: bitrateMap[quality] || 2800000,
      segments: segmentData,
    };
  });

  // Step 6: Register with server
  onProgress?.({
    stage: 'registering',
    percent: 90,
    message: 'Registering video...',
  });

  const registerResponse = await fetch('/api/v1/register-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: transcoded.videoId,
      title: file.name.replace(/\.[^/.]+$/, ''),
      creatorId: userAddress,
      walrusMasterUri: blobResults[0].blobId, // Placeholder
      posterWalrusUri: posterBlobId,
      rootSecretEnc: toBase64(rootSecret),
      duration: transcoded.duration,
      renditions,
    }),
  });

  if (!registerResponse.ok) {
    throw new Error('Failed to register video');
  }

  const { video } = await registerResponse.json();

  onProgress?.({
    stage: 'complete',
    percent: 100,
    message: 'Upload complete!',
  });

  return {
    videoId: video.id,
    walrusMasterUri: video.walrusRootUri,
    posterWalrusUri: video.posterWalrusUri,
    duration: video.duration,
  };
}
