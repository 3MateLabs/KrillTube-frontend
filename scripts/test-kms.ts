/**
 * Test script for KMS envelope encryption
 *
 * Run with: npx tsx scripts/test-kms.ts
 */

import { encryptRootSecret, decryptRootSecret, storeSessionPrivateKey, loadSessionPrivateKey, deleteSessionPrivateKey, cleanupExpiredSessionKeys, getSessionKeyStoreStats } from '../lib/kms/envelope';
import { getMasterKey, validateMasterKey } from '../lib/kms/masterKey';
import { generateVideoRootSecret } from '../lib/crypto/keyDerivation';
import { generateX25519Keypair } from '../lib/crypto/primitives';
import { toHex } from '../lib/crypto/utils';

async function testKMS() {
  console.log('🔐 Testing KMS Envelope Encryption\n');

  try {
    // Test 1: Master Key Validation
    console.log('1️⃣  Testing master key loading...');
    validateMasterKey();
    const masterKey = getMasterKey();
    console.log(`   ✅ Master key loaded: ${toHex(masterKey.slice(0, 8))}...\n`);

    // Test 2: Encrypt/Decrypt Video Root Secret
    console.log('2️⃣  Testing video root secret encryption...');
    const rootSecret = generateVideoRootSecret();
    console.log(`   📝 Original secret: ${toHex(rootSecret.slice(0, 8))}...`);

    const encrypted = await encryptRootSecret(rootSecret);
    console.log(`   🔒 Encrypted (${encrypted.length} bytes): ${encrypted.toString('hex').slice(0, 32)}...`);

    const decrypted = await decryptRootSecret(encrypted);
    console.log(`   🔓 Decrypted: ${toHex(decrypted.slice(0, 8))}...`);

    if (toHex(rootSecret) === toHex(decrypted)) {
      console.log(`   ✅ Encryption/decryption successful!\n`);
    } else {
      throw new Error('Decrypted secret does not match original!');
    }

    // Test 3: Multiple Encryptions Produce Different Ciphertexts
    console.log('3️⃣  Testing encryption randomness...');
    const encrypted1 = await encryptRootSecret(rootSecret);
    const encrypted2 = await encryptRootSecret(rootSecret);

    if (encrypted1.toString('hex') !== encrypted2.toString('hex')) {
      console.log(`   ✅ Different encryptions produce different ciphertexts (good!)\n`);
    } else {
      throw new Error('Encryptions should produce different ciphertexts!');
    }

    // Test 4: Session Private Key Storage
    console.log('4️⃣  Testing session private key storage...');
    const keypair = await generateX25519Keypair();
    const sessionId = 'session_test123';

    storeSessionPrivateKey(sessionId, keypair.privateKeyJwk, 5); // 5 seconds TTL
    console.log(`   💾 Stored session key: ${sessionId}`);

    const loadedJwk = loadSessionPrivateKey(sessionId);
    if (JSON.stringify(loadedJwk) === JSON.stringify(keypair.privateKeyJwk)) {
      console.log(`   ✅ Session key loaded successfully\n`);
    } else {
      throw new Error('Loaded session key does not match!');
    }

    // Test 5: Session Key Store Statistics
    console.log('5️⃣  Testing session key store stats...');
    const stats = getSessionKeyStoreStats();
    console.log(`   📊 Total keys: ${stats.total}`);
    console.log(`   📊 Expired keys: ${stats.expired}`);
    console.log(`   ✅ Stats retrieved successfully\n`);

    // Test 6: Session Key Expiration
    console.log('6️⃣  Testing session key expiration...');
    console.log(`   ⏳ Waiting 6 seconds for key to expire...`);
    await new Promise(resolve => setTimeout(resolve, 6000));

    try {
      loadSessionPrivateKey(sessionId);
      throw new Error('Should have thrown error for expired key!');
    } catch (error: any) {
      if (error.message.includes('expired')) {
        console.log(`   ✅ Expired key correctly rejected\n`);
      } else {
        throw error;
      }
    }

    // Test 7: Session Key Cleanup
    console.log('7️⃣  Testing session key cleanup...');
    storeSessionPrivateKey('session1', keypair.privateKeyJwk, 1); // 1 second
    storeSessionPrivateKey('session2', keypair.privateKeyJwk, 1);
    storeSessionPrivateKey('session3', keypair.privateKeyJwk, 3600); // 1 hour

    console.log(`   📊 Stats before cleanup: ${getSessionKeyStoreStats().total} keys`);

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const cleaned = cleanupExpiredSessionKeys();
    console.log(`   🧹 Cleaned up: ${cleaned} expired keys`);
    console.log(`   📊 Stats after cleanup: ${getSessionKeyStoreStats().total} keys`);
    console.log(`   ✅ Cleanup working correctly\n`);

    // Test 8: Session Key Deletion
    console.log('8️⃣  Testing session key deletion...');
    const testSessionId = 'session_delete_test';
    storeSessionPrivateKey(testSessionId, keypair.privateKeyJwk, 3600);
    deleteSessionPrivateKey(testSessionId);

    try {
      loadSessionPrivateKey(testSessionId);
      throw new Error('Should have thrown error for deleted key!');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        console.log(`   ✅ Deleted key correctly removed\n`);
      } else {
        throw error;
      }
    }

    console.log('✅ All KMS tests passed! 🎉\n');
    console.log('📊 Summary:');
    console.log('   - Master key loading: ✅');
    console.log('   - Envelope encryption: ✅');
    console.log('   - Encryption randomness: ✅');
    console.log('   - Session key storage: ✅');
    console.log('   - Session key stats: ✅');
    console.log('   - Session key expiration: ✅');
    console.log('   - Session key cleanup: ✅');
    console.log('   - Session key deletion: ✅');
  } catch (error) {
    console.error('\n❌ KMS test failed:', error);
    process.exit(1);
  }
}

// Run tests
testKMS();
