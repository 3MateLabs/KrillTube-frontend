'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useWalletContext } from '@/lib/context/WalletContext';
import { ConnectWalletModal } from './modals/ConnectWalletModal';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  onError?: (error: string) => void;
}

export function VideoPlayer({ src, poster, autoPlay = false, onError }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const { isConnected } = useWalletContext();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Monitor wallet disconnection during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('[VideoPlayer] Wallet status changed:', { isConnected, isPlaying });

    // If wallet disconnects while video is playing, pause and show modal
    if (!isConnected && isPlaying) {
      console.log('[VideoPlayer] Wallet disconnected during playback, pausing video');
      video.pause();
      setShowConnectModal(true);
    }
  }, [isConnected, isPlaying]);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<Array<{ index: number; height: number; label: string }>>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[Player] Manifest parsed, ready to play');

        // Get available quality levels
        const levels = hls.levels.map((level, index) => ({
          index,
          height: level.height,
          label: `${level.height}p`,
        }));

        console.log('[Player] Available quality levels:', levels);
        setQualityLevels(levels);
        setCurrentQuality(hls.currentLevel);

        setIsLoading(false);
        if (autoPlay) {
          video.play().catch((err) => {
            console.warn('[Player] Autoplay failed:', err);
          });
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('[Player] HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('[Player] Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('[Player] Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              const errorMsg = `Cannot recover from error: ${data.type}`;
              setError(errorMsg);
              onError?.(errorMsg);
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        console.log('[Player] Native HLS loaded');
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch((err) => {
            console.warn('[Player] Autoplay failed:', err);
          });
        }
      });

      video.addEventListener('error', () => {
        const errorMsg = 'Video playback error';
        setError(errorMsg);
        onError?.(errorMsg);
      });
    } else {
      const errorMsg = 'HLS is not supported in this browser';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [src, autoPlay, onError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if wallet is connected before playing
    if (!isPlaying && !isConnected) {
      setShowConnectModal(true);
      return;
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const changeQuality = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;

    console.log('[Player] Changing quality to level index:', levelIndex);
    console.log('[Player] Level details:', hls.levels[levelIndex]);
    hls.currentLevel = levelIndex;
    setShowQualityMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center">
        <div className="text-center text-white p-6">
          <p className="text-lg mb-2">Playback Error</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
      onMouseMove={() => setShowControls(true)}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-walrus-mint border-t-transparent mx-auto mb-3"></div>
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        poster={poster}
        playsInline
        onClick={togglePlay}
      />

      {/* Custom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressRef}
          className="w-full h-1.5 bg-white/20 cursor-pointer hover:h-2 transition-all group/progress"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-walrus-mint transition-all relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-walrus-mint rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-walrus-mint transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Volume */}
          <button
            onClick={toggleMute}
            className="text-white hover:text-walrus-mint transition-colors"
          >
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Time */}
          <div className="text-white text-sm font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="flex-1"></div>

          {/* Quality Selector */}
          {qualityLevels.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-white hover:text-walrus-mint transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">
                  {currentQuality === -1 ? 'Auto' : qualityLevels[currentQuality]?.label || 'Auto'}
                </span>
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg overflow-hidden shadow-xl min-w-[120px]">
                  <button
                    onClick={() => changeQuality(-1)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      currentQuality === -1
                        ? 'bg-walrus-mint text-walrus-black font-semibold'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Auto
                  </button>
                  {qualityLevels
                    .sort((a, b) => b.height - a.height)
                    .map((level) => (
                      <button
                        key={level.index}
                        onClick={() => changeQuality(level.index)}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                          currentQuality === level.index
                            ? 'bg-walrus-mint text-walrus-black font-semibold'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-walrus-mint transition-colors"
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </div>
  );
}
