/**
 * Client-side encryption utilities for video segments
 * Used during upload phase to encrypt segments before uploading to Walrus
 */

'use client';

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate random DEK for segment encryption (16 bytes)
 * Each segment gets its own independent random key
 */
export function generateDEK(): Uint8Array {
  return generateRandomBytes(16);
}

/**
 * Generate IV for AES-GCM (12 bytes)
 */
export function generateIV(): Uint8Array {
  return generateRandomBytes(12);
}

/**
 * Encrypt segment data with AES-GCM-128
 * @param dekBytes - 16-byte DEK as Uint8Array
 * @param data - Segment data to encrypt
 * @param iv - 12-byte IV
 */
export async function encryptSegment(
  dekBytes: Uint8Array,
  data: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  // Import DEK as CryptoKey
  const dekKey = await crypto.subtle.importKey(
    'raw',
    dekBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      tagLength: 128, // 128-bit auth tag
    },
    dekKey,
    data.buffer as ArrayBuffer
  );

  return new Uint8Array(encrypted);
}


/**
 * Convert Uint8Array to base64
 */
export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 to Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
