/**
 * Custom hls.js loader for SEAL-encrypted video segments
 *
 * Extends hls.js loader to:
 * - Intercept segment downloads
 * - Fetch SEAL metadata from server
 * - Download encrypted segments from Walrus
 * - Decrypt using SEAL threshold encryption with session key
 * - Handle errors and retries
 */

'use client';

import type { SessionKey } from '@mysten/seal';
import { initializeSealClient, decryptWithSeal } from '@/lib/seal';
import { SEAL_CONFIG } from '@/lib/seal/config';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import { createSuiClientWithRateLimitHandling } from '@/lib/suiClientRateLimitSwitch';

export interface SealDecryptingLoaderConfig {
  videoId: string;
  channelId: string;
  packageId: string;
  sessionKey: SessionKey;
  maxRetries?: number;
  retryDelay?: number;
  network?: 'mainnet' | 'testnet';
}

/**
 * Custom loader that decrypts SEAL segments before passing to hls.js
 */
export class SealDecryptingLoader {
  private config: SealDecryptingLoaderConfig;
  private context: any = null;
  private callbacks: any = null;
  private abortController: AbortController | null = null;
  private retryCount: number = 0;
  private _stats: any = {
    aborted: false,
    loaded: 0,
    retry: 0,
    total: 0,
    chunkCount: 0,
    bwEstimate: 0,
    loading: {
      start: 0,
      first: 0,
      end: 0,
    },
    parsing: {
      start: 0,
      end: 0,
    },
    buffering: {
      start: 0,
      first: 0,
      end: 0,
    },
  };

  constructor(hlsConfig: any) {
    // HLS.js passes its config as the first parameter
    // Extract our SEAL config from it
    const sealConfig = hlsConfig.sealLoaderConfig;

    if (!sealConfig) {
      throw new Error('SEAL loader config not found in HLS config');
    }

    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      network: 'mainnet',
      ...sealConfig,
    };

    console.log('[SealDecryptingLoader] Initialized with config:', {
      videoId: this.config.videoId,
      channelId: this.config.channelId,
      hasSessionKey: !!this.config.sessionKey,
    });
  }

  /**
   * Get loader statistics
   */
  getResponseHeader(name: string): string | null {
    return null;
  }

  /**
   * Load and decrypt a SEAL segment
   */
  load(
    context: any,
    config: any,
    callbacks: any
  ): void {
    this.context = context;
    this.callbacks = callbacks;
    this.abortController = new AbortController();
    this.retryCount = 0;

    // Reset stats
    this._stats = {
      aborted: false,
      loaded: 0,
      retry: 0,
      total: 0,
      chunkCount: 0,
      bwEstimate: 0,
      loading: {
        start: Date.now(),
        first: 0,
        end: 0,
      },
      parsing: {
        start: 0,
        end: 0,
      },
      buffering: {
        start: 0,
        first: 0,
        end: 0,
      },
    };

    // Start loading
    this.loadWithRetry().catch((error) => {
      console.error('[SealDecryptingLoader] Load failed:', error);
      callbacks.onError?.({ code: 0, text: error.message }, context, error);
    });
  }

  /**
   * Load with retry logic
   */
  private async loadWithRetry(): Promise<void> {
    while (this.retryCount <= (this.config.maxRetries || 3)) {
      try {
        await this.loadAndDecrypt();
        return; // Success
      } catch (error) {
        console.error('[SealDecryptingLoader] Load failed:', error);

        if (this.retryCount < (this.config.maxRetries || 3)) {
          this.retryCount++;
          console.log(`[SealDecryptingLoader] Retrying (${this.retryCount}/${this.config.maxRetries || 3})...`);
          this._stats.retry = this.retryCount;
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay || 1000));
        } else {
          throw error; // Max retries reached
        }
      }
    }
  }

  /**
   * Load and decrypt the segment
   */
  private async loadAndDecrypt(): Promise<void> {
    const { url, type } = this.context;

    console.log('[SealDecryptingLoader] Loading:', { url, type });

    // For playlists, just fetch them normally (they're not encrypted)
    if (type === 'manifest' || url.endsWith('.m3u8')) {
      console.log('[SealDecryptingLoader] Loading playlist (unencrypted)');
      return this.loadPlaintext();
    }

    // For segments, use SEAL decryption
    if (type === 'level') {
      console.log('[SealDecryptingLoader] Loading SEAL-encrypted segment');
      return this.loadSealSegment();
    }

    // Unknown type, load as plaintext
    console.log('[SealDecryptingLoader] Unknown type, loading as plaintext');
    return this.loadPlaintext();
  }

  /**
   * Load plaintext content (playlists)
   */
  private async loadPlaintext(): Promise<void> {
    const response = await fetch(this.context.url, {
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    this._stats.loaded = data.length;
    this._stats.total = data.length;
    this._stats.loading.end = Date.now();

    this.callbacks.onSuccess?.(
      {
        url: this.context.url,
        data,
      },
      this._stats,
      this.context,
      null
    );
  }

  /**
   * Load and decrypt SEAL-encrypted segment
   */
  private async loadSealSegment(): Promise<void> {
    const url = this.context.url;

    // Extract segment info from URL
    // URL format: https://aggregator.../by-quilt-patch-id/{blobId}@{start}:{end}
    const match = url.match(/\/by-quilt-patch-id\/([^@]+)@(\d+):(\d+)/);
    if (!match) {
      throw new Error('Invalid segment URL format');
    }

    const [, blobId] = match;

    // Parse segment index from frag data
    const segIdx = this.context.frag?.sn ?? -1;
    const rendition = this.getRenditionName();

    console.log('[SealDecryptingLoader] Fetching SEAL metadata:', {
      videoId: this.config.videoId,
      rendition,
      segIdx
    });

    // Fetch SEAL metadata from our API
    const metadataResponse = await fetch(
      `/api/v1/seal/segment?videoId=${this.config.videoId}&segIdx=${segIdx}`,
      {
        signal: this.abortController?.signal,
      }
    );

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch SEAL metadata: ${metadataResponse.statusText}`);
    }

    const metadata = await metadataResponse.json();
    console.log('[SealDecryptingLoader] Got SEAL metadata:', metadata);

    // Download encrypted segment from Walrus
    console.log('[SealDecryptingLoader] Downloading encrypted segment from Walrus...');
    const segmentResponse = await fetch(metadata.walrusUri, {
      signal: this.abortController?.signal,
    });

    if (!segmentResponse.ok) {
      throw new Error(`Failed to download segment: ${segmentResponse.statusText}`);
    }

    const encryptedData = new Uint8Array(await segmentResponse.arrayBuffer());
    console.log('[SealDecryptingLoader] Downloaded encrypted segment:', encryptedData.length, 'bytes');

    // Initialize SEAL client
    const suiClient = createSuiClientWithRateLimitHandling();
    const sealClient = initializeSealClient({
      network: this.config.network || SEAL_CONFIG.NETWORK,
      packageId: this.config.packageId,
      suiClient,
    });

    // Build seal_approve transaction
    console.log('[SealDecryptingLoader] Building seal_approve transaction...');
    const tx = new Transaction();

    const documentIdBytes = fromHex(metadata.sealDocumentId.replace('0x', ''));

    tx.moveCall({
      target: `${this.config.packageId}::creator_channel::seal_approve`,
      arguments: [
        tx.pure.vector('u8', Array.from(documentIdBytes)),
        tx.object(this.config.channelId),
        tx.object('0x6'), // Clock object
      ],
    });

    const txBytes = await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    });

    // Decrypt with SEAL
    console.log('[SealDecryptingLoader] Decrypting with SEAL...');
    const decryptedData = await decryptWithSeal(
      sealClient,
      encryptedData,
      this.config.sessionKey,
      txBytes
    );

    console.log('[SealDecryptingLoader] ✓ Segment decrypted:', decryptedData.length, 'bytes');

    this._stats.loaded = decryptedData.byteLength;
    this._stats.total = decryptedData.byteLength;
    this._stats.loading.end = Date.now();

    // Pass decrypted data to hls.js
    this.callbacks.onSuccess?.(
      {
        url: this.context.url,
        data: decryptedData.buffer,
      },
      this._stats,
      this.context,
      null
    );
  }

  /**
   * Get rendition name from HLS level
   */
  private getRenditionName(): string {
    // Try to extract from frag level
    const level = this.context.frag?.level;
    if (level !== undefined) {
      // Map level index to rendition name
      // This assumes the levels are in the same order as renditions
      const renditionNames = ['360p', '480p', '720p', '1080p'];
      return renditionNames[level] || '360p';
    }
    return '360p'; // Default fallback
  }

  /**
   * Abort the loader
   */
  abort(): void {
    console.log('[SealDecryptingLoader] Aborting...');
    this._stats.aborted = true;
    this.abortController?.abort();
  }

  /**
   * Destroy the loader
   */
  destroy(): void {
    console.log('[SealDecryptingLoader] Destroying...');
    this.abort();
    this.context = null;
    this.callbacks = null;
    this.abortController = null;
  }

  /**
   * Get stats
   */
  get stats(): any {
    return this._stats;
  }
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
  const suiClient = createSuiClientWithRateLimitHandling();

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
