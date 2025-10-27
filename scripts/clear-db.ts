#!/usr/bin/env tsx
/**
 * Database clearing script
 *
 * Clears all video-related data from the database.
 * Use this after fixing encryption to remove old videos with encrypted init segments.
 *
 * Usage:
 *   npm run clear-db              # Clear all videos
 *   npm run clear-db -- --confirm # Skip confirmation prompt
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

async function clearDatabase(skipConfirmation = false) {
  console.log('\n🗑️  DATABASE CLEAR SCRIPT\n');
  console.log('This will delete:');
  console.log('  - All Videos');
  console.log('  - All VideoRenditions');
  console.log('  - All VideoSegments');
  console.log('  - All PlaybackSessions');
  console.log('  - All PlaybackLogs');
  console.log('  - All Assets');
  console.log('  - All AssetRevisions\n');

  if (!skipConfirmation) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Are you sure you want to proceed? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled\n');
      process.exit(0);
    }
  }

  console.log('\n⏳ Clearing database...\n');

  try {
    // Delete in order (respecting foreign key constraints)
    const playbackLogs = await prisma.playbackLog.deleteMany();
    console.log(`✓ Deleted ${playbackLogs.count} PlaybackLogs`);

    const playbackSessions = await prisma.playbackSession.deleteMany();
    console.log(`✓ Deleted ${playbackSessions.count} PlaybackSessions`);

    const videoSegments = await prisma.videoSegment.deleteMany();
    console.log(`✓ Deleted ${videoSegments.count} VideoSegments`);

    const videoRenditions = await prisma.videoRendition.deleteMany();
    console.log(`✓ Deleted ${videoRenditions.count} VideoRenditions`);

    const videos = await prisma.video.deleteMany();
    console.log(`✓ Deleted ${videos.count} Videos`);

    const assetRevisions = await prisma.assetRevision.deleteMany();
    console.log(`✓ Deleted ${assetRevisions.count} AssetRevisions`);

    const assets = await prisma.asset.deleteMany();
    console.log(`✓ Deleted ${assets.count} Assets`);

    console.log('\n✅ Database cleared successfully!\n');
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const skipConfirmation = process.argv.includes('--confirm');
clearDatabase(skipConfirmation)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
