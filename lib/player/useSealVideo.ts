/**
 * React hook for SEAL-encrypted video playback
 * Handles subscription-based video decryption using SEAL with wallet signing
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { checkSealAccess, SealDecryptingLoader } from './sealDecryptingLoader';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { SessionKey, SealClient } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
import { initializeSealClient } from '@/lib/seal';

export interface UseSealVideoOptions {
  videoId: string;
  videoUrl: string; // Master playlist URL (unencrypted playlist structure)
  channelId: string; // Creator's SEAL channel ID
  packageId: string; // SEAL package ID
  network?: 'mainnet' | 'testnet'; // Walrus network
  autoplay?: boolean;
  enabled?: boolean; // Whether this hook should be active
  onReady?: () => void;
  onError?: (error: Error) => void;
  onAccessDenied?: () => void;
  onSigningRequired?: () => void; // Called when user needs to sign
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
  const sessionKeyRef = useRef<SessionKey | null>(null);
  const sealClientRef = useRef<SealClient | null>(null);
  const suiClientRef = useRef<SuiClient | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Wallet hooks
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  /**
   * Initialize and check access with wallet signing
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        // Skip if this hook is disabled
        if (options.enabled === false) {
          console.log('[useSealVideo] Hook disabled, skipping initialization');
          setIsLoading(false);
          return;
        }

        console.log('[useSealVideo] Initializing SEAL video player...');

        // Validate options
        if (!options.videoId || !options.channelId || !options.packageId) {
          throw new Error('videoId, channelId, and packageId are required');
        }

        // Check wallet connection
        if (!currentAccount?.address) {
          throw new Error('Wallet not connected');
        }

        const userAddress = currentAccount.address;
        console.log('[useSealVideo] User address:', userAddress);

        // Initialize SuiClient ONCE (will be reused for access check, SealClient, SessionKey, and all transactions)
        // This prevents redundant RPC initialization
        suiClientRef.current = new SuiClient({
          url: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
        });
        console.log('[useSealVideo] ✓ SUI client initialized and cached');

        // Check if user has access to this channel using the cached SuiClient
        console.log('[useSealVideo] Checking subscription access...');
        const accessGranted = await checkSealAccess(
          options.channelId,
          userAddress,
          options.packageId,
          suiClientRef.current
        );

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

        // Create SealClient ONCE and reuse it for all segment decryption
        // This prevents redundant key server fetches and initialization on every segment
        console.log('[useSealVideo] Initializing SEAL client (once, will be reused)...');
        sealClientRef.current = initializeSealClient({
          network: options.network || 'mainnet',
          packageId: options.packageId,
          suiClient: suiClientRef.current,
        });
        console.log('[useSealVideo] ✓ SEAL client initialized and cached');

        // Fetch the channel object with full reference (version + digest)
        // This is a SEAL performance optimization - passing fully qualified object refs
        // prevents key servers from making additional RPC calls to resolve versions
        console.log('[useSealVideo] Fetching channel object reference...');
        const channelObject = await suiClientRef.current.getObject({
          id: options.channelId,
          options: { showContent: false }, // We only need the object reference
        });

        if (channelObject.error) {
          throw new Error(`Failed to fetch channel object: ${channelObject.error}`);
        }

        const channelObjectRef = {
          objectId: channelObject.data!.objectId,
          version: channelObject.data!.version,
          digest: channelObject.data!.digest,
        };
        console.log('[useSealVideo] ✓ Channel object reference fetched:', channelObjectRef);

        // Create session key for SEAL decryption
        console.log('[useSealVideo] Creating session key...');
        if (options.onSigningRequired) {
          options.onSigningRequired();
        }

        const sessionKey = await SessionKey.create({
          address: userAddress,
          packageId: options.packageId,
          ttlMin: 10, // 10 minute TTL
          suiClient: suiClientRef.current,
        });

        // Sign the personal message with wallet
        const message = sessionKey.getPersonalMessage();
        const { signature } = await signPersonalMessage({
          message: Buffer.from(message),
        });

        sessionKey.setPersonalMessageSignature(signature);
        sessionKeyRef.current = sessionKey;

        console.log('[useSealVideo] ✓ Session key created and signed');

        // Initialize HLS.js with SEAL decrypting loader
        console.log('[useSealVideo] Initializing HLS.js with SEAL loader...');

        if (!Hls.isSupported()) {
          throw new Error('HLS.js is not supported in this browser');
        }

        // Create HLS instance with custom SEAL loader
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          // Use custom loader for SEAL decryption
          loader: SealDecryptingLoader as any,
          // Increase timeouts for SEAL decryption (key server latency can be high)
          fragLoadingTimeOut: 60000, // 60 seconds for fragment loading
          fragLoadingMaxRetry: 3,
          fragLoadingRetryDelay: 1000,
          manifestLoadingTimeOut: 30000,
          manifestLoadingMaxRetry: 3,
          // Pass config to loader via xhrSetup (loader will access it via context)
          xhrSetup: function(xhr: any, url: string) {
            // This won't be used since we have a custom loader
          },
        });

        // Store loader config in HLS config for loader to access
        // Pass pre-initialized SealClient and SuiClient to prevent re-initialization on every segment
        // Pass channelObjectRef for SEAL performance optimization
        (hls.config as any).sealLoaderConfig = {
          videoId: options.videoId,
          channelId: options.channelId,
          packageId: options.packageId,
          sessionKey: sessionKeyRef.current,
          sealClient: sealClientRef.current,
          suiClient: suiClientRef.current,
          channelObjectRef,
          network: options.network || 'mainnet',
        };

        // Attach video element
        if (videoRef.current) {
          hls.attachMedia(videoRef.current);
          console.log('[useSealVideo] ✓ HLS attached to video element');
        }

        // Handle HLS events
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[useSealVideo] ✓ Media attached, loading playlist...');
          hls.loadSource(options.videoUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[useSealVideo] ✓ Manifest parsed');

          // WORKAROUND: Rewrite segment URLs to add query parameters
          // Old uploads have raw Walrus blob URLs without videoId/rendition/segIdx params
          // The SEAL loader needs these params to fetch metadata from the API
          if (hls.levels) {
            console.log('[useSealVideo] Rewriting segment URLs to add query parameters...');
            hls.levels.forEach((level, levelIndex) => {
              if (level.details?.fragments) {
                level.details.fragments.forEach((frag) => {
                  if (frag.url?.includes('walrus') && !frag.url.includes('videoId=')) {
                    try {
                      const url = new URL(frag.url);
                      // Determine rendition name from level height
                      const rendition = level.height ? `${level.height}p` : '360p';

                      url.searchParams.set('videoId', options.videoId);
                      url.searchParams.set('rendition', rendition);
                      url.searchParams.set('segIdx', frag.sn.toString());

                      frag.url = url.toString();
                      console.log(`[useSealVideo] Rewrote segment ${frag.sn} URL for ${rendition}`);
                    } catch (err) {
                      console.warn('[useSealVideo] Failed to rewrite URL:', frag.url, err);
                    }
                  }
                });
              }
            });
            console.log('[useSealVideo] ✓ Segment URL rewriting complete');
          }

          setIsLoading(false);

          if (options.onReady) {
            options.onReady();
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('[useSealVideo] HLS error:', data);

          if (data.fatal) {
            setError(new Error(data.details || 'HLS fatal error'));

            if (options.onError) {
              options.onError(new Error(data.details || 'HLS fatal error'));
            }
          }
        });

        hlsRef.current = hls;
        console.log('[useSealVideo] ✓ SEAL video player ready');

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
  }, [options.videoId, options.channelId, options.packageId, options.enabled, options.network, currentAccount?.address, signPersonalMessage]);

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
