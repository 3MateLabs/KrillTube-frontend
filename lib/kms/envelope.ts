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
 * Encrypt a video root secret using envelope encryption
 *
 * The encrypted output can be safely stored in the database.
 *
 * @param plainSecret - Video root secret (32 bytes)
 * @returns Buffer containing encrypted secret
 */
export async function encryptRootSecret(plainSecret: Uint8Array): Promise<Buffer> {
  if (plainSecret.length !== 32) {
    throw new Error('Root secret must be 32 bytes');
  }

  // Step 1: Generate a random DEK for this secret
  const dek = generateAes128Key(); // 16 bytes
  const dataIv = generateIv(); // 12 bytes

  // Step 2: Encrypt the secret with the DEK
  const encryptedData = await aesGcmEncrypt(dek, plainSecret, dataIv);

  // Step 3: Encrypt the DEK with the master key
  const masterKey = getMasterKey();
  const kekIv = generateIv(); // 12 bytes
  const encryptedDek = await aesGcmEncrypt(masterKey, dek, kekIv);

  // Step 4: Combine everything into a single blob
  // Format: [version(1)] [dataIv(12)] [kekIv(12)] [encryptedDek(32)] [encryptedData(48)]
  const version = new Uint8Array([1]); // Version byte for future compatibility
  const combined = concatBytes(version, dataIv, kekIv, encryptedDek, encryptedData);

  return Buffer.from(combined);
}

/**
 * Decrypt a video root secret using envelope encryption
 *
 * @param encryptedSecret - Buffer or Uint8Array containing encrypted secret from database
 * @returns Decrypted root secret (32 bytes)
 */
export async function decryptRootSecret(encryptedSecret: Buffer | Uint8Array): Promise<Uint8Array> {
  const data = new Uint8Array(encryptedSecret);

  // Parse the combined blob
  let offset = 0;

  // Version check
  const version = data[offset];
  offset += 1;

  if (version !== 1) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

  // Extract IVs
  const dataIv = data.slice(offset, offset + 12);
  offset += 12;

  const kekIv = data.slice(offset, offset + 12);
  offset += 12;

  // Extract encrypted DEK (16 bytes + 16 bytes auth tag = 32)
  const encryptedDek = data.slice(offset, offset + 32);
  offset += 32;

  // Extract encrypted data (32 bytes + 16 bytes auth tag = 48)
  const encryptedData = data.slice(offset);

  // Step 1: Decrypt the DEK using the master key
  const masterKey = getMasterKey();
  const dek = await aesGcmDecrypt(masterKey, encryptedDek, kekIv);

  // Step 2: Decrypt the data using the DEK
  const plainSecret = await aesGcmDecrypt(dek, encryptedData, dataIv);

  if (plainSecret.length !== 32) {
    throw new Error(`Decrypted secret is not 32 bytes: ${plainSecret.length}`);
  }

  return plainSecret;
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
