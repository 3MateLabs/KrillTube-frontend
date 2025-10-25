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

export interface UseEncryptedVideoOptions {
  videoId: string;
  videoUrl: string; // Master playlist URL
  autoplay?: boolean;
  apiBaseUrl?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onSessionExpired?: () => void;
}

export interface UseEncryptedVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoading: boolean;
  isPlaying: boolean;
  error: Error | null;
  session: ReturnType<SessionManager['getSession']>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  destroy: () => void;
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
        if (!videoRef.current) {
          throw new Error('Video element not ready');
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

        // Step 2: Initialize session (ECDH key exchange with server)
        await sessionManagerRef.current.initialize();
        setSession(sessionManagerRef.current.getSession());

        console.log('[useEncryptedVideo] ✓ Session initialized');

        if (!mounted) return;

        // Step 3: Create hls.js instance with custom decrypting loader
        const DecryptingLoaderClass = createDecryptingLoaderClass({
          sessionManager: sessionManagerRef.current,
          maxRetries: 3,
          retryDelay: 1000,
        });

        hlsRef.current = new Hls({
          loader: DecryptingLoaderClass as any,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

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

          if (options.onReady) {
            options.onReady();
          }

          if (options.autoplay && videoRef.current) {
            videoRef.current.play().catch((err) => {
              console.warn('[useEncryptedVideo] Autoplay failed:', err);
            });
          }
        });

        hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
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
  };
}
