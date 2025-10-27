/**
 * End-to-End Integration Tests for Video Encryption System
 *
 * This test suite simulates the complete video encryption and decryption flow:
 * 1. Client-server ECDH key exchange
 * 2. Session KEK derivation
 * 3. Multiple segment encryption/decryption
 * 4. Key prefetching simulation
 * 5. Performance benchmarks
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  initializeClientSession,
  deriveClientKek,
  unwrapAndDecryptSegment,
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

describe('End-to-End Video Encryption System', () => {
  describe('Complete Video Playback Simulation', () => {
    it('should handle complete HLS playback scenario with multiple quality levels', async () => {
      // Simulate HLS video with 3 quality levels, 10 segments each
      const qualities = ['720p', '480p', '360p'];
      const segmentsPerQuality = 10;

      // 1. ECDH handshake
      const clientSession = await initializeClientSession();
      const serverKeypair = await generateX25519Keypair();
      const serverNonce = randomBytes(12);

      // Server derives KEK
      const serverSharedSecret = await deriveSharedSecret(
        clientSession.clientPublicKey,
        serverKeypair.privateKeyJwk
      );

      const serverKek = await hkdfDeriveKey(
        { ikm: serverSharedSecret, salt: serverNonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      // Client derives KEK
      const clientKek = await deriveClientKek(
        clientSession,
        toBase64(serverKeypair.publicKey),
        toBase64(serverNonce)
      );

      // 2. Simulate video playback
      const playbackResults: {
        quality: string;
        segmentIndex: number;
        success: boolean;
        decryptionTime: number;
      }[] = [];

      for (const quality of qualities) {
        for (let segIdx = 0; segIdx < segmentsPerQuality; segIdx++) {
          // Server-side: Generate and encrypt segment
          const segmentData = randomBytes(512 * 1024); // 512KB segment
          const dek = generateAes128Key();
          const segmentIv = generateIv();
          const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
          const encryptedSegment = await aesGcmEncrypt(dek, segmentData, segmentIv);

          // Client-side: Decrypt segment
          const startTime = performance.now();
          const decrypted = await unwrapAndDecryptSegment(
            clientKek,
            toBase64(wrappedKey),
            toBase64(wrapIv),
            encryptedSegment,
            toBase64(segmentIv)
          );
          const decryptionTime = performance.now() - startTime;

          playbackResults.push({
            quality,
            segmentIndex: segIdx,
            success: decrypted.length === segmentData.length,
            decryptionTime,
          });

          expect(decrypted).toEqual(segmentData);
        }
      }

      // 3. Verify all segments decrypted successfully
      expect(playbackResults.every((r) => r.success)).toBe(true);
      expect(playbackResults.length).toBe(qualities.length * segmentsPerQuality);

      // 4. Performance analysis
      const avgDecryptionTime =
        playbackResults.reduce((sum, r) => sum + r.decryptionTime, 0) /
        playbackResults.length;

      console.log(`\nPlayback Simulation Results:`);
      console.log(`  Total segments: ${playbackResults.length}`);
      console.log(`  Average decryption time: ${avgDecryptionTime.toFixed(2)}ms`);
      console.log(`  Max decryption time: ${Math.max(...playbackResults.map((r) => r.decryptionTime)).toFixed(2)}ms`);
      console.log(`  Min decryption time: ${Math.min(...playbackResults.map((r) => r.decryptionTime)).toFixed(2)}ms`);

      // Performance requirement: average decryption should be < 100ms for smooth playback
      expect(avgDecryptionTime).toBeLessThan(100);
    });

    it('should handle adaptive bitrate switching during playback', async () => {
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

      // Simulate ABR: Start at 360p, switch to 720p, then back to 480p
      const qualities = [
        { name: '360p', segments: 5 },
        { name: '720p', segments: 10 },
        { name: '480p', segments: 5 },
      ];

      let totalSegments = 0;

      for (const quality of qualities) {
        for (let i = 0; i < quality.segments; i++) {
          // Different segment sizes per quality
          const segmentSize =
            quality.name === '720p' ? 1024 * 1024 : quality.name === '480p' ? 512 * 1024 : 256 * 1024;

          const segmentData = randomBytes(segmentSize);
          const dek = generateAes128Key();
          const segmentIv = generateIv();
          const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
          const encryptedSegment = await aesGcmEncrypt(dek, segmentData, segmentIv);

          const decrypted = await unwrapAndDecryptSegment(
            clientKek,
            toBase64(wrappedKey),
            toBase64(wrapIv),
            encryptedSegment,
            toBase64(segmentIv)
          );

          expect(decrypted).toEqual(segmentData);
          totalSegments++;
        }
      }

      expect(totalSegments).toBe(20);
    });

    it('should handle parallel key prefetching for multiple segments', async () => {
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

      // Simulate prefetching 15 segments in parallel
      const segmentCount = 15;
      const encryptedSegments: Array<{
        wrappedKey: string;
        wrapIv: string;
        encryptedData: Uint8Array;
        segmentIv: string;
        originalData: Uint8Array;
      }> = [];

      // Server prepares all segments
      for (let i = 0; i < segmentCount; i++) {
        const segmentData = randomBytes(256 * 1024); // 256KB each
        const dek = generateAes128Key();
        const segmentIv = generateIv();
        const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
        const encryptedData = await aesGcmEncrypt(dek, segmentData, segmentIv);

        encryptedSegments.push({
          wrappedKey: toBase64(wrappedKey),
          wrapIv: toBase64(wrapIv),
          encryptedData,
          segmentIv: toBase64(segmentIv),
          originalData: segmentData,
        });
      }

      // Client prefetches and decrypts all segments in parallel
      const startTime = performance.now();
      const decryptionPromises = encryptedSegments.map((seg) =>
        unwrapAndDecryptSegment(
          clientKek,
          seg.wrappedKey,
          seg.wrapIv,
          seg.encryptedData,
          seg.segmentIv
        )
      );

      const decryptedSegments = await Promise.all(decryptionPromises);
      const totalTime = performance.now() - startTime;

      // Verify all decrypted correctly
      for (let i = 0; i < segmentCount; i++) {
        expect(decryptedSegments[i]).toEqual(encryptedSegments[i].originalData);
      }

      console.log(`\nParallel Prefetch Results:`);
      console.log(`  Segments: ${segmentCount}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average per segment: ${(totalTime / segmentCount).toFixed(2)}ms`);

      // Parallel processing should be efficient
      expect(totalTime).toBeLessThan(segmentCount * 100); // Should be faster than sequential
    });

    it('should handle seeking (random access to segments)', async () => {
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

      // Create 100 segments (simulating a full video)
      const totalSegments = 100;
      const allSegments: Array<{
        wrappedKey: string;
        wrapIv: string;
        encryptedData: Uint8Array;
        segmentIv: string;
        originalData: Uint8Array;
      }> = [];

      // Server prepares all segments
      for (let i = 0; i < totalSegments; i++) {
        const segmentData = new TextEncoder().encode(`Segment ${i} data`);
        const dek = generateAes128Key();
        const segmentIv = generateIv();
        const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
        const encryptedData = await aesGcmEncrypt(dek, segmentData, segmentIv);

        allSegments.push({
          wrappedKey: toBase64(wrappedKey),
          wrapIv: toBase64(wrapIv),
          encryptedData,
          segmentIv: toBase64(segmentIv),
          originalData: segmentData,
        });
      }

      // Simulate seeking: access segments in random order
      const seekIndices = [0, 50, 25, 75, 10, 90, 5, 95]; // Random seeks

      for (const idx of seekIndices) {
        const seg = allSegments[idx];
        const decrypted = await unwrapAndDecryptSegment(
          clientKek,
          seg.wrappedKey,
          seg.wrapIv,
          seg.encryptedData,
          seg.segmentIv
        );

        expect(decrypted).toEqual(seg.originalData);
        expect(new TextDecoder().decode(decrypted)).toBe(`Segment ${idx} data`);
      }
    });

    it('should maintain security across session boundaries', async () => {
      // Session 1
      const session1Client = await initializeClientSession();
      const session1Server = await generateX25519Keypair();
      const session1Nonce = randomBytes(12);

      const session1ServerShared = await deriveSharedSecret(
        session1Client.clientPublicKey,
        session1Server.privateKeyJwk
      );

      const session1ServerKek = await hkdfDeriveKey(
        { ikm: session1ServerShared, salt: session1Nonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const session1ClientKek = await deriveClientKek(
        session1Client,
        toBase64(session1Server.publicKey),
        toBase64(session1Nonce)
      );

      // Session 2 (different session)
      const session2Client = await initializeClientSession();
      const session2Server = await generateX25519Keypair();
      const session2Nonce = randomBytes(12);

      const session2ServerShared = await deriveSharedSecret(
        session2Client.clientPublicKey,
        session2Server.privateKeyJwk
      );

      const session2ServerKek = await hkdfDeriveKey(
        { ikm: session2ServerShared, salt: session2Nonce, info: 'session-kek-v1' },
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
      );

      const session2ClientKek = await deriveClientKek(
        session2Client,
        toBase64(session2Server.publicKey),
        toBase64(session2Nonce)
      );

      // Encrypt segment in session 1
      const segmentData = randomBytes(1024);
      const dek = generateAes128Key();
      const segmentIv = generateIv();
      const { wrappedKey, iv: wrapIv } = await wrapKey(session1ServerKek, dek);
      const encryptedSegment = await aesGcmEncrypt(dek, segmentData, segmentIv);

      // Session 1 client can decrypt
      const decrypted1 = await unwrapAndDecryptSegment(
        session1ClientKek,
        toBase64(wrappedKey),
        toBase64(wrapIv),
        encryptedSegment,
        toBase64(segmentIv)
      );

      expect(decrypted1).toEqual(segmentData);

      // Session 2 client CANNOT decrypt (security check)
      await expect(
        unwrapAndDecryptSegment(
          session2ClientKek,
          toBase64(wrappedKey),
          toBase64(wrapIv),
          encryptedSegment,
          toBase64(segmentIv)
        )
      ).rejects.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance targets for real-time playback', async () => {
      // Setup
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

      // Benchmark different segment sizes
      const sizes = [
        { name: '256KB', bytes: 256 * 1024 },
        { name: '512KB', bytes: 512 * 1024 },
        { name: '1MB', bytes: 1024 * 1024 },
        { name: '2MB', bytes: 2 * 1024 * 1024 },
      ];

      console.log('\n=== Performance Benchmarks ===');

      for (const size of sizes) {
        const segmentData = randomBytes(size.bytes);
        const dek = generateAes128Key();
        const segmentIv = generateIv();

        // Encryption benchmark
        const encryptStart = performance.now();
        const { wrappedKey, iv: wrapIv } = await wrapKey(serverKek, dek);
        const encryptedSegment = await aesGcmEncrypt(dek, segmentData, segmentIv);
        const encryptTime = performance.now() - encryptStart;

        // Decryption benchmark
        const decryptStart = performance.now();
        const decrypted = await unwrapAndDecryptSegment(
          clientKek,
          toBase64(wrappedKey),
          toBase64(wrapIv),
          encryptedSegment,
          toBase64(segmentIv)
        );
        const decryptTime = performance.now() - decryptStart;

        expect(decrypted).toEqual(segmentData);

        const throughputMbps = (size.bytes / 1024 / 1024 / (decryptTime / 1000)).toFixed(2);

        console.log(`${size.name}:`);
        console.log(`  Encryption: ${encryptTime.toFixed(2)}ms`);
        console.log(`  Decryption: ${decryptTime.toFixed(2)}ms`);
        console.log(`  Throughput: ${throughputMbps} MB/s`);

        // Performance requirements for smooth playback
        // Typical HLS segment is 2-10 seconds, so we have time to decrypt
        // Larger segments (2MB) may take longer but still acceptable for prefetching
        const maxTime = size.bytes > 1024 * 1024 ? 3000 : 1000; // 3s for >1MB, 1s otherwise
        expect(decryptTime).toBeLessThan(maxTime);
      }
    });
  });
});
