/**
 * Simple test script for crypto primitives
 *
 * Run with: npx tsx scripts/test-crypto.ts
 */

import {
  generateX25519Keypair,
  deriveSharedSecret,
  hkdf,
  aesGcmEncrypt,
  aesGcmDecrypt,
  wrapKey,
  unwrapKey,
  generateAes128Key,
  generateIv,
  randomBytes,
} from '../lib/crypto/primitives';

import {
  deriveSessionKek,
  deriveSegmentDek,
  generateVideoRootSecret,
} from '../lib/crypto/keyDerivation';

import { toBase64, fromBase64, toHex } from '../lib/crypto/utils';

async function testCryptoPrimitives() {
  console.log('🔐 Testing Crypto Primitives\n');

  try {
    // Test 1: X25519 Keypair Generation
    console.log('1️⃣  Testing X25519 keypair generation...');
    const keypair1 = await generateX25519Keypair();
    const keypair2 = await generateX25519Keypair();
    console.log(`   ✅ Generated keypair 1: ${toHex(keypair1.publicKey.slice(0, 8))}...`);
    console.log(`   ✅ Generated keypair 2: ${toHex(keypair2.publicKey.slice(0, 8))}...\n`);

    // Test 2: ECDH Shared Secret
    console.log('2️⃣  Testing ECDH shared secret derivation...');
    const sharedSecret1 = await deriveSharedSecret(keypair2.publicKey, keypair1.privateKeyJwk);
    const sharedSecret2 = await deriveSharedSecret(keypair1.publicKey, keypair2.privateKeyJwk);

    if (toHex(sharedSecret1) === toHex(sharedSecret2)) {
      console.log(`   ✅ Shared secrets match: ${toHex(sharedSecret1.slice(0, 8))}...\n`);
    } else {
      throw new Error('Shared secrets do not match!');
    }

    // Test 3: HKDF Key Derivation
    console.log('3️⃣  Testing HKDF key derivation...');
    const salt = randomBytes(16);
    const derivedKey = await hkdf({
      ikm: sharedSecret1,
      salt,
      info: 'test-key',
      length: 16,
    });
    console.log(`   ✅ Derived 16-byte key: ${toHex(derivedKey)}\n`);

    // Test 4: AES-GCM Encryption/Decryption
    console.log('4️⃣  Testing AES-GCM encryption/decryption...');
    const plaintext = new TextEncoder().encode('Hello, encrypted world!');
    const key = generateAes128Key();
    const iv = generateIv();

    const ciphertext = await aesGcmEncrypt(key, plaintext, iv);
    const decrypted = await aesGcmDecrypt(key, ciphertext, iv);
    const decryptedText = new TextDecoder().decode(decrypted);

    if (decryptedText === 'Hello, encrypted world!') {
      console.log(`   ✅ Encryption/decryption successful: "${decryptedText}"\n`);
    } else {
      throw new Error('Decryption failed!');
    }

    // Test 5: Key Wrapping/Unwrapping
    console.log('5️⃣  Testing key wrapping/unwrapping...');
    const kek = await crypto.subtle.importKey(
      'raw',
      randomBytes(16),
      { name: 'AES-GCM' },
      true,
      ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
    );
    const dek = generateAes128Key();

    const { wrappedKey, iv: wrapIv } = await wrapKey(kek, dek);
    const unwrappedDek = await unwrapKey(kek, wrappedKey, wrapIv);

    if (toHex(dek) === toHex(unwrappedDek)) {
      console.log(`   ✅ Key wrapping/unwrapping successful\n`);
    } else {
      throw new Error('Unwrapped key does not match original!');
    }

    // Test 6: Session KEK Derivation
    console.log('6️⃣  Testing session KEK derivation...');
    const serverKeypair = await generateX25519Keypair();
    const clientKeypair = await generateX25519Keypair();
    const serverNonce = randomBytes(12);

    const sessionKek = await deriveSessionKek(
      serverKeypair.privateKeyJwk,
      clientKeypair.publicKey,
      serverNonce
    );
    console.log(`   ✅ Session KEK derived successfully\n`);

    // Test 7: Segment DEK Derivation
    console.log('7️⃣  Testing segment DEK derivation...');
    const rootSecret = generateVideoRootSecret();
    const videoId = 'vid_test123';
    const rendition = '720p';

    const seg0Dek = await deriveSegmentDek(rootSecret, videoId, rendition, 0);
    const seg1Dek = await deriveSegmentDek(rootSecret, videoId, rendition, 1);
    const seg0DekAgain = await deriveSegmentDek(rootSecret, videoId, rendition, 0);

    // Check that different segments have different DEKs
    if (toHex(seg0Dek) !== toHex(seg1Dek)) {
      console.log(`   ✅ Segment 0 DEK: ${toHex(seg0Dek)}`);
      console.log(`   ✅ Segment 1 DEK: ${toHex(seg1Dek)}`);
    } else {
      throw new Error('Different segments should have different DEKs!');
    }

    // Check that derivation is deterministic
    if (toHex(seg0Dek) === toHex(seg0DekAgain)) {
      console.log(`   ✅ DEK derivation is deterministic\n`);
    } else {
      throw new Error('DEK derivation is not deterministic!');
    }

    // Test 8: End-to-End Encryption Flow
    console.log('8️⃣  Testing end-to-end encryption flow...');

    // Simulate video segment encryption
    const segmentData = new TextEncoder().encode('This is a 4-second video segment...');
    const segmentDek = generateAes128Key();
    const segmentIv = generateIv();

    const encryptedSegment = await aesGcmEncrypt(segmentDek, segmentData, segmentIv);

    // Wrap the DEK with session KEK
    const { wrappedKey: wrappedSegmentDek, iv: wrapIvForSegment } = await wrapKey(
      sessionKek,
      segmentDek
    );

    // Simulate client receiving wrapped DEK and encrypted segment
    const unwrappedSegmentDek = await unwrapKey(sessionKek, wrappedSegmentDek, wrapIvForSegment);
    const decryptedSegment = await aesGcmDecrypt(
      unwrappedSegmentDek,
      encryptedSegment,
      segmentIv
    );

    const decryptedSegmentText = new TextDecoder().decode(decryptedSegment);

    if (decryptedSegmentText === 'This is a 4-second video segment...') {
      console.log(`   ✅ End-to-end flow successful: "${decryptedSegmentText}"\n`);
    } else {
      throw new Error('End-to-end decryption failed!');
    }

    console.log('✅ All crypto tests passed! 🎉\n');
    console.log('📊 Summary:');
    console.log('   - X25519 ECDH: ✅');
    console.log('   - HKDF key derivation: ✅');
    console.log('   - AES-GCM encryption: ✅');
    console.log('   - Key wrapping: ✅');
    console.log('   - Session KEK: ✅');
    console.log('   - Segment DEK: ✅');
    console.log('   - End-to-end flow: ✅');
  } catch (error) {
    console.error('\n❌ Crypto test failed:', error);
    process.exit(1);
  }
}

// Run tests
testCryptoPrimitives();
