/**
 * Custom Video Player with Green Theme & Resolution Switching
 * Matches v1 design with Walrus green branding
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEncryptedVideo } from '@/lib/player/useEncryptedVideo';
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

        {/* Custom Controls Overlay */}
        {!isLoading && !error && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
            <div className="p-6 space-y-3">
              {/* Progress Bar */}
              <div className="relative h-4 flex flex-col justify-center items-start gap-2.5">
                <div className="self-stretch flex-1 bg-black rounded-[30px] border border-white" />
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute top-0 w-full h-5 appearance-none cursor-pointer bg-transparent
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-[30px] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                    [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-[30px]
                    [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: 'transparent',
                  }}
                />
                <div
                  className="absolute top-0 h-5 bg-white rounded-[30px] border-2 border-black pointer-events-none"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <button
                    onClick={() => (isPlaying ? pause() : play())}
                    className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-center items-center gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Volume Button */}
                  <button className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                    <div className="w-6 h-6 relative overflow-hidden mx-auto">
                      {volume === 0 ? (
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Time Display */}
                  <div className="h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-2.5">
                    <div className="text-black text-base font-bold font-['Outfit']">{formatTime(currentTime)} / {formatTime(duration)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* CC Button */}
                  <button className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-center items-center gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                    <div className="w-6 h-6 relative overflow-hidden">
                      <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 11c0-.959-.68-1.761-1.581-1.954C16.779 8.445 17 7.75 17 7c0-2.206-1.794-4-4-4-1.516 0-2.822.857-3.5 2.104C8.822 3.857 7.516 3 6 3 3.794 3 2 4.794 2 7c0 .75.221 1.445.581 2.046C1.68 9.239 1 10.041 1 11v8c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-8zM6 5c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zm7-2c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zM3 19v-8h14l.002 8H3z" />
                        <path d="M6 13H4v4h2v-4zm4 0H8v4h2v-4z" />
                      </svg>
                    </div>
                  </button>

                  {/* Settings/Quality Button */}
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-center items-center gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all relative"
                  >
                    <div className="w-6 h-6 relative overflow-hidden">
                      <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                      </svg>
                    </div>

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

                  {/* Picture in Picture */}
                  <button className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-center items-center gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                    <div className="w-6 h-6 relative overflow-hidden">
                      <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z" />
                      </svg>
                    </div>
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-center items-center gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    <div className="w-6 h-6 relative overflow-hidden">
                      {isFullscreen ? (
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                        </svg>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Status Bar */}
              <div className="flex items-center gap-3 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
                  <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomVideoPlayer;
