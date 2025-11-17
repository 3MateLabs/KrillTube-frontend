/**
 * Custom Video Player with Green Theme & Resolution Switching
 * Matches v1 design with Walrus green branding
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEncryptedVideo } from '@/lib/player/useEncryptedVideo';
import Hls from 'hls.js';
import Image from 'next/image';
import { useWalletContext } from '@/lib/context/WalletContext';
import { PaymentModal } from './modals/PaymentModal';
import { NoKrillModal } from './modals/NoKrillModal';
import { ChainSelector } from './wallet/ChainSelector';
import { Toast } from './ui/Toast';
import { mintDemoKrill } from '@/lib/utils/mintDemoKrill';
import { processPayment } from '@/lib/utils/processPayment';
import { useSignAndExecuteTransaction as useSuiSignAndExecute } from '@mysten/dapp-kit';
import { useSignAndExecuteTransaction as useIotaSignAndExecute } from '@iota/dapp-kit';

export interface CustomVideoPlayerProps {
  videoId: string;
  videoUrl: string;
  network?: 'mainnet' | 'testnet'; // Walrus network for correct aggregator URLs
  title?: string;
  autoplay?: boolean;
  className?: string;
}

export function CustomVideoPlayer({
  videoId,
  videoUrl,
  network,
  title,
  autoplay = false,
  className = '',
}: CustomVideoPlayerProps) {
  const {
    videoRef,
    isLoading,
    isPlaying,
    error,
    session,
    play,
    pause,
    hlsInstance,
  } = useEncryptedVideo({
    videoId,
    videoUrl,
    network,
    autoplay,
    onReady: () => {
      console.log('Video ready to play');
    },
    onError: (err) => {
      console.error('Video error:', err);
    },
    onSessionExpired: () => {
      console.error('Session expired - please refresh');
      alert('Your session has expired. Please refresh the page.');
    },
  });

  // Wallet connection check
  const { isConnected, address, chain } = useWalletContext();

  // Transaction signing hooks
  const { mutateAsync: signAndExecuteSui } = useSuiSignAndExecute();
  const { mutateAsync: signAndExecuteIota } = useIotaSignAndExecute();

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Start hidden, check payment first
  const [checkingPayment, setCheckingPayment] = useState(true); // Loading state for payment check

  // No Krill modal state
  const [showNoKrillModal, setShowNoKrillModal] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; link?: string } | null>(null);

  // Creator config state - separate configs for dKRILL and IOTA
  const [dKrillConfig, setDKrillConfig] = useState<{
    objectId: string;
    pricePerView: string;
    chain: string;
    decimals: number;
  } | null>(null);

  const [iotaConfig, setIotaConfig] = useState<{
    objectId: string;
    pricePerView: string;
    chain: string;
    decimals: number;
  } | null>(null);

  // Quality switching state
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<Array<{
    level: number;
    height: number;
    name: string;
  }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check if user has already paid for this video
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!videoId) {
        setCheckingPayment(false);
        return;
      }

      try {
        console.log('[CustomVideoPlayer] Checking payment status for video:', videoId);
        const response = await fetch(`/api/v1/payment/check?videoId=${videoId}`);

        if (!response.ok) {
          console.error('[CustomVideoPlayer] Failed to check payment status');
          setCheckingPayment(false);
          setShowPaymentModal(true);
          return;
        }

        const data = await response.json();
        console.log('[CustomVideoPlayer] Payment check result:', data);

        if (data.hasPaid) {
          // User has paid, hide payment modal and show player
          console.log('[CustomVideoPlayer] ✓ User has already paid for this video');
          setShowPaymentModal(false);
          setCheckingPayment(false);

          // Auto-play video after a short delay to ensure player is ready
          setTimeout(() => {
            console.log('[CustomVideoPlayer] Auto-playing video for paid user');
            play();
          }, 500);
        } else {
          // User hasn't paid, show payment modal
          console.log('[CustomVideoPlayer] User has not paid, showing payment modal');
          setShowPaymentModal(true);
          setCheckingPayment(false);
        }
      } catch (error) {
        console.error('[CustomVideoPlayer] Error checking payment status:', error);
        // On error, default to showing payment modal
        setShowPaymentModal(true);
        setCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, [videoId, address, chain, play]);

  // Fetch creator configs for both payment methods
  useEffect(() => {
    const fetchCreatorConfigs = async () => {
      if (!videoId || !chain) return;

      try {
        console.log('[CustomVideoPlayer] Fetching creator configs for video:', videoId);
        const response = await fetch(`/api/v1/videos/${videoId}`);

        if (!response.ok) {
          console.error('[CustomVideoPlayer] Failed to fetch video data');
          return;
        }

        const data = await response.json();
        const video = data.video;

        // Find dKRILL creator config
        const dKrillCoinType = chain === 'sui'
          ? process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN!
          : process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN!;

        const dKrillCfg = video.creatorConfigs?.find(
          (c: any) => c.chain === chain && c.coinType === dKrillCoinType
        );

        if (dKrillCfg) {
          console.log('[CustomVideoPlayer] Found dKRILL creator config:', dKrillCfg);
          setDKrillConfig({
            objectId: dKrillCfg.objectId,
            pricePerView: dKrillCfg.pricePerView,
            chain: dKrillCfg.chain,
            decimals: dKrillCfg.decimals,
          });
        } else {
          console.warn('[CustomVideoPlayer] No dKRILL creator config found for chain:', chain);
        }

        // Find native IOTA creator config (only for IOTA chain)
        if (chain === 'iota') {
          const nativeIotaCoinType = '0x2::iota::IOTA';
          const iotaCfg = video.creatorConfigs?.find(
            (c: any) => c.chain === chain && c.coinType === nativeIotaCoinType
          );

          if (iotaCfg) {
            console.log('[CustomVideoPlayer] Found native IOTA creator config:', iotaCfg);
            setIotaConfig({
              objectId: iotaCfg.objectId,
              pricePerView: iotaCfg.pricePerView,
              chain: iotaCfg.chain,
              decimals: iotaCfg.decimals,
            });
          } else {
            console.warn('[CustomVideoPlayer] No native IOTA creator config found');
          }
        }
      } catch (error) {
        console.error('[CustomVideoPlayer] Error fetching creator configs:', error);
      }
    };

    fetchCreatorConfigs();
  }, [videoId, chain]);

  // Pause video when wallet disconnects
  useEffect(() => {
    if (!isConnected && isPlaying) {
      console.log('[CustomVideoPlayer] Wallet disconnected, pausing video');
      pause();
    }
  }, [isConnected, isPlaying, pause]);

  // Get HLS instance and extract quality levels
  useEffect(() => {
    if (hlsInstance && hlsInstance.levels) {
      // Extract available quality levels
      const levels = hlsInstance.levels.map((level, index) => ({
        level: index,
        height: level.height,
        name: `${level.height}p`,
      }));

      setAvailableQualities(levels);

      // Listen for quality changes
      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        setCurrentQuality(data.level);
      });
    }
  }, [hlsInstance, isLoading]);

  // Update time and progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const updateBuffer = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('progress', updateBuffer);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('progress', updateBuffer);
    };
  }, [videoRef]);

  // Handle quality switching
  const switchQuality = (level: number) => {
    if (hlsInstance) {
      hlsInstance.currentLevel = level;
      setCurrentQuality(level);
      setShowQualityMenu(false);
    }
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Payment handlers
  const handlePayWithDKRILL = async () => {
    console.log('[CustomVideoPlayer] Pay with dKRILL clicked');

    if (!address || !chain) {
      setToast({ message: 'Please connect your wallet first', type: 'error' });
      return;
    }

    if (!dKrillConfig) {
      setToast({ message: 'dKRILL creator config not found', type: 'error' });
      return;
    }

    try {
      const network = chain === 'sui' ? 'sui' : 'iota';
      const signAndExecuteTransaction: any = network === 'sui' ? signAndExecuteSui : signAndExecuteIota;

      console.log('[CustomVideoPlayer] Processing dKRILL payment...', {
        network,
        creatorConfigId: dKrillConfig.objectId,
        pricePerView: dKrillConfig.pricePerView,
      });

      const digest = await processPayment({
        network,
        creatorConfigId: dKrillConfig.objectId,
        referrerAddress: '0x0', // No referrer
        paymentAmount: parseInt(dKrillConfig.pricePerView),
        signAndExecuteTransaction,
        userAddress: address,
        videoId,
      });

      console.log('[CustomVideoPlayer] Payment successful! Digest:', digest);

      // Generate explorer URL based on network
      const explorerUrl = network === 'sui'
        ? `https://suiscan.xyz/mainnet/tx/${digest}`
        : `https://iotascan.com/mainnet/tx/${digest}`;

      setToast({
        message: 'Payment successful! Refreshing page...',
        type: 'success',
        link: explorerUrl
      });
      setShowPaymentModal(false); // Close payment modal after successful payment
      setCheckingPayment(false); // Clear checking state

      // Refresh page after short delay to ensure backend has processed the payment
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('[CustomVideoPlayer] Payment failed:', error);

      // Check if the error is due to no dKRILL tokens
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      if (errorMessage.includes('No dKRILL coins found')) {
        // Show the No Krill modal instead of a toast error
        setShowPaymentModal(false);
        setShowNoKrillModal(true);
      } else {
        // Show toast for other errors
        setToast({
          message: errorMessage,
          type: 'error'
        });
      }
    }
  };

  const handlePayWithIOTA = async () => {
    console.log('[CustomVideoPlayer] Pay with native IOTA clicked');

    if (!address || !chain) {
      setToast({ message: 'Please connect your wallet first', type: 'error' });
      return;
    }

    if (!iotaConfig) {
      setToast({ message: 'Native IOTA creator config not found', type: 'error' });
      return;
    }

    try {
      const network = chain === 'sui' ? 'sui' : 'iota';
      const signAndExecuteTransaction: any = network === 'sui' ? signAndExecuteSui : signAndExecuteIota;

      console.log('[CustomVideoPlayer] Processing native IOTA payment...', {
        network,
        creatorConfigId: iotaConfig.objectId,
        pricePerView: iotaConfig.pricePerView,
      });

      const digest = await processPayment({
        network,
        creatorConfigId: iotaConfig.objectId,
        referrerAddress: '0x0', // No referrer
        paymentAmount: parseInt(iotaConfig.pricePerView),
        signAndExecuteTransaction,
        userAddress: address,
        coinType: '0x2::iota::IOTA', // Use native IOTA coin
        videoId,
      });

      console.log('[CustomVideoPlayer] Payment successful! Digest:', digest);

      // Generate explorer URL based on network
      const explorerUrl = network === 'sui'
        ? `https://suiscan.xyz/mainnet/tx/${digest}`
        : `https://iotascan.com/mainnet/tx/${digest}`;

      setToast({
        message: 'Payment successful! Refreshing page...',
        type: 'success',
        link: explorerUrl
      });
      setShowPaymentModal(false); // Close payment modal after successful payment
      setCheckingPayment(false); // Clear checking state

      // Refresh page after short delay to ensure backend has processed the payment
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('[CustomVideoPlayer] Payment failed:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Payment failed',
        type: 'error'
      });
    }
  };

  const handleGetDemoTokens = async () => {
    console.log('[CustomVideoPlayer] Get demo tokens clicked');

    if (!address || !chain) {
      setToast({ message: 'Please connect your wallet first', type: 'error' });
      return;
    }

    try {
      const network = chain === 'sui' ? 'sui' : 'iota';
      const signAndExecuteTransaction: any = network === 'sui' ? signAndExecuteSui : signAndExecuteIota;

      console.log('[CustomVideoPlayer] Minting demo tokens...', { network, address });

      const digest = await mintDemoKrill({
        network,
        recipientAddress: address,
        signAndExecuteTransaction,
      });

      console.log('[CustomVideoPlayer] Mint successful! Digest:', digest);

      // Generate explorer URL based on network
      const explorerUrl = network === 'sui'
        ? `https://suiscan.xyz/mainnet/tx/${digest}`
        : `https://iotascan.com/mainnet/tx/${digest}`;

      setToast({
        message: '1000 dKRILL tokens minted! Click to view transaction',
        type: 'success',
        link: explorerUrl
      });

      // Close the No Krill modal and show the payment modal again
      setShowNoKrillModal(false);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('[CustomVideoPlayer] Mint failed:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to mint tokens',
        type: 'error'
      });
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = parseFloat(e.target.value);
    }
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    if (video) {
      video.volume = newVolume;
      setVolume(newVolume);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div className={`custom-video-player ${className}`} ref={containerRef}>
      {/* Video Container - Always rendered so ref attaches immediately */}
      <div className="relative aspect-video min-h-[600px] bg-walrus-black rounded-lg overflow-hidden group">
        {/* Video Element (hidden controls) - Always in DOM */}
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
          onClick={() => (isPlaying ? pause() : play())}
          style={{ display: isLoading || error ? 'none' : 'block' }}
        />

        {/* Loading State Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-walrus-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-walrus-mint font-medium">Initializing secure playback...</p>
              <p className="text-sm text-gray-400 mt-2">Establishing encrypted session...</p>
            </div>
          </div>
        )}

        {/* Error State Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg max-w-md">
              <h4 className="font-bold">Playback Error</h4>
              <p className="text-sm">{error.message}</p>
            </div>
          </div>
        )}

        {/* Checking Payment Status Overlay */}
        {checkingPayment && isConnected && (
          <div className="absolute inset-0 bg-[#2C5F7E]/90 z-30 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-walrus-mint border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-walrus-mint font-medium">Checking payment status...</p>
            </div>
          </div>
        )}

        {/* Payment Modal - Shows when user hasn't paid */}
        {showPaymentModal && isConnected && !checkingPayment && (
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onPayWithDKRILL={handlePayWithDKRILL}
            onPayWithIOTA={handlePayWithIOTA}
            onGetDemoTokens={handleGetDemoTokens}
            dKrillPrice={dKrillConfig?.pricePerView}
            iotaPrice={iotaConfig?.pricePerView}
            dKrillDecimals={dKrillConfig?.decimals}
            iotaDecimals={iotaConfig?.decimals}
          />
        )}

        {/* No Krill Modal - Shows when user doesn't have dKRILL */}
        {showNoKrillModal && isConnected && (
          <NoKrillModal
            isOpen={showNoKrillModal}
            onClose={() => {
              setShowNoKrillModal(false);
              setShowPaymentModal(true);
            }}
            onGetDemoTokens={handleGetDemoTokens}
          />
        )}

        {/* Wallet Connection Overlay - Covers entire video player */}
        {!isConnected && (
          <div className="absolute inset-0 bg-[#2C5F7E] z-30 flex flex-col items-center justify-center">
            {/* Content */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-3 mx-auto">
                Connect wallet to continue
              </h2>
              <p className="text-white/80 text-sm mx-auto">
                You need to connect your wallet to play videos
              </p>
            </div>

            {/* Connect Wallet Button */}
            <div className="flex justify-center">
              <ChainSelector />
            </div>
          </div>
        )}

        {/* Custom Controls Overlay */}
        {!isLoading && !error && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pb-6 pt-3">
            {/* Progress Bar - Full Width */}
            <div className="w-full max-w-[85%] ml-6 mb-4">
              <div className="relative h-5">
                <div className="w-full h-5 bg-black rounded-[30px]" />
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute top-0 w-full h-5 appearance-none cursor-pointer bg-transparent
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0
                    [&::-webkit-slider-thumb]:opacity-0
                    [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0
                    [&::-moz-range-thumb]:opacity-0"
                  style={{
                    background: 'transparent',
                  }}
                />
                <div
                  className="absolute top-0 h-5 bg-white rounded-[30px] pointer-events-none"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
            </div>

            {/* Controls Row - With Padding */}
            <div className="w-full max-w-[85%] ml-6 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Play/Pause Button */}
                  <button
                    onClick={() => (isPlaying ? pause() : play())}
                    className="w-12 h-12 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    {isPlaying ? (
                      <Image src="/logos/pause icon.svg" alt="Pause" width={24} height={24} className="w-6 h-6" />
                    ) : (
                      <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Volume Button */}
                  <button className="w-12 h-12 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                    <Image src="/logos/volume.svg" alt="Volume" width={24} height={24} className="w-6 h-6" />
                  </button>

                  {/* Time Display */}
                  <div className="px-6 py-3 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center">
                    <div className="text-black text-base font-bold font-['Outfit']">{formatTime(currentTime)} / {formatTime(duration)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* CC Button */}
                  <button className="w-12 h-12 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                    <Image src="/logos/material-symbols_subtitles-rounded.svg" alt="CC" width={24} height={24} className="w-6 h-6" />
                  </button>

                  {/* Settings/Quality Button */}
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="w-12 h-12 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all relative"
                  >
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                    </svg>

                    {/* Quality Menu */}
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] overflow-hidden">
                        <div className="py-2">
                          <button
                            onClick={() => switchQuality(-1)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FFEEE5] transition-colors flex items-center justify-between gap-8 ${
                              currentQuality === -1 ? 'bg-[#FFEEE5] text-black font-bold' : 'text-black'
                            }`}
                          >
                            <span>Auto</span>
                          </button>
                          {availableQualities.map((quality) => (
                            <button
                              key={quality.level}
                              onClick={() => switchQuality(quality.level)}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-[#FFEEE5] transition-colors flex items-center justify-between gap-8 ${
                                currentQuality === quality.level ? 'bg-[#FFEEE5] text-black font-bold' : 'text-black'
                              }`}
                            >
                              <span>{quality.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Share Button */}
                  <button className="w-12 h-12 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                    <Image src="/logos/share.svg" alt="Share" width={24} height={24} className="w-6 h-6" />
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-12 h-12 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    <Image src="/logos/ri_expand-horizontal-line.svg" alt="Fullscreen" width={24} height={24} className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          link={toast.link}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default CustomVideoPlayer;
