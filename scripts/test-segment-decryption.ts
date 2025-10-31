/**
 * Test script to manually decrypt a segment and verify it
 */

async function testDecryption() {
  const videoId = 'PAuxtO0Fx0xp7kQMo5Ny02AiRSyVJexPSY69zprNBoE';
  const rendition = '1080p';
  const segIdx = -1; // init segment

  console.log('🧪 Testing segment decryption...\n');

  // Step 1: Get DEK and IV from key API
  console.log('📡 Fetching decryption key...');
  const keyResponse = await fetch(
    `http://localhost:3001/api/v1/key?videoId=${videoId}&rendition=${rendition}&segIdx=${segIdx}`
  );

  if (!keyResponse.ok) {
    throw new Error(`Key API failed: ${keyResponse.status}`);
  }

  const keyData = await keyResponse.json();
  console.log(`✅ Got DEK: ${keyData.dek}`);
  console.log(`   IV: ${keyData.iv}\n`);

  // Step 2: Download encrypted segment from Walrus
  console.log('📥 Downloading encrypted segment...');
  const blobId = 'uVlFJyseZ7hPCh9KDglHZy9uHARi9HDyiOmztzxSQrA';
  const blobUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`;

  const segmentResponse = await fetch(blobUrl);
  if (!segmentResponse.ok) {
    throw new Error(`Failed to download segment: ${segmentResponse.status}`);
  }

  const encryptedData = await segmentResponse.arrayBuffer();
  console.log(`✅ Downloaded ${encryptedData.byteLength} bytes\n`);

  // Step 3: Decrypt segment using Web Crypto API
  console.log('🔓 Decrypting segment...');

  // Convert base64 DEK and IV to Uint8Array
  const dekBytes = Uint8Array.from(atob(keyData.dek), c => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(keyData.iv), c => c.charCodeAt(0));

  console.log(`   DEK length: ${dekBytes.length} bytes`);
  console.log(`   IV length: ${ivBytes.length} bytes`);

  // Import DEK as CryptoKey
  const dekKey = await crypto.subtle.importKey(
    'raw',
    dekBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Decrypt the data
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    dekKey,
    encryptedData
  );

  console.log(`✅ Decrypted ${decryptedData.byteLength} bytes\n`);

  // Step 4: Verify it's a valid fMP4 init segment
  console.log('🔍 Verifying fMP4 structure...');
  const decryptedBytes = new Uint8Array(decryptedData);

  // Check for ftyp box (should start with file size, then 'ftyp')
  const ftypMagic = String.fromCharCode(...decryptedBytes.slice(4, 8));
  console.log(`   First box type: "${ftypMagic}"`);

  if (ftypMagic === 'ftyp') {
    console.log('✅ Valid fMP4 file (has ftyp box)');

    // Check for major brand
    const brand = String.fromCharCode(...decryptedBytes.slice(8, 12));
    console.log(`   Major brand: "${brand}"`);
  } else {
    console.log('❌ NOT a valid fMP4 file (missing ftyp box)');
    console.log(`   First 16 bytes: ${Array.from(decryptedBytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  }

  console.log('\n🎉 Test complete!');
}

testDecryption().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
