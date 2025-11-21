/**
 * Unified Upload Orchestrator
 * Handles all three encryption types:
 * - per-video: DEK encryption only
 * - subscription-acl: SEAL encryption only
 * - both: DEK + SEAL in parallel
 */

'use client';

import { transcodeVideo } from '@/lib/transcode/clientTranscode';
import {
  uploadVideoClientSide,
  ClientUploadResult,
  UploadProgress,
} from './clientUploadOrchestrator';
import { uploadVideoWithSEAL, SealUploadResult } from './sealUploadOrchestrator';

export type EncryptionType = 'per-video' | 'subscription-acl' | 'both';

export interface UnifiedUploadOptions {
  encryptionType: EncryptionType;
  creatorSealObjectId?: string; // Required for subscription-acl and both
  network?: 'mainnet' | 'testnet';
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UnifiedUploadResult {
  encryptionType: EncryptionType;
  dekUpload?: ClientUploadResult; // Present for per-video and both
  sealUpload?: SealUploadResult; // Present for subscription-acl and both
}

/**
 * Upload video with specified encryption type
 */
export async function uploadVideoUnified(
  file: File,
  qualities: string[],
  signAndExecute: any,
  walletAddress: string,
  options: UnifiedUploadOptions
): Promise<UnifiedUploadResult> {
  const { encryptionType, creatorSealObjectId, network = 'mainnet', epochs = 5, onProgress } = options;

  console.log('[Unified Upload] Starting upload with encryption type:', encryptionType);

  // Validate SEAL requirements
  if ((encryptionType === 'subscription-acl' || encryptionType === 'both') && !creatorSealObjectId) {
    throw new Error('creatorSealObjectId is required for subscription-acl or both encryption types');
  }

  // Step 1: Transcode video (shared by all encryption types)
  onProgress?.({
    stage: 'transcoding',
    percent: 5,
    message: 'Transcoding video...',
  });

  const transcoded = await transcodeVideo(file, {
    qualities,
    segmentDuration: 4,
    onProgress: (p) => {
      const overallPercent = 5 + (p.overall / 100) * 25; // 5-30%
      onProgress?.({
        stage: 'transcoding',
        percent: overallPercent,
        message: p.message,
      });
    },
  });

  console.log(`[Unified Upload] Transcoding complete: ${transcoded.segments.length} segments`);

  // Step 2: Upload based on encryption type
  const result: UnifiedUploadResult = {
    encryptionType,
  };

  switch (encryptionType) {
    case 'per-video': {
      // DEK encryption only
      console.log('[Unified Upload] Using per-video (DEK) encryption');
      onProgress?.({
        stage: 'encrypting',
        percent: 30,
        message: 'Starting DEK encryption...',
      });

      result.dekUpload = await uploadVideoClientSide(
        file,
        qualities,
        signAndExecute,
        walletAddress,
        {
          network,
          epochs,
          onProgress,
        }
      );

      console.log('[Unified Upload] ✓ DEK upload complete');
      break;
    }

    case 'subscription-acl': {
      // SEAL encryption only
      console.log('[Unified Upload] Using subscription-acl (SEAL) encryption');
      onProgress?.({
        stage: 'encrypting',
        percent: 30,
        message: 'Starting SEAL encryption...',
      });

      result.sealUpload = await uploadVideoWithSEAL(
        transcoded,
        creatorSealObjectId!,
        qualities,
        signAndExecute,
        walletAddress,
        {
          network,
          epochs,
          onProgress,
        }
      );

      console.log('[Unified Upload] ✓ SEAL upload complete');
      break;
    }

    case 'both': {
      // Both DEK and SEAL in parallel
      console.log('[Unified Upload] Using BOTH (DEK + SEAL) encryption');
      onProgress?.({
        stage: 'encrypting',
        percent: 30,
        message: 'Starting parallel encryption (DEK + SEAL)...',
      });

      // Run both uploads in parallel
      const [dekResult, sealResult] = await Promise.all([
        uploadVideoClientSide(file, qualities, signAndExecute, walletAddress, {
          network,
          epochs,
          onProgress: (progress) => {
            // Adjust progress for DEK path (30-65%)
            const adjustedPercent = 30 + ((progress.percent - 30) / 70) * 35;
            onProgress?.({
              ...progress,
              percent: adjustedPercent,
              message: `[DEK] ${progress.message}`,
            });
          },
        }),
        uploadVideoWithSEAL(transcoded, creatorSealObjectId!, qualities, signAndExecute, walletAddress, {
          network,
          epochs,
          onProgress: (progress) => {
            // Adjust progress for SEAL path (30-65%)
            const adjustedPercent = 30 + ((progress.percent - 30) / 70) * 35;
            onProgress?.({
              ...progress,
              percent: adjustedPercent,
              message: `[SEAL] ${progress.message}`,
            });
          },
        }),
      ]);

      result.dekUpload = dekResult;
      result.sealUpload = sealResult;

      console.log('[Unified Upload] ✓ Both uploads complete');
      console.log('[Unified Upload]   DEK Video ID:', dekResult.videoId);
      console.log('[Unified Upload]   SEAL Video ID:', sealResult.videoId);
      break;
    }

    default:
      throw new Error(`Invalid encryption type: ${encryptionType}`);
  }

  onProgress?.({
    stage: 'complete',
    percent: 100,
    message: 'Upload complete!',
  });

  console.log('[Unified Upload] ✓ All uploads complete');
  return result;
}
