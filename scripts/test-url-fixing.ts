/**
 * Test script to verify URL fixing logic
 * Tests the decryptingLoader's URL transformation
 */

// Simulate the URL fixing logic
const PATCH_ID_REGEX = /\/by-quilt-patch-id\/([^@]+)@\d+:\d+/;
const PATCH_ID_GLOBAL_REGEX = /\/by-quilt-patch-id\/([^\s@\n]+)@\d+:\d+/g;
const AGGREGATOR_DOMAIN = 'aggregator.walrus.space';
const AGGREGATOR_REPLACEMENT = 'aggregator.mainnet.walrus.mirai.cloud';

function fixWalrusUrl(url: string): string {
  let fixed = url;

  // Step 1: Replace aggregator domain
  if (fixed.includes(AGGREGATOR_DOMAIN)) {
    fixed = fixed.replace(AGGREGATOR_DOMAIN, AGGREGATOR_REPLACEMENT);
  }

  // Step 2: Strip @start:end byte ranges from patch IDs
  const patchIdMatch = fixed.match(PATCH_ID_REGEX);
  if (patchIdMatch) {
    const blobId = patchIdMatch[1];
    // Need to check if /v1/blobs/ is already present
    if (fixed.includes('/v1/blobs/by-quilt-patch-id/')) {
      // URL already has full path, just remove the by-quilt-patch-id part
      fixed = fixed.replace(/\/by-quilt-patch-id\/([^@]+)@\d+:\d+/, '/$1');
    } else {
      // URL is relative, add full path
      fixed = fixed.replace(PATCH_ID_REGEX, `/v1/blobs/${blobId}`);
    }
  }

  return fixed;
}

function fixPlaylist(playlist: string): string {
  let fixed = playlist;

  // Replace aggregator domain
  if (fixed.includes(AGGREGATOR_DOMAIN)) {
    fixed = fixed.replace(new RegExp(AGGREGATOR_DOMAIN.replace('.', '\\.'), 'g'), AGGREGATOR_REPLACEMENT);
  }

  // Strip @start:end from patch IDs in playlist
  if (PATCH_ID_GLOBAL_REGEX.test(fixed)) {
    // Check if URLs in playlist are absolute or relative
    if (fixed.includes('https://') || fixed.includes('http://')) {
      // Absolute URLs - check if /v1/blobs/ is present
      if (fixed.includes('/v1/blobs/by-quilt-patch-id/')) {
        fixed = fixed.replace(/\/by-quilt-patch-id\/([^@\s\n]+)@\d+:\d+/g, '/$1');
      } else {
        fixed = fixed.replace(/\/by-quilt-patch-id\/([^@\s\n]+)@\d+:\d+/g, '/v1/blobs/$1');
      }
    } else {
      // Relative URLs
      fixed = fixed.replace(/\/by-quilt-patch-id\/([^@\s\n]+)@\d+:\d+/g, '/v1/blobs/$1');
    }
  }

  return fixed;
}

// Test cases
console.log('=== URL Fixing Tests ===\n');

const testCases = [
  {
    name: 'Full URL with /v1/blobs/ and @range',
    input: 'https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/by-quilt-patch-id/j4RF93zFuLrv2CWQU0-Bv9J86DlXqTbOJfcbhANDCT8@0:210',
    expected: 'https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/j4RF93zFuLrv2CWQU0-Bv9J86DlXqTbOJfcbhANDCT8'
  },
  {
    name: 'Full URL without /v1/blobs/ but with @range',
    input: 'https://aggregator.mainnet.walrus.mirai.cloud/by-quilt-patch-id/j4RF93zFuLrv2CWQU0-Bv9J86DlXqTbOJfcbhANDCT8@0:210',
    expected: 'https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/j4RF93zFuLrv2CWQU0-Bv9J86DlXqTbOJfcbhANDCT8'
  },
  {
    name: 'Relative URL with @range',
    input: '/by-quilt-patch-id/j4RF93zFuLrv2CWQU0-Bv9J86DlXqTbOJfcbhANDCT8@0:210',
    expected: '/v1/blobs/j4RF93zFuLrv2CWQU0-Bv9J86DlXqTbOJfcbhANDCT8'
  },
  {
    name: 'Old aggregator domain',
    input: 'https://aggregator.walrus.space/v1/blobs/by-quilt-patch-id/ABC123@0:100',
    expected: 'https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/ABC123'
  },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = fixWalrusUrl(test.input);
  const success = result === test.expected;

  if (success) {
    console.log(`✓ PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`✗ FAIL: ${test.name}`);
    console.log(`  Input:    ${test.input}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got:      ${result}`);
    failed++;
  }
}

console.log(`\n=== Playlist Fixing Tests ===\n`);

const playlistTests = [
  {
    name: 'M3U8 with absolute URLs',
    input: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/by-quilt-patch-id/ABC123@0:100
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720
https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/by-quilt-patch-id/DEF456@0:200`,
    expected: `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/ABC123
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=1280x720
https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/DEF456`
  },
  {
    name: 'M3U8 with relative URLs',
    input: `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:10.0
/by-quilt-patch-id/SEG001@0:50
#EXTINF:10.0
/by-quilt-patch-id/SEG002@50:100`,
    expected: `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:10.0
/v1/blobs/SEG001
#EXTINF:10.0
/v1/blobs/SEG002`
  }
];

for (const test of playlistTests) {
  const result = fixPlaylist(test.input);
  const success = result === test.expected;

  if (success) {
    console.log(`✓ PASS: ${test.name}`);
    passed++;
  } else {
    console.log(`✗ FAIL: ${test.name}`);
    console.log(`  Expected:\n${test.expected}`);
    console.log(`  Got:\n${result}`);
    failed++;
  }
}

console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
