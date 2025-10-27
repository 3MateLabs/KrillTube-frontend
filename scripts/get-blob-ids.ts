#!/usr/bin/env tsx
/**
 * Script to retrieve Walrus blob IDs from uploaded videos
 *
 * Usage:
 *   npm run get-blob-ids              # Show all videos with blob IDs
 *   npm run get-blob-ids -- --video <VIDEO_ID>  # Show specific video
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VideoWithBlobs {
  id: string;
  title: string;
  walrusMasterUri: string;
  posterWalrusUri: string | null;
  createdAt: Date;
  renditions: {
    name: string;
    walrusPlaylistUri: string;
    segments: {
      segIdx: number;
      walrusUri: string;
    }[];
  }[];
}

async function extractBlobId(uri: string): Promise<string> {
  // Extract blob ID from different Walrus URI formats:
  // - /v1/blobs/{blobId}
  // - /v1/blobs/by-quilt-patch-id/{patchId}
  const match = uri.match(/\/v1\/blobs\/(?:by-quilt-patch-id\/)?([^/]+)$/);
  return match ? match[1] : uri;
}

async function getVideoBlobs(videoId?: string) {
  console.log('\n📦 WALRUS BLOB IDs\n');

  const videos = await prisma.video.findMany({
    where: videoId ? { id: videoId } : undefined,
    include: {
      renditions: {
        include: {
          segments: {
            orderBy: { segIdx: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (videos.length === 0) {
    console.log('No videos found\n');
    return;
  }

  for (const video of videos) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📹 Video: ${video.title}`);
    console.log(`   ID: ${video.id}`);
    console.log(`   Created: ${video.createdAt.toISOString()}`);
    console.log();

    // Master playlist blob ID
    const masterBlobId = await extractBlobId(video.walrusMasterUri);
    console.log(`🎬 Master Playlist:`);
    console.log(`   Blob ID: ${masterBlobId}`);
    console.log(`   URI: ${video.walrusMasterUri}`);
    console.log();

    // Poster blob ID
    if (video.posterWalrusUri) {
      const posterBlobId = await extractBlobId(video.posterWalrusUri);
      console.log(`🖼️  Poster:`);
      console.log(`   Blob ID: ${posterBlobId}`);
      console.log(`   URI: ${video.posterWalrusUri}`);
      console.log();
    }

    // Rendition blob IDs
    for (const rendition of video.renditions) {
      console.log(`📊 Rendition: ${rendition.name}`);

      const playlistBlobId = await extractBlobId(rendition.walrusPlaylistUri);
      console.log(`   Playlist Blob ID: ${playlistBlobId}`);
      console.log(`   Playlist URI: ${rendition.walrusPlaylistUri}`);
      console.log();

      console.log(`   Segments (${rendition.segments.length} total):`);
      for (const segment of rendition.segments) {
        const segmentBlobId = await extractBlobId(segment.walrusUri);
        console.log(`     Segment ${segment.segIdx}: ${segmentBlobId}`);
        console.log(`       URI: ${segment.walrusUri}`);
      }
      console.log();
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`✅ Found ${videos.length} video(s)\n`);
}

async function exportBlobIdsJson(videoId?: string) {
  const videos = await prisma.video.findMany({
    where: videoId ? { id: videoId } : undefined,
    include: {
      renditions: {
        include: {
          segments: {
            orderBy: { segIdx: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = await Promise.all(
    videos.map(async (video) => {
      const renditions = await Promise.all(
        video.renditions.map(async (rendition) => {
          const segments = await Promise.all(
            rendition.segments.map(async (segment) => ({
              segIdx: segment.segIdx,
              blobId: await extractBlobId(segment.walrusUri),
              uri: segment.walrusUri,
            }))
          );

          return {
            name: rendition.name,
            playlistBlobId: await extractBlobId(rendition.walrusPlaylistUri),
            playlistUri: rendition.walrusPlaylistUri,
            segments,
          };
        })
      );

      return {
        videoId: video.id,
        title: video.title,
        createdAt: video.createdAt,
        masterPlaylistBlobId: await extractBlobId(video.walrusMasterUri),
        masterPlaylistUri: video.walrusMasterUri,
        posterBlobId: video.posterWalrusUri ? await extractBlobId(video.posterWalrusUri) : null,
        posterUri: video.posterWalrusUri,
        renditions,
      };
    })
  );

  return result;
}

// Main execution
const args = process.argv.slice(2);
const videoIdIndex = args.indexOf('--video');
const videoId = videoIdIndex !== -1 ? args[videoIdIndex + 1] : undefined;
const jsonOutput = args.includes('--json');

if (jsonOutput) {
  exportBlobIdsJson(videoId)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
} else {
  getVideoBlobs(videoId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
