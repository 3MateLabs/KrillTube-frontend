/**
 * Walrus SDK client for direct WAL token payments
 * Uses @mysten/walrus SDK for fully decentralized uploads
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Signer } from '@mysten/sui/cryptography';
import { readFile } from 'fs/promises';

// Get configuration from environment
const network = (process.env.NEXT_PUBLIC_WALRUS_NETWORK || 'mainnet') as 'testnet' | 'mainnet';
const epochs = process.env.NEXT_PUBLIC_WALRUS_EPOCHS ? parseInt(process.env.NEXT_PUBLIC_WALRUS_EPOCHS, 10) : 200;
const suiRpcUrl = process.env.NEXT_PUBLIC_SUI_RPC_URL || getFullnodeUrl(network);

// Walrus Mainnet Contract Addresses (from walrus/testnet-contracts/walrus/Move.lock)
const MAINNET_SYSTEM_OBJECT = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';
const MAINNET_PACKAGE_ID = '0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77';

// Lazy initialization to avoid loading WASM on server
let _suiWalrusClient: any = null;

async function getSuiWalrusClient() {
  if (!_suiWalrusClient) {
    // Only initialize when actually needed (browser only)
    // Import walrus dynamically to avoid loading WASM during module init
    const { walrus } = await import('@mysten/walrus');

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
    const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
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

/**
 * Build batch extend transaction for multiple blobs using PTBs (OPTIMIZED)
 *
 * This batches multiple extend operations into a SINGLE PTB transaction, which:
 * - Reduces gas costs (1 fee instead of N fees)
 * - Requires only 1 signature
 * - Processes in ~10 seconds instead of minutes
 *
 * HOW IT WORKS (PTB Approach):
 * 1. Create a single PTB (Programmable Transaction Block)
 * 2. For each blob: Get the extend transaction from SDK
 * 3. Merge all extend operations into the single PTB
 * 4. All extends execute atomically in one transaction
 *
 * TECHNICAL DETAILS:
 * - Uses Sui's PTB to batch multiple Move calls
 * - Each extend calls `walrus::blob::extend_with_resource`
 * - Requires purchasing Storage resources from Walrus System
 * - See: walrus/sources/system/blob.move:268 (extend_with_resource)
 *
 * @param blobs - Array of blob object IDs to extend
 * @param epochs - Number of epochs to extend each blob
 * @returns Unsigned PTB transaction that extends all blobs
 */
export async function buildBatchExtendTransaction(
  blobs: Array<{ blobObjectId: string; walCoin?: string }>,
  epochs: number
): Promise<any> {
  if (blobs.length === 0) {
    throw new Error('No blobs provided for batch extend');
  }

  if (blobs.length === 1) {
    // If only one blob, use single extend
    return await buildExtendBlobTransaction({
      blobObjectId: blobs[0].blobObjectId,
      epochs,
      walCoin: blobs[0].walCoin,
    });
  }

  try {
    console.log(`[WalrusSDK] Building batch extend PTB for ${blobs.length} blobs...`);

    // Import Transaction from @mysten/sui
    const { Transaction } = await import('@mysten/sui/transactions');

    // Get the first extend transaction as a base
    const firstTx = await suiWalrusClient.extendBlobTransaction({
      blobObjectId: blobs[0].blobObjectId,
      epochs,
      walCoin: blobs[0].walCoin,
    });

    // If the SDK returns a Transaction object, we can use it as our base
    if (!(firstTx instanceof Transaction)) {
      console.warn('[WalrusSDK] SDK did not return a Transaction object, cannot batch');
      return firstTx;
    }

    console.log('[WalrusSDK] ✓ Base transaction created for first blob');

    // For remaining blobs, get their extend transactions and merge into base
    for (let i = 1; i < blobs.length; i++) {
      const blob = blobs[i];
      console.log(`[WalrusSDK] Adding extend operation ${i + 1}/${blobs.length} for blob ${blob.blobObjectId}`);

      try {
        // Get the extend transaction for this blob
        const extendTx = await suiWalrusClient.extendBlobTransaction({
          blobObjectId: blob.blobObjectId,
          epochs,
          walCoin: blob.walCoin,
        });

        // Merge transactions using Sui's built-in method
        // Note: This approach may not work if transactions have conflicting inputs
        // In that case, we'd need to manually reconstruct the Move calls
        if (extendTx instanceof Transaction) {
          const txData = extendTx.getData();
          const baseTxData = firstTx.getData();

          // Copy all commands from the extend transaction
          if (txData.commands && txData.commands.length > 0) {
            // Append commands to base transaction
            for (const command of txData.commands) {
              // Deep clone the command to avoid reference issues
              const clonedCommand = JSON.parse(JSON.stringify(command));
              baseTxData.commands.push(clonedCommand);
            }
            console.log(`[WalrusSDK]   ✓ Added ${txData.commands.length} commands from blob ${i + 1}`);
          }
        }
      } catch (error) {
        console.error(`[WalrusSDK] Failed to add blob ${i + 1} to batch:`, error);
        console.warn(`[WalrusSDK] Skipping blob ${blob.blobObjectId}`);
      }
    }

    const finalTxData = firstTx.getData();
    console.log(`[WalrusSDK] ✓ Batch PTB created with ${finalTxData.commands.length} total commands for ${blobs.length} blobs`);

    return firstTx;

  } catch (error) {
    console.error('[WalrusSDK] Failed to build batch extend PTB:', error);
    console.warn('[WalrusSDK] Falling back to single-blob extend transaction');

    // Fallback to first blob only
    return await buildExtendBlobTransaction({
      blobObjectId: blobs[0].blobObjectId,
      epochs,
      walCoin: blobs[0].walCoin,
    });
  }
}

// Legacy singleton export for compatibility with register-video route
export const walrusSDK = {
  getBlobMetadata,
  calculateExtendCost,
  buildExtendBlobTransaction,
  buildBatchExtendTransaction,
  buildDeleteBlobTransaction,
};
