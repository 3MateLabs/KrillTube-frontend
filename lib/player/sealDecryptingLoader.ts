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

import type { SessionKey, SealClient } from '@mysten/seal';
import { decryptWithSeal } from '@/lib/seal';
import { Transaction, Inputs } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';

export interface SealDecryptingLoaderConfig {
  videoId: string;
  channelId: string;
  packageId: string;
  sessionKey: SessionKey;
  sealClient: SealClient; // Pre-initialized SealClient to reuse across all segments
  suiClient: SuiClient; // Pre-initialized SuiClient to reuse for all transactions
  channelObjectRef?: { objectId: string; version: string; digest: string }; // Fully qualified channel object reference
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

    if (!sealConfig.sealClient) {
      throw new Error('SealClient not provided in loader config - must be initialized in useSealVideo');
    }

    if (!sealConfig.suiClient) {
      throw new Error('SuiClient not provided in loader config - must be initialized in useSealVideo');
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
      hasSealClient: !!this.config.sealClient,
      hasSuiClient: !!this.config.suiClient,
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
    // type === 'manifest' = master playlist
    // type === 'level' = rendition/level playlist
    if (type === 'manifest' || type === 'level' || url.endsWith('.m3u8')) {
      console.log('[SealDecryptingLoader] Loading playlist (unencrypted)');
      return this.loadPlaintext();
    }

    // For segments, use SEAL decryption
    console.log('[SealDecryptingLoader] Loading SEAL-encrypted segment');
    return this.loadSealSegment();
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

    let data = await response.text();

    // WORKAROUND: Rewrite testnet URLs to mainnet URLs
    // This is needed because the master playlist blob was uploaded with testnet URLs
    // but the actual blobs exist on mainnet
    const testnetPattern = /https:\/\/aggregator\.walrus-testnet\.walrus\.space/g;
    const mainnetUrl = 'https://aggregator.mainnet.walrus.mirai.cloud';

    if (testnetPattern.test(data)) {
      console.log('[SealDecryptingLoader] Rewriting testnet URLs to mainnet');
      data = data.replace(testnetPattern, mainnetUrl);
    }

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
    const urlString = this.context.url;

    // Parse segment info from URL query parameters (new format after manifest rewriting)
    // or from frag data (fallback)
    let videoId = this.config.videoId;
    let segIdx: number;
    let rendition: string;

    try {
      const url = new URL(urlString);
      const videoIdParam = url.searchParams.get('videoId');
      const segIdxParam = url.searchParams.get('segIdx');
      const renditionParam = url.searchParams.get('rendition');

      if (videoIdParam && segIdxParam && renditionParam) {
        // New format with query parameters
        videoId = videoIdParam;
        segIdx = parseInt(segIdxParam);
        rendition = renditionParam;
        console.log('[SealDecryptingLoader] Using query params from URL');
      } else {
        // Fallback: use frag data
        const fragSn = this.context.frag?.sn;
        // Handle init segments: HLS.js uses string 'initSegment', we need -1
        segIdx = typeof fragSn === 'number' ? fragSn : -1;
        rendition = this.getRenditionName();
        console.log('[SealDecryptingLoader] Using frag data (no query params)');
      }
    } catch (err) {
      // URL parsing failed, use frag data
      const fragSn = this.context.frag?.sn;
      // Handle init segments: HLS.js uses string 'initSegment', we need -1
      segIdx = typeof fragSn === 'number' ? fragSn : -1;
      rendition = this.getRenditionName();
      console.log('[SealDecryptingLoader] URL parsing failed, using frag data');
    }

    console.log('[SealDecryptingLoader] Fetching SEAL metadata:', {
      videoId,
      rendition,
      segIdx
    });

    // Fetch SEAL metadata from our API
    let t1 = Date.now();
    const metadataResponse = await fetch(
      `/api/v1/seal/segment?videoId=${videoId}&segIdx=${segIdx}`,
      {
        signal: this.abortController?.signal,
      }
    );

    if (!metadataResponse.ok) {
      const errorData = await metadataResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch SEAL metadata: ${metadataResponse.statusText}`);
    }

    const metadata = await metadataResponse.json();
    console.log(`[SealDecryptingLoader] Got SEAL metadata in ${Date.now() - t1}ms:`, metadata);

    // Download encrypted segment from Walrus
    console.log('[SealDecryptingLoader] Downloading encrypted segment from Walrus...');
    t1 = Date.now();
    const segmentResponse = await fetch(metadata.walrusUri, {
      signal: this.abortController?.signal,
    });

    if (!segmentResponse.ok) {
      throw new Error(`Failed to download segment: ${segmentResponse.statusText}`);
    }

    const encryptedData = new Uint8Array(await segmentResponse.arrayBuffer());
    console.log(`[SealDecryptingLoader] Downloaded encrypted segment: ${encryptedData.length} bytes in ${Date.now() - t1}ms`);

    // Use pre-initialized SealClient and SuiClient from config (created once in useSealVideo)
    // This prevents redundant key server fetches and RPC initialization for every segment
    const sealClient = this.config.sealClient;
    const suiClient = this.config.suiClient;
    console.log('[SealDecryptingLoader] Using cached SEAL client and SUI client (no re-initialization)');

    // Build seal_approve transaction
    console.log('[SealDecryptingLoader] Building seal_approve transaction...');
    t1 = Date.now();
    const tx = new Transaction();

    const documentIdBytes = fromHex(metadata.sealDocumentId.replace('0x', ''));

    // Use fully qualified object reference if available (SEAL performance optimization)
    // This prevents key servers from making additional RPC calls to resolve object versions
    const channelArg = this.config.channelObjectRef
      ? tx.object(Inputs.ObjectRef({
          objectId: this.config.channelObjectRef.objectId,
          version: this.config.channelObjectRef.version,
          digest: this.config.channelObjectRef.digest,
        }))
      : tx.object(this.config.channelId);

    tx.moveCall({
      target: `${this.config.packageId}::creator_channel::seal_approve`,
      arguments: [
        tx.pure.vector('u8', Array.from(documentIdBytes)),
        channelArg,
        tx.object('0x6'), // Clock object
      ],
    });

    const txBytes = await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    });
    console.log(`[SealDecryptingLoader] Transaction built in ${Date.now() - t1}ms`);

    // Decrypt with SEAL
    console.log('[SealDecryptingLoader] Decrypting with SEAL...');
    const decryptStartTime = Date.now();
    let decryptedData: Uint8Array;

    try {
      // Don't pass abortController signal to SEAL - it has its own timeout handling
      // and the loader's signal can be too aggressive
      decryptedData = await decryptWithSeal(
        sealClient,
        encryptedData,
        this.config.sessionKey,
        txBytes
      );
      const decryptDuration = Date.now() - decryptStartTime;
      console.log(`[SealDecryptingLoader] ✓ Segment decrypted: ${decryptedData.length} bytes in ${decryptDuration}ms`);
    } catch (err) {
      const decryptDuration = Date.now() - decryptStartTime;
      console.error(`[SealDecryptingLoader] SEAL decryption failed after ${decryptDuration}ms:`, err);
      console.error('[SealDecryptingLoader] Error details:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        error: err,
        duration: decryptDuration,
      });
      throw new Error(`SEAL decryption failed: ${err instanceof Error ? err.message : String(err)}`);
    }

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
 * @param packageId - SEAL package ID
 * @param suiClient - Optional SuiClient instance (creates new if not provided)
 * @returns true if subscribed, false otherwise
 */
export async function checkSealAccess(
  channelId: string,
  userAddress: string,
  packageId: string,
  suiClient?: SuiClient
): Promise<boolean> {
  // Use provided client or create a new one (only for initial access check)
  const client = suiClient || new SuiClient({
    url: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
  });

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

    const result = await client.devInspectTransactionBlock({
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
