/**
 * Server-side key derivation functions
 *
 * This module handles all key derivation operations on the server:
 * - Session KEK (Key Encryption Key) derivation from ECDH shared secret
 * - Segment DEK (Data Encryption Key) derivation from video root secret
 *
 * All keys are derived deterministically using HKDF-SHA256.
 */

import { deriveSharedSecret, hkdf, hkdfDeriveKey } from './primitives';
import { stringToBytes } from './utils';

/**
 * Derive a session KEK (Key Encryption Key) from ECDH shared secret
 *
 * This KEK is used to wrap/unwrap segment DEKs for a specific playback session.
 * The derivation combines the ECDH shared secret with a server nonce to create
 * a unique KEK per session.
 *
 * @param serverPrivateKeyJwk - Server's ephemeral X25519 private key (JWK)
 * @param clientPublicKey - Client's ephemeral X25519 public key (32 bytes)
 * @param serverNonce - Server-generated nonce (12 bytes)
 * @returns Promise resolving to KEK as CryptoKey
 */
export async function deriveSessionKek(
  serverPrivateKeyJwk: JsonWebKey,
  clientPublicKey: Uint8Array,
  serverNonce: Uint8Array
): Promise<CryptoKey> {
  console.log('[Server KEK] Deriving server KEK...');
  console.log('[Server KEK] Server private JWK has d:', !!serverPrivateKeyJwk.d);
  console.log('[Server KEK] Server private JWK has x:', !!serverPrivateKeyJwk.x);
  console.log('[Server KEK] Client public key length:', clientPublicKey.length);
  console.log('[Server KEK] Server nonce length:', serverNonce.length);

  if (clientPublicKey.length !== 32) {
    throw new Error('Client public key must be 32 bytes');
  }
  if (serverNonce.length !== 12) {
    throw new Error('Server nonce must be 12 bytes');
  }

  // Step 1: Perform ECDH key exchange
  const sharedSecret = await deriveSharedSecret(clientPublicKey, serverPrivateKeyJwk);

  // Import toBase64 for logging
  const { toBase64 } = await import('./utils');
  console.log('[Server KEK] ECDH shared secret (first 8 bytes):', toBase64(sharedSecret.slice(0, 8)));

  // Step 2: Derive KEK using HKDF with the nonce as salt
  const kek = await hkdfDeriveKey(
    {
      ikm: sharedSecret,
      salt: serverNonce,
      info: 'session-kek-v1', // Domain separation
    },
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  );

  console.log('[Server KEK] ✓ Derived KEK');

  return kek;
}

/**
 * Derive a segment DEK (Data Encryption Key) deterministically
 *
 * Each segment gets a unique DEK derived from the video's root secret.
 * The derivation uses the video ID, rendition name, and segment index
 * to ensure uniqueness while maintaining determinism.
 *
 * @param rootSecret - Video's root secret (32 bytes, KMS-encrypted in database)
 * @param videoId - Video identifier (e.g., "vid_abc123")
 * @param rendition - Rendition name (e.g., "720p")
 * @param segmentIndex - Segment index (0-based)
 * @returns Promise resolving to 16-byte DEK for AES-128-GCM
 */
export async function deriveSegmentDek(
  rootSecret: Uint8Array,
  videoId: string,
  rendition: string,
  segmentIndex: number
): Promise<Uint8Array> {
  if (rootSecret.length !== 32) {
    throw new Error('Root secret must be 32 bytes');
  }
  if (!Number.isInteger(segmentIndex) || segmentIndex < -1) {
    throw new Error('Segment index must be an integer >= -1 (-1 for init segment)');
  }

  // Create a unique salt for this segment
  // Format: "videoId|rendition|segmentIndex"
  const saltString = `${videoId}|${rendition}|${segmentIndex}`;
  const salt = stringToBytes(saltString);

  // Derive 16-byte (128-bit) DEK using HKDF
  const dek = await hkdf({
    ikm: rootSecret,
    salt,
    info: 'chunk-dek-v1', // Domain separation
    length: 16, // AES-128
  });

  return dek;
}

/**
 * Derive a segment DEK as CryptoKey (for direct use with Web Crypto API)
 *
 * Same as deriveSegmentDek but returns a CryptoKey instead of raw bytes.
 *
 * @param rootSecret - Video's root secret (32 bytes)
 * @param videoId - Video identifier
 * @param rendition - Rendition name
 * @param segmentIndex - Segment index
 * @returns Promise resolving to CryptoKey for AES-128-GCM
 */
export async function deriveSegmentDekKey(
  rootSecret: Uint8Array,
  videoId: string,
  rendition: string,
  segmentIndex: number
): Promise<CryptoKey> {
  if (rootSecret.length !== 32) {
    throw new Error('Root secret must be 32 bytes');
  }

  const saltString = `${videoId}|${rendition}|${segmentIndex}`;
  const salt = stringToBytes(saltString);

  // Import root secret as key material
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    rootSecret,
    { name: 'HKDF' },
    false,
    ['deriveKey']
  );

  // Derive DEK as CryptoKey
  const dek = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: stringToBytes('chunk-dek-v1'),
    },
    ikmKey,
    {
      name: 'AES-GCM',
      length: 128,
    },
    true, // extractable (for wrapping)
    ['encrypt', 'decrypt']
  );

  return dek;
}

/**
 * Generate a video root secret (32 bytes)
 *
 * This should be called once when a video is uploaded.
 * The root secret must be encrypted with KMS before storing in the database.
 *
 * @returns 32 random bytes
 */
export function generateVideoRootSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Derive a master key from a password (for KMS master key generation)
 *
 * NOTE: This is for initial setup only. In production, use a proper KMS.
 *
 * @param password - Password or secret passphrase
 * @param salt - Salt (should be saved alongside encrypted data)
 * @param iterations - PBKDF2 iterations (100,000+ recommended)
 * @returns Promise resolving to 32-byte master key
 */
export async function deriveMasterKeyFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<Uint8Array> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    stringToBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const masterKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    passwordKey,
    256 // 32 bytes
  );

  return new Uint8Array(masterKeyBits);
}
