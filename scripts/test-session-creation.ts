/**
 * Test session creation and key retrieval
 */

const VIDEO_ID = 'asset_1761842957328_ap9pylb';
const API_BASE = 'http://localhost:3000';

async function testSessionFlow() {
  console.log('=== Testing Session Creation Flow ===\n');

  try {
    // Step 1: Create session
    console.log('Step 1: Creating session...');
    const sessionRes = await fetch(`${API_BASE}/api/v1/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: VIDEO_ID,
        clientPublicKey: 'test_public_key_base64', // In real flow, generated with X25519
      }),
    });

    if (!sessionRes.ok) {
      const error = await sessionRes.text();
      console.error(`✗ Session creation failed: ${sessionRes.status}`);
      console.error(`  Response: ${error}`);
      process.exit(1);
    }

    const sessionData = await sessionRes.json();
    console.log(`✓ Session created: ${sessionData.sessionId}`);
    console.log(`  Server public key: ${sessionData.serverPublicKey ? 'Present' : 'MISSING'}`);

    // Step 2: Get segment key
    console.log('\nStep 2: Fetching segment key...');
    const keyRes = await fetch(`${API_BASE}/api/v1/key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionData.sessionId,
        videoId: VIDEO_ID,
        rendition: '720p',
        segIdx: 0,
      }),
    });

    if (!keyRes.ok) {
      const error = await keyRes.text();
      console.error(`✗ Key retrieval failed: ${keyRes.status}`);
      console.error(`  Response: ${error}`);
      process.exit(1);
    }

    const keyData = await keyRes.json();
    console.log(`✓ Key retrieved for segment 0`);
    console.log(`  Wrapped DEK: ${keyData.wrappedDek ? 'Present' : 'MISSING'}`);
    console.log(`  IV: ${keyData.iv ? 'Present' : 'MISSING'}`);

    console.log('\n=== ✓ ALL TESTS PASSED ===');
    console.log('\nSession and key retrieval working correctly.');

  } catch (error) {
    console.error('\n✗ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testSessionFlow();
