/**
 * Custom hls.js loader for decrypting encrypted video segments
 *
 * Extends hls.js loader to:
 * - Intercept segment downloads
 * - Fetch encryption keys from server
 * - Decrypt segments before passing to hls.js
 * - Handle errors and retries
 */

'use client';

import type Hls from 'hls.js';
import { SessionManager } from './sessionManager';
import { aesGcmDecrypt } from '../crypto/primitives';
import { DecryptionWorkerPool } from './workerPool';

export interface DecryptingLoaderConfig {
  sessionManager: SessionManager;
  workerPool?: DecryptionWorkerPool; // Optional worker pool for parallel decryption
  maxRetries?: number;
  retryDelay?: number;
  hlsInstance?: any; // Reference to HLS instance for level mapping
}

/**
 * Custom loader that decrypts segments before passing to hls.js
 */
const PATCH_ID_REGEX = /\/by-quilt-patch-id\/([^@]+)@\d+:\d+/;
const PATCH_ID_GLOBAL_REGEX = /\/by-quilt-patch-id\/([^\s@\n]+)@\d+:\d+/g;
const AGGREGATOR_DOMAIN = 'aggregator.walrus.space';
const AGGREGATOR_REPLACEMENT = 'aggregator.mainnet.walrus.mirai.cloud';

export class DecryptingLoader {
  private config: DecryptingLoaderConfig;
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

  constructor(config: DecryptingLoaderConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Get loader statistics
   */
  getResponseHeader(name: string): string | null {
    return null; // Headers not needed for decryption
  }

  /**
   * Load and decrypt a segment
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
        start: performance.now(),
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

    this.loadWithRetry(context, config);
  }

  /**
   * Load with automatic retry on failure
   */
  private async loadWithRetry(
    context: any,
    config: any
  ): Promise<void> {
    try {
      await this.loadInternal(context, config);
    } catch (error) {
      console.error('[DecryptingLoader] Load failed:', error);

      // Retry on network or decryption errors
      if (
        this.retryCount < this.config.maxRetries! &&
        !this.abortController?.signal.aborted
      ) {
        this.retryCount++;
        console.log(
          `[DecryptingLoader] Retrying (${this.retryCount}/${this.config.maxRetries})...`
        );

        // Exponential backoff
        const delay = this.config.retryDelay! * Math.pow(2, this.retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.loadWithRetry(context, config);
      }

      // Max retries exceeded or aborted
      if (this.callbacks?.onError) {
        this.callbacks.onError(
          {
            code: 0,
            text: error instanceof Error ? error.message : 'Load failed',
          },
          context,
          null as any,
          {} as any
        );
      }
    }
  }

  /**
   * Internal load and decrypt logic
   */
  private async loadInternal(
    context: any,
    config: any
  ): Promise<void> {
    const startTime = performance.now();

    // Determine if this is a segment or playlist
    const isSegment = context.frag && context.frag.relurl;
    const isInitSegment = context.frag && context.frag.sn === 'initSegment';
    // Init segments ARE encrypted in our system (segIdx: -1)
    const isEncrypted = isSegment; // Both init and media segments are encrypted

    if (!isEncrypted) {
      return this.loadPlaintext(context, config, startTime);
    }

    return this.loadAndDecrypt(context, config, startTime);
  }

  /**
   * Fix legacy/broken Walrus URLs and extract byte range
   * - Replace non-existent aggregator.walrus.space with working aggregator
   * - Convert by-quilt-patch-id URLs to blob ID URLs
   * - Extract byte range from @start:end notation
   * Returns: { url: fixed URL, rangeHeader: Range header value or null }
   */
  private fixWalrusUrl(url: string): { url: string; rangeHeader: string | null } {
    let fixed = url;
    let rangeHeader: string | null = null;

    if (fixed.includes(AGGREGATOR_DOMAIN)) {
      fixed = fixed.replace(AGGREGATOR_DOMAIN, AGGREGATOR_REPLACEMENT);
    }

    // Match patch ID with byte range: blobId@start:end
    const patchIdMatch = fixed.match(/\/by-quilt-patch-id\/([^@]+)@(\d+):(\d+)/);
    if (patchIdMatch) {
      const blobId = patchIdMatch[1];
      const start = patchIdMatch[2];
      const end = patchIdMatch[3];

      // Create Range header for byte range
      rangeHeader = `bytes=${start}-${end}`;

      // Replace with blob ID URL (remove by-quilt-patch-id and @range)
      if (fixed.includes('/v1/blobs/by-quilt-patch-id/')) {
        fixed = fixed.replace(/\/by-quilt-patch-id\/[^@]+@\d+:\d+/, `/${blobId}`);
      } else {
        fixed = fixed.replace(/\/by-quilt-patch-id\/[^@]+@\d+:\d+/, `/v1/blobs/${blobId}`);
      }
    }

    return { url: fixed, rangeHeader };
  }

  /**
   * Load plaintext content (playlists, init segments)
   */
  private async loadPlaintext(
    context: any,
    config: any,
    startTime: number
  ): Promise<void> {
    // Fix legacy/broken URLs before fetching
    const { url: fixedUrl, rangeHeader } = this.fixWalrusUrl(context.url);

    const fetchOptions: RequestInit = {
      signal: this.abortController?.signal,
    };

    // Add Range header if URL has byte range
    if (rangeHeader) {
      fetchOptions.headers = {
        'Range': rangeHeader,
      };
    }

    const response = await fetch(fixedUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Playlists (.m3u8) need to be strings, not ArrayBuffers
    const isPlaylist = context.url.includes('.m3u8') || context.responseType === 'text';
    let data: ArrayBuffer | string;

    if (isPlaylist) {
      data = await response.text();
      let fixedPlaylist = data;

      if (fixedPlaylist.includes(AGGREGATOR_DOMAIN)) {
        fixedPlaylist = fixedPlaylist.replace(new RegExp(AGGREGATOR_DOMAIN.replace('.', '\\.'), 'g'), AGGREGATOR_REPLACEMENT);
      }

      if (PATCH_ID_GLOBAL_REGEX.test(fixedPlaylist)) {
        // Check if playlist URLs already have /v1/blobs/ prefix
        if (fixedPlaylist.includes('/v1/blobs/by-quilt-patch-id/')) {
          // Already has /v1/blobs/, just remove by-quilt-patch-id and @range
          fixedPlaylist = fixedPlaylist.replace(/\/by-quilt-patch-id\/([^@\s\n]+)@\d+:\d+/g, '/$1');
        } else {
          // Doesn't have /v1/blobs/, add it
          fixedPlaylist = fixedPlaylist.replace(/\/by-quilt-patch-id\/([^@\s\n]+)@\d+:\d+/g, '/v1/blobs/$1');
        }
      }

      data = fixedPlaylist;
    } else {
      data = await response.arrayBuffer();
    }

    this._stats.loading.first = this._stats.loading.start;
    this._stats.loading.end = performance.now();
    this._stats.loaded = typeof data === 'string' ? data.length : data.byteLength;
    this._stats.total = typeof data === 'string' ? data.length : data.byteLength;
    this._stats.retry = this.retryCount;

    if (this.callbacks?.onSuccess) {
      this.callbacks.onSuccess(
        {
          url: context.url,
          data: data as any,
        },
        this._stats,
        context
      );
    }
  }

  /**
   * Load and decrypt encrypted segment
   * OPTIMIZED: Uses pipeline architecture and Web Workers
   */
  private async loadAndDecrypt(
    context: any,
    _config: any,
    _startTime: number
  ): Promise<void> {
    if (!context.frag) {
      throw new Error('No fragment info for segment');
    }

    // Extract segment info from fragment
    // Note: context.frag.sn can be a number (media segment) or "initSegment" (init segment)
    let segIdx: number;
    if (context.frag.sn === 'initSegment') {
      segIdx = -1; // Convention: -1 for init segments
    } else {
      segIdx = typeof context.frag.sn === 'number' ? context.frag.sn : parseInt(String(context.frag.sn), 10);
    }

    const rendition = this.extractRendition(context);
    const { url: fixedUrl, rangeHeader } = this.fixWalrusUrl(context.url);

    const fetchOptions: RequestInit = {
      signal: this.abortController?.signal,
    };

    // Add Range header if URL has byte range
    if (rangeHeader) {
      fetchOptions.headers = {
        'Range': rangeHeader,
      };
    }

    const [encryptedDataBuffer, segmentKey] = await Promise.all([
      fetch(fixedUrl, fetchOptions).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.arrayBuffer();
      }),
      this.config.sessionManager.getSegmentKey(rendition, segIdx),
    ]);

    const encryptedData = new Uint8Array(encryptedDataBuffer);
    let decryptedData: Uint8Array;

    if (this.config.workerPool && this.config.workerPool.isAvailable()) {
      decryptedData = await this.config.workerPool.decrypt(
        segmentKey.dek,
        encryptedData,
        segmentKey.iv
      );
    } else {
      decryptedData = await aesGcmDecrypt(segmentKey.dek, encryptedData, segmentKey.iv);
    }

    // Update stats
    this._stats.loading.first = this._stats.loading.start;
    this._stats.loading.end = performance.now();
    this._stats.loaded = decryptedData.byteLength;
    this._stats.total = decryptedData.byteLength;
    this._stats.retry = this.retryCount;

    // Pass decrypted data to hls.js
    if (this.callbacks?.onSuccess) {
      this.callbacks.onSuccess(
        {
          url: context.url,
          data: decryptedData.buffer as any,
        },
        this._stats,
        context
      );
    }

    if (segIdx >= 0 && segIdx < 1000 && this.config.hlsInstance?.levels) {
      this.config.sessionManager
        .prefetchKeysAggressive(this.config.hlsInstance.levels, segIdx, rendition)
        .catch(() => {});
    }
  }

  /**
   * Extract rendition name from fragment context
   * Uses HLS.js level information to map level index to resolution
   */
  private extractRendition(context: any): string {
    if (context.frag && typeof context.frag.level === 'number' && this.config.hlsInstance) {
      const levelIndex = context.frag.level;
      const levels = this.config.hlsInstance.levels;

      if (levels && levels[levelIndex]) {
        const level = levels[levelIndex];
        return `${level.height}p`;
      }
    }

    throw new Error('Cannot extract rendition from fragment context');
  }

  /**
   * Abort current load
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Destroy loader and cleanup
   */
  destroy(): void {
    this.abort();
    this.context = null;
    this.callbacks = null;
  }

  get stats(): any {
    return this._stats;
  }
}

/**
 * Factory function to create DecryptingLoader class
 * Compatible with hls.js loader configuration
 */
export function createDecryptingLoaderClass(
  config: DecryptingLoaderConfig
): any {
  return class {
    private loader: DecryptingLoader;

    constructor() {
      this.loader = new DecryptingLoader(config);
    }

    load(
      context: any,
      config: any,
      callbacks: any
    ): void {
      this.loader.load(context, config, callbacks);
    }

    abort(): void {
      this.loader.abort();
    }

    destroy(): void {
      this.loader.destroy();
    }

    get stats(): any {
      return this.loader.stats;
    }

    getResponseHeader(name: string): string | null {
      return this.loader.getResponseHeader(name);
    }
  };
}
