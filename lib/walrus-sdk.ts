/**
 * Walrus SDK client for direct WAL token payments
 * Uses @mysten/walrus SDK for fully decentralized uploads
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Signer } from '@mysten/sui/cryptography';
import { readFile } from 'fs/promises';
import { createSuiClientWithRateLimitHandling } from '@/lib/suiClientRateLimitSwitch';

// Get configuration from environment
const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK || 'mainnet') as 'testnet' | 'mainnet';
const epochs = process.env.NEXT_PUBLIC_WALRUS_EPOCHS ? parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS, 10) : 200;
const suiRpcUrl = process.env.NEXT_PUBLIC_SUI_RPC_URL || getFullnodeUrl(network);

// Lazy initialization to avoid loading WASM on server
let _suiWalrusClient: any = null;

async function getSuiWalrusClient() {
  if (!_suiWalrusClient) {
    // Only initialize when actually needed (browser only)
    // Import walrus dynamically to avoid loading WASM during module init
    const { walrus } = await import('@mysten/walrus');

    // For $extend pattern, use plain SuiClient (not rate-limited)
    // Rate limiting is handled by WalrusClient constructor elsewhere
    _suiWalrusClient = (new SuiClient({
      url: suiRpcUrl,
    }) as any).extend(walrus({ network }));

    console.log(`[WalrusSDK] Initialized with ${network}`);
    console.log(`[WalrusSDK] Sui RPC: ${suiRpcUrl}`);
    console.log(`[WalrusSDK] Default epochs: ${epochs}`);
    console.log(`[WalrusSDK] Payment: WAL tokens via Sui transactions`);
  }
  return _suiWalrusClient;
}

// Export for backward compatibility - wraps async client
export const suiWalrusClient = {
  async storageCost(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.storageCost(...args);
  },
  async writeBlob(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.writeBlob(...args);
  },
  async writeQuilt(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.writeQuilt(...args);
  },
  async readBlob(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.readBlob(...args);
  },
  async getBlobMetadata(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.getBlobMetadata(...args);
  },
  async extendBlobTransaction(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.extendBlobTransaction(...args);
  },
  async deleteBlobTransaction(...args: any[]) {
    const client = await getSuiWalrusClient();
    return client.deleteBlobTransaction(...args);
  },
};

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

// ============================================================================
// Delete and Extend Functionality (Mainnet Only)
// ============================================================================

export interface WalrusBlobMetadata {
  blobObjectId: string;
  blobId: string;
  endEpoch: number;
  size: string;
  deletable: boolean;
}

export interface ExtendBlobOptions {
  blobObjectId: string;
  epochs: number;
  walCoin?: string;
}

export interface DeleteBlobOptions {
  blobObjectId: string;
}

/**
 * Get blob metadata from Sui blockchain
 *
 * @param blobObjectId - Sui blob object ID
 * @returns Blob metadata including expiry epoch
 */
export async function getBlobMetadata(blobObjectId: string): Promise<WalrusBlobMetadata> {
  try {
    // Use rate-limited SuiClient with automatic RPC endpoint rotation
    const suiClient = createSuiClientWithRateLimitHandling();
    const blobObject = await suiClient.getObject({
      id: blobObjectId,
      options: { showContent: true },
    });

    if (!blobObject.data?.content || blobObject.data.content.dataType !== 'moveObject') {
      throw new Error('Invalid blob object');
    }

    const fields = blobObject.data.content.fields as any;

    return {
      blobObjectId,
      blobId: fields.blob_id,
      endEpoch: parseInt(fields.storage?.fields?.end_epoch || '0'),
      size: fields.size,
      deletable: fields.deletable,
    };
  } catch (error) {
    throw new Error(`Failed to fetch blob metadata: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Calculate cost to extend blob storage
 *
 * @param size - Blob size in bytes
 * @param additionalEpochs - Number of epochs to extend
 * @returns Cost in MIST (1 WAL = 1_000_000_000 MIST)
 */
export async function calculateExtendCost(size: number, additionalEpochs: number): Promise<bigint> {
  try {
    const { storageCost } = await suiWalrusClient.storageCost(size, additionalEpochs);
    return storageCost;
  } catch (error) {
    throw new Error(`Failed to calculate extend cost: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Build extend blob transaction (client must sign)
 *
 * @param options - Extend options
 * @returns Unsigned transaction block
 */
export async function buildExtendBlobTransaction(options: ExtendBlobOptions) {
  return await suiWalrusClient.extendBlobTransaction(options);
}

/**
 * Build delete blob transaction (client must sign)
 *
 * @param options - Delete options
 * @returns Unsigned transaction block with storage resource transfer
 */
export async function buildDeleteBlobTransaction(options: DeleteBlobOptions & { owner: string }) {
  return await suiWalrusClient.deleteBlobTransaction(options);
}

// Legacy singleton export for compatibility with register-video route
export const walrusSDK = {
  getBlobMetadata,
  calculateExtendCost,
  buildExtendBlobTransaction,
  buildDeleteBlobTransaction,
};
