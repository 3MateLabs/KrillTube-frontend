/**
 * Server-side key derivation functions
 *
 * This module handles key derivation for playback sessions:
 * - Session KEK (Key Encryption Key) derivation from ECDH shared secret
 *
 * All keys are derived deterministically using HKDF-SHA256.
 */

import { deriveSharedSecret, hkdfDeriveKey } from './primitives';
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
    new Uint8Array(stringToBytes(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const masterKeyBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(salt),
      iterations,
    },
    passwordKey,
    256 // 32 bytes
  );

  return new Uint8Array(masterKeyBits);
}
