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

export interface DecryptingLoaderConfig {
  sessionManager: SessionManager;
  maxRetries?: number;
  retryDelay?: number;
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
    const isEncrypted = isSegment; // Only segments are encrypted, not playlists

    console.log(`[DecryptingLoader] Loading: ${context.url}`);
    console.log(`[DecryptingLoader] Type: ${isSegment ? 'segment' : 'playlist'}`);

    // For playlists, just fetch normally (not encrypted)
    if (!isEncrypted) {
      return this.loadPlaintext(context, config, startTime);
    }

    // For segments, fetch and decrypt
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

    const data = await response.arrayBuffer();
    const duration = performance.now() - startTime;

    console.log(`[DecryptingLoader] ✓ Loaded plaintext (${duration.toFixed(0)}ms)`);

    if (this.callbacks?.onSuccess) {
      this.callbacks.onSuccess(
        {
          url: context.url,
          data: data as any,
        },
        {} as any,
        context
      );
    }
  }

  /**
   * Load and decrypt encrypted segment
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
    const segIdx = context.frag.sn; // Segment number
    const rendition = this.extractRendition(context.url);

    console.log(`[DecryptingLoader] Segment: ${rendition} #${segIdx}`);

    // Step 1: Fetch encryption key
    const keyStartTime = performance.now();
    const segmentKey = await this.config.sessionManager.getSegmentKey(
      rendition,
      segIdx
    );
    const keyDuration = performance.now() - keyStartTime;
    console.log(`[DecryptingLoader] ✓ Got key (${keyDuration.toFixed(0)}ms)`);

    // Step 2: Download encrypted segment
    const downloadStartTime = performance.now();
    const response = await fetch(context.url, {
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const encryptedData = new Uint8Array(await response.arrayBuffer());
    const downloadDuration = performance.now() - downloadStartTime;
    console.log(
      `[DecryptingLoader] ✓ Downloaded (${encryptedData.length} bytes, ${downloadDuration.toFixed(0)}ms)`
    );

    // Step 3: Decrypt segment
    const decryptStartTime = performance.now();
    const decryptedData = await aesGcmDecrypt(
      segmentKey.dek,
      encryptedData,
      segmentKey.iv
    );
    const decryptDuration = performance.now() - decryptStartTime;

    const totalDuration = performance.now() - startTime;
    console.log(`[DecryptingLoader] ✓ Decrypted (${decryptDuration.toFixed(0)}ms)`);
    console.log(
      `[DecryptingLoader] ✓ Total: ${totalDuration.toFixed(0)}ms (key: ${keyDuration.toFixed(0)}ms, download: ${downloadDuration.toFixed(0)}ms, decrypt: ${decryptDuration.toFixed(0)}ms)`
    );

    // Step 4: Pass decrypted data to hls.js
    if (this.callbacks?.onSuccess) {
      this.callbacks.onSuccess(
        {
          url: context.url,
          data: decryptedData.buffer as any,
        },
        {} as any,
        context
      );
    }

    // Optional: Prefetch keys for upcoming segments
    if (segIdx < 1000) {
      // Reasonable upper bound
      const upcomingSegments = [segIdx + 1, segIdx + 2, segIdx + 3];
      this.config.sessionManager
        .prefetchKeys(rendition, upcomingSegments)
        .catch((error) => {
          console.warn('[DecryptingLoader] Prefetch failed:', error);
        });
    }
  }

  /**
   * Extract rendition name from URL
   * Example: https://walrus.../720p_seg_0001.m4s → "720p"
   */
  private extractRendition(url: string): string {
    const match = url.match(/\/(\d+p)_/);
    if (match) {
      return match[1];
    }

    // Fallback: check for rendition in path
    const pathMatch = url.match(/\/(\d+p)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Default to 720p if can't determine
    console.warn('[DecryptingLoader] Could not extract rendition from URL, defaulting to 720p');
    return '720p';
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

  /**
   * Get loader context
   */
  get context(): Hls.LoaderContext | null {
    return this.context;
  }

  get stats(): Hls.LoaderStats {
    return {
      aborted: false,
      loaded: 0,
      retry: this.retryCount,
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

    get context(): Hls.LoaderContext | null {
      return this.loader.context;
    }

    get stats(): Hls.LoaderStats {
      return this.loader.stats;
    }

    getResponseHeader(name: string): string | null {
      return this.loader.getResponseHeader(name);
    }
  };
}
