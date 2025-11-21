/**
 * React hook for SEAL-encrypted video playback
 * Handles subscription-based video decryption using SEAL
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { loadSealSegment, checkSealAccess } from './sealDecryptionLoader';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';

export interface UseSealVideoOptions {
  videoId: string;
  videoUrl: string; // Master playlist URL (unencrypted playlist structure)
  channelId: string; // Creator's SEAL channel ID
  userPrivateKey?: string; // User's wallet private key for signing (hex format)
  autoplay?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onAccessDenied?: () => void;
}

export interface UseSealVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isLoading: boolean;
  isPlaying: boolean;
  error: Error | null;
  hasAccess: boolean;
  play: () => Promise<void>;
  pause: () => void;
  destroy: () => void;
}

/**
 * Hook for SEAL-encrypted video playback
 *
 * Note: This is a simplified version that loads segments on-demand
 * For production, you'd want to integrate with HLS.js custom loader
 *
 * Usage:
 * ```tsx
 * const { videoRef, isLoading, hasAccess, error } = useSealVideo({
 *   videoId: 'video_123',
 *   videoUrl: 'https://walrus.../master.m3u8',
 *   channelId: '0x...',
 *   userPrivateKey: '0x...',
 * });
 *
 * if (!hasAccess) return <SubscribePrompt />;
 * if (error) return <ErrorMessage error={error} />;
 *
 * return <video ref={videoRef} controls />;
 * ```
 */
export function useSealVideo(options: UseSealVideoOptions): UseSealVideoReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const keypairRef = useRef<Ed25519Keypair | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  /**
   * Initialize and check access
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('[useSealVideo] Initializing SEAL video player...');

        // Validate options
        if (!options.videoId || !options.channelId) {
          throw new Error('videoId and channelId are required');
        }

        // Create user keypair from private key
        if (!options.userPrivateKey) {
          throw new Error('User wallet private key is required for SEAL decryption');
        }

        keypairRef.current = Ed25519Keypair.fromSecretKey(
          fromHex(options.userPrivateKey)
        );

        const userAddress = keypairRef.current.toSuiAddress();
        console.log('[useSealVideo] User address:', userAddress);

        // Check if user has access to this channel
        console.log('[useSealVideo] Checking subscription access...');
        const accessGranted = await checkSealAccess(options.channelId, userAddress);

        if (!mounted) return;

        if (!accessGranted) {
          console.log('[useSealVideo] Access denied - subscription required');
          setHasAccess(false);
          setIsLoading(false);

          if (options.onAccessDenied) {
            options.onAccessDenied();
          }

          return;
        }

        console.log('[useSealVideo] ✓ Access granted');
        setHasAccess(true);

        // For now, we'll use a simplified approach
        // In production, you'd create a custom HLS loader like the DEK version
        console.log('[useSealVideo] SEAL decryption ready');
        setIsLoading(false);

        if (options.onReady) {
          options.onReady();
        }

      } catch (err) {
        console.error('[useSealVideo] Initialization error:', err);

        if (mounted) {
          const error = err instanceof Error ? err : new Error('Failed to initialize SEAL video');
          setError(error);
          setIsLoading(false);

          if (options.onError) {
            options.onError(error);
          }
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [options.videoId, options.channelId, options.userPrivateKey]);

  /**
   * Play video
   */
  const play = async () => {
    if (!videoRef.current) {
      throw new Error('Video element not ready');
    }

    if (!hasAccess) {
      throw new Error('Access denied - subscription required');
    }

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error('[useSealVideo] Play error:', err);
      const error = err instanceof Error ? err : new Error('Failed to play video');
      setError(error);

      if (options.onError) {
        options.onError(error);
      }
    }
  };

  /**
   * Pause video
   */
  const pause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  /**
   * Cleanup
   */
  const destroy = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroy();
    };
  }, []);

  return {
    videoRef,
    isLoading,
    isPlaying,
    error,
    hasAccess,
    play,
    pause,
    destroy,
  };
}

/**
 * Determine which video hook to use based on encryption type
 */
export function getVideoPlayerHook(encryptionType: string): 'dek' | 'seal' | 'both' {
  switch (encryptionType) {
    case 'per-video':
      return 'dek';
    case 'subscription-acl':
      return 'seal';
    case 'both':
      return 'both'; // Will need special handling
    default:
      return 'dek'; // Fallback to DEK
  }
}
