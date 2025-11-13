/**
 * Backfill blob object IDs and end epochs for existing quilt-uploaded videos
 *
 * This script fetches blob object metadata from the Sui blockchain for videos
 * that were uploaded via HTTP quilts (which don't return blob object IDs).
 *
 * Usage:
 *   npx tsx scripts/backfill-blob-metadata.ts
 */

import { PrismaClient } from '@prisma/client';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting blob metadata backfill...\n');

  // Initialize Sui client for mainnet
  const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

  // Find mainnet videos without blob object IDs
  const videos = await prisma.video.findMany({
    where: {
      network: 'mainnet',
      masterBlobObjectId: null,
    },
    include: {
      renditions: {
        include: {
          segments: true,
        },
      },
    },
    take: 10, // Process in batches
  });

  console.log(`Found ${videos.length} mainnet videos missing blob object IDs\n`);

  let updated = 0;
  let failed = 0;

  for (const video of videos) {
    console.log(`\nProcessing video: ${video.title} (${video.id})`);

    try {
      // Extract blob ID from Walrus URI
      const masterBlobId = extractBlobIdFromUri(video.walrusMasterUri);

      if (!masterBlobId) {
        console.log(`  ⚠️  Could not extract blob ID from URI: ${video.walrusMasterUri}`);
        failed++;
        continue;
      }

      console.log(`  Blob ID: ${masterBlobId}`);

      // Query Sui blockchain for blob object
      // Method 1: Search for blob object by blob ID
      // Note: This requires knowing the blob object type and searching through events

      // Method 2: Query blob events from Walrus system object
      const WALRUS_SYSTEM_OBJECT = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

      // Query events to find blob object creation
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: `${WALRUS_SYSTEM_OBJECT}::blob::BlobRegistered`,
        },
        limit: 50,
      });

      console.log(`  Found ${events.data.length} blob registration events`);

      // Search for matching blob ID in events
      let blobObjectId: string | null = null;
      let endEpoch: number | null = null;

      for (const event of events.data) {
        const eventData = event.parsedJson as any;
        if (eventData.blob_id === masterBlobId) {
          blobObjectId = eventData.object_id;
          endEpoch = parseInt(eventData.end_epoch || '0');
          console.log(`  ✓ Found blob object: ${blobObjectId}`);
          console.log(`  ✓ End epoch: ${endEpoch}`);
          break;
        }
      }

      if (!blobObjectId) {
        console.log(`  ⚠️  Blob object not found in recent events`);
        console.log(`  Tip: Blob might be older than query limit. Try direct object lookup.`);
        failed++;
        continue;
      }

      // Update video with blob metadata
      await prisma.video.update({
        where: { id: video.id },
        data: {
          masterBlobObjectId: blobObjectId,
          masterEndEpoch: endEpoch,
        },
      });

      console.log(`  ✓ Updated video with blob metadata`);
      updated++;

      // TODO: Also update poster, renditions, and segments
      // This would require extracting blob IDs from all URIs and querying each

    } catch (error) {
      console.error(`  ❌ Error processing video: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }

  console.log(`\n\nBackfill complete:`);
  console.log(`  ✓ Updated: ${updated} videos`);
  console.log(`  ❌ Failed: ${failed} videos`);
  console.log(`\nNote: This script only updated master playlist metadata.`);
  console.log(`To fully enable extend/delete, also backfill poster, renditions, and segments.`);
}

/**
 * Extract blob ID from Walrus URI
 */
function extractBlobIdFromUri(uri: string): string | null {
  // Handle quilt patch IDs: /v1/blobs/by-quilt-patch-id/{patchId}
  const quiltMatch = uri.match(/\/v1\/blobs\/by-quilt-patch-id\/([^/]+)$/);
  if (quiltMatch) {
    return quiltMatch[1]; // Return quilt patch ID (can be used to query)
  }

  // Handle regular blob IDs: /v1/blobs/{blobId}
  const blobMatch = uri.match(/\/v1\/blobs\/([^/]+)$/);
  if (blobMatch) {
    return blobMatch[1];
  }

  return null;
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
