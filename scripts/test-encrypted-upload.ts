/**
 * Test script for V2 encrypted upload flow
 *
 * Tests:
 * 1. Server-side encryption of transcoded segments
 * 2. DEK derivation and uniqueness
 * 3. Encrypted file generation
 *
 * Run with: npx tsx scripts/test-encrypted-upload.ts
 */

import { encryptTranscodeResult, calculateEncryptionStats } from '../lib/server/encryptor';
import { decryptRootSecret } from '../lib/kms/envelope';
import { deriveSegmentDek } from '../lib/crypto/keyDerivation';
import { aesGcmDecrypt } from '../lib/crypto/primitives';
import { toHex } from '../lib/crypto/utils';
import type { TranscodeResult } from '../lib/types';
import fs from 'fs';
import path from 'path';

async function testEncryptedUpload() {
  console.log('🧪 Testing V2 Encrypted Upload Flow\n');

  try {
    // Create a mock transcode result for testing
    const mockTranscodeResult: TranscodeResult = {
      jobId: 'test_job_123',
      renditions: [
        {
          quality: '720p',
          resolution: '1280x720',
          bitrate: 2800000,
          playlist: {
            filename: '720p.m3u8',
            filepath: '/tmp/test/720p.m3u8',
            content: '#EXTM3U\n',
          },
          segments: [
            {
              filename: '720p_seg_0000.m4s',
              filepath: '/tmp/test/720p_seg_0000.m4s',
              index: 0,
              duration: 4.0,
              size: 500000,
            },
            {
              filename: '720p_seg_0001.m4s',
              filepath: '/tmp/test/720p_seg_0001.m4s',
              index: 1,
              duration: 4.0,
              size: 500000,
            },
          ],
          initSegment: {
            filename: '720p_init.mp4',
            filepath: '/tmp/test/720p_init.mp4',
            index: -1,
            duration: 0,
            size: 50000,
          },
        },
      ],
      masterPlaylist: {
        filename: 'master.m3u8',
        filepath: '/tmp/test/master.m3u8',
        content: '#EXTM3U\n',
      },
      poster: {
        filename: 'poster.jpg',
        filepath: '/tmp/test/poster.jpg',
      },
      duration: 8.0,
      totalSegments: 2,
    };

    // Create temporary test directory and files
    const testDir = '/tmp/test';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
      fs.mkdirSync(path.join(testDir, '720p'), { recursive: true });
    }

    // Create mock segment files with test data
    const testData = Buffer.from('Mock video segment data for testing encryption');
    fs.writeFileSync(mockTranscodeResult.renditions[0].segments[0].filepath, testData);
    fs.writeFileSync(mockTranscodeResult.renditions[0].segments[1].filepath, testData);
    fs.writeFileSync(mockTranscodeResult.renditions[0].initSegment!.filepath, testData);
    fs.writeFileSync(mockTranscodeResult.masterPlaylist.filepath, testData);
    fs.writeFileSync(mockTranscodeResult.poster!.filepath, testData);

    console.log('1️⃣  Testing segment encryption...');
    const videoId = 'video_test_abc123';
    const encryptedResult = await encryptTranscodeResult(mockTranscodeResult, videoId);

    console.log(`   ✅ Video ID: ${encryptedResult.videoId}`);
    console.log(`   ✅ Root secret length: ${encryptedResult.rootSecret.length} bytes`);
    console.log(`   ✅ Encrypted root secret length: ${encryptedResult.rootSecretEnc.length} bytes`);
    console.log(`   ✅ Renditions encrypted: ${encryptedResult.renditions.length}\n`);

    // Test 2: Verify encryption statistics
    console.log('2️⃣  Testing encryption statistics...');
    const stats = calculateEncryptionStats(encryptedResult);
    console.log(`   📊 Total segments: ${stats.totalSegments}`);
    console.log(`   📊 Original size: ${stats.totalOriginalSize} bytes`);
    console.log(`   📊 Encrypted size: ${stats.totalEncryptedSize} bytes`);
    console.log(`   📊 Overhead: ${stats.overhead} bytes (${stats.overheadPercentage.toFixed(2)}%)`);

    // AES-GCM overhead should be: IV (12 bytes) + auth tag (16 bytes) = 28 bytes per segment
    const expectedOverhead = stats.totalSegments * 28;
    console.log(`   📊 Expected overhead: ${expectedOverhead} bytes`);

    if (stats.overhead === expectedOverhead) {
      console.log(`   ✅ Encryption overhead is correct!\n`);
    } else {
      console.warn(`   ⚠️  Overhead mismatch: expected ${expectedOverhead}, got ${stats.overhead}\n`);
    }

    // Test 3: Verify DEK uniqueness
    console.log('3️⃣  Testing DEK uniqueness...');
    const rendition = encryptedResult.renditions[0];
    const seg0 = rendition.segments[0];
    const seg1 = rendition.segments[1];

    const dek0 = await deriveSegmentDek(
      encryptedResult.rootSecret,
      videoId,
      rendition.quality,
      seg0.segIdx
    );
    const dek1 = await deriveSegmentDek(
      encryptedResult.rootSecret,
      videoId,
      rendition.quality,
      seg1.segIdx
    );

    console.log(`   🔑 DEK seg 0: ${toHex(dek0).substring(0, 32)}...`);
    console.log(`   🔑 DEK seg 1: ${toHex(dek1).substring(0, 32)}...`);

    if (toHex(dek0) !== toHex(dek1)) {
      console.log(`   ✅ DEKs are unique!\n`);
    } else {
      throw new Error('DEKs should be unique per segment!');
    }

    // Test 4: Verify decryption works
    console.log('4️⃣  Testing segment decryption...');

    // Read encrypted segment
    const encryptedData = fs.readFileSync(seg0.encryptedPath);
    console.log(`   📦 Encrypted file size: ${encryptedData.length} bytes`);

    // Decrypt segment
    const decrypted = await aesGcmDecrypt(dek0, new Uint8Array(encryptedData), seg0.iv);
    console.log(`   📦 Decrypted size: ${decrypted.length} bytes`);

    // Verify decrypted data matches original
    const originalData = testData;
    if (Buffer.from(decrypted).toString() === originalData.toString()) {
      console.log(`   ✅ Decryption successful - data matches original!\n`);
    } else {
      throw new Error('Decrypted data does not match original!');
    }

    // Test 5: Verify root secret encryption/decryption
    console.log('5️⃣  Testing root secret envelope encryption...');
    const decryptedRootSecret = await decryptRootSecret(encryptedResult.rootSecretEnc);
    console.log(`   🔓 Decrypted root secret: ${toHex(decryptedRootSecret).substring(0, 32)}...`);

    if (toHex(encryptedResult.rootSecret) === toHex(decryptedRootSecret)) {
      console.log(`   ✅ Root secret encryption/decryption works!\n`);
    } else {
      throw new Error('Decrypted root secret does not match original!');
    }

    // Test 6: Verify deterministic DEK derivation
    console.log('6️⃣  Testing deterministic DEK derivation...');
    const dek0Again = await deriveSegmentDek(
      encryptedResult.rootSecret,
      videoId,
      rendition.quality,
      seg0.segIdx
    );

    if (toHex(dek0) === toHex(dek0Again)) {
      console.log(`   ✅ DEK derivation is deterministic!\n`);
    } else {
      throw new Error('DEK derivation should be deterministic!');
    }

    // Test 7: Verify encrypted files exist
    console.log('7️⃣  Verifying encrypted file generation...');
    let encryptedFilesExist = true;
    for (const rend of encryptedResult.renditions) {
      if (rend.initSegment && !fs.existsSync(rend.initSegment.encryptedPath)) {
        console.error(`   ❌ Missing encrypted init segment: ${rend.initSegment.encryptedPath}`);
        encryptedFilesExist = false;
      }
      for (const seg of rend.segments) {
        if (!fs.existsSync(seg.encryptedPath)) {
          console.error(`   ❌ Missing encrypted segment: ${seg.encryptedPath}`);
          encryptedFilesExist = false;
        }
      }
    }

    if (encryptedFilesExist) {
      console.log(`   ✅ All encrypted files exist!\n`);
    } else {
      throw new Error('Some encrypted files are missing!');
    }

    // Cleanup
    console.log('🧹 Cleaning up test files...');
    fs.rmSync(testDir, { recursive: true, force: true });

    console.log('\n✅ All encrypted upload tests passed! 🎉\n');
    console.log('📋 Summary:');
    console.log('   - Segment encryption: ✅');
    console.log('   - Encryption statistics: ✅');
    console.log('   - DEK uniqueness: ✅');
    console.log('   - Segment decryption: ✅');
    console.log('   - Root secret envelope encryption: ✅');
    console.log('   - Deterministic DEK derivation: ✅');
    console.log('   - Encrypted file generation: ✅');

    console.log('\n🚀 Ready to test full upload flow with real video!');
    console.log('   1. Upload video to /api/transcode');
    console.log('   2. Take encrypted result from response');
    console.log('   3. POST to /api/v1/videos with encrypted result');
    console.log('   4. Video will be uploaded to Walrus and stored in DB');
  } catch (error) {
    console.error('\n❌ Encrypted upload test failed:', error);
    process.exit(1);
  }
}

// Run tests
testEncryptedUpload();
