/**
 * Walrus SDK client for direct WAL token payments
 * Uses @mysten/walrus SDK for fully decentralized uploads
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Signer } from '@mysten/sui/cryptography';
import { readFile } from 'fs/promises';

// Get configuration from environment
const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK || 'mainnet') as 'testnet' | 'mainnet';
const epochs = process.env.NEXT_PUBLIC_WALRUS_EPOCHS ? parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS, 10) : 200;
const suiRpcUrl = process.env.NEXT_PUBLIC_SUI_RPC_URL || getFullnodeUrl(network);

// Create Sui client with Walrus extension
export const suiWalrusClient = (new SuiClient({
  url: suiRpcUrl,
}) as any).extend(walrus({ network }));

console.log(`[WalrusSDK] Initialized with ${network}`);
console.log(`[WalrusSDK] Sui RPC: ${suiRpcUrl}`);
console.log(`[WalrusSDK] Default epochs: ${epochs}`);
console.log(`[WalrusSDK] Payment: WAL tokens via Sui transactions`);

/**
 * Get signer from environment (mnemonic or private key)
 */
export function getSigner(): Signer {
  const mnemonic = process.env.WALLET_MNEMONIC;
  const privateKey = process.env.WALLET_PRIVATE_KEY;

  if (mnemonic) {
    return Ed25519Keypair.deriveKeypair(mnemonic);
  } else if (privateKey) {
    const keyBytes = Buffer.from(privateKey, 'hex');
    return Ed25519Keypair.fromSecretKey(keyBytes);
  } else {
    throw new Error(
      'No wallet configured. Set WALLET_MNEMONIC or WALLET_PRIVATE_KEY in .env'
    );
  }
}

/**
 * Get WAL balance for an address
 */
export async function getWalBalance(address: string): Promise<bigint> {
  try {
    // TODO: Query WAL coin balance from Sui
    // This requires knowing the WAL coin type
    // For now, return placeholder
    console.warn('[WalrusSDK] WAL balance checking not implemented yet');
    return BigInt(0);
  } catch (error) {
    console.error('[WalrusSDK] Error getting WAL balance:', error);
    return BigInt(0);
  }
}

/**
 * Upload a single blob using SDK with WAL payment
 */
export async function uploadBlobSDK(
  data: Uint8Array,
  options?: {
    epochs?: number;
    deletable?: boolean;
    signer?: Signer;
  }
): Promise<{
  blobId: string;
  blobObject: any;
  txDigest: string;
}> {
  const signer = options?.signer || getSigner();
  const epochsToUse = options?.epochs || epochs;
  const deletable = options?.deletable ?? true;

  console.log(`[WalrusSDK] Uploading blob (${data.length} bytes) with WAL payment...`);
  console.log(`[WalrusSDK] Epochs: ${epochsToUse}, Deletable: ${deletable}`);

  // Calculate cost before upload
  const cost = await suiWalrusClient.storageCost(data.length, epochsToUse);
  const costSui = (Number(cost.totalCost) / 1_000_000_000).toFixed(6);
  console.log(`[WalrusSDK] Cost: ${costSui} WAL (${cost.totalCost} MIST)`);

  try {
    const result = await suiWalrusClient.writeBlob({
      blob: data,
      deletable,
      epochs: epochsToUse,
      signer,
    });

    console.log(`[WalrusSDK] ✓ Blob uploaded: ${result.blobId}`);
    console.log(`[WalrusSDK] ✓ Object ID: ${result.blobObject.id.id}`);
    console.log(`[WalrusSDK] ✓ Paid ${costSui} WAL from wallet`);

    return {
      blobId: result.blobId,
      blobObject: result.blobObject,
      txDigest: '', // Note: writeBlob doesn't return tx digest directly
    };
  } catch (error) {
    console.error('[WalrusSDK] Upload failed:', error);
    throw new Error(
      `Walrus SDK upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Upload multiple blobs as a quilt using SDK with WAL payment
 */
export async function uploadQuiltSDK(
  blobs: Array<{
    contents: Uint8Array;
    identifier: string;
    tags?: Record<string, string>;
  }>,
  options?: {
    epochs?: number;
    deletable?: boolean;
    signer?: Signer;
  }
): Promise<{
  blobId: string;
  blobObject: any;
  index: {
    patches: Array<{
      patchId: string;
      identifier: string;
      startIndex: number;
      endIndex: number;
      tags: Record<string, string>;
    }>;
  };
}> {
  const signer = options?.signer || getSigner();
  const epochsToUse = options?.epochs || epochs;
  const deletable = options?.deletable ?? true;

  // Calculate total size
  const totalSize = blobs.reduce((sum, blob) => sum + blob.contents.length, 0);

  console.log(`[WalrusSDK] Uploading quilt with ${blobs.length} files (${totalSize} bytes)...`);
  console.log(`[WalrusSDK] Epochs: ${epochsToUse}, Deletable: ${deletable}`);

  // Calculate cost before upload
  const cost = await suiWalrusClient.storageCost(totalSize, epochsToUse);
  const costSui = (Number(cost.totalCost) / 1_000_000_000).toFixed(6);
  console.log(`[WalrusSDK] Cost: ${costSui} WAL (${cost.totalCost} MIST)`);

  try {
    const result = await suiWalrusClient.writeQuilt({
      blobs,
      deletable,
      epochs: epochsToUse,
      signer,
    });

    console.log(`[WalrusSDK] ✓ Quilt uploaded: ${result.blobId}`);
    console.log(`[WalrusSDK] ✓ ${result.index.patches.length} patches created`);
    console.log(`[WalrusSDK] ✓ Paid ${costSui} WAL from wallet`);

    return result;
  } catch (error) {
    console.error('[WalrusSDK] Quilt upload failed:', error);
    throw new Error(
      `Walrus SDK quilt upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Upload encrypted video segments using SDK
 * This is the main function for KrillTube video uploads
 */
export async function uploadEncryptedVideoSDK(files: {
  segments: Array<{ path: string; identifier: string }>;
  playlists: Array<{ content: string; identifier: string }>;
  poster?: string;
}): Promise<{
  segmentPatchIds: Map<string, string>;
  playlistPatchIds: Map<string, string>;
  posterPatchId?: string;
  totalCost: string; // In WAL
}> {
  console.log(`[WalrusSDK] Starting encrypted video upload with WAL payment...`);

  // Step 1: Upload segments as quilt
  const segmentBlobs = await Promise.all(
    files.segments.map(async (seg) => ({
      contents: await readFile(seg.path),
      identifier: seg.identifier,
    }))
  );

  // Add poster if exists
  if (files.poster) {
    segmentBlobs.push({
      contents: await readFile(files.poster),
      identifier: 'poster',
    });
  }

  const segmentQuilt = await uploadQuiltSDK(segmentBlobs);

  // Build segment patch ID map
  const segmentPatchIds = new Map<string, string>();
  for (const patch of segmentQuilt.index.patches) {
    segmentPatchIds.set(patch.identifier, patch.patchId);
  }

  // Step 2: Upload playlists as quilt
  const playlistBlobs = files.playlists.map((pl) => ({
    contents: new TextEncoder().encode(pl.content),
    identifier: pl.identifier,
  }));

  const playlistQuilt = await uploadQuiltSDK(playlistBlobs);

  // Build playlist patch ID map
  const playlistPatchIds = new Map<string, string>();
  for (const patch of playlistQuilt.index.patches) {
    playlistPatchIds.set(patch.identifier, patch.patchId);
  }

  // Calculate total cost
  const segmentCost = await suiWalrusClient.storageCost(
    segmentBlobs.reduce((sum, b) => sum + b.contents.length, 0),
    epochs
  );
  const playlistCost = await suiWalrusClient.storageCost(
    playlistBlobs.reduce((sum, b) => sum + b.contents.length, 0),
    epochs
  );

  const totalCostMist = segmentCost.totalCost + playlistCost.totalCost;
  const totalCost = (Number(totalCostMist) / 1_000_000_000).toFixed(6);

  console.log(`[WalrusSDK] ✓ Video upload complete!`);
  console.log(`[WalrusSDK] ✓ Segments: ${segmentPatchIds.size} patches`);
  console.log(`[WalrusSDK] ✓ Playlists: ${playlistPatchIds.size} patches`);
  console.log(`[WalrusSDK] ✓ Total cost: ${totalCost} WAL`);

  return {
    segmentPatchIds,
    playlistPatchIds,
    posterPatchId: files.poster ? segmentPatchIds.get('poster') : undefined,
    totalCost,
  };
}

/**
 * Read blob using SDK (for verification)
 */
export async function readBlobSDK(blobId: string): Promise<Uint8Array> {
  console.log(`[WalrusSDK] Reading blob: ${blobId}`);
  const data = await suiWalrusClient.readBlob({ blobId });
  console.log(`[WalrusSDK] ✓ Read ${data.length} bytes`);
  return data;
}

/**
 * Get blob metadata using SDK
 */
export async function getBlobMetadataSDK(blobId: string) {
  console.log(`[WalrusSDK] Getting metadata for blob: ${blobId}`);
  const metadata = await suiWalrusClient.getBlobMetadata({ blobId });
  return metadata;
}
