/**
 * Diagnostic script to troubleshoot video playback issues
 *
 * Usage: npx tsx scripts/diagnose-playback.ts [VIDEO_ID]
 */

import { prisma } from '../lib/db';

async function diagnosePlayback(videoId?: string) {
  console.log('🔍 WalPlayer Playback Diagnostics\n');

  // 1. Check environment configuration
  console.log('📋 Environment Configuration:');
  console.log(`   Network: ${process.env.NEXT_PUBLIC_WALRUS_NETWORK || 'NOT SET'}`);
  console.log(`   Aggregator: ${process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || 'NOT SET'}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT SET'}`);
  console.log('');

  // 2. Check database connection
  console.log('🗄️  Database Connection:');
  try {
    await prisma.$connect();
    console.log('   ✅ Connected');
  } catch (error) {
    console.log('   ❌ Failed to connect');
    console.error('   Error:', error);
    return;
  }

  // 3. Check video count
  console.log('\n📊 Video Statistics:');
  try {
    const totalVideos = await prisma.video.count();
    const mainnetVideos = await prisma.video.count({ where: { network: 'mainnet' } });
    const testnetVideos = await prisma.video.count({ where: { network: 'testnet' } });

    console.log(`   Total videos: ${totalVideos}`);
    console.log(`   Mainnet videos: ${mainnetVideos}`);
    console.log(`   Testnet videos: ${testnetVideos}`);
  } catch (error) {
    console.log('   ❌ Failed to query videos');
    console.error('   Error:', error);
    return;
  }

  // 4. Check specific video if provided
  if (videoId) {
    console.log(`\n🎬 Video Details (${videoId}):`);
    try {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          renditions: {
            include: {
              segments: {
                take: 3, // First 3 segments
              },
            },
          },
        },
      });

      if (!video) {
        console.log('   ❌ Video not found');
        return;
      }

      console.log(`   Title: ${video.title}`);
      console.log(`   Network: ${video.network}`);
      console.log(`   Created: ${video.createdAt}`);
      console.log(`   Master URI: ${video.walrusMasterUri.substring(0, 80)}...`);

      // Check network mismatch
      const envNetwork = process.env.NEXT_PUBLIC_WALRUS_NETWORK;
      if (envNetwork && video.network !== envNetwork) {
        console.log(`\n   ⚠️  NETWORK MISMATCH DETECTED!`);
        console.log(`      Video is on: ${video.network}`);
        console.log(`      .env configured for: ${envNetwork}`);
        console.log(`      → This will cause playback to fail!`);
      }

      // Check renditions
      console.log(`\n   Renditions: ${video.renditions.length}`);
      video.renditions.forEach((r) => {
        console.log(`     - ${r.name}: ${r.segments.length} segments`);
      });

      // Check if segments have encryption keys
      const firstSegment = video.renditions[0]?.segments[0];
      if (firstSegment) {
        console.log(`\n   Encryption Check:`);
        console.log(`     DEK encrypted: ${firstSegment.dekEnc ? '✅ Yes' : '❌ No'}`);
        console.log(`     IV present: ${firstSegment.iv ? '✅ Yes' : '❌ No'}`);
      }
    } catch (error) {
      console.log('   ❌ Failed to fetch video');
      console.error('   Error:', error);
    }
  }

  // 5. Check recent videos
  if (!videoId) {
    console.log('\n📹 Recent Videos:');
    try {
      const recentVideos = await prisma.video.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          network: true,
          createdAt: true,
        },
      });

      if (recentVideos.length === 0) {
        console.log('   No videos found');
      } else {
        recentVideos.forEach((v, i) => {
          console.log(`   ${i + 1}. ${v.title}`);
          console.log(`      ID: ${v.id}`);
          console.log(`      Network: ${v.network}`);
          console.log(`      Created: ${v.createdAt}`);
          console.log('');
        });

        console.log(`\n💡 To diagnose a specific video, run:`);
        console.log(`   npx tsx scripts/diagnose-playback.ts ${recentVideos[0].id}`);
      }
    } catch (error) {
      console.log('   ❌ Failed to fetch recent videos');
      console.error('   Error:', error);
    }
  }

  // 6. Final recommendations
  console.log('\n✨ Recommendations:');
  const envNetwork = process.env.NEXT_PUBLIC_WALRUS_NETWORK;
  if (!envNetwork) {
    console.log('   ⚠️  Set NEXT_PUBLIC_WALRUS_NETWORK in .env');
  }

  const aggregator = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR;
  if (!aggregator) {
    console.log('   ⚠️  Set NEXT_PUBLIC_WALRUS_AGGREGATOR in .env');
  } else if (envNetwork === 'testnet' && !aggregator.includes('testnet')) {
    console.log('   ⚠️  Aggregator URL should include "testnet" for testnet network');
  } else if (envNetwork === 'mainnet' && aggregator.includes('testnet')) {
    console.log('   ⚠️  Aggregator URL should NOT include "testnet" for mainnet');
  }

  console.log('\n📚 For more troubleshooting, see TROUBLESHOOTING.md');

  await prisma.$disconnect();
}

// Get video ID from command line
const videoId = process.argv[2];

diagnosePlayback(videoId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
