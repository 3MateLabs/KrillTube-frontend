/**
 * Envelope encryption for video root secrets and session keys
 *
 * This module provides envelope encryption using the master key:
 * 1. Generate a random Data Encryption Key (DEK)
 * 2. Encrypt the data with the DEK using AES-GCM
 * 3. Encrypt the DEK with the master key (Key Encryption Key)
 * 4. Store: encrypted_data + encrypted_dek + iv
 *
 * For production, replace this with AWS KMS encryption/decryption.
 */

import { aesGcmEncrypt, aesGcmDecrypt, generateAes128Key, generateIv } from '../crypto/primitives';
import { concatBytes } from '../crypto/utils';
import { getMasterKey } from './masterKey';

/**
 * Encrypt a segment DEK using the master key
 *
 * The encrypted output can be safely stored in the database.
 *
 * @param plainDek - Segment DEK (16 bytes)
 * @returns Buffer containing encrypted DEK
 */
export async function encryptDek(plainDek: Uint8Array): Promise<Buffer> {
  if (plainDek.length !== 16) {
    throw new Error('DEK must be 16 bytes');
  }

  // Encrypt DEK directly with master key (no envelope needed for small keys)
  const masterKey = getMasterKey();
  const iv = generateIv(); // 12 bytes
  const encryptedDek = await aesGcmEncrypt(masterKey, plainDek, iv);

  // Format: [version(1)] [iv(12)] [encryptedDek(32)]
  const version = new Uint8Array([1]);
  const combined = concatBytes(version, iv, encryptedDek);

  return Buffer.from(combined);
}

/**
 * Decrypt a segment DEK using the master key
 *
 * @param encryptedDek - Buffer or Uint8Array containing encrypted DEK from database
 * @returns Decrypted DEK (16 bytes)
 */
export async function decryptDek(encryptedDek: Buffer | Uint8Array): Promise<Uint8Array> {
  const data = new Uint8Array(encryptedDek);

  // Parse the combined blob
  let offset = 0;

  // Version check
  const version = data[offset];
  offset += 1;

  if (version !== 1) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  // Extract IV
  const iv = data.slice(offset, offset + 12);
  offset += 12;

  // Extract encrypted DEK (16 bytes + 16 bytes auth tag = 32)
  const encryptedDekData = data.slice(offset);

  // Decrypt the DEK using the master key
  const masterKey = getMasterKey();
  const plainDek = await aesGcmDecrypt(masterKey, encryptedDekData, iv);

  if (plainDek.length !== 16) {
    throw new Error(`Decrypted DEK is not 16 bytes: ${plainDek.length}`);
  }

  return plainDek;
}

/**
 * In-memory store for session private keys (ephemeral)
 *
 * In production, use Redis with TTL for better scalability.
 * For V2 MVP, we use a simple Map with expiration.
 */
const sessionKeyStore = new Map<
  string,
  {
    privateKeyJwk: JsonWebKey;
    expiresAt: number;
  }
>();

/**
 * Store a session private key (ephemeral, short-lived)
 *
 * @param sessionId - Session identifier
 * @param privateKeyJwk - X25519 private key as JWK
 * @param ttlSeconds - Time to live in seconds (default: 1800 = 30 min)
 * @returns Reference string (just returns sessionId for now)
 */
export function storeSessionPrivateKey(
  sessionId: string,
  privateKeyJwk: JsonWebKey,
  ttlSeconds: number = 1800
): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;

  sessionKeyStore.set(sessionId, {
    privateKeyJwk,
    expiresAt,
  });

  return sessionId; // Return sessionId as the reference
}

/**
 * Load a session private key
 *
 * @param reference - Reference string (sessionId)
 * @returns X25519 private key as JWK
 * @throws Error if not found or expired
 */
export function loadSessionPrivateKey(reference: string): JsonWebKey {
  const entry = sessionKeyStore.get(reference);

  if (!entry) {
    throw new Error('Session private key not found');
  }

  if (Date.now() > entry.expiresAt) {
    sessionKeyStore.delete(reference);
    throw new Error('Session private key expired');
  }

  return entry.privateKeyJwk;
}

/**
 * Delete a session private key
 *
 * @param reference - Reference string (sessionId)
 */
export function deleteSessionPrivateKey(reference: string): void {
  sessionKeyStore.delete(reference);
}

/**
 * Clean up expired session keys (should be called periodically)
 *
 * @returns Number of keys cleaned up
 */
export function cleanupExpiredSessionKeys(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, value] of sessionKeyStore.entries()) {
    if (now > value.expiresAt) {
      sessionKeyStore.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[KMS] Cleaned up ${cleaned} expired session keys`);
  }

  return cleaned;
}

/**
 * Get session key store statistics (for monitoring)
 */
export function getSessionKeyStoreStats(): {
  total: number;
  expired: number;
} {
  const now = Date.now();
  let expired = 0;

  for (const value of sessionKeyStore.values()) {
    if (now > value.expiresAt) {
      expired++;
    }
  }

  return {
    total: sessionKeyStore.size,
    expired,
  };
}
