/**
 * Walrus SDK client wrapper for mainnet delete/extend operations
 *
 * This module provides server-side access to Walrus SDK functions that require
 * blockchain interaction (delete/extend). Only works for mainnet videos.
 *
 * IMPORTANT: Transactions must be signed client-side in browser.
 * This module only builds unsigned transactions.
 */

import { WalrusClient } from '@mysten/walrus';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import type { TransactionObjectArgument } from '@mysten/sui/transactions';

const MAINNET_SYSTEM_OBJECT = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';
const MAINNET_PACKAGE_ID = '0x6b8c2a2cf5be98f43e04a6cd7ca9e38d0c8c8a8c8c8c8c8c8c8c8c8c8c8c8c8c'; // TODO: Update with actual mainnet package ID

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
  walCoin?: TransactionObjectArgument;
}

export interface DeleteBlobOptions {
  blobObjectId: string;
}

/**
 * Server-side Walrus SDK client for mainnet operations
 *
 * IMPORTANT: This client only builds unsigned transactions.
 * Signing must happen client-side with user's wallet.
 */
export class WalrusSDKClient {
  private client?: WalrusClient;
  private suiClient?: SuiClient;

  private initialize() {
    if (this.client) return;

    // Initialize Sui client for mainnet
    this.suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

    // Initialize Walrus SDK client
    this.client = new WalrusClient({
      network: 'mainnet',
      suiClient: this.suiClient,
    });

    console.log('[Walrus SDK] Initialized mainnet client');
  }

  /**
   * Get blob metadata from Sui blockchain
   *
   * @param blobObjectId - Sui blob object ID
   * @returns Blob metadata including expiry epoch
   */
  async getBlobMetadata(blobObjectId: string): Promise<WalrusBlobMetadata> {
    this.initialize();

    try {
      const blobObject = await this.suiClient!.getObject({
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
  async calculateExtendCost(size: number, additionalEpochs: number): Promise<bigint> {
    this.initialize();

    try {
      const { storageCost } = await this.client!.storageCost(size, additionalEpochs);
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
  async buildExtendBlobTransaction(options: ExtendBlobOptions) {
    this.initialize();
    return await this.client!.extendBlobTransaction(options);
  }

  /**
   * Build delete blob transaction (client must sign)
   *
   * @param options - Delete options
   * @returns Unsigned transaction block with storage resource transfer
   */
  async buildDeleteBlobTransaction(options: DeleteBlobOptions & { owner: string }) {
    this.initialize();
    return await this.client!.deleteBlobTransaction(options);
  }
}

// Singleton instance for server-side use
export const walrusSDK = new WalrusSDKClient();
