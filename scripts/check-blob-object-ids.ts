/**
 * Script to check blob object ID status for all videos
 */

import { prisma } from '../lib/db';

async function checkBlobObjectIds() {
  console.log('[Check] Fetching all videos...\n');

  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      network: true,
      masterBlobObjectId: true,
      creatorId: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Total videos: ${videos.length}\n`);

  videos.forEach((v, i) => {
    console.log(`${i + 1}. "${v.title}"`);
    console.log(`   ID: ${v.id}`);
    console.log(`   Network: ${v.network}`);
    console.log(`   Creator: ${v.creatorId.substring(0, 10)}...`);
    console.log(`   Blob Object ID: ${v.masterBlobObjectId || 'MISSING ❌'}`);
    console.log('');
  });

  const withBlobIds = videos.filter(v => v.masterBlobObjectId);
  const withoutBlobIds = videos.filter(v => !v.masterBlobObjectId);

  console.log('\n=== SUMMARY ===');
  console.log(`Videos WITH blob object IDs: ${withBlobIds.length} ✅`);
  console.log(`Videos WITHOUT blob object IDs: ${withoutBlobIds.length} ❌`);
  console.log('\nNote: Extend/Delete buttons only show for videos WITH blob object IDs on mainnet\n');
}

checkBlobObjectIds()
  .then(() => {
    console.log('[Check] Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Check] Fatal error:', error);
    process.exit(1);
  });
