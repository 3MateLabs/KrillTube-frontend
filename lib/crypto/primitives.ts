/**
 * Core cryptographic primitives using Web Crypto API
 *
 * This module provides all the cryptographic building blocks needed for
 * the encrypted HLS playback system:
 * - X25519 (ECDH) keypair generation and key exchange
 * - HKDF key derivation
 * - AES-GCM encryption/decryption
 * - AES-GCM key wrapping/unwrapping
 * - Secure random generation
 *
 * All functions use the native Web Crypto API for maximum security and performance.
 */

/**
 * X25519 keypair (32 bytes each)
 */
export interface X25519Keypair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  privateKeyJwk: JsonWebKey; // Store full JWK for re-import
}

/**
 * Generate an X25519 keypair for ECDH key exchange
 *
 * @returns Promise resolving to 32-byte public and private keys
 */
export async function generateX25519Keypair(): Promise<X25519Keypair> {
  const keypair = (await crypto.subtle.generateKey(
    {
      name: 'X25519',
    },
    true, // extractable
    ['deriveKey', 'deriveBits']
  )) as CryptoKeyPair;

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keypair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keypair.privateKey);

  if (!privateKeyJwk.d) {
    throw new Error('Failed to export private key');
  }

  // Convert base64url to Uint8Array
  const privateKeyBuffer = base64UrlToUint8Array(privateKeyJwk.d);

  return {
    publicKey: new Uint8Array(publicKeyBuffer),
    privateKey: privateKeyBuffer,
    privateKeyJwk, // Store full JWK with both 'd' and 'x'
  };
}

/**
 * Derive a shared secret using ECDH (X25519)
 *
 * @param publicKey - Other party's public key (32 bytes)
 * @param privateKeyJwk - Own private key as JWK (from generateX25519Keypair)
 * @returns Promise resolving to 32-byte shared secret
 */
export async function deriveSharedSecret(
  publicKey: Uint8Array,
  privateKeyJwk: JsonWebKey
): Promise<Uint8Array> {
  if (publicKey.length !== 32) {
    throw new Error('Public key must be 32 bytes');
  }

  // Import public key
  const pubKeyObj = await crypto.subtle.importKey(
    'raw',
    publicKey,
    {
      name: 'X25519',
    },
    false,
    []
  );

  // Import private key from JWK
  const privKeyObj = await crypto.subtle.importKey(
    'jwk',
    privateKeyJwk,
    {
      name: 'X25519',
    },
    false,
    ['deriveBits']
  );

  // Derive shared secret
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    {
      name: 'X25519',
      public: pubKeyObj,
    },
    privKeyObj,
    256 // 32 bytes
  );

  return new Uint8Array(sharedSecretBuffer);
}

/**
 * HKDF parameters
 */
export interface HkdfParams {
  ikm: Uint8Array; // Input key material
  salt: Uint8Array; // Salt (at least 16 bytes recommended)
  info: string; // Context and application specific info
  length: number; // Output key length in bytes (16 for AES-128, 32 for AES-256)
}

/**
 * Derive a key using HKDF-SHA256
 *
 * @param params - HKDF parameters
 * @returns Promise resolving to derived key material
 */
export async function hkdf(params: HkdfParams): Promise<Uint8Array> {
  const { ikm, salt, info, length } = params;

  if (length < 16 || length > 255 * 32) {
    throw new Error('Invalid output length for HKDF');
  }

  // Import IKM as key material
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    {
      name: 'HKDF',
    },
    false,
    ['deriveBits']
  );

  // Derive bits using HKDF
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode(info),
    },
    ikmKey,
    length * 8 // bits
  );

  return new Uint8Array(derivedBits);
}

/**
 * Derive a CryptoKey using HKDF-SHA256 (for use with Web Crypto operations)
 *
 * @param params - HKDF parameters
 * @param keyUsages - Key usages (e.g., ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'])
 * @returns Promise resolving to CryptoKey
 */
export async function hkdfDeriveKey(
  params: Omit<HkdfParams, 'length'>,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> {
  const { ikm, salt, info } = params;

  // Import IKM as key material
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    {
      name: 'HKDF',
    },
    false,
    ['deriveKey']
  );

  // Derive key using HKDF
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: new TextEncoder().encode(info),
    },
    ikmKey,
    {
      name: 'AES-GCM',
      length: 128, // AES-128
    },
    true, // extractable
    keyUsages
  );

  return derivedKey;
}

/**
 * Encrypt data using AES-GCM-128
 *
 * @param key - CryptoKey or raw key bytes (16 bytes for AES-128)
 * @param plaintext - Data to encrypt
 * @param iv - Initialization vector (12 bytes recommended for GCM)
 * @returns Promise resolving to ciphertext (includes auth tag)
 */
export async function aesGcmEncrypt(
  key: CryptoKey | Uint8Array,
  plaintext: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  if (iv.length !== 12) {
    throw new Error('IV must be 12 bytes for AES-GCM');
  }

  // Import key if raw bytes provided
  const cryptoKey =
    key instanceof Uint8Array
      ? await crypto.subtle.importKey(
          'raw',
          key,
          {
            name: 'AES-GCM',
            length: 128,
          },
          false,
          ['encrypt']
        )
      : key;

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    cryptoKey,
    plaintext
  );

  return new Uint8Array(ciphertext);
}

/**
 * Decrypt data using AES-GCM-128
 *
 * @param key - CryptoKey or raw key bytes (16 bytes for AES-128)
 * @param ciphertext - Encrypted data (includes auth tag)
 * @param iv - Initialization vector (12 bytes)
 * @returns Promise resolving to plaintext
 * @throws Error if authentication fails
 */
export async function aesGcmDecrypt(
  key: CryptoKey | Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  if (iv.length !== 12) {
    throw new Error('IV must be 12 bytes for AES-GCM');
  }

  // Import key if raw bytes provided
  const cryptoKey =
    key instanceof Uint8Array
      ? await crypto.subtle.importKey(
          'raw',
          key,
          {
            name: 'AES-GCM',
            length: 128,
          },
          false,
          ['decrypt']
        )
      : key;

  // Decrypt
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    cryptoKey,
    ciphertext
  );

  return new Uint8Array(plaintext);
}

/**
 * Wrap a Data Encryption Key (DEK) with a Key Encryption Key (KEK) using AES-GCM
 *
 * This provides authenticated encryption of the DEK, ensuring both confidentiality
 * and integrity of the wrapped key.
 *
 * @param kek - Key Encryption Key (CryptoKey or raw bytes)
 * @param dek - Data Encryption Key to wrap (raw bytes)
 * @returns Promise resolving to { wrappedKey, iv }
 */
export async function wrapKey(
  kek: CryptoKey | Uint8Array,
  dek: Uint8Array
): Promise<{ wrappedKey: Uint8Array; iv: Uint8Array }> {
  if (dek.length !== 16) {
    throw new Error('DEK must be 16 bytes (AES-128)');
  }

  // Generate random IV for this wrapping operation
  const iv = randomBytes(12);

  // Encrypt DEK with KEK using AES-GCM
  const wrappedKey = await aesGcmEncrypt(kek, dek, iv);

  return { wrappedKey, iv };
}

/**
 * Unwrap a Data Encryption Key (DEK) using a Key Encryption Key (KEK)
 *
 * @param kek - Key Encryption Key (CryptoKey or raw bytes)
 * @param wrappedKey - Wrapped DEK (ciphertext + auth tag)
 * @param iv - Initialization vector used during wrapping
 * @returns Promise resolving to unwrapped DEK (raw bytes)
 * @throws Error if authentication fails
 */
export async function unwrapKey(
  kek: CryptoKey | Uint8Array,
  wrappedKey: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  // Decrypt wrapped DEK
  const dek = await aesGcmDecrypt(kek, wrappedKey, iv);

  if (dek.length !== 16) {
    throw new Error('Unwrapped DEK is not 16 bytes');
  }

  return dek;
}

/**
 * Generate cryptographically secure random bytes
 *
 * @param length - Number of random bytes to generate
 * @returns Uint8Array of random bytes
 */
export function randomBytes(length: number): Uint8Array {
  if (length <= 0) {
    throw new Error('Invalid random bytes length: must be > 0');
  }

  // crypto.getRandomValues has a limit of 65536 bytes per call
  // For larger sizes, we need to chunk the generation
  if (length <= 65536) {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // Generate large random data in chunks
  const result = new Uint8Array(length);
  const chunkSize = 65536;
  let offset = 0;

  while (offset < length) {
    const remaining = length - offset;
    const size = Math.min(remaining, chunkSize);
    const chunk = crypto.getRandomValues(new Uint8Array(size));
    result.set(chunk, offset);
    offset += size;
  }

  return result;
}

/**
 * Generate a random AES-128 key (16 bytes)
 *
 * @returns 16 random bytes suitable for use as AES-128 key
 */
export function generateAes128Key(): Uint8Array {
  return randomBytes(16);
}

/**
 * Generate a random 12-byte IV for AES-GCM
 *
 * @returns 12 random bytes suitable for use as AES-GCM IV
 */
export function generateIv(): Uint8Array {
  return randomBytes(12);
}

/**
 * Generate a random nonce (12 bytes)
 * Alias for generateIv() for clarity in HKDF salt context
 *
 * @returns 12 random bytes suitable for use as HKDF salt/nonce
 */
export function generateNonce(): Uint8Array {
  return randomBytes(12);
}

// ============================================================================
// Utility Functions for Base64Url encoding (used internally)
// ============================================================================

/**
 * Convert base64url string to Uint8Array
 */
function base64UrlToUint8Array(base64url: string): Uint8Array {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  // Decode
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to base64url string
 */
function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  // Convert to binary string
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Encode to base64
  const base64 = btoa(binary);
  // Convert to base64url (remove padding, replace chars)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
