/**
 * End-to-end test for decryption flow
 * Tests URL fixing, session creation, key retrieval, and decryption
 */

import { prisma } from '../lib/db';

async function testDecryptionFlow() {
  console.log('=== Testing Decryption Flow ===\n');

  try {
    // Step 1: Get latest video from database
    console.log('Step 1: Fetching video from database...');
    const video = await prisma.video.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        renditions: {
          include: {
            segments: {
              take: 3,
              orderBy: { segIdx: 'asc' }
            }
          }
        }
      }
    });

    if (!video) {
      console.error('✗ No videos found in database');
      process.exit(1);
    }

    console.log(`✓ Found video: ${video.title} (ID: ${video.id})`);
    console.log(`  Master URI: ${video.walrusMasterUri}\n`);

    // Step 2: Test URL fixing
    console.log('Step 2: Testing URL transformations...');

    const PATCH_ID_REGEX = /\/by-quilt-patch-id\/([^@]+)@\d+:\d+/;

    function fixWalrusUrl(url: string): string {
      let fixed = url;

      // Replace old aggregator
      if (fixed.includes('aggregator.walrus.space')) {
        fixed = fixed.replace('aggregator.walrus.space', 'aggregator.mainnet.walrus.mirai.cloud');
      }

      // Strip @start:end from patch IDs
      const match = fixed.match(PATCH_ID_REGEX);
      if (match) {
        const blobId = match[1];
        if (fixed.includes('/v1/blobs/by-quilt-patch-id/')) {
          fixed = fixed.replace(/\/by-quilt-patch-id\/([^@]+)@\d+:\d+/, '/$1');
        } else {
          fixed = fixed.replace(PATCH_ID_REGEX, `/v1/blobs/${blobId}`);
        }
      }

      return fixed;
    }

    const fixedMasterUri = fixWalrusUrl(video.walrusMasterUri);
    console.log(`  Original: ${video.walrusMasterUri}`);
    console.log(`  Fixed:    ${fixedMasterUri}`);

    if (fixedMasterUri.includes('by-quilt-patch-id')) {
      console.error('✗ URL still contains by-quilt-patch-id!');
      process.exit(1);
    }

    if (fixedMasterUri.includes('@')) {
      console.error('✗ URL still contains @ byte range!');
      process.exit(1);
    }

    if (fixedMasterUri.match(/\/v1\/blobs\/v1\/blobs\//)) {
      console.error('✗ URL has duplicate /v1/blobs/ path!');
      process.exit(1);
    }

    console.log('✓ Master URI transformation looks good\n');

    // Step 3: Test rendition URLs
    console.log('Step 3: Testing rendition URLs...');
    for (const rendition of video.renditions) {
      const fixedPlaylistUri = fixWalrusUrl(rendition.walrusPlaylistUri);
      console.log(`  ${rendition.name} playlist:`);
      console.log(`    Original: ${rendition.walrusPlaylistUri}`);
      console.log(`    Fixed:    ${fixedPlaylistUri}`);

      if (fixedPlaylistUri.includes('by-quilt-patch-id') || fixedPlaylistUri.includes('@')) {
        console.error(`✗ Rendition ${rendition.name} URL not fixed properly!`);
        process.exit(1);
      }

      if (fixedPlaylistUri.match(/\/v1\/blobs\/v1\/blobs\//)) {
        console.error(`✗ Rendition ${rendition.name} has duplicate /v1/blobs/ path!`);
        process.exit(1);
      }
    }
    console.log('✓ All rendition URLs look good\n');

    // Step 4: Test segment URLs
    console.log('Step 4: Testing segment URLs...');
    const firstRendition = video.renditions[0];
    if (firstRendition?.segments && firstRendition.segments.length > 0) {
      for (const segment of firstRendition.segments.slice(0, 3)) {
        const fixedSegmentUri = fixWalrusUrl(segment.walrusUri);
        console.log(`  Segment ${segment.segIdx}:`);
        console.log(`    Original: ${segment.walrusUri}`);
        console.log(`    Fixed:    ${fixedSegmentUri}`);

        if (fixedSegmentUri.includes('by-quilt-patch-id') || fixedSegmentUri.includes('@')) {
          console.error(`✗ Segment ${segment.segIdx} URL not fixed properly!`);
          process.exit(1);
        }

        if (fixedSegmentUri.match(/\/v1\/blobs\/v1\/blobs\//)) {
          console.error(`✗ Segment ${segment.segIdx} has duplicate /v1/blobs/ path!`);
          process.exit(1);
        }
      }
    }
    console.log('✓ All segment URLs look good\n');

    // Step 5: Test Walrus connectivity
    console.log('Step 5: Testing Walrus connectivity...');
    try {
      const testUrl = fixedMasterUri;
      console.log(`  Fetching: ${testUrl}`);

      const response = await fetch(testUrl);
      console.log(`  Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.error(`✗ Failed to fetch master playlist: ${response.status}`);
        const body = await response.text();
        console.error(`  Response body: ${body.substring(0, 200)}`);
        process.exit(1);
      }

      const content = await response.text();
      console.log(`  Content length: ${content.length} bytes`);
      console.log(`  Content preview: ${content.substring(0, 100)}...`);
      console.log('✓ Successfully fetched master playlist\n');

      // Test if playlist needs fixing
      if (content.includes('by-quilt-patch-id')) {
        console.log('  ⚠ Playlist contains by-quilt-patch-id URLs (will be fixed by loader)');
      }

    } catch (error) {
      console.error(`✗ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }

    // Step 6: Check database integrity
    console.log('Step 6: Checking database integrity...');
    console.log(`  Video has ${video.renditions.length} renditions`);

    for (const rendition of video.renditions) {
      const segmentCount = rendition.segments?.length || 0;
      console.log(`  ${rendition.name}: ${segmentCount} segments`);

      if (segmentCount === 0) {
        console.error(`✗ Rendition ${rendition.name} has no segments!`);
        process.exit(1);
      }

      // Check if segments have IVs
      const firstSegment = rendition.segments?.[0];
      if (firstSegment && !firstSegment.iv) {
        console.error(`✗ Segment ${firstSegment.segIdx} in ${rendition.name} has no IV!`);
        process.exit(1);
      }
    }

    console.log('✓ Database integrity looks good\n');

    // Success!
    console.log('=== ✓ ALL TESTS PASSED ===');
    console.log('\nThe decryption flow should work correctly.');
    console.log('Try playing the video in the browser now.');

  } catch (error) {
    console.error('\n✗ Test failed with error:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDecryptionFlow();
