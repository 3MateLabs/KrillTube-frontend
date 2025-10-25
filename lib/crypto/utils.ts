/**
 * Crypto utility functions for encoding/decoding
 *
 * These utilities are used throughout the encrypted playback system for
 * converting between different data representations (base64, hex, strings, bytes).
 */

/**
 * Convert Uint8Array to base64 string
 *
 * @param bytes - Byte array to encode
 * @returns Base64-encoded string
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 *
 * @param base64 - Base64-encoded string
 * @returns Decoded byte array
 */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64url string (URL-safe, no padding)
 *
 * @param bytes - Byte array to encode
 * @returns Base64url-encoded string
 */
export function toBase64Url(bytes: Uint8Array): string {
  const base64 = toBase64(bytes);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string to Uint8Array
 *
 * @param base64url - Base64url-encoded string
 * @returns Decoded byte array
 */
export function fromBase64Url(base64url: string): Uint8Array {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padLength = (4 - (base64.length % 4)) % 4;
  base64 = base64.padEnd(base64.length + padLength, '=');
  return fromBase64(base64);
}

/**
 * Convert Uint8Array to hexadecimal string
 *
 * @param bytes - Byte array to encode
 * @returns Hex-encoded string (lowercase)
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hexadecimal string to Uint8Array
 *
 * @param hex - Hex-encoded string
 * @returns Decoded byte array
 */
export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert string to Uint8Array (UTF-8 encoding)
 *
 * @param str - String to encode
 * @returns UTF-8 encoded byte array
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string (UTF-8 decoding)
 *
 * @param bytes - Byte array to decode
 * @returns Decoded string
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Compare two Uint8Arrays for equality (constant-time)
 *
 * This is a constant-time comparison to prevent timing attacks.
 *
 * @param a - First byte array
 * @param b - Second byte array
 * @returns true if arrays are equal, false otherwise
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

/**
 * Concatenate multiple Uint8Arrays
 *
 * @param arrays - Arrays to concatenate
 * @returns Single concatenated array
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

/**
 * Generate a random opaque token (base64url encoded)
 *
 * @param byteLength - Length in bytes (default: 32)
 * @returns Random base64url-encoded string
 */
export function generateOpaqueToken(byteLength: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return toBase64Url(bytes);
}

/**
 * Validate that a string is valid base64url
 *
 * @param str - String to validate
 * @returns true if valid base64url, false otherwise
 */
export function isValidBase64Url(str: string): boolean {
  // Base64url uses only these characters: A-Z, a-z, 0-9, -, _
  const base64UrlRegex = /^[A-Za-z0-9\-_]+$/;
  return base64UrlRegex.test(str);
}

/**
 * Convert Buffer to Uint8Array (for Node.js compatibility)
 *
 * @param buffer - Node.js Buffer
 * @returns Uint8Array
 */
export function bufferToUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

/**
 * Convert Uint8Array to Buffer (for Node.js compatibility)
 *
 * @param bytes - Uint8Array
 * @returns Node.js Buffer
 */
export function uint8ArrayToBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
