/**
 * Server-side video segment encryptor
 *
 * Encrypts transcoded video segments before uploading to Walrus.
 * Uses deterministic DEK derivation from video root secret.
 */

import fs from 'fs';
import { promisify } from 'util';
import { aesGcmEncrypt, generateIv } from '../crypto/primitives';
import { deriveSegmentDek, generateVideoRootSecret } from '../crypto/keyDerivation';
import { encryptRootSecret } from '../kms/envelope';
import type { TranscodeResult, TranscodedRendition } from '../types';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Encrypted segment metadata
 */
export interface EncryptedSegmentMeta {
  segIdx: number;
  encryptedPath: string;
  iv: Buffer; // 12-byte IV
  originalSize: number;
  encryptedSize: number;
}

/**
 * Encrypted rendition metadata
 */
export interface EncryptedRenditionMeta {
  quality: string;
  resolution: string;
  bitrate: number;
  playlistPath: string;
  initSegment?: EncryptedSegmentMeta;
  segments: EncryptedSegmentMeta[];
}

/**
 * Encrypted transcode result
 */
export interface EncryptedTranscodeResult {
  videoId: string;
  rootSecret: Uint8Array; // Plain root secret (encrypt before storing!)
  rootSecretEnc: Buffer; // KMS-encrypted root secret for DB
  renditions: EncryptedRenditionMeta[];
  masterPlaylistPath: string;
  posterPath?: string;
  duration: number;
}

/**
 * Encrypt all segments from a transcode result
 *
 * @param transcodeResult - Result from videoTranscoder.transcodeToHLS()
 * @param videoId - Video identifier for DEK derivation
 * @returns Promise resolving to encrypted transcode result
 */
export async function encryptTranscodeResult(
  transcodeResult: TranscodeResult,
  videoId: string
): Promise<EncryptedTranscodeResult> {
  console.log(`[Encryptor] Starting encryption for video ${videoId}`);

  // Generate video root secret
  const rootSecret = generateVideoRootSecret();
  const rootSecretEnc = await encryptRootSecret(rootSecret);

  console.log(`[Encryptor] Generated and encrypted root secret`);

  const encryptedRenditions: EncryptedRenditionMeta[] = [];

  // Encrypt each rendition
  for (const rendition of transcodeResult.renditions) {
    console.log(`[Encryptor] Encrypting rendition: ${rendition.quality}`);

    const encryptedSegments: EncryptedSegmentMeta[] = [];

    // Init segment is NOT encrypted - it must be plaintext for video decoder
    let encryptedInitSegment: EncryptedSegmentMeta | undefined;
    if (rendition.initSegment) {
      const fs = await import('fs');
      const stat = await fs.promises.stat(rendition.initSegment.filepath);

      encryptedInitSegment = {
        segIdx: -1,
        encryptedPath: rendition.initSegment.filepath, // Keep original (plaintext)
        iv: Buffer.alloc(12), // Dummy IV (not used for plaintext)
        originalSize: stat.size,
        encryptedSize: stat.size, // Same size (no encryption)
      };

      console.log(`[Encryptor] ⚠️  Init segment kept as PLAINTEXT (required for video decoder)`);
    }

    // Encrypt media segments
    for (const segment of rendition.segments) {
      const encrypted = await encryptSegmentFile(
        segment.filepath,
        rootSecret,
        videoId,
        rendition.quality,
        segment.index
      );
      encryptedSegments.push(encrypted);
    }

    encryptedRenditions.push({
      quality: rendition.quality,
      resolution: rendition.resolution,
      bitrate: rendition.bitrate,
      playlistPath: rendition.playlist.filepath,
      initSegment: encryptedInitSegment,
      segments: encryptedSegments,
    });

    console.log(
      `[Encryptor] ✓ Encrypted ${encryptedSegments.length} segments for ${rendition.quality}`
    );
  }

  return {
    videoId,
    rootSecret,
    rootSecretEnc,
    renditions: encryptedRenditions,
    masterPlaylistPath: transcodeResult.masterPlaylist.filepath,
    posterPath: transcodeResult.poster?.filepath,
    duration: transcodeResult.duration,
  };
}

/**
 * Encrypt a single segment file
 *
 * @param filepath - Path to the segment file
 * @param rootSecret - Video root secret for DEK derivation
 * @param videoId - Video identifier
 * @param rendition - Rendition name (e.g., "720p")
 * @param segIdx - Segment index (-1 for init segment)
 * @returns Promise resolving to encrypted segment metadata
 */
async function encryptSegmentFile(
  filepath: string,
  rootSecret: Uint8Array,
  videoId: string,
  rendition: string,
  segIdx: number
): Promise<EncryptedSegmentMeta> {
  // Read segment file
  const segmentData = await readFile(filepath);
  const originalSize = segmentData.length;

  // Derive DEK for this specific segment
  const dek = await deriveSegmentDek(rootSecret, videoId, rendition, segIdx);

  // Generate IV
  const iv = generateIv();

  // Encrypt segment
  const encryptedData = await aesGcmEncrypt(dek, new Uint8Array(segmentData), iv);

  // Write encrypted segment to new file
  const encryptedPath = filepath + '.enc';
  await writeFile(encryptedPath, Buffer.from(encryptedData));

  return {
    segIdx,
    encryptedPath,
    iv: Buffer.from(iv),
    originalSize,
    encryptedSize: encryptedData.length,
  };
}

/**
 * Calculate total encryption statistics
 */
export function calculateEncryptionStats(result: EncryptedTranscodeResult): {
  totalSegments: number;
  totalOriginalSize: number;
  totalEncryptedSize: number;
  overhead: number;
  overheadPercentage: number;
} {
  let totalSegments = 0;
  let totalOriginalSize = 0;
  let totalEncryptedSize = 0;

  for (const rendition of result.renditions) {
    for (const segment of rendition.segments) {
      totalSegments++;
      totalOriginalSize += segment.originalSize;
      totalEncryptedSize += segment.encryptedSize;
    }

    if (rendition.initSegment) {
      totalSegments++;
      totalOriginalSize += rendition.initSegment.originalSize;
      totalEncryptedSize += rendition.initSegment.encryptedSize;
    }
  }

  const overhead = totalEncryptedSize - totalOriginalSize;

  return {
    totalSegments,
    totalOriginalSize,
    totalEncryptedSize,
    overhead,
    overheadPercentage: (overhead / totalOriginalSize) * 100,
  };
}
