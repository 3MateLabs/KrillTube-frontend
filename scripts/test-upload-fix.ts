/**
 * Test script to verify HTTP upload fix
 */

const publisherUrl = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space';
const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || 'https://aggregator.walrus-testnet.walrus.space';
const epochs = 1; // Use 1 epoch for free testnet uploads

async function testUpload() {
  console.log('🧪 Testing Walrus HTTP upload with epochs parameter...\n');

  // Create test data
  const testData = new TextEncoder().encode('Test video segment data - ' + Date.now());

  // Upload with epochs parameter (FIXED)
  console.log(`📤 Uploading to: ${publisherUrl}/v1/blobs?epochs=${epochs}`);
  const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochs}`, {
    method: 'PUT',
    body: testData,
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const blobId = result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId;

  console.log(`✅ Upload successful!`);
  console.log(`   Blob ID: ${blobId}`);
  console.log(`   Response:`, JSON.stringify(result, null, 2));

  // Verify blob is accessible
  console.log(`\n🔍 Verifying blob accessibility...`);
  const verifyUrl = `${aggregatorUrl}/v1/blobs/${blobId}`;
  console.log(`   Fetching: ${verifyUrl}`);

  const verifyResponse = await fetch(verifyUrl);

  if (!verifyResponse.ok) {
    const errorText = await verifyResponse.text();
    console.error(`❌ Blob not accessible: ${verifyResponse.status}`);
    console.error(`   Error: ${errorText}`);
    return;
  }

  const retrievedData = await verifyResponse.arrayBuffer();
  const retrievedText = new TextDecoder().decode(retrievedData);

  console.log(`✅ Blob accessible!`);
  console.log(`   Retrieved data: ${retrievedText}`);
  console.log(`\n🎉 All tests passed! The fix is working correctly.`);
}

testUpload().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
