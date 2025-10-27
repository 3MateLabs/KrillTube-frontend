/**
 * Client-side session manager for encrypted video playback
 *
 * Handles:
 * - Session creation with server
 * - KEK derivation from ECDH key exchange
 * - Key caching
 * - Session refresh
 * - Error handling
 */

'use client';

import { generateX25519Keypair } from '../crypto/primitives';
import { deriveClientKek, unwrapSegmentDek } from '../crypto/client';
import { toBase64, fromBase64 } from '../crypto/utils';

export interface SessionConfig {
  videoId: string;
  apiBaseUrl?: string;
  onSessionExpired?: () => void;
  onError?: (error: Error) => void;
}

export interface SessionInfo {
  sessionId: string;
  videoId: string;
  videoTitle: string;
  serverPubKey: string;
  serverNonce: string;
  expiresAt: Date;
}

export interface SegmentKey {
  dek: Uint8Array;
  iv: Uint8Array;
  cachedAt: number;
}

/**
 * Manages encrypted video playback session
 */
export class SessionManager {
  private config: SessionConfig;
  private apiBaseUrl: string;
  private session: SessionInfo | null = null;
  private clientKeypair: Awaited<ReturnType<typeof generateX25519Keypair>> | null = null;
  private sessionKek: CryptoKey | null = null;
  private keyCache: Map<string, SegmentKey> = new Map();
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(config: SessionConfig) {
    this.config = config;
    this.apiBaseUrl = config.apiBaseUrl || '/api';
  }

  /**
   * Initialize session with server
   */
  async initialize(): Promise<void> {
    console.log('[SessionManager] Initializing session...');

    // Generate client-side X25519 keypair
    this.clientKeypair = await generateX25519Keypair();
    console.log('[SessionManager] Generated client keypair');

    // Create session with server
    const response = await fetch(`${this.apiBaseUrl}/v1/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({
        videoId: this.config.videoId,
        clientPubKey: toBase64(this.clientKeypair.publicKey),
        deviceFingerprint: await this.getDeviceFingerprint(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Session creation failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    this.session = {
      sessionId: data.sessionId,
      videoId: data.videoId,
      videoTitle: data.videoTitle,
      serverPubKey: data.serverPubKey,
      serverNonce: data.serverNonce,
      expiresAt: new Date(data.expiresAt),
    };

    console.log('[SessionManager] ✓ Session created:', this.session.sessionId);
    console.log('[SessionManager] Expires:', this.session.expiresAt.toLocaleString());

    // Derive session KEK
    this.sessionKek = await deriveClientKek(
      {
        clientPublicKey: this.clientKeypair.publicKey,
        clientPrivateKeyJwk: this.clientKeypair.privateKeyJwk,
      },
      this.session.serverPubKey,
      this.session.serverNonce
    );

    console.log('[SessionManager] ✓ Derived session KEK');

    // Start auto-refresh (refresh every 15 minutes, session expires in 30)
    this.startAutoRefresh();
  }

  /**
   * Get unwrapped DEK for a segment
   */
  async getSegmentKey(rendition: string, segIdx: number): Promise<SegmentKey> {
    if (!this.session || !this.sessionKek) {
      throw new Error('Session not initialized');
    }

    // Check cache first
    const cacheKey = `${rendition}:${segIdx}`;
    const cached = this.keyCache.get(cacheKey);
    if (cached) {
      console.log(`[SessionManager] Cache hit: ${cacheKey}`);
      return cached;
    }

    console.log(`[SessionManager] Fetching key: ${rendition} segment ${segIdx}`);

    // Fetch wrapped DEK from server
    const response = await fetch(
      `${this.apiBaseUrl}/v1/key?videoId=${this.session.videoId}&rendition=${rendition}&segIdx=${segIdx}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        this.handleSessionExpired();
        throw new Error('Session expired');
      }
      const error = await response.json();
      throw new Error(`Key retrieval failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();

    // Unwrap DEK
    const dek = await unwrapSegmentDek(
      this.sessionKek,
      data.wrappedDek,
      data.wrapIv
    );

    const segmentKey: SegmentKey = {
      dek,
      iv: fromBase64(data.segmentIv),
      cachedAt: Date.now(),
    };

    // Cache the unwrapped key
    this.keyCache.set(cacheKey, segmentKey);

    console.log(`[SessionManager] ✓ Retrieved and unwrapped key: ${cacheKey}`);

    return segmentKey;
  }

  /**
   * Prefetch keys for multiple segments
   */
  async prefetchKeys(rendition: string, segIndices: number[]): Promise<void> {
    if (!this.session || !this.sessionKek) {
      throw new Error('Session not initialized');
    }

    // Filter out already cached keys
    const uncachedIndices = segIndices.filter(
      (idx) => !this.keyCache.has(`${rendition}:${idx}`)
    );

    if (uncachedIndices.length === 0) {
      console.log('[SessionManager] All keys already cached');
      return;
    }

    console.log(`[SessionManager] Prefetching ${uncachedIndices.length} keys...`);

    // Batch fetch (max 20 keys at once)
    const batches = [];
    for (let i = 0; i < uncachedIndices.length; i += 20) {
      batches.push(uncachedIndices.slice(i, i + 20));
    }

    for (const batch of batches) {
      const response = await fetch(`${this.apiBaseUrl}/v1/key/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          videoId: this.session.videoId,
          rendition,
          segIndices: batch,
        }),
      });

      if (!response.ok) {
        console.warn('[SessionManager] Batch prefetch failed:', response.statusText);
        continue;
      }

      const data = await response.json();

      // Unwrap and cache all keys
      for (const key of data.keys) {
        const dek = await unwrapSegmentDek(
          this.sessionKek,
          key.wrappedDek,
          key.wrapIv
        );

        const cacheKey = `${rendition}:${key.segIdx}`;
        this.keyCache.set(cacheKey, {
          dek,
          iv: fromBase64(key.segmentIv),
          cachedAt: Date.now(),
        });
      }

      console.log(`[SessionManager] ✓ Prefetched ${data.keys.length} keys`);
    }
  }

  /**
   * Aggressive prefetch: Prefetch keys for current quality + all other qualities
   * This eliminates buffering during ABR switching and seeking
   *
   * @param hlsLevels - HLS quality levels from hls.js
   * @param currentSegIdx - Current segment index being played
   * @param currentRendition - Current quality being played (e.g., "720p")
   */
  async prefetchKeysAggressive(
    hlsLevels: any[],
    currentSegIdx: number,
    currentRendition?: string
  ): Promise<void> {
    if (!this.session || !this.sessionKek) {
      throw new Error('Session not initialized');
    }

    console.log('[SessionManager] Starting aggressive prefetch...');
    const startTime = performance.now();

    const prefetchPromises: Promise<void>[] = [];

    // Strategy: Prefetch broadly to cover all playback scenarios
    for (let i = 0; i < hlsLevels.length; i++) {
      const level = hlsLevels[i];
      const rendition = `${level.height}p`;

      // Current quality: prefetch next 30 segments (covers ~1-2 minutes ahead)
      // Other qualities: prefetch next 15 segments (for ABR switching)
      const segmentCount = rendition === currentRendition ? 30 : 15;
      const segIndices = Array.from({ length: segmentCount }, (_, idx) => currentSegIdx + idx);

      // Fire all prefetches in parallel
      prefetchPromises.push(
        this.prefetchKeys(rendition, segIndices).catch((err) => {
          console.warn(`[SessionManager] Prefetch failed for ${rendition}:`, err);
        })
      );
    }

    // Wait for all prefetches to complete
    await Promise.all(prefetchPromises);

    const duration = performance.now() - startTime;
    console.log(`[SessionManager] ✓ Aggressive prefetch completed in ${duration.toFixed(0)}ms`);
    console.log(`[SessionManager] Cache size: ${this.keyCache.size} keys`);
  }

  /**
   * Refresh session to extend expiration
   */
  async refresh(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    console.log('[SessionManager] Refreshing session...');

    const response = await fetch(`${this.apiBaseUrl}/v1/session/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        this.handleSessionExpired();
        throw new Error('Session expired');
      }
      const error = await response.json();
      throw new Error(`Session refresh failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    this.session.expiresAt = new Date(data.expiresAt);

    console.log('[SessionManager] ✓ Session refreshed until', this.session.expiresAt.toLocaleString());
  }

  /**
   * Terminate session
   */
  async terminate(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (!this.session) {
      return;
    }

    console.log('[SessionManager] Terminating session...');

    await fetch(`${this.apiBaseUrl}/v1/session`, {
      method: 'DELETE',
      credentials: 'include',
    });

    this.session = null;
    this.sessionKek = null;
    this.clientKeypair = null;
    this.keyCache.clear();

    console.log('[SessionManager] ✓ Session terminated');
  }

  /**
   * Get current session info
   */
  getSession(): SessionInfo | null {
    return this.session;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    if (!this.session) {
      return false;
    }
    return this.session.expiresAt > new Date();
  }

  /**
   * Clear key cache
   */
  clearCache(): void {
    this.keyCache.clear();
    console.log('[SessionManager] Cache cleared');
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    // Refresh every 15 minutes (session expires in 30)
    this.refreshTimer = setInterval(
      () => {
        this.refresh().catch((error) => {
          console.error('[SessionManager] Auto-refresh failed:', error);
          if (this.config.onError) {
            this.config.onError(error);
          }
        });
      },
      15 * 60 * 1000
    );
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    console.warn('[SessionManager] Session expired');

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.session = null;
    this.sessionKek = null;
    this.keyCache.clear();

    if (this.config.onSessionExpired) {
      this.config.onSessionExpired();
    }
  }

  /**
   * Get device fingerprint for optional device binding
   */
  private async getDeviceFingerprint(): Promise<string> {
    // Simple fingerprint based on user agent and screen resolution
    const ua = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fingerprint = `${ua}|${screen}|${timezone}`;

    // Hash the fingerprint
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }
}
