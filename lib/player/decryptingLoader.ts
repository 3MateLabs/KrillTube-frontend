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
export class DecryptingLoader implements Hls.LoaderInterface {
  private config: DecryptingLoaderConfig;
  private context: Hls.LoaderContext | null = null;
  private callbacks: Hls.LoaderCallbacks<Hls.LoaderContext> | null = null;
  private abortController: AbortController | null = null;
  private retryCount: number = 0;
  private _stats: Hls.LoaderStats = {
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
    context: Hls.LoaderContext,
    config: Hls.LoaderConfiguration,
    callbacks: Hls.LoaderCallbacks<Hls.LoaderContext>
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
    context: Hls.LoaderContext,
    config: Hls.LoaderConfiguration
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
    context: Hls.LoaderContext,
    config: Hls.LoaderConfiguration
  ): Promise<void> {
    const startTime = performance.now();

    // Determine if this is a segment or playlist
    const isSegment = context.frag && context.frag.relurl;
    const isInitSegment = context.frag && context.frag.sn === 'initSegment';

    // Only media segments are encrypted, NOT playlists or init segments
    const isEncrypted = isSegment && !isInitSegment;

    console.log(`[DecryptingLoader] Loading: ${context.url}`);
    console.log(`[DecryptingLoader] Type: ${isInitSegment ? 'init segment' : isSegment ? 'media segment' : 'playlist'}`);
    console.log(`[DecryptingLoader] Encrypted: ${isEncrypted}`);

    // For playlists and init segments, just fetch normally (not encrypted)
    if (!isEncrypted) {
      return this.loadPlaintext(context, config, startTime);
    }

    // For media segments, fetch and decrypt
    return this.loadAndDecrypt(context, config, startTime);
  }

  /**
   * Load plaintext content (playlists, init segments)
   */
  private async loadPlaintext(
    context: Hls.LoaderContext,
    config: Hls.LoaderConfiguration,
    startTime: number
  ): Promise<void> {
    const response = await fetch(context.url, {
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Playlists (.m3u8) need to be strings, not ArrayBuffers
    const isPlaylist = context.url.includes('.m3u8') || context.responseType === 'text';
    let data: ArrayBuffer | string;

    if (isPlaylist) {
      data = await response.text();
    } else {
      data = await response.arrayBuffer();
    }

    const duration = performance.now() - startTime;

    // Update stats
    this._stats.loading.first = this._stats.loading.start;
    this._stats.loading.end = performance.now();
    this._stats.loaded = typeof data === 'string' ? data.length : data.byteLength;
    this._stats.total = typeof data === 'string' ? data.length : data.byteLength;
    this._stats.retry = this.retryCount;

    console.log(`[DecryptingLoader] ✓ Loaded plaintext (${duration.toFixed(0)}ms)`);

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
    context: Hls.LoaderContext,
    config: Hls.LoaderConfiguration,
    startTime: number
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

    console.log(`[DecryptingLoader] Segment: ${rendition} #${segIdx === -1 ? 'init' : segIdx}`);

    // OPTIMIZATION 1: Pipeline architecture - Start download and key fetch in PARALLEL
    const pipelineStartTime = performance.now();

    const [encryptedDataBuffer, segmentKey] = await Promise.all([
      // Download segment (starts immediately, non-blocking)
      fetch(context.url, { signal: this.abortController?.signal }).then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.arrayBuffer();
      }),

      // Fetch key (starts immediately, in parallel with download)
      this.config.sessionManager.getSegmentKey(rendition, segIdx),
    ]);

    const pipelineDuration = performance.now() - pipelineStartTime;
    const encryptedData = new Uint8Array(encryptedDataBuffer);

    console.log(
      `[DecryptingLoader] ✓ Pipeline (download + key): ${pipelineDuration.toFixed(0)}ms, ${encryptedData.length} bytes`
    );

    // OPTIMIZATION 2: Use Web Worker pool for parallel decryption (non-blocking UI)
    const decryptStartTime = performance.now();
    let decryptedData: Uint8Array;

    if (this.config.workerPool && this.config.workerPool.isAvailable()) {
      // Use worker pool for parallel, non-blocking decryption
      decryptedData = await this.config.workerPool.decrypt(
        segmentKey.dek,
        encryptedData,
        segmentKey.iv
      );
      console.log(`[DecryptingLoader] ✓ Decrypted via worker (${(performance.now() - decryptStartTime).toFixed(0)}ms)`);
    } else {
      // Fallback to main thread if workers not available
      decryptedData = await aesGcmDecrypt(segmentKey.dek, encryptedData, segmentKey.iv);
      console.log(`[DecryptingLoader] ✓ Decrypted on main thread (${(performance.now() - decryptStartTime).toFixed(0)}ms)`);
    }

    const totalDuration = performance.now() - startTime;
    console.log(`[DecryptingLoader] ✓ Total: ${totalDuration.toFixed(0)}ms`);

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

    // OPTIMIZATION 3: Aggressive key prefetching (skip for init segments)
    if (segIdx >= 0 && segIdx < 1000 && this.config.hlsInstance?.levels) {
      // Prefetch keys for all quality levels (not just current)
      // This eliminates buffering during ABR quality switches
      this.config.sessionManager
        .prefetchKeysAggressive(this.config.hlsInstance.levels, segIdx, rendition)
        .catch((error) => {
          console.warn('[DecryptingLoader] Aggressive prefetch failed:', error);
        });
    }
  }

  /**
   * Extract rendition name from fragment context
   * Uses HLS.js level information to map level index to resolution
   */
  private extractRendition(context: Hls.LoaderContext): string {
    // Get rendition from fragment's level property
    if (context.frag && typeof context.frag.level === 'number' && this.config.hlsInstance) {
      const levelIndex = context.frag.level;
      const levels = this.config.hlsInstance.levels;

      if (levels && levels[levelIndex]) {
        const level = levels[levelIndex];
        const rendition = `${level.height}p`;
        console.log(`[DecryptingLoader] Extracted rendition from level ${levelIndex}: ${rendition}`);
        return rendition;
      }
    }

    // This shouldn't happen in normal operation - log error for debugging
    console.error('[DecryptingLoader] Failed to extract rendition from HLS level!');
    console.error('[DecryptingLoader] Fragment level:', context.frag?.level);
    console.error('[DecryptingLoader] HLS instance available:', !!this.config.hlsInstance);
    console.error('[DecryptingLoader] Levels available:', this.config.hlsInstance?.levels?.length);

    // Throw error instead of defaulting - this indicates a real problem
    throw new Error('Cannot extract rendition from fragment context. HLS levels not available.');
  }

  /**
   * Abort current load
   */
  abort(): void {
    console.log('[DecryptingLoader] Aborting load');
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

  get stats(): Hls.LoaderStats {
    return this._stats;
  }
}

/**
 * Factory function to create DecryptingLoader class
 * Compatible with hls.js loader configuration
 */
export function createDecryptingLoaderClass(
  config: DecryptingLoaderConfig
): new (hlsConfig: Hls.HlsConfig) => Hls.LoaderInterface {
  return class implements Hls.LoaderInterface {
    private loader: DecryptingLoader;

    constructor(hlsConfig: Hls.HlsConfig) {
      this.loader = new DecryptingLoader(config);
    }

    load(
      context: Hls.LoaderContext,
      config: Hls.LoaderConfiguration,
      callbacks: Hls.LoaderCallbacks<Hls.LoaderContext>
    ): void {
      this.loader.load(context, config, callbacks);
    }

    abort(): void {
      this.loader.abort();
    }

    destroy(): void {
      this.loader.destroy();
    }

    get stats(): Hls.LoaderStats {
      return this.loader.stats;
    }

    getResponseHeader(name: string): string | null {
      return this.loader.getResponseHeader(name);
    }
  };
}
