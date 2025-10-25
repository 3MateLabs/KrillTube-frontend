/**
 * Master key management for envelope encryption
 *
 * The master key is used to encrypt/decrypt video root secrets before
 * storing them in the database. In production, this should use AWS KMS
 * or a similar key management service.
 *
 * For V2 MVP, we use a 256-bit master key from environment variable.
 */

import { fromBase64 } from '../crypto/utils';

let cachedMasterKey: Uint8Array | null = null;

/**
 * Get the master encryption key from environment
 *
 * The key is cached in memory after first load.
 *
 * @returns 32-byte master key
 * @throws Error if KMS_MASTER_KEY is not set or invalid
 */
export function getMasterKey(): Uint8Array {
  if (cachedMasterKey) {
    return cachedMasterKey;
  }

  const masterKeyB64 = process.env.KMS_MASTER_KEY;

  if (!masterKeyB64) {
    throw new Error(
      'KMS_MASTER_KEY environment variable is not set. Generate one with: openssl rand -base64 32'
    );
  }

  try {
    const masterKey = fromBase64(masterKeyB64);

    if (masterKey.length !== 32) {
      throw new Error(`Master key must be 32 bytes, got ${masterKey.length}`);
    }

    // Cache for subsequent calls
    cachedMasterKey = masterKey;

    return masterKey;
  } catch (error) {
    throw new Error(
      `Invalid KMS_MASTER_KEY format. Expected base64-encoded 32 bytes. Error: ${error}`
    );
  }
}

/**
 * Validate that the master key is properly configured
 *
 * Call this during application startup to fail fast if misconfigured.
 *
 * @throws Error if master key is invalid
 */
export function validateMasterKey(): void {
  try {
    const key = getMasterKey();
    console.log('[KMS] Master key loaded successfully (32 bytes)');
  } catch (error) {
    console.error('[KMS] Master key validation failed:', error);
    throw error;
  }
}

/**
 * Generate a new random master key (for initial setup only)
 *
 * This should be run ONCE during initial deployment, then the key
 * should be stored securely in environment variables.
 *
 * @returns Base64-encoded 32-byte master key
 */
export function generateMasterKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (let i = 0; i < key.length; i++) {
    binary += String.fromCharCode(key[i]);
  }
  return btoa(binary);
}

/**
 * Clear the cached master key (for testing or key rotation)
 */
export function clearMasterKeyCache(): void {
  cachedMasterKey = null;
}
