/**
 * Query testnet blob object IDs from database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Querying testnet videos...\n');

    const videos = await prisma.video.findMany({
      where: {
        network: 'testnet',
      },
      select: {
        id: true,
        title: true,
        network: true,
        walrusMasterUri: true,
        masterBlobObjectId: true,
        masterEndEpoch: true,
        posterBlobObjectId: true,
        posterEndEpoch: true,
        createdAt: true,
        renditions: {
          select: {
            id: true,
            name: true,
            playlistBlobObjectId: true,
            playlistEndEpoch: true,
            segments: {
              take: 1,
              select: {
                blobObjectId: true,
                endEpoch: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`Found ${videos.length} testnet videos:\n`);

    for (const video of videos) {
      console.log(`\nVideo: ${video.title} (${video.id})`);
      console.log(`  Network: ${video.network}`);
      console.log(`  Master URI: ${video.walrusMasterUri}`);
      console.log(`  Master Blob Object ID: ${video.masterBlobObjectId || 'NULL (quilt upload - no metadata)'}`);
      console.log(`  Master End Epoch: ${video.masterEndEpoch || 'NULL'}`);
      console.log(`  Poster Blob Object ID: ${video.posterBlobObjectId || 'NULL'}`);
      console.log(`  Poster End Epoch: ${video.posterEndEpoch || 'NULL'}`);
      console.log(`  Created: ${video.createdAt}`);
      console.log(`  Renditions: ${video.renditions.length}`);

      video.renditions.forEach((r) => {
        console.log(`    - ${r.name}: Playlist Blob Object ID = ${r.playlistBlobObjectId || 'NULL'}, End Epoch = ${r.playlistEndEpoch || 'NULL'}`);
        if (r.segments.length > 0) {
          console.log(`      First segment: Blob Object ID = ${r.segments[0].blobObjectId || 'NULL'}, End Epoch = ${r.segments[0].endEpoch || 'NULL'}`);
        }
      });
    }

    console.log('\n\nSummary:');
    const withBlobObjectIds = videos.filter(v => v.masterBlobObjectId !== null);
    console.log(`Videos with blob object IDs: ${withBlobObjectIds.length}/${videos.length}`);
    console.log(`Videos without blob object IDs: ${videos.length - withBlobObjectIds.length}/${videos.length} (likely quilt uploads)`);

  } catch (error) {
    console.error('Error querying database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
