/**
 * Custom Video Player with Green Theme & Resolution Switching
 * Matches v1 design with Walrus green branding
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEncryptedVideo } from '@/lib/player/useEncryptedVideo';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useWalletAuth } from '@/lib/hooks/useWalletAuth';
import { ConnectWallet } from './ConnectWallet';
import Hls from 'hls.js';

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
  // Get current wallet account and auth state
  const currentAccount = useCurrentAccount();
  const walletAddress = currentAccount?.address;
  const { isAuthenticated, requestSignature, isLoading: authLoading } = useWalletAuth();

  // Track if we need signature
  const [needsSignature, setNeedsSignature] = useState(false);
  const [signingInProgress, setSigningInProgress] = useState(false);

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
    walletAddress, // Pass wallet address to video hook
    network,
    autoplay: autoplay && !!walletAddress && isAuthenticated, // Only autoplay if wallet connected and authenticated
    onReady: () => {
      console.log('Video ready to play');
      setNeedsSignature(false);
    },
    onError: (err) => {
      console.error('Video error:', err);
      // Check if error is about signature
      if (err.message.includes('SIGNATURE_REQUIRED')) {
        console.log('[CustomVideoPlayer] Signature required, showing prompt');
        setNeedsSignature(true);
      }
    },
    onSessionExpired: () => {
      console.error('Session expired - please refresh');
      alert('Your session has expired. Please refresh the page.');
    },
  });

  // Handle signature request
  const handleRequestSignature = async () => {
    setSigningInProgress(true);
    try {
      const success = await requestSignature();
      if (success) {
        console.log('[CustomVideoPlayer] Signature obtained, reloading page');
        // Reload the page to reinitialize video with signature
        window.location.reload();
      }
    } catch (error) {
      console.error('[CustomVideoPlayer] Failed to get signature:', error);
    } finally {
      setSigningInProgress(false);
    }
  };

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
      <div className="relative aspect-video bg-walrus-black rounded-lg overflow-hidden group">
        {/* Video Element (hidden controls) - Always in DOM */}
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
          onClick={() => (isPlaying ? pause() : play())}
          style={{ display: isLoading || error || !walletAddress ? 'none' : 'block' }}
        />

        {/* Wallet Connection Required Overlay */}
        {!walletAddress && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-walrus-mint/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-walrus-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Wallet Connection Required</h3>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                To watch this encrypted video, please connect your wallet. This ensures secure access tracking.
              </p>
              <div className="flex justify-center">
                <ConnectWallet />
              </div>
            </div>
          </div>
        )}

        {/* Signature Required Overlay */}
        {walletAddress && needsSignature && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Signature Required</h3>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Please sign a message with your wallet to verify ownership and access this video.
              </p>
              <button
                onClick={handleRequestSignature}
                disabled={signingInProgress}
                className="px-6 py-3 bg-walrus-mint hover:bg-mint-800 text-walrus-black font-semibold rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signingInProgress ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-walrus-black border-t-transparent rounded-full animate-spin"></div>
                    Requesting Signature...
                  </span>
                ) : (
                  'Sign Message'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading State Overlay */}
        {walletAddress && isLoading && (
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

        {/* Custom Controls Overlay */}
        {walletAddress && !isLoading && !error && (
          <div className="absolute inset-0 bg-gradient-to-t from-walrus-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
            <div className="p-4 space-y-3">
              {/* Progress Bar */}
              <div className="relative">
                {/* Buffer Progress */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 bg-walrus-mint/30 rounded-full"
                  style={{ width: `${buffered}%` }}
                />

                {/* Seek Bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-walrus-mint
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                    [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-walrus-mint [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(var(--walrus-mint-rgb)) 0%, rgb(var(--walrus-mint-rgb)) ${(currentTime / duration) * 100}%, rgb(55, 65, 81) ${(currentTime / duration) * 100}%, rgb(55, 65, 81) 100%)`,
                  }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  {/* Play/Pause Button */}
                  <button
                    onClick={() => (isPlaying ? pause() : play())}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-walrus-mint hover:bg-walrus-mint/80 transition-colors"
                  >
                    {isPlaying ? (
                      <svg className="w-4 h-4 text-walrus-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-walrus-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Time Display */}
                  <div className="text-sm font-medium text-walrus-mint">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>

                  {/* Volume Control */}
                  <div
                    className="relative flex items-center gap-2"
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                      {volume === 0 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                        </svg>
                      )}
                    </button>

                    {/* Volume Slider */}
                    {showVolumeSlider && (
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-walrus-mint"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quality Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowQualityMenu(!showQualityMenu)}
                      className="px-3 py-1.5 bg-walrus-mint/20 hover:bg-walrus-mint/30 rounded-lg text-sm font-medium text-walrus-mint transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                      </svg>
                      {currentQuality === -1 ? 'Auto' : `${availableQualities.find(q => q.level === currentQuality)?.name || 'Auto'}`}
                    </button>

                    {/* Quality Menu */}
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-walrus-black/95 border border-walrus-mint/30 rounded-lg shadow-xl overflow-hidden backdrop-blur-sm">
                        <div className="py-2">
                          {/* Auto Quality */}
                          <button
                            onClick={() => switchQuality(-1)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-walrus-mint/20 transition-colors flex items-center justify-between gap-8 ${
                              currentQuality === -1 ? 'bg-walrus-mint/20 text-walrus-mint' : 'text-white'
                            }`}
                          >
                            <span>Auto</span>
                            {currentQuality === -1 && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>

                          {/* Quality Options */}
                          {availableQualities.map((quality) => (
                            <button
                              key={quality.level}
                              onClick={() => switchQuality(quality.level)}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-walrus-mint/20 transition-colors flex items-center justify-between gap-8 ${
                                currentQuality === quality.level ? 'bg-walrus-mint/20 text-walrus-mint' : 'text-white'
                              }`}
                            >
                              <span>{quality.name}</span>
                              {currentQuality === quality.level && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  >
                    {isFullscreen ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center gap-3 text-xs text-walrus-mint/70">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-walrus-mint animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Encrypted</span>
                </div>
                {session && (
                  <>
                    <span>•</span>
                    <span>Session: {session.sessionId.substring(0, 8)}...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomVideoPlayer;
