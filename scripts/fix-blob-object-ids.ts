/**
 * Script to fix missing blob object IDs for mainnet videos
 * This populates blob object IDs by fetching from blockchain
 */

import { prisma } from '../lib/db';
import { walrusSDK } from '../lib/walrus-sdk';

async function fixBlobObjectIds() {
  console.log('[Fix] Fetching mainnet videos without blob object IDs...');

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
  });

  console.log(`[Fix] Found ${videos.length} mainnet videos without blob object IDs\n`);

  for (const video of videos) {
    console.log(`[Fix] Processing video: ${video.id} - "${video.title}"`);

    try {
      // Extract blob ID from master URI
      // Format: https://aggregator.mainnet.walrus.mirai.cloud/v1/blobs/{blobId}
      const masterBlobId = video.walrusMasterUri.split('/blobs/')[1];

      if (!masterBlobId) {
        console.error(`  ❌ Could not extract blob ID from URI: ${video.walrusMasterUri}`);
        continue;
      }

      console.log(`  Master Blob ID: ${masterBlobId}`);

      // Fetch blob metadata from blockchain
      const masterMetadata = await walrusSDK.getBlobMetadata(masterBlobId);

      console.log(`  ✅ Found blob object: ${masterMetadata.objectId}`);
      console.log(`  End epoch: ${masterMetadata.endEpoch}`);

      // Update video with blob object ID
      await prisma.video.update({
        where: { id: video.id },
        data: {
          masterBlobObjectId: masterMetadata.objectId,
          masterEndEpoch: masterMetadata.endEpoch,
        },
      });

      console.log(`  ✅ Updated video ${video.id} with blob object metadata\n`);

    } catch (error) {
      console.error(`  ❌ Error processing video ${video.id}:`, error);
      console.error(`     ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  console.log('[Fix] ✅ Migration complete!');
}

fixBlobObjectIds()
  .then(() => {
    console.log('[Fix] Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Fix] Fatal error:', error);
    process.exit(1);
  });
