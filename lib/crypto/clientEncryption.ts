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
 * Generate root secret (32 bytes) for video encryption
 */
export function generateRootSecret(): Uint8Array {
  return generateRandomBytes(32);
}

/**
 * Generate IV for AES-GCM (12 bytes)
 */
export function generateIV(): Uint8Array {
  return generateRandomBytes(12);
}

/**
 * Derive segment DEK from root secret using HKDF-SHA256
 * Matches server-side derivation for playback
 */
export async function deriveSegmentDEK(
  rootSecret: Uint8Array,
  videoId: string,
  rendition: string,
  segIdx: number
): Promise<CryptoKey> {
  // Import root secret as base key (convert to BufferSource)
  const baseKey = await crypto.subtle.importKey(
    'raw',
    rootSecret.buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Salt: videoId|rendition|segIdx (matches server)
  const salt = new TextEncoder().encode(`${videoId}|${rendition}|${segIdx}`);

  // Derive 128-bit AES key (16 bytes)
  const dek = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('chunk-dek-v1'),
    },
    baseKey,
    { name: 'AES-GCM', length: 128 },
    false,
    ['encrypt']
  );

  return dek;
}

/**
 * Encrypt segment data with AES-GCM-128
 */
export async function encryptSegment(
  dek: CryptoKey,
  data: Uint8Array,
  iv: Uint8Array
): Promise<Uint8Array> {
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
      tagLength: 128, // MUST match server-side decryption (128-bit auth tag)
    },
    dek,
    data.buffer as ArrayBuffer
  );

  return new Uint8Array(encrypted);
}

/**
 * Encrypt root secret with server's public key (X25519)
 * Server will decrypt with its private key to store in KMS
 */
export async function encryptRootSecretForServer(
  rootSecret: Uint8Array,
  serverPublicKey: Uint8Array
): Promise<{ encrypted: Uint8Array; ephemeralPublicKey: Uint8Array }> {
  // Generate ephemeral client keypair for ECDH
  const clientKeypair = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'X25519',
    },
    true,
    ['deriveKey']
  );

  // Import server's public key
  const serverPubKey = await crypto.subtle.importKey(
    'raw',
    serverPublicKey.buffer as ArrayBuffer,
    {
      name: 'ECDH',
      namedCurve: 'X25519',
    },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: serverPubKey,
    },
    clientKeypair.privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt']
  );

  // Encrypt root secret with shared secret
  const iv = generateIV();
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    sharedSecret,
    rootSecret.buffer as ArrayBuffer
  );

  // Export client's public key
  const clientPubKeyExported = await crypto.subtle.exportKey(
    'raw',
    clientKeypair.publicKey
  );

  // Combine: iv (12 bytes) + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return {
    encrypted: combined,
    ephemeralPublicKey: new Uint8Array(clientPubKeyExported),
  };
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
