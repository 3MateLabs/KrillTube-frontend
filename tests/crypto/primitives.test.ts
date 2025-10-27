/**
 * Tests for cryptographic primitives
 *
 * This test suite verifies:
 * - X25519 key generation and ECDH key exchange
 * - HKDF key derivation
 * - AES-GCM encryption/decryption
 * - Key wrapping/unwrapping
 * - Random generation functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateX25519Keypair,
  deriveSharedSecret,
  hkdf,
  hkdfDeriveKey,
  aesGcmEncrypt,
  aesGcmDecrypt,
  wrapKey,
  unwrapKey,
  randomBytes,
  generateAes128Key,
  generateIv,
  generateNonce,
} from '@/lib/crypto/primitives';

describe('Crypto Primitives', () => {
  describe('Random Generation', () => {
    it('should generate random bytes of correct length', () => {
      const bytes16 = randomBytes(16);
      const bytes32 = randomBytes(32);

      expect(bytes16.length).toBe(16);
      expect(bytes32.length).toBe(32);
    });

    it('should generate different random values each time', () => {
      const bytes1 = randomBytes(16);
      const bytes2 = randomBytes(16);

      // Extremely unlikely to be equal
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should generate AES-128 key (16 bytes)', () => {
      const key = generateAes128Key();
      expect(key.length).toBe(16);
    });

    it('should generate IV (12 bytes)', () => {
      const iv = generateIv();
      expect(iv.length).toBe(12);
    });

    it('should generate nonce (12 bytes)', () => {
      const nonce = generateNonce();
      expect(nonce.length).toBe(12);
    });

    it('should throw error for invalid length', () => {
      expect(() => randomBytes(0)).toThrow();
      expect(() => randomBytes(-1)).toThrow();
      // Large sizes are now supported via chunking
      const large = randomBytes(100000);
      expect(large.length).toBe(100000);
    });
  });

  describe('X25519 Key Generation and ECDH', () => {
    it('should generate valid X25519 keypair', async () => {
      const keypair = await generateX25519Keypair();

      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.privateKey).toBeInstanceOf(Uint8Array);
      expect(keypair.publicKey.length).toBe(32);
      expect(keypair.privateKey.length).toBe(32);
      expect(keypair.privateKeyJwk).toBeDefined();
      expect(keypair.privateKeyJwk.kty).toBe('OKP');
      expect(keypair.privateKeyJwk.crv).toBe('X25519');
    });

    it('should generate different keypairs each time', async () => {
      const keypair1 = await generateX25519Keypair();
      const keypair2 = await generateX25519Keypair();

      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
      expect(keypair1.privateKey).not.toEqual(keypair2.privateKey);
    });

    it('should derive same shared secret from both sides', async () => {
      // Alice generates keypair
      const aliceKeypair = await generateX25519Keypair();

      // Bob generates keypair
      const bobKeypair = await generateX25519Keypair();

      // Alice derives shared secret using Bob's public key
      const aliceShared = await deriveSharedSecret(
        bobKeypair.publicKey,
        aliceKeypair.privateKeyJwk
      );

      // Bob derives shared secret using Alice's public key
      const bobShared = await deriveSharedSecret(
        aliceKeypair.publicKey,
        bobKeypair.privateKeyJwk
      );

      // Both should derive the same shared secret
      expect(aliceShared).toEqual(bobShared);
      expect(aliceShared.length).toBe(32);
    });

    it('should derive different shared secrets for different keypairs', async () => {
      const alice1 = await generateX25519Keypair();
      const alice2 = await generateX25519Keypair();
      const bob = await generateX25519Keypair();

      const shared1 = await deriveSharedSecret(bob.publicKey, alice1.privateKeyJwk);
      const shared2 = await deriveSharedSecret(bob.publicKey, alice2.privateKeyJwk);

      expect(shared1).not.toEqual(shared2);
    });

    it('should throw error for invalid public key length', async () => {
      const keypair = await generateX25519Keypair();
      const invalidPublicKey = new Uint8Array(16); // Wrong length

      await expect(
        deriveSharedSecret(invalidPublicKey, keypair.privateKeyJwk)
      ).rejects.toThrow();
    });
  });

  describe('HKDF Key Derivation', () => {
    it('should derive deterministic keys from same inputs', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const info = 'test-context';

      const key1 = await hkdf({ ikm, salt, info, length: 16 });
      const key2 = await hkdf({ ikm, salt, info, length: 16 });

      expect(key1).toEqual(key2);
      expect(key1.length).toBe(16);
    });

    it('should derive different keys for different contexts', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);

      const key1 = await hkdf({ ikm, salt, info: 'context-1', length: 16 });
      const key2 = await hkdf({ ikm, salt, info: 'context-2', length: 16 });

      expect(key1).not.toEqual(key2);
    });

    it('should derive different keys for different salts', async () => {
      const ikm = randomBytes(32);
      const info = 'test-context';

      const key1 = await hkdf({ ikm, salt: randomBytes(16), info, length: 16 });
      const key2 = await hkdf({ ikm, salt: randomBytes(16), info, length: 16 });

      expect(key1).not.toEqual(key2);
    });

    it('should derive different length keys', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const info = 'test-context';

      const key16 = await hkdf({ ikm, salt, info, length: 16 });
      const key32 = await hkdf({ ikm, salt, info, length: 32 });

      expect(key16.length).toBe(16);
      expect(key32.length).toBe(32);
    });

    it('should throw error for invalid output length', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);

      await expect(
        hkdf({ ikm, salt, info: 'test', length: 8 })
      ).rejects.toThrow();

      await expect(
        hkdf({ ikm, salt, info: 'test', length: 10000 })
      ).rejects.toThrow();
    });

    it('should derive CryptoKey for AES-GCM', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const info = 'session-kek';

      const cryptoKey = await hkdfDeriveKey(
        { ikm, salt, info },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      expect(cryptoKey).toBeDefined();
      expect(cryptoKey.type).toBe('secret');
      expect(cryptoKey.algorithm.name).toBe('AES-GCM');
    });
  });

  describe('AES-GCM Encryption/Decryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const key = generateAes128Key();
      const iv = generateIv();
      const plaintext = new TextEncoder().encode('Hello, World!');

      const ciphertext = await aesGcmEncrypt(key, plaintext, iv);
      const decrypted = await aesGcmDecrypt(key, ciphertext, iv);

      expect(decrypted).toEqual(plaintext);
      expect(new TextDecoder().decode(decrypted)).toBe('Hello, World!');
    });

    it('should produce different ciphertext with different IVs', async () => {
      const key = generateAes128Key();
      const plaintext = new TextEncoder().encode('Test data');

      const ciphertext1 = await aesGcmEncrypt(key, plaintext, generateIv());
      const ciphertext2 = await aesGcmEncrypt(key, plaintext, generateIv());

      expect(ciphertext1).not.toEqual(ciphertext2);
    });

    it('should fail decryption with wrong key', async () => {
      const key1 = generateAes128Key();
      const key2 = generateAes128Key();
      const iv = generateIv();
      const plaintext = new TextEncoder().encode('Secret data');

      const ciphertext = await aesGcmEncrypt(key1, plaintext, iv);

      await expect(
        aesGcmDecrypt(key2, ciphertext, iv)
      ).rejects.toThrow();
    });

    it('should fail decryption with wrong IV', async () => {
      const key = generateAes128Key();
      const plaintext = new TextEncoder().encode('Secret data');

      const ciphertext = await aesGcmEncrypt(key, plaintext, generateIv());

      await expect(
        aesGcmDecrypt(key, ciphertext, generateIv())
      ).rejects.toThrow();
    });

    it('should fail decryption with tampered ciphertext', async () => {
      const key = generateAes128Key();
      const iv = generateIv();
      const plaintext = new TextEncoder().encode('Secret data');

      const ciphertext = await aesGcmEncrypt(key, plaintext, iv);

      // Tamper with ciphertext
      ciphertext[0] ^= 1;

      await expect(
        aesGcmDecrypt(key, ciphertext, iv)
      ).rejects.toThrow();
    });

    it('should encrypt large data', async () => {
      const key = generateAes128Key();
      const iv = generateIv();
      const largeData = randomBytes(1024 * 1024); // 1MB

      const ciphertext = await aesGcmEncrypt(key, largeData, iv);
      const decrypted = await aesGcmDecrypt(key, ciphertext, iv);

      expect(decrypted).toEqual(largeData);
    });

    it('should throw error for invalid IV length', async () => {
      const key = generateAes128Key();
      const plaintext = new TextEncoder().encode('Test');
      const badIv = randomBytes(16); // Should be 12 bytes

      await expect(
        aesGcmEncrypt(key, plaintext, badIv)
      ).rejects.toThrow('IV must be 12 bytes');
    });

    it('should work with CryptoKey instead of raw bytes', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const cryptoKey = await hkdfDeriveKey(
        { ikm, salt, info: 'test-key' },
        ['encrypt', 'decrypt']
      );

      const iv = generateIv();
      const plaintext = new TextEncoder().encode('Test with CryptoKey');

      const ciphertext = await aesGcmEncrypt(cryptoKey, plaintext, iv);
      const decrypted = await aesGcmDecrypt(cryptoKey, ciphertext, iv);

      expect(decrypted).toEqual(plaintext);
    });
  });

  describe('Key Wrapping/Unwrapping', () => {
    it('should wrap and unwrap DEK successfully', async () => {
      // Generate KEK
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const kek = await hkdfDeriveKey(
        { ikm, salt, info: 'session-kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // Generate DEK
      const dek = generateAes128Key();

      // Wrap DEK
      const { wrappedKey, iv } = await wrapKey(kek, dek);

      // Unwrap DEK
      const unwrappedDek = await unwrapKey(kek, wrappedKey, iv);

      expect(unwrappedDek).toEqual(dek);
    });

    it('should produce different wrapped keys each time (random IV)', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const kek = await hkdfDeriveKey(
        { ikm, salt, info: 'session-kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const dek = generateAes128Key();

      const wrap1 = await wrapKey(kek, dek);
      const wrap2 = await wrapKey(kek, dek);

      // IVs should be different
      expect(wrap1.iv).not.toEqual(wrap2.iv);
      // Wrapped keys should be different
      expect(wrap1.wrappedKey).not.toEqual(wrap2.wrappedKey);

      // But both should unwrap to same DEK
      const unwrapped1 = await unwrapKey(kek, wrap1.wrappedKey, wrap1.iv);
      const unwrapped2 = await unwrapKey(kek, wrap2.wrappedKey, wrap2.iv);

      expect(unwrapped1).toEqual(dek);
      expect(unwrapped2).toEqual(dek);
    });

    it('should fail unwrapping with wrong KEK', async () => {
      const ikm1 = randomBytes(32);
      const ikm2 = randomBytes(32);
      const salt = randomBytes(16);

      const kek1 = await hkdfDeriveKey(
        { ikm: ikm1, salt, info: 'kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const kek2 = await hkdfDeriveKey(
        { ikm: ikm2, salt, info: 'kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const dek = generateAes128Key();
      const { wrappedKey, iv } = await wrapKey(kek1, dek);

      await expect(
        unwrapKey(kek2, wrappedKey, iv)
      ).rejects.toThrow();
    });

    it('should fail unwrapping with tampered wrapped key', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const kek = await hkdfDeriveKey(
        { ikm, salt, info: 'kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const dek = generateAes128Key();
      const { wrappedKey, iv } = await wrapKey(kek, dek);

      // Tamper with wrapped key
      wrappedKey[0] ^= 1;

      await expect(
        unwrapKey(kek, wrappedKey, iv)
      ).rejects.toThrow();
    });

    it('should throw error for invalid DEK length', async () => {
      const ikm = randomBytes(32);
      const salt = randomBytes(16);
      const kek = await hkdfDeriveKey(
        { ikm, salt, info: 'kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const invalidDek = randomBytes(32); // Should be 16 bytes

      await expect(
        wrapKey(kek, invalidDek)
      ).rejects.toThrow('DEK must be 16 bytes');
    });
  });

  describe('End-to-End Encryption Flow', () => {
    it('should complete full ECDH + HKDF + AES-GCM flow', async () => {
      // 1. Client and server generate keypairs
      const clientKeypair = await generateX25519Keypair();
      const serverKeypair = await generateX25519Keypair();

      // 2. Both derive shared secret
      const clientShared = await deriveSharedSecret(
        serverKeypair.publicKey,
        clientKeypair.privateKeyJwk
      );

      const serverShared = await deriveSharedSecret(
        clientKeypair.publicKey,
        serverKeypair.privateKeyJwk
      );

      expect(clientShared).toEqual(serverShared);

      // 3. Derive session KEK from shared secret
      const salt = randomBytes(16);
      const sessionKek = await hkdfDeriveKey(
        { ikm: clientShared, salt, info: 'session-kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // 4. Server generates DEK for segment encryption
      const segmentDek = generateAes128Key();
      const segmentIv = generateIv();

      // 5. Server wraps DEK with KEK
      const { wrappedKey, iv: wrapIv } = await wrapKey(sessionKek, segmentDek);

      // 6. Server encrypts segment
      const segment = new TextEncoder().encode('Video segment data');
      const encryptedSegment = await aesGcmEncrypt(segmentDek, segment, segmentIv);

      // 7. Client unwraps DEK
      const unwrappedDek = await unwrapKey(sessionKek, wrappedKey, wrapIv);

      // 8. Client decrypts segment
      const decryptedSegment = await aesGcmDecrypt(
        unwrappedDek,
        encryptedSegment,
        segmentIv
      );

      expect(decryptedSegment).toEqual(segment);
      expect(new TextDecoder().decode(decryptedSegment)).toBe('Video segment data');
    });

    it('should handle multiple segment encryptions with same KEK', async () => {
      // Setup ECDH and derive KEK
      const clientKeypair = await generateX25519Keypair();
      const serverKeypair = await generateX25519Keypair();

      const sharedSecret = await deriveSharedSecret(
        serverKeypair.publicKey,
        clientKeypair.privateKeyJwk
      );

      const kek = await hkdfDeriveKey(
        { ikm: sharedSecret, salt: randomBytes(16), info: 'session-kek' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // Encrypt multiple segments
      const segments = [
        new TextEncoder().encode('Segment 1'),
        new TextEncoder().encode('Segment 2'),
        new TextEncoder().encode('Segment 3'),
      ];

      const encryptedData = [];

      for (const segment of segments) {
        const dek = generateAes128Key();
        const iv = generateIv();
        const { wrappedKey, iv: wrapIv } = await wrapKey(kek, dek);
        const ciphertext = await aesGcmEncrypt(dek, segment, iv);

        encryptedData.push({ ciphertext, iv, wrappedKey, wrapIv });
      }

      // Decrypt all segments
      for (let i = 0; i < segments.length; i++) {
        const { ciphertext, iv, wrappedKey, wrapIv } = encryptedData[i];
        const dek = await unwrapKey(kek, wrappedKey, wrapIv);
        const decrypted = await aesGcmDecrypt(dek, ciphertext, iv);

        expect(decrypted).toEqual(segments[i]);
      }
    });
  });
});
