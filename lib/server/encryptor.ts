/**
 * Server-side video segment encryptor
 *
 * Encrypts transcoded video segments before uploading to Walrus.
 * Each segment gets a unique random AES-128 key.
 */

import fs from 'fs';
import { promisify } from 'util';
import { aesGcmEncrypt, generateIv, generateAes128Key } from '../crypto/primitives';
import type { TranscodeResult, TranscodedRendition } from '../types';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * Encrypted segment metadata
 */
export interface EncryptedSegmentMeta {
  segIdx: number;
  encryptedPath: string;
  dek: Buffer; // 16-byte AES-128 key (random, stored directly in DB)
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
  renditions: EncryptedRenditionMeta[];
  masterPlaylistPath: string;
  posterPath?: string;
  duration: number;
}

/**
 * Encrypt all segments from a transcode result
 *
 * @param transcodeResult - Result from videoTranscoder.transcodeToHLS()
 * @param videoId - Video identifier
 * @returns Promise resolving to encrypted transcode result
 */
export async function encryptTranscodeResult(
  transcodeResult: TranscodeResult,
  videoId: string
): Promise<EncryptedTranscodeResult> {
  console.log(`[Encryptor] Starting encryption for video ${videoId}`);

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
        dek: Buffer.alloc(16), // Dummy DEK (not used for plaintext)
        iv: Buffer.alloc(12), // Dummy IV (not used for plaintext)
        originalSize: stat.size,
        encryptedSize: stat.size, // Same size (no encryption)
      };

      console.log(`[Encryptor] ⚠️  Init segment kept as PLAINTEXT (required for video decoder)`);
    }

    // Encrypt media segments with random keys
    for (const segment of rendition.segments) {
      const encrypted = await encryptSegmentFile(
        segment.filepath,
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
 * @param segIdx - Segment index
 * @returns Promise resolving to encrypted segment metadata
 */
async function encryptSegmentFile(
  filepath: string,
  segIdx: number
): Promise<EncryptedSegmentMeta> {
  // Read segment file
  const segmentData = await readFile(filepath);
  const originalSize = segmentData.length;

  // Generate random AES-128 key for this segment
  const dek = generateAes128Key();

  // Generate random IV
  const iv = generateIv();

  // Encrypt segment
  const encryptedData = await aesGcmEncrypt(dek, new Uint8Array(segmentData), iv);

  // Write encrypted segment to new file
  const encryptedPath = filepath + '.enc';
  await writeFile(encryptedPath, Buffer.from(encryptedData));

  return {
    segIdx,
    encryptedPath,
    dek: Buffer.from(dek),
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
