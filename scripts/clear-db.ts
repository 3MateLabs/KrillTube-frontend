/**
 * Clear all data from the database
 * Run with: npx tsx scripts/clear-db.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Clearing database...\n');

  try {
    // Delete in order to respect foreign key constraints
    console.log('Deleting PlaybackLog...');
    const playbackLogs = await prisma.playbackLog.deleteMany();
    console.log(`  ✓ Deleted ${playbackLogs.count} playback logs`);

    console.log('Deleting PlaybackSession...');
    const playbackSessions = await prisma.playbackSession.deleteMany();
    console.log(`  ✓ Deleted ${playbackSessions.count} playback sessions`);

    console.log('Deleting VideoSegment...');
    const videoSegments = await prisma.videoSegment.deleteMany();
    console.log(`  ✓ Deleted ${videoSegments.count} video segments`);

    console.log('Deleting VideoRendition...');
    const videoRenditions = await prisma.videoRendition.deleteMany();
    console.log(`  ✓ Deleted ${videoRenditions.count} video renditions`);

    console.log('Deleting Video...');
    const videos = await prisma.video.deleteMany();
    console.log(`  ✓ Deleted ${videos.count} videos`);

    console.log('Deleting AssetRevision...');
    const assetRevisions = await prisma.assetRevision.deleteMany();
    console.log(`  ✓ Deleted ${assetRevisions.count} asset revisions`);

    console.log('Deleting Asset...');
    const assets = await prisma.asset.deleteMany();
    console.log(`  ✓ Deleted ${assets.count} assets`);

    console.log('\n✅ Database cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
