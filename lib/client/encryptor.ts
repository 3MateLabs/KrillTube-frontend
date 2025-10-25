/**
 * Client-side video segment encryptor
 *
 * Encrypts video segments in the browser before uploading to Walrus.
 * Each segment gets a unique DEK (Data Encryption Key) for maximum security.
 */

'use client';

import { aesGcmEncrypt, generateAes128Key, generateIv } from '../crypto/primitives';
import { toBase64 } from '../crypto/utils';

/**
 * Encrypted segment data
 */
export interface EncryptedSegment {
  encryptedData: Uint8Array;
  dek: Uint8Array; // 16-byte DEK (will be stored encrypted in DB)
  iv: Uint8Array; // 12-byte IV (stored in DB)
  ivBase64: string; // For convenience
  originalSize: number;
  encryptedSize: number;
}

/**
 * Encrypt a single video segment
 *
 * @param segmentData - Raw segment bytes
 * @returns Promise resolving to encrypted segment with metadata
 */
export async function encryptSegment(segmentData: Uint8Array): Promise<EncryptedSegment> {
  // Generate unique DEK and IV for this segment
  const dek = generateAes128Key();
  const iv = generateIv();

  // Encrypt the segment
  const encryptedData = await aesGcmEncrypt(dek, segmentData, iv);

  return {
    encryptedData,
    dek,
    iv,
    ivBase64: toBase64(iv),
    originalSize: segmentData.length,
    encryptedSize: encryptedData.length,
  };
}

/**
 * Encrypt multiple segments in batch
 *
 * @param segments - Array of segment data
 * @param onProgress - Optional progress callback (current, total)
 * @returns Promise resolving to array of encrypted segments
 */
export async function encryptSegments(
  segments: Uint8Array[],
  onProgress?: (current: number, total: number) => void
): Promise<EncryptedSegment[]> {
  const encrypted: EncryptedSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const encryptedSegment = await encryptSegment(segments[i]);
    encrypted.push(encryptedSegment);

    if (onProgress) {
      onProgress(i + 1, segments.length);
    }
  }

  return encrypted;
}

/**
 * Segment encryption statistics
 */
export interface EncryptionStats {
  totalSegments: number;
  totalOriginalSize: number;
  totalEncryptedSize: number;
  overhead: number; // Encryption overhead in bytes
  overheadPercentage: number;
}

/**
 * Calculate encryption statistics
 *
 * @param encryptedSegments - Array of encrypted segments
 * @returns Encryption statistics
 */
export function calculateEncryptionStats(
  encryptedSegments: EncryptedSegment[]
): EncryptionStats {
  const totalOriginalSize = encryptedSegments.reduce(
    (sum, seg) => sum + seg.originalSize,
    0
  );
  const totalEncryptedSize = encryptedSegments.reduce(
    (sum, seg) => sum + seg.encryptedSize,
    0
  );
  const overhead = totalEncryptedSize - totalOriginalSize;

  return {
    totalSegments: encryptedSegments.length,
    totalOriginalSize,
    totalEncryptedSize,
    overhead,
    overheadPercentage: (overhead / totalOriginalSize) * 100,
  };
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
