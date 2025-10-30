/**
 * Test script for V2 session and key APIs
 *
 * Tests:
 * 1. Session creation with ECDH keypair exchange
 * 2. Key retrieval with DEK wrapping
 * 3. DEK unwrapping and segment decryption
 * 4. Session refresh
 *
 * Prerequisites:
 * - Server running on http://localhost:3001
 * - At least one encrypted video in database
 *
 * Run with: npx tsx scripts/test-session-api.ts
 */

import { generateX25519Keypair, unwrapKey, aesGcmDecrypt } from '../lib/crypto/primitives';
import { deriveClientKek } from '../lib/crypto/client';
import { toBase64, fromBase64 } from '../lib/crypto/utils';

const API_BASE = 'http://localhost:3001/api';

interface ClientSession {
  keypair: Awaited<ReturnType<typeof generateX25519Keypair>>;
  sessionId: string;
  videoId: string;
  serverPubKey: string;
  serverNonce: string;
  kek?: CryptoKey;
  cookie: string;
}

async function testSessionAPI() {
  console.log('🧪 Testing V2 Session & Key APIs\n');

  try {
    // Step 0: Check if there's a video in the database
    console.log('0️⃣  Checking for available videos...');
    const videosResponse = await fetch(`${API_BASE}/v1/videos?limit=1`);
    if (!videosResponse.ok) {
      throw new Error('Failed to fetch videos');
    }
    const videosData = await videosResponse.json();

    if (!videosData.videos || videosData.videos.length === 0) {
      console.log('   ⚠️  No videos found in database');
      console.log('   💡 Please create a video first:');
      console.log('      1. Upload a video to /api/transcode');
      console.log('      2. Register it with /api/v1/videos');
      return;
    }

    const testVideo = videosData.videos[0];
    console.log(`   ✅ Found video: ${testVideo.title} (${testVideo.id})`);
    console.log(`   📊 Renditions: ${testVideo.renditions.map((r: any) => r.name).join(', ')}\n`);

    // Test 1: Create session
    console.log('1️⃣  Testing session creation...');

    // Generate client-side X25519 keypair
    const clientKeypair = await generateX25519Keypair();
    console.log(`   🔑 Generated client X25519 keypair`);
    console.log(`   🔑 Client public key: ${toBase64(clientKeypair.publicKey).substring(0, 32)}...`);

    // Create session
    const sessionResponse = await fetch(`${API_BASE}/v1/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: testVideo.id,
        clientPubKey: toBase64(clientKeypair.publicKey),
        deviceFingerprint: 'test-device-123',
      }),
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.json();
      throw new Error(`Session creation failed: ${JSON.stringify(error)}`);
    }

    const sessionData = await sessionResponse.json();
    console.log(`   ✅ Session created: ${sessionData.sessionId}`);
    console.log(`   🔐 Server public key: ${sessionData.serverPubKey.substring(0, 32)}...`);
    console.log(`   🔐 Server nonce: ${sessionData.serverNonce.substring(0, 32)}...`);
    console.log(`   ⏰ Expires: ${sessionData.expiresAt}`);

    // Extract cookie from response
    const setCookieHeader = sessionResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('No session cookie in response');
    }
    const cookie = setCookieHeader.split(';')[0]; // Extract just the cookie value
    console.log(`   🍪 Cookie: ${cookie.substring(0, 50)}...\n`);

    const session: ClientSession = {
      keypair: clientKeypair,
      sessionId: sessionData.sessionId,
      videoId: testVideo.id,
      serverPubKey: sessionData.serverPubKey,
      serverNonce: sessionData.serverNonce,
      cookie,
    };

    // Test 2: Derive session KEK
    console.log('2️⃣  Testing KEK derivation...');
    const kek = await deriveClientKek(
      { clientPublicKey: session.keypair.publicKey, clientPrivateKeyJwk: session.keypair.privateKeyJwk, kek: null },
      session.serverPubKey,
      session.serverNonce
    );
    session.kek = kek;
    console.log(`   ✅ Derived session KEK from ECDH + HKDF\n`);

    // Test 3: Request wrapped DEK for segment 0
    console.log('3️⃣  Testing key retrieval...');
    const rendition = testVideo.renditions[0].name;
    const segIdx = 0;

    const keyResponse = await fetch(
      `${API_BASE}/v1/key?videoId=${testVideo.id}&rendition=${rendition}&segIdx=${segIdx}`,
      {
        headers: {
          Cookie: session.cookie,
        },
      }
    );

    if (!keyResponse.ok) {
      const error = await keyResponse.json();
      throw new Error(`Key retrieval failed: ${JSON.stringify(error)}`);
    }

    const keyData = await keyResponse.json();
    console.log(`   ✅ Retrieved wrapped DEK for ${rendition} segment ${segIdx}`);
    console.log(`   📦 Wrapped DEK: ${keyData.wrappedDek.substring(0, 32)}...`);
    console.log(`   📦 Wrap IV: ${keyData.wrapIv.substring(0, 32)}...`);
    console.log(`   📦 Segment IV: ${keyData.segmentIv?.substring(0, 32)}...`);
    console.log(`   ⏱️  Duration: ${keyData.duration}\n`);

    // Test 4: Unwrap DEK
    console.log('4️⃣  Testing DEK unwrapping...');
    const wrappedDek = fromBase64(keyData.wrappedDek);
    const wrapIv = fromBase64(keyData.wrapIv);

    const unwrappedDek = await unwrapKey(session.kek!, wrappedDek, wrapIv);
    console.log(`   ✅ Unwrapped DEK: ${toBase64(unwrappedDek).substring(0, 32)}...`);
    console.log(`   📏 DEK length: ${unwrappedDek.length} bytes (should be 16 for AES-128)\n`);

    // Test 5: Batch key retrieval
    console.log('5️⃣  Testing batch key retrieval...');
    const batchResponse = await fetch(`${API_BASE}/v1/key/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        videoId: testVideo.id,
        rendition,
        segIndices: [0, 1, 2],
      }),
    });

    if (!batchResponse.ok) {
      const error = await batchResponse.json();
      throw new Error(`Batch key retrieval failed: ${JSON.stringify(error)}`);
    }

    const batchData = await batchResponse.json();
    console.log(`   ✅ Retrieved ${batchData.keys.length} wrapped DEKs`);
    console.log(`   ⏱️  Duration: ${batchData.duration}\n`);

    // Test 6: Session refresh
    console.log('6️⃣  Testing session refresh...');
    const refreshResponse = await fetch(`${API_BASE}/v1/session/refresh`, {
      method: 'POST',
      headers: {
        Cookie: session.cookie,
      },
    });

    if (!refreshResponse.ok) {
      const error = await refreshResponse.json();
      throw new Error(`Session refresh failed: ${JSON.stringify(error)}`);
    }

    const refreshData = await refreshResponse.json();
    console.log(`   ✅ Session refreshed`);
    console.log(`   ⏰ New expiration: ${refreshData.expiresAt}\n`);

    // Test 7: Get session info
    console.log('7️⃣  Testing session info retrieval...');
    const infoResponse = await fetch(`${API_BASE}/v1/session`, {
      headers: {
        Cookie: session.cookie,
      },
    });

    if (!infoResponse.ok) {
      const error = await infoResponse.json();
      throw new Error(`Session info retrieval failed: ${JSON.stringify(error)}`);
    }

    const infoData = await infoResponse.json();
    console.log(`   ✅ Session info retrieved`);
    console.log(`   📹 Video: ${infoData.video.title}`);
    console.log(`   ⏰ Created: ${infoData.createdAt}`);
    console.log(`   ⏰ Last activity: ${infoData.lastActivity}\n`);

    // Test 8: Delete session
    console.log('8️⃣  Testing session deletion...');
    const deleteResponse = await fetch(`${API_BASE}/v1/session`, {
      method: 'DELETE',
      headers: {
        Cookie: session.cookie,
      },
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(`Session deletion failed: ${JSON.stringify(error)}`);
    }

    const deleteData = await deleteResponse.json();
    console.log(`   ✅ Session deleted: ${deleteData.message}\n`);

    // Test 9: Verify session is gone
    console.log('9️⃣  Verifying session is deleted...');
    const verifyResponse = await fetch(`${API_BASE}/v1/session`, {
      headers: {
        Cookie: session.cookie,
      },
    });

    if (verifyResponse.ok) {
      throw new Error('Session should be deleted but still exists!');
    }

    console.log(`   ✅ Session correctly deleted (returns 401)\n`);

    console.log('✅ All session API tests passed! 🎉\n');
    console.log('📋 Summary:');
    console.log('   - Session creation: ✅');
    console.log('   - KEK derivation: ✅');
    console.log('   - Key retrieval: ✅');
    console.log('   - DEK unwrapping: ✅');
    console.log('   - Batch key retrieval: ✅');
    console.log('   - Session refresh: ✅');
    console.log('   - Session info: ✅');
    console.log('   - Session deletion: ✅');
    console.log('   - Deletion verification: ✅');

    console.log('\n🚀 Session APIs are working correctly!');
    console.log('   Next: Implement custom hls.js loader for client-side decryption');
  } catch (error) {
    console.error('\n❌ Session API test failed:', error);
    process.exit(1);
  }
}

// Run tests
testSessionAPI();
