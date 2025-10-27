/**
 * Tests for client-side crypto functions
 *
 * This test suite verifies:
 * - Client session initialization
 * - Client-server KEK derivation
 * - DEK unwrapping
 * - Segment decryption
 * - Device fingerprinting
 * - Environment validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  initializeClientSession,
  deriveClientKek,
  unwrapSegmentDek,
  decryptSegment,
  unwrapAndDecryptSegment,
  getDeviceFingerprint,
  isWebCryptoAvailable,
  isSecureContext,
  validateCryptoEnvironment,
  cacheKek,
  getCachedKek,
  clearKekCache,
} from '@/lib/crypto/client';
import {
  generateX25519Keypair,
  deriveSharedSecret,
  hkdfDeriveKey,
  wrapKey,
  aesGcmEncrypt,
  generateAes128Key,
  generateIv,
  randomBytes,
} from '@/lib/crypto/primitives';
import { toBase64 } from '@/lib/crypto/utils';

describe('Client Crypto Functions', () => {
  describe('Environment Validation', () => {
    it('should detect Web Crypto availability', () => {
      const available = isWebCryptoAvailable();
      expect(available).toBe(true);
    });

    it('should validate crypto environment', () => {
      // Note: This may throw in Node.js test environment due to secure context check
      // In real browser environment with HTTPS, this should pass
      try {
        validateCryptoEnvironment();
      } catch (e) {
        // Expected in Node.js test environment
        expect((e as Error).message).toContain('secure context');
      }
    });

    it('should check secure context', () => {
      const secure = isSecureContext();
      expect(typeof secure).toBe('boolean');
    });
  });

  describe('Client Session Initialization', () => {
    it('should initialize client session with keypair', async () => {
      const session = await initializeClientSession();

      expect(session).toBeDefined();
      expect(session.clientPublicKey).toBeInstanceOf(Uint8Array);
      expect(session.clientPublicKey.length).toBe(32);
      expect(session.clientPrivateKeyJwk).toBeDefined();
      expect(session.clientPrivateKeyJwk.kty).toBe('OKP');
      expect(session.clientPrivateKeyJwk.crv).toBe('X25519');
      expect(session.kek).toBeNull();
    });

    it('should generate different sessions each time', async () => {
      const session1 = await initializeClientSession();
      const session2 = await initializeClientSession();

      expect(session1.clientPublicKey).not.toEqual(session2.clientPublicKey);
    });
  });

  describe('KEK Derivation', () => {
    it('should derive KEK from server public key and nonce', async () => {
      // Initialize client session
      const clientSession = await initializeClientSession();

      // Simulate server generating keypair and nonce
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      // Convert to base64 (as would be sent over network)
      const serverPublicKeyB64 = toBase64(serverKeypair.publicKey);
      const serverNonceB64 = toBase64(serverNonce);

      // Derive client KEK
      const clientKek = await deriveClientKek(
        clientSession,
        serverPublicKeyB64,
        serverNonceB64
      );

      expect(clientKek).toBeDefined();
      expect(clientKek.type).toBe('secret');
      expect(clientKek.algorithm.name).toBe('AES-GCM');
      expect(clientSession.kek).toBe(clientKek);
    });

    it('should derive same KEK as server', async () => {
      // Client setup
      const clientSession = await initializeClientSession();

      // Server setup
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      // Server derives shared secret and KEK
      const serverSharedSecret = await deriveSharedSecret(
        clientSession.clientPublicKey,
        serverKeypair.privateKeyJwk
      );

      const serverKek = await hkdfDeriveKey(
        {
          ikm: serverSharedSecret,
          salt: serverNonce,
          info: 'session-kek-v1',
        },
        ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
      );

      // Client derives KEK
      const clientKek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      // Test that both KEKs work identically
      const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
      const testIv = generateIv();

      // Encrypt with server KEK
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: testIv },
        serverKek,
        testData
      );

      // Decrypt with client KEK
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: testIv },
        clientKek,
        encrypted
      );

      expect(new Uint8Array(decrypted)).toEqual(testData);
    });

    it('should throw error for invalid server public key length', async () => {
      const clientSession = await initializeClientSession();
      const invalidPublicKey = toBase64(randomBytes(16)); // Wrong length
      const nonce = toBase64(randomBytes(12));

      await expect(
        deriveClientKek(clientSession, invalidPublicKey, nonce)
      ).rejects.toThrow('Invalid server public key length');
    });

    it('should throw error for invalid nonce length', async () => {
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const invalidNonce = toBase64(randomBytes(16)); // Wrong length

      await expect(
        deriveClientKek(clientSession, toBase64(serverKeypair.publicKey), invalidNonce)
      ).rejects.toThrow('Invalid server nonce length');
    });
  });

  describe('DEK Unwrapping and Segment Decryption', () => {
    it('should unwrap segment DEK correctly', async () => {
      // Setup session
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      // Derive KEKs
      const serverSharedSecret = await deriveSharedSecret(
        clientSession.clientPublicKey,
        serverKeypair.privateKeyJwk
      );

      const serverKek = await hkdfDeriveKey(
        { ikm: serverSharedSecret, salt: serverNonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const clientKek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      // Server wraps DEK
      const dek = generateAes128Key();
      const { wrappedKey, iv } = await wrapKey(serverKek, dek);

      // Client unwraps DEK
      const unwrappedDek = await unwrapSegmentDek(
        clientKek,
        toBase64(wrappedKey),
        toBase64(iv)
      );

      expect(unwrappedDek).toEqual(dek);
    });

    it('should decrypt segment correctly', async () => {
      // Setup encryption
      const dek = generateAes128Key();
      const iv = generateIv();
      const plainSegment = new TextEncoder().encode('Video segment data');

      // Encrypt segment
      const encrypted = await aesGcmEncrypt(dek, plainSegment, iv);

      // Decrypt segment
      const decrypted = await decryptSegment(dek, encrypted, toBase64(iv));

      expect(decrypted).toEqual(plainSegment);
      expect(new TextDecoder().decode(decrypted)).toBe('Video segment data');
    });

    it('should complete full unwrap and decrypt flow', async () => {
      // Setup session
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      // Derive KEKs
      const serverSharedSecret = await deriveSharedSecret(
        clientSession.clientPublicKey,
        serverKeypair.privateKeyJwk
      );

      const serverKek = await hkdfDeriveKey(
        { ikm: serverSharedSecret, salt: serverNonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const clientKek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      // Server encrypts segment
      const dek = generateAes128Key();
      const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
      const segmentIv = generateIv();
      const plainSegment = randomBytes(1024); // 1KB segment
      const encryptedSegment = await aesGcmEncrypt(dek, plainSegment, segmentIv);

      // Client unwraps and decrypts in one call
      const decrypted = await unwrapAndDecryptSegment(
        clientKek,
        toBase64(wrappedKey),
        toBase64(wrapIv),
        encryptedSegment,
        toBase64(segmentIv)
      );

      expect(decrypted).toEqual(plainSegment);
    });
  });

  describe('Device Fingerprinting', () => {
    it('should generate device fingerprint', async () => {
      const fingerprint = await getDeviceFingerprint();

      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
    });

    it('should generate same fingerprint in same environment', async () => {
      const fp1 = await getDeviceFingerprint();
      const fp2 = await getDeviceFingerprint();

      expect(fp1).toBe(fp2);
    });

    it('should generate base64 encoded hash', async () => {
      const fingerprint = await getDeviceFingerprint();

      // Base64 should not contain invalid characters
      expect(fingerprint).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('KEK Caching', () => {
    beforeAll(() => {
      clearKekCache();
    });

    it('should cache and retrieve KEK', async () => {
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      const kek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      const sessionId = 'test-session-123';
      cacheKek(sessionId, kek, 60);

      const cachedKek = getCachedKek(sessionId);
      expect(cachedKek).toBe(kek);
    });

    it('should return null for non-existent session', () => {
      const kek = getCachedKek('non-existent-session');
      expect(kek).toBeNull();
    });

    it('should clear all cached KEKs', async () => {
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      const kek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      cacheKek('session-1', kek);
      cacheKek('session-2', kek);

      expect(getCachedKek('session-1')).not.toBeNull();
      expect(getCachedKek('session-2')).not.toBeNull();

      clearKekCache();

      expect(getCachedKek('session-1')).toBeNull();
      expect(getCachedKek('session-2')).toBeNull();
    });
  });

  describe('End-to-End Client-Server Flow', () => {
    it('should complete full ECDH session with multiple segment decryptions', async () => {
      // 1. Client initializes session
      const clientSession = await initializeClientSession();

      // 2. Server generates keypair and nonce
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      // 3. Server derives KEK
      const serverSharedSecret = await deriveSharedSecret(
        clientSession.clientPublicKey,
        serverKeypair.privateKeyJwk
      );

      const serverKek = await hkdfDeriveKey(
        { ikm: serverSharedSecret, salt: serverNonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // 4. Client derives KEK (server sends public key + nonce)
      const clientKek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      // 5. Encrypt and decrypt multiple segments
      const segments = [
        new TextEncoder().encode('Segment 0'),
        new TextEncoder().encode('Segment 1'),
        new TextEncoder().encode('Segment 2'),
      ];

      for (const segment of segments) {
        // Server encrypts
        const dek = generateAes128Key();
        const segmentIv = generateIv();
        const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
        const encryptedSegment = await aesGcmEncrypt(dek, segment, segmentIv);

        // Client decrypts
        const decrypted = await unwrapAndDecryptSegment(
          clientKek,
          toBase64(wrappedKey),
          toBase64(wrapIv),
          encryptedSegment,
          toBase64(segmentIv)
        );

        expect(decrypted).toEqual(segment);
      }
    });

    it('should handle large video segments efficiently', async () => {
      // Setup session
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      const serverSharedSecret = await deriveSharedSecret(
        clientSession.clientPublicKey,
        serverKeypair.privateKeyJwk
      );

      const serverKek = await hkdfDeriveKey(
        { ikm: serverSharedSecret, salt: serverNonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const clientKek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      // Test with 1MB segment (typical video segment size)
      const largeSegment = randomBytes(1024 * 1024);
      const dek = generateAes128Key();
      const segmentIv = generateIv();
      const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);

      const startTime = performance.now();
      const encryptedSegment = await aesGcmEncrypt(dek, largeSegment, segmentIv);
      const encryptionTime = performance.now() - startTime;

      const decryptStartTime = performance.now();
      const decrypted = await unwrapAndDecryptSegment(
        clientKek,
        toBase64(wrappedKey),
        toBase64(wrapIv),
        encryptedSegment,
        toBase64(segmentIv)
      );
      const decryptionTime = performance.now() - decryptStartTime;

      expect(decrypted).toEqual(largeSegment);

      // Performance checks (should complete in reasonable time)
      expect(encryptionTime).toBeLessThan(1000); // < 1 second
      expect(decryptionTime).toBeLessThan(1000); // < 1 second

      console.log(`1MB segment encryption: ${encryptionTime.toFixed(2)}ms`);
      console.log(`1MB segment decryption: ${decryptionTime.toFixed(2)}ms`);
    });
  });
});
