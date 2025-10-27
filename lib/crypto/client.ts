/**
 * Client-side cryptographic functions (browser)
 *
 * This module provides crypto operations for the browser-side video player:
 * - KEK derivation from ECDH (client perspective)
 * - DEK unwrapping from wrapped keys
 * - Segment decryption
 * - Device fingerprinting
 *
 * These functions mirror the server-side operations but are optimized
 * for browser environments.
 */

'use client';

import {
  generateX25519Keypair,
  deriveSharedSecret,
  hkdfDeriveKey,
  unwrapKey,
  aesGcmDecrypt,
} from './primitives';
import { fromBase64, toBase64, stringToBytes } from './utils';

/**
 * Client-side session initialization result
 */
export interface ClientSession {
  clientPublicKey: Uint8Array;
  clientPrivateKeyJwk: JsonWebKey; // Store as JWK for deriveSharedSecret
  kek: CryptoKey | null; // Set after server response
}

/**
 * Initialize a client session (step 1: generate keypair)
 *
 * Call this before creating a session with the server.
 *
 * @returns Promise resolving to client session with keypair
 */
export async function initializeClientSession(): Promise<ClientSession> {
  const { publicKey, privateKeyJwk } = await generateX25519Keypair();

  return {
    clientPublicKey: publicKey,
    clientPrivateKeyJwk: privateKeyJwk,
    kek: null,
  };
}

/**
 * Derive client KEK after receiving server's public key (step 2)
 *
 * This must be called after the server responds with its ephemeral public key
 * and nonce. The derived KEK is used to unwrap segment DEKs.
 *
 * @param session - Client session from initializeClientSession()
 * @param serverPublicKeyB64 - Server's public key (base64)
 * @param serverNonceB64 - Server's nonce (base64)
 * @returns Promise resolving to KEK (CryptoKey)
 */
export async function deriveClientKek(
  session: ClientSession,
  serverPublicKeyB64: string,
  serverNonceB64: string
): Promise<CryptoKey> {
  const serverPublicKey = fromBase64(serverPublicKeyB64);
  const serverNonce = fromBase64(serverNonceB64);

  console.log('[Client KEK] Deriving client KEK...');
  console.log('[Client KEK] Server public key (base64):', serverPublicKeyB64);
  console.log('[Client KEK] Server nonce (base64):', serverNonceB64);
  console.log('[Client KEK] Client private JWK has d:', !!session.clientPrivateKeyJwk.d);
  console.log('[Client KEK] Client private JWK has x:', !!session.clientPrivateKeyJwk.x);

  if (serverPublicKey.length !== 32) {
    throw new Error('Invalid server public key length');
  }
  if (serverNonce.length !== 12) {
    throw new Error('Invalid server nonce length');
  }

  // Perform ECDH to get shared secret
  const sharedSecret = await deriveSharedSecret(serverPublicKey, session.clientPrivateKeyJwk);
  console.log('[Client KEK] ECDH shared secret (first 8 bytes):', toBase64(sharedSecret.slice(0, 8)));

  // Derive KEK using HKDF (same process as server)
  const kek = await hkdfDeriveKey(
    {
      ikm: sharedSecret,
      salt: serverNonce,
      info: 'session-kek-v1', // Must match server
    },
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  console.log('[Client KEK] ✓ Derived KEK');

  // Store KEK in session
  session.kek = kek;

  return kek;
}

/**
 * Unwrap a segment DEK using the session KEK
 *
 * @param kek - Session KEK (from deriveClientKek)
 * @param wrappedDekB64 - Wrapped DEK from server (base64)
 * @param ivB64 - IV used for wrapping (base64)
 * @returns Promise resolving to unwrapped DEK (raw bytes)
 */
export async function unwrapSegmentDek(
  kek: CryptoKey,
  wrappedDekB64: string,
  ivB64: string
): Promise<Uint8Array> {
  const wrappedDek = fromBase64(wrappedDekB64);
  const iv = fromBase64(ivB64);

  const dek = await unwrapKey(kek, wrappedDek, iv);

  return dek;
}

/**
 * Decrypt a video segment
 *
 * @param dek - Segment DEK (from unwrapSegmentDek)
 * @param encryptedSegment - Encrypted segment data
 * @param ivB64 - IV used for encryption (base64)
 * @returns Promise resolving to decrypted segment data
 */
export async function decryptSegment(
  dek: Uint8Array,
  encryptedSegment: Uint8Array,
  ivB64: string
): Promise<Uint8Array> {
  const iv = fromBase64(ivB64);

  const decrypted = await aesGcmDecrypt(dek, encryptedSegment, iv);

  return decrypted;
}

/**
 * Complete flow: unwrap DEK and decrypt segment in one call
 *
 * This is a convenience function that combines unwrapping and decryption.
 *
 * @param kek - Session KEK
 * @param wrappedDekB64 - Wrapped DEK (base64)
 * @param wrapIvB64 - IV for unwrapping (base64)
 * @param encryptedSegment - Encrypted segment data
 * @param segmentIvB64 - IV for segment decryption (base64)
 * @returns Promise resolving to decrypted segment
 */
export async function unwrapAndDecryptSegment(
  kek: CryptoKey,
  wrappedDekB64: string,
  wrapIvB64: string,
  encryptedSegment: Uint8Array,
  segmentIvB64: string
): Promise<Uint8Array> {
  // Unwrap DEK
  const dek = await unwrapSegmentDek(kek, wrappedDekB64, wrapIvB64);

  // Decrypt segment
  const decrypted = await decryptSegment(dek, encryptedSegment, segmentIvB64);

  return decrypted;
}

/**
 * Generate a device fingerprint for device binding
 *
 * This creates a stable fingerprint based on browser characteristics.
 * Note: This is not foolproof but adds an additional layer of security.
 *
 * @returns Promise resolving to device hash (base64)
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // User agent
  components.push(navigator.userAgent);

  // Screen resolution and color depth
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch (e) {
    components.push('unknown-tz');
  }

  // Language
  components.push(navigator.language);

  // Hardware concurrency
  components.push(navigator.hardwareConcurrency?.toString() || '0');

  // Platform
  components.push(navigator.platform);

  // Combine all components
  const fingerprintString = components.join('|');

  // Hash the fingerprint
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprintString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  return toBase64(hashArray);
}

/**
 * Validate that Web Crypto API is available
 *
 * @returns true if Web Crypto is available, false otherwise
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.getRandomValues !== 'undefined'
  );
}

/**
 * Check if the current context is secure (HTTPS)
 *
 * Web Crypto API requires a secure context.
 *
 * @returns true if secure context, false otherwise
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') {
    return true; // Server-side is considered secure
  }
  return window.isSecureContext ?? false;
}

/**
 * Validate that the environment supports all required crypto operations
 *
 * @throws Error if environment is not suitable
 */
export function validateCryptoEnvironment(): void {
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API is not available');
  }

  if (!isSecureContext()) {
    throw new Error('Crypto operations require a secure context (HTTPS)');
  }

  // Check for X25519 support (may not be available in older browsers)
  // This is a best-effort check
  try {
    // Will throw if X25519 is not supported
    crypto.subtle.generateKey({ name: 'X25519' }, false, ['deriveKey']);
  } catch (e) {
    throw new Error('Browser does not support X25519 (ECDH)');
  }
}

/**
 * In-memory cache for session KEKs to avoid re-derivation
 *
 * Key: session ID or cookie value
 * Value: { kek, expiresAt }
 */
const kekCache = new Map<
  string,
  {
    kek: CryptoKey;
    expiresAt: number;
  }
>();

/**
 * Cache a KEK for a session
 *
 * @param sessionId - Session identifier
 * @param kek - KEK to cache
 * @param ttlSeconds - Time to live in seconds (default: 1800 = 30 min)
 */
export function cacheKek(sessionId: string, kek: CryptoKey, ttlSeconds: number = 1800): void {
  kekCache.set(sessionId, {
    kek,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Get a cached KEK for a session
 *
 * @param sessionId - Session identifier
 * @returns Cached KEK or null if not found/expired
 */
export function getCachedKek(sessionId: string): CryptoKey | null {
  const cached = kekCache.get(sessionId);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() > cached.expiresAt) {
    kekCache.delete(sessionId);
    return null;
  }

  return cached.kek;
}

/**
 * Clear the KEK cache (e.g., on logout or session end)
 */
export function clearKekCache(): void {
  kekCache.clear();
}
