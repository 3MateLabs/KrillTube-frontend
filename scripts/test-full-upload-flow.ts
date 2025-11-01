/**
 * Test full video upload flow (simulated)
 * Tests the complete client-side encryption + server-side upload flow
 */

async function testFullUploadFlow() {
  console.log('=== Testing Full Upload Flow ===\n');

  // Simulate encrypted segments (like real upload would have)
  const segments = [
    { identifier: '720p_init', size: 1024 },
    { identifier: '720p_seg_0', size: 524288 },
    { identifier: '720p_seg_1', size: 512000 },
  ];

  console.log(`Simulating upload of ${segments.length} segments...\n`);

  const uploadedSegments: any[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    console.log(`[${i + 1}/${segments.length}] Uploading ${seg.identifier} (${seg.size} bytes)...`);

    // Create fake encrypted data
    const fakeData = new Uint8Array(seg.size);
    for (let j = 0; j < seg.size; j++) {
      fakeData[j] = Math.floor(Math.random() * 256);
    }

    try {
      // Upload via server API
      const formData = new FormData();
      formData.append('blob', new Blob([fakeData]));
      formData.append('identifier', seg.identifier);
      formData.append('network', 'testnet');
      formData.append('epochs', '1');

      const startTime = Date.now();
      const response = await fetch('http://localhost:3000/api/v1/upload-blob', {
        method: 'POST',
        body: formData,
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to upload ${seg.identifier}`);
        console.error(`Status: ${response.status} ${response.statusText}`);
        console.error(`Error:`, errorText);

        // Try to parse error details
        try {
          const errorJson = JSON.parse(errorText);
          console.error('Error details:', JSON.stringify(errorJson, null, 2));
        } catch (e) {
          // Not JSON
        }

        process.exit(1);
      }

      const result = await response.json();
      uploadedSegments.push(result);

      console.log(`   ✅ Uploaded in ${elapsed}ms → ${result.blobId.substring(0, 20)}...`);

    } catch (error) {
      console.error(`❌ Exception uploading ${seg.identifier}:`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log(`\n✅ All ${segments.length} segments uploaded successfully!\n`);

  // Test creating playlist
  console.log('=== Testing Playlist Upload ===\n');

  const playlistContent = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:4
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MAP:URI="https://aggregator.walrus-testnet.walrus.space/v1/blobs/${uploadedSegments[0].blobId}"
#EXTINF:4.0,
https://aggregator.walrus-testnet.walrus.space/v1/blobs/${uploadedSegments[1].blobId}
#EXTINF:4.0,
https://aggregator.walrus-testnet.walrus.space/v1/blobs/${uploadedSegments[2].blobId}
#EXT-X-ENDLIST
`;

  console.log('Uploading playlist...');

  try {
    const formData = new FormData();
    formData.append('blob', new Blob([playlistContent]));
    formData.append('identifier', '720p_playlist');
    formData.append('network', 'testnet');
    formData.append('epochs', '1');

    const response = await fetch('http://localhost:3000/api/v1/upload-blob', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to upload playlist');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error('Error:', errorText);
      process.exit(1);
    }

    const result = await response.json();
    console.log(`✅ Playlist uploaded → ${result.blobId}\n`);

    // Test fetching the playlist
    console.log('=== Testing Playlist Retrieval ===\n');
    const playlistUrl = result.url;
    console.log(`Fetching: ${playlistUrl}`);

    const fetchResponse = await fetch(playlistUrl);
    if (fetchResponse.ok) {
      const content = await fetchResponse.text();
      console.log('✅ Playlist retrieved successfully!');
      console.log('\nPlaylist content:');
      console.log(content);
    } else {
      console.error('❌ Failed to fetch playlist');
    }

  } catch (error) {
    console.error('❌ Exception uploading playlist:');
    console.error(error);
    process.exit(1);
  }

  console.log('\n✅ Full upload flow test completed successfully!');
}

// Run test
testFullUploadFlow();
