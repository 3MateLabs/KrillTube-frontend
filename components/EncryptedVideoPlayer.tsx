/**
 * Example React component for encrypted video playback
 *
 * Demonstrates how to use the useEncryptedVideo hook
 */

'use client';

import React from 'react';
import { useEncryptedVideo } from '@/lib/player/useEncryptedVideo';

export interface EncryptedVideoPlayerProps {
  videoId: string;
  videoUrl: string;
  title?: string;
  autoplay?: boolean;
  className?: string;
}

/**
 * Encrypted video player component
 *
 * Usage:
 * ```tsx
 * <EncryptedVideoPlayer
 *   videoId="video_123"
 *   videoUrl="https://walrus.../master.m3u8"
 *   title="My Encrypted Video"
 *   autoplay={false}
 * />
 * ```
 */
export function EncryptedVideoPlayer({
  videoId,
  videoUrl,
  title,
  autoplay = false,
  className = '',
}: EncryptedVideoPlayerProps) {
  const {
    videoRef,
    isLoading,
    isPlaying,
    error,
    session,
    play,
    pause,
  } = useEncryptedVideo({
    videoId,
    videoUrl,
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

  return (
    <div className={`encrypted-video-player ${className}`}>
      {/* Title */}
      {title && (
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {session && (
            <p className="text-sm text-gray-500">
              Session expires: {session.expiresAt.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center bg-black aspect-video rounded-lg">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Initializing secure playback...</p>
            <p className="text-sm text-gray-400 mt-2">
              Establishing encrypted session...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
          <h4 className="font-bold">Playback Error</h4>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Video Element */}
      <div className={isLoading || error ? 'hidden' : ''}>
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black rounded-lg"
          controls
          playsInline
        />
      </div>

      {/* Playback Info */}
      {!isLoading && !error && (
        <div className="mt-4 text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isPlaying ? 'bg-green-500' : 'bg-gray-400'
                }`}
              ></span>
              <span>{isPlaying ? 'Playing' : 'Paused'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              <span>Encrypted</span>
            </div>

            {session && (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                <span>Session: {session.sessionId.substring(0, 8)}...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && session && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-semibold">
            Debug Info
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(
              {
                videoId: session.videoId,
                sessionId: session.sessionId,
                expiresAt: session.expiresAt,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}

export default EncryptedVideoPlayer;
