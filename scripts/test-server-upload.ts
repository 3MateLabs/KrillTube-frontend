/**
 * Test server-side blob upload API
 *
 * This tests the new /api/v1/upload-blob endpoint that uploads to Walrus
 * via HTTP API without requiring wallet signatures.
 */

async function testServerUpload() {
  console.log('=== Testing Server-Side Blob Upload ===\n');

  // Test data
  const testBlob = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const identifier = 'test_blob_' + Date.now();
  const network = 'testnet';
  const epochs = 1;

  console.log(`Test blob size: ${testBlob.length} bytes`);
  console.log(`Identifier: ${identifier}`);
  console.log(`Network: ${network}`);
  console.log(`Epochs: ${epochs}\n`);

  try {
    // Create FormData
    const formData = new FormData();
    formData.append('blob', new Blob([testBlob]));
    formData.append('identifier', identifier);
    formData.append('network', network);
    formData.append('epochs', epochs.toString());

    console.log('Sending request to /api/v1/upload-blob...');

    // Send to server API
    const response = await fetch('http://localhost:3000/api/v1/upload-blob', {
      method: 'POST',
      body: formData,
    });

    console.log(`Response status: ${response.status} ${response.statusText}\n`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed!');
      console.error('Error response:', errorText);

      // Try to parse as JSON
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.error('Raw error text:', errorText);
      }

      process.exit(1);
    }

    // Parse success response
    const result = await response.json();
    console.log('✅ Upload successful!\n');
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.publisher) {
      console.log(`\n🔄 Used publisher: ${result.publisher}`)
    }

    // Verify response structure
    if (!result.blobId) {
      console.error('❌ Missing blobId in response!');
      process.exit(1);
    }

    if (!result.url) {
      console.error('❌ Missing url in response!');
      process.exit(1);
    }

    console.log('\n✅ All checks passed!');
    console.log(`\nBlob ID: ${result.blobId}`);
    console.log(`Blob URL: ${result.url}`);

    // Test retrieval
    console.log('\n=== Testing Blob Retrieval ===\n');
    console.log(`Fetching from: ${result.url}`);

    const retrieveResponse = await fetch(result.url);
    console.log(`Retrieve status: ${retrieveResponse.status} ${retrieveResponse.statusText}`);

    if (retrieveResponse.ok) {
      const retrievedData = await retrieveResponse.arrayBuffer();
      const retrievedArray = new Uint8Array(retrievedData);

      console.log(`Retrieved ${retrievedArray.length} bytes`);

      // Verify data matches
      if (retrievedArray.length === testBlob.length) {
        let match = true;
        for (let i = 0; i < testBlob.length; i++) {
          if (retrievedArray[i] !== testBlob[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          console.log('✅ Retrieved data matches original!');
        } else {
          console.error('❌ Retrieved data does NOT match original!');
        }
      } else {
        console.error(`❌ Size mismatch! Expected ${testBlob.length}, got ${retrievedArray.length}`);
      }
    } else {
      console.error('❌ Failed to retrieve blob!');
      const errorText = await retrieveResponse.text();
      console.error('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed with exception:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
testServerUpload();
