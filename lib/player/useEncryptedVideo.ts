/**
 * React hook for encrypted video playback
 *
 * Simplifies integration of encrypted video playback with hls.js
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { SessionManager } from './sessionManager';
import { createDecryptingLoaderClass } from './decryptingLoader';
import { DecryptionWorkerPool } from './workerPool';

export interface UseEncryptedVideoOptions {
  videoId: string;
  videoUrl: string; // Master playlist URL
  network?: 'mainnet' | 'testnet'; // Walrus network for correct aggregator URLs
  autoplay?: boolean;
  apiBaseUrl?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
}

export interface UseEncryptedVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLoading: boolean;
  isPlaying: boolean;
  error: Error | null;
  session: ReturnType<SessionManager['getSession']>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
  hlsInstance: Hls | null;
}

/**
 * Hook for encrypted HLS video playback
 *
 * Usage:
 * ```tsx
 * const { videoRef, isLoading, error, play, pause } = useEncryptedVideo({
 *   videoId: 'video_123',
 *   videoUrl: 'https://walrus.../master.m3u8',
 *   autoplay: true,
 * });
 *
 * return (
 *   <div>
 *     {isLoading && <p>Loading...</p>}
 *     {error && <p>Error: {error.message}</p>}
 *     <video ref={videoRef} controls />
 *   </div>
 * );
 * ```
 */
export function useEncryptedVideo(
  options: UseEncryptedVideoOptions
): UseEncryptedVideoReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sessionManagerRef = useRef<SessionManager | null>(null);
  const workerPoolRef = useRef<DecryptionWorkerPool | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<ReturnType<SessionManager['getSession']>>(null);

  /**
   * Initialize session and hls.js
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {

        // Wait for video element to be ready
        if (!videoRef.current) {
          console.log('[useEncryptedVideo] Waiting for video element...');
          return; // Will retry on next render
        }

        if (!Hls.isSupported()) {
          throw new Error('HLS not supported in this browser');
        }

        console.log('[useEncryptedVideo] Initializing...');
        setIsLoading(true);
        setError(null);

        // Step 1: Create session manager
        sessionManagerRef.current = new SessionManager({
          videoId: options.videoId,
          apiBaseUrl: options.apiBaseUrl,
          onSessionExpired: () => {
            if (options.onSessionExpired) {
              options.onSessionExpired();
            }
            setError(new Error('Session expired'));
          },
          onError: (err) => {
            if (options.onError) {
              options.onError(err);
            }
            setError(err);
          },
        });

        // Step 2: Skip session initialization in DEMO MODE
        // Session creation is no longer required for key retrieval
        console.log('[useEncryptedVideo] ✓ DEMO MODE: Skipping session initialization');

        if (!mounted) return;

        // Step 3: Create Web Worker pool for parallel decryption (4 workers = 4 CPU cores)
        console.log('[useEncryptedVideo] Creating worker pool...');
        workerPoolRef.current = new DecryptionWorkerPool(4);
        console.log('[useEncryptedVideo] ✓ Worker pool created');

        // Step 4: Create hls.js instance with custom decrypting loader
        // We'll set the HLS instance reference after creation
        const loaderConfig: {
          sessionManager: SessionManager;
          workerPool: DecryptionWorkerPool;
          maxRetries: number;
          retryDelay: number;
          network?: 'mainnet' | 'testnet';
          hlsInstance?: any;
        } = {
          sessionManager: sessionManagerRef.current,
          workerPool: workerPoolRef.current,
          maxRetries: 3,
          retryDelay: 1000,
          network: options.network || 'mainnet', // Pass network to loader
        };

        const DecryptingLoaderClass = createDecryptingLoaderClass(loaderConfig);

        hlsRef.current = new Hls({
          loader: DecryptingLoaderClass as any,
          enableWorker: true,
          lowLatencyMode: false,

          // Aggressive buffering for smooth playback with decryption
          maxBufferLength: 60,        // Buffer 60 seconds ahead
          maxMaxBufferLength: 120,    // Maximum buffer up to 120 seconds
          maxBufferSize: 100 * 1000 * 1000, // 100MB buffer size
          maxBufferHole: 0.5,         // Max gap tolerance

          // Back buffer (keep 90 seconds behind for seeking)
          backBufferLength: 90,

          // Fragment loading optimization
          maxFragLookUpTolerance: 0.25,

          // Start loading aggressively
          startLevel: -1,             // Auto quality selection
          autoStartLoad: true,        // Start loading immediately
        });

        // Set HLS instance reference in loader config so it can access levels
        loaderConfig.hlsInstance = hlsRef.current;

        console.log('[useEncryptedVideo] ✓ Created hls.js instance');

        // Step 4: Attach hls.js to video element
        hlsRef.current.attachMedia(videoRef.current);

        hlsRef.current.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[useEncryptedVideo] ✓ Media attached');
          hlsRef.current!.loadSource(options.videoUrl);
        });

        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[useEncryptedVideo] ✓ Manifest parsed');
          setIsLoading(false);

          // OPTIMIZED: Aggressive prefetch keys for first 30 segments on all quality levels
          if (sessionManagerRef.current && hlsRef.current) {
            const levels = hlsRef.current.levels;
            if (levels && levels.length > 0) {
              console.log('[useEncryptedVideo] Starting aggressive key prefetch...');

              // Use aggressive prefetch to load all keys upfront
              // This eliminates ALL key fetch latency during playback
              sessionManagerRef.current
                .prefetchKeysAggressive(levels, 0)
                .then(() => {
                  console.log('[useEncryptedVideo] ✓ Aggressive prefetch completed');
                  const stats = workerPoolRef.current?.getStats();
                  if (stats) {
                    console.log('[useEncryptedVideo] Worker pool stats:', stats);
                  }
                })
                .catch((err) => {
                  console.warn('[useEncryptedVideo] Aggressive prefetch failed:', err);
                  // Continue playback even if prefetch fails
                });
            }
          }

          if (options.onReady) {
            options.onReady();
          }

          if (options.autoplay && videoRef.current) {
            videoRef.current.play().catch((err) => {
              console.warn('[useEncryptedVideo] Autoplay failed:', err);
            });
          }
        });

        hlsRef.current.on(Hls.Events.ERROR, (_event, data) => {
          console.error('[useEncryptedVideo] HLS error:', data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[useEncryptedVideo] Fatal network error');
                hlsRef.current?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('[useEncryptedVideo] Fatal media error');
                hlsRef.current?.recoverMediaError();
                break;
              default:
                console.error('[useEncryptedVideo] Unrecoverable error');
                setError(new Error(`HLS Error: ${data.details}`));
                if (options.onError) {
                  options.onError(new Error(`HLS Error: ${data.details}`));
                }
                break;
            }
          }
        });

        console.log('[useEncryptedVideo] ✓ Initialization complete');
      } catch (err) {
        console.error('[useEncryptedVideo] Initialization failed:', err);
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsLoading(false);

        if (options.onError) {
          options.onError(error);
        }
      }
    };

    initialize();

    // Cleanup
    return () => {
      mounted = false;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (sessionManagerRef.current) {
        sessionManagerRef.current.terminate();
        sessionManagerRef.current = null;
      }

      if (workerPoolRef.current) {
        workerPoolRef.current.destroy();
        workerPoolRef.current = null;
      }
    };
  }, [options.videoId, options.videoUrl, options.apiBaseUrl]);

  /**
   * Track playing state
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  /**
   * Play video
   */
  const play = useCallback(async () => {
    if (videoRef.current) {
      await videoRef.current.play();
    }
  }, []);

  /**
   * Pause video
   */
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  /**
   * Seek to time
   */
  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  /**
   * Set volume
   */
  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  /**
   * Destroy player and session
   */
  const destroy = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (sessionManagerRef.current) {
      sessionManagerRef.current.terminate();
      sessionManagerRef.current = null;
    }
  }, []);

  return {
    videoRef,
    isLoading,
    isPlaying,
    error,
    session,
    play,
    pause,
    seek,
    setVolume,
    destroy,
    hlsInstance: hlsRef.current,
  };
}
