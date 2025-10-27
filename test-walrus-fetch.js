/**
 * Test script to understand Walrus blob propagation
 * Usage: node test-walrus-fetch.js [blobId] [type]
 * type: 'blob' or 'quilt' (default: blob)
 */

const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';

async function fetchWithRetry(url, maxRetries = 10, delayMs = 2000) {
  console.log(`\n🔍 Testing URL: ${url}`);
  console.log('─'.repeat(80));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      const response = await fetch(url);
      const elapsed = Date.now() - startTime;

      console.log(`\n[Attempt ${attempt}/${maxRetries}] Status: ${response.status} ${response.statusText} (${elapsed}ms)`);

      // Log response headers
      console.log('\nResponse Headers:');
      for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        console.log(`\n✅ SUCCESS after ${attempt} attempt(s)!`);
        console.log(`   Content-Type: ${contentType}`);
        console.log(`   Content-Length: ${contentLength} bytes`);

        // If it's text content, show first 200 chars
        if (contentType?.includes('text') || contentType?.includes('application/vnd.apple.mpegurl')) {
          const text = await response.text();
          console.log('\nContent Preview:');
          console.log(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        } else {
          console.log('\nBinary content - not displaying');
        }

        return { success: true, attempts: attempt, elapsed };
      }

      // If not successful, show error body
      const errorText = await response.text();
      console.log(`\n❌ Error Response Body:`);
      console.log(errorText);

      if (attempt < maxRetries) {
        console.log(`\n⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.log(`\n❌ Network Error: ${error.message}`);
      if (attempt < maxRetries) {
        console.log(`\n⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.log(`\n❌ FAILED after ${maxRetries} attempts`);
  return { success: false, attempts: maxRetries };
}

async function testBlobFetch(blobId, type = 'blob') {
  let url;

  if (type === 'quilt') {
    url = `${AGGREGATOR}/v1/blobs/by-quilt-patch-id/${blobId}`;
  } else {
    url = `${AGGREGATOR}/v1/${blobId}`;
  }

  const result = await fetchWithRetry(url);

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY:');
  console.log(`  Type: ${type}`);
  console.log(`  ID: ${blobId}`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Attempts: ${result.attempts}`);
  if (result.elapsed) {
    console.log(`  Time to first success: ~${result.attempts * 2} seconds`);
  }
  console.log('='.repeat(80));
}

// Get the most recent upload from our logs
async function testRecentUpload() {
  const fs = require('fs');
  const path = require('path');

  // Try to read the most recent manifest from uploads directory
  const uploadsDir = path.join(__dirname, 'public', 'uploads');

  try {
    const files = fs.readdirSync(uploadsDir);
    const assetDirs = files.filter(f => f.startsWith('asset_'));

    if (assetDirs.length === 0) {
      console.log('❌ No uploads found. Upload a video first!');
      return;
    }

    // Get most recent
    const latestDir = assetDirs.sort().reverse()[0];
    const manifestPath = path.join(uploadsDir, latestDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.log('❌ No manifest found in latest upload');
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    console.log('\n📦 Found recent upload:');
    console.log(`   Asset ID: ${manifest.assetId}`);
    console.log(`   Title: ${manifest.title}`);
    console.log(`   Uploaded: ${manifest.uploadedAt}`);

    // Test master playlist
    console.log('\n🎬 Testing Master Playlist:');
    const masterBlobId = manifest.masterPlaylist.blobId;
    const masterUrl = manifest.masterPlaylist.url;
    const isMasterQuilt = masterUrl.includes('by-quilt-patch-id');

    console.log(`   URL: ${masterUrl}`);
    await testBlobFetch(masterBlobId, isMasterQuilt ? 'quilt' : 'blob');

    // Test one rendition playlist
    console.log('\n\n📺 Testing 360p Rendition Playlist:');
    const rendition = manifest.renditions.find(r => r.quality === '360p');
    if (rendition) {
      const playlistBlobId = rendition.playlist.blobId;
      const playlistUrl = rendition.playlist.url;
      const isPlaylistQuilt = playlistUrl.includes('by-quilt-patch-id');

      console.log(`   URL: ${playlistUrl}`);
      await testBlobFetch(playlistBlobId, isPlaylistQuilt ? 'quilt' : 'blob');
    }

    // Test one segment
    console.log('\n\n🎞️ Testing First Segment:');
    if (rendition && rendition.segments.length > 0) {
      const segment = rendition.segments[0];
      const segmentUrl = segment.url;
      const isSegmentQuilt = segmentUrl.includes('by-quilt-patch-id');

      console.log(`   URL: ${segmentUrl}`);
      await testBlobFetch(segment.blobId, isSegmentQuilt ? 'quilt' : 'blob');
    }

  } catch (error) {
    console.error('Error reading upload:', error.message);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('🔍 Walrus Blob Fetch Tester\n');
  console.log('Testing most recent upload...\n');
  testRecentUpload();
} else {
  const blobId = args[0];
  const type = args[1] || 'blob';
  testBlobFetch(blobId, type);
}
