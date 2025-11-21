/**
 * SEAL Decryption Loader
 * Handles downloading and decrypting SEAL-encrypted video segments for subscribers
 */

'use client';

import {
  initializeSealClient,
  createSealSessionKey,
  decryptWithSeal,
} from '@/lib/seal';
import { SEAL_CONFIG } from '@/lib/seal/config';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

export interface SealSegmentMetadata {
  segIdx: number;
  sealDocumentId: string;
  sealBlobId: string;
  walrusUri: string;
  duration: number;
}

export interface SealVideoMetadata {
  videoId: string;
  channelId: string;
  creatorAddress: string;
  segments: SealSegmentMetadata[];
}

/**
 * Load and decrypt a SEAL-encrypted video segment
 *
 * @param segmentMetadata - Segment metadata from database
 * @param userKeypair - User's wallet keypair for signing
 * @param channelId - Creator's channel ID for seal_approve
 * @returns Decrypted segment data
 */
export async function loadSealSegment(
  segmentMetadata: SealSegmentMetadata,
  userKeypair: Ed25519Keypair,
  channelId: string
): Promise<Uint8Array> {
  const packageId = SEAL_CONFIG.PACKAGE_ID;

  if (!packageId || packageId === '0x0') {
    throw new Error('SEAL package ID not configured');
  }

  console.log('[SEAL Loader] Loading segment:', {
    segIdx: segmentMetadata.segIdx,
    documentId: segmentMetadata.sealDocumentId.slice(0, 16) + '...',
    blobId: segmentMetadata.sealBlobId,
  });

  try {
    // Step 1: Download encrypted segment from Walrus
    console.log('[SEAL Loader] Downloading encrypted segment from Walrus...');
    const response = await fetch(segmentMetadata.walrusUri);

    if (!response.ok) {
      throw new Error(`Failed to download segment: ${response.statusText}`);
    }

    const encryptedData = new Uint8Array(await response.arrayBuffer());
    console.log('[SEAL Loader] Downloaded encrypted segment:', encryptedData.length, 'bytes');

    // Step 2: Initialize SEAL client
    const suiClient = new SuiClient({ url: SEAL_CONFIG.RPC_URL });
    const sealClient = initializeSealClient({
      network: SEAL_CONFIG.NETWORK,
      packageId,
      suiClient,
    });

    console.log('[SEAL Loader] SEAL client initialized');

    // Step 3: Create session key (10 minute TTL)
    console.log('[SEAL Loader] Creating session key...');
    const sessionKey = await createSealSessionKey(
      userKeypair,
      packageId,
      suiClient,
      10 // 10 minute TTL
    );

    console.log('[SEAL Loader] Session key created');

    // Step 4: Build seal_approve transaction to prove subscription
    console.log('[SEAL Loader] Building seal_approve transaction...');
    const tx = new Transaction();

    // Convert document ID to vector<u8> for Move
    const documentIdBytes = Uint8Array.from(
      Buffer.from(segmentMetadata.sealDocumentId.replace('0x', ''), 'hex')
    );

    tx.moveCall({
      target: `${packageId}::creator_channel::seal_approve`,
      arguments: [
        tx.pure.vector('u8', Array.from(documentIdBytes)),
        tx.object(channelId), // Creator's channel
        tx.object('0x6'), // Clock object
      ],
    });

    // Build transaction bytes (without executing)
    const txBytes = await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    });

    console.log('[SEAL Loader] seal_approve transaction built');

    // Step 5: Decrypt with SEAL
    // The SEAL key servers will verify the seal_approve transaction on-chain
    // before releasing the key shares for decryption
    console.log('[SEAL Loader] Decrypting with SEAL...');
    const decryptedData = await decryptWithSeal(
      sealClient,
      encryptedData,
      sessionKey,
      txBytes
    );

    console.log('[SEAL Loader] ✓ Segment decrypted:', decryptedData.length, 'bytes');
    return decryptedData;

  } catch (error) {
    console.error('[SEAL Loader] Decryption failed:', error);

    if (error instanceof Error) {
      // Provide user-friendly error messages
      if (error.message.includes('NOT_SUBSCRIBED')) {
        throw new Error('You are not subscribed to this channel. Please subscribe to watch this video.');
      } else if (error.message.includes('INVALID_PREFIX')) {
        throw new Error('Invalid video access. This video may be corrupted.');
      } else if (error.message.includes('session key')) {
        throw new Error('Session expired. Please refresh the page and try again.');
      }
    }

    throw new Error(`Failed to decrypt segment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Preload and decrypt multiple segments in parallel
 * Useful for buffering ahead during playback
 *
 * @param segments - Array of segment metadata
 * @param userKeypair - User's wallet keypair
 * @param channelId - Creator's channel ID
 * @param maxParallel - Maximum parallel downloads (default: 3)
 * @returns Array of decrypted segments
 */
export async function loadSealSegmentsBatch(
  segments: SealSegmentMetadata[],
  userKeypair: Ed25519Keypair,
  channelId: string,
  maxParallel: number = 3
): Promise<Map<number, Uint8Array>> {
  console.log(`[SEAL Loader] Batch loading ${segments.length} segments (${maxParallel} parallel)...`);

  const results = new Map<number, Uint8Array>();

  // Process segments in batches
  for (let i = 0; i < segments.length; i += maxParallel) {
    const batch = segments.slice(i, i + maxParallel);

    const batchResults = await Promise.all(
      batch.map(async (segment) => {
        try {
          const data = await loadSealSegment(segment, userKeypair, channelId);
          return { segIdx: segment.segIdx, data };
        } catch (error) {
          console.error(`[SEAL Loader] Failed to load segment ${segment.segIdx}:`, error);
          throw error;
        }
      })
    );

    // Store results
    batchResults.forEach(({ segIdx, data }) => {
      results.set(segIdx, data);
    });

    console.log(`[SEAL Loader] Loaded batch ${i / maxParallel + 1}/${Math.ceil(segments.length / maxParallel)}`);
  }

  console.log(`[SEAL Loader] ✓ All ${segments.length} segments loaded`);
  return results;
}

/**
 * Create a streaming loader for SEAL segments
 * Returns segments on-demand as they're requested by the player
 *
 * @param videoMetadata - Complete video metadata
 * @param userKeypair - User's wallet keypair
 * @returns Function to load segments by index
 */
export function createSealSegmentLoader(
  videoMetadata: SealVideoMetadata,
  userKeypair: Ed25519Keypair
): (segIdx: number) => Promise<Uint8Array> {
  // Cache for decoded segments
  const cache = new Map<number, Uint8Array>();

  // Session key cache (reuse for 10 minutes)
  let sessionKeyCache: {
    key: any;
    expiresAt: number;
  } | null = null;

  return async (segIdx: number): Promise<Uint8Array> => {
    // Check cache first
    if (cache.has(segIdx)) {
      console.log(`[SEAL Loader] Segment ${segIdx} loaded from cache`);
      return cache.get(segIdx)!;
    }

    // Find segment metadata
    const segment = videoMetadata.segments.find(s => s.segIdx === segIdx);
    if (!segment) {
      throw new Error(`Segment ${segIdx} not found in video metadata`);
    }

    // Load and decrypt
    const data = await loadSealSegment(
      segment,
      userKeypair,
      videoMetadata.channelId
    );

    // Cache the result
    cache.set(segIdx, data);

    // Limit cache size (keep last 10 segments)
    if (cache.size > 10) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    return data;
  };
}

/**
 * Check if user has access to a SEAL-encrypted video
 * Validates subscription without downloading/decrypting
 *
 * @param channelId - Creator's channel ID
 * @param userAddress - User's wallet address
 * @returns true if subscribed, false otherwise
 */
export async function checkSealAccess(
  channelId: string,
  userAddress: string
): Promise<boolean> {
  const packageId = SEAL_CONFIG.PACKAGE_ID;
  const suiClient = new SuiClient({ url: SEAL_CONFIG.RPC_URL });

  try {
    // Use devInspectTransactionBlock to check subscription status
    // without executing a transaction
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::creator_channel::is_subscribed`,
      arguments: [
        tx.object(channelId),
        tx.pure.address(userAddress),
      ],
    });

    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress,
    });

    // Parse the result
    if (result.results && result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues[0]) {
        // First byte is the boolean result
        return returnValues[0][0][0] === 1;
      }
    }

    return false;
  } catch (error) {
    console.error('[SEAL Loader] Failed to check access:', error);
    return false;
  }
}
