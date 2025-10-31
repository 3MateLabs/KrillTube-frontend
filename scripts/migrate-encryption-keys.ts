/**
 * Migration Script: Convert root secret-based encryption to per-segment DEKs
 *
 * This script:
 * 1. Fetches all videos with root secrets
 * 2. For each segment, derives the old DEK from root secret
 * 3. Encrypts each DEK with master key
 * 4. Stores encrypted DEK in video_segments.dek_enc
 *
 * Run this BEFORE applying the Prisma migration!
 */

import { prisma } from '@/lib/db';
import { decryptRootSecret } from '@/lib/kms/envelope';
import { deriveSegmentDek } from '@/lib/crypto/keyDerivation';
import { encryptDek } from '@/lib/kms/envelope';
import { exportAesKey } from '@/lib/crypto/primitives';

async function migrateEncryptionKeys() {
  console.log('[Migration] Starting encryption key migration...');

  // Fetch all videos (with root secrets still in DB)
  const videos = await prisma.video.findMany({
    include: {
      renditions: {
        include: {
          segments: true,
        },
      },
    },
  });

  console.log(`[Migration] Found ${videos.length} videos to migrate`);

  for (const video of videos) {
    console.log(`\n[Migration] Processing video: ${video.id}`);

    try {
      // Decrypt root secret
      const rootSecret = await decryptRootSecret(video.rootSecretEnc);
      console.log(`  ✓ Decrypted root secret`);

      let totalSegments = 0;
      let migratedSegments = 0;

      for (const rendition of video.renditions) {
        console.log(`  Processing rendition: ${rendition.name}`);

        for (const segment of rendition.segments) {
          totalSegments++;

          // Derive DEK from root secret (old way)
          const segmentDekKey = await deriveSegmentDek(
            rootSecret,
            video.id,
            rendition.name,
            segment.segIdx
          );

          // Export DEK as raw bytes
          const dekBytes = await exportAesKey(segmentDekKey);

          // Encrypt DEK with master key (new way)
          const dekEncrypted = await encryptDek(dekBytes);

          // Update segment with encrypted DEK
          await prisma.videoSegment.update({
            where: { id: segment.id },
            data: {
              dekEnc: Buffer.from(dekEncrypted),
            },
          });

          migratedSegments++;
        }
      }

      console.log(`  ✓ Migrated ${migratedSegments}/${totalSegments} segments for video ${video.id}`);
    } catch (error) {
      console.error(`  ✗ Failed to migrate video ${video.id}:`, error);
      throw error; // Stop on first error
    }
  }

  console.log(`\n[Migration] ✓ Successfully migrated all ${videos.length} videos`);
  console.log('[Migration] You can now apply the Prisma migration to drop root_secret_enc');
}

// Run migration
migrateEncryptionKeys()
  .catch((error) => {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
