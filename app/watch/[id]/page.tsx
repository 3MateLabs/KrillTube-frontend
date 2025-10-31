'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer';
import { MobileWatchView } from '@/components/MobileWatchView';
import { formatDuration, formatBytes } from '@/lib/types';

/**
 * Extract blob ID from Walrus URI and clean it for Walrus Scan
 * Removes base64 padding and trailing encoded metadata that Walrus Scan doesn't recognize
 */
function extractBlobId(uri: string): string {
  // Extract blob ID from different Walrus URI formats:
  // - /v1/blobs/{blobId}
  // - /v1/blobs/by-quilt-patch-id/{patchId}
  const match = uri.match(/\/v1\/blobs\/(?:by-quilt-patch-id\/)?([^/]+)$/);
  if (!match) return uri;

  let blobId = match[1];

  // Remove trailing base64-encoded metadata that Walrus Scan doesn't use
  // Quilt patch IDs often have extra encoded data at the end (like BAQADAA, BAQACAA, etc.)
  // Strip everything after the last occurrence of 'B' followed by base64 padding patterns
  // These patterns typically end with AA, AQ, Ag, Aw, BA, etc.

  // Remove common quilt metadata suffixes
  blobId = blobId.replace(/B[A-Za-z0-9_-]{4,8}$/, '');

  return blobId;
}

export default function WatchPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
      const isTwitter = /Twitter|FBAN|FBAV/.test(userAgent);
      const isMobileDevice = typeof window !== 'undefined' && (
        /iPhone|iPad|iPod|Android/i.test(userAgent) || window.innerWidth < 768
      );
      setIsMobile(isTwitter || isMobileDevice);
    };
    
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/v1/videos/${videoId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Video not found');
          } else {
            setError('Failed to load video');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.video) {
          setVideo(data.video);
        } else {
          setError('Video not available');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-walrus-mint border-t-transparent mb-4"></div>
          <p className="text-text-muted">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-16 h-16 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || 'Video not found'}
          </h2>
          <p className="text-text-muted mb-6 text-sm">
            This video may have been removed or the link is incorrect.
          </p>
          <Link
            href="/upload"
            className="inline-block px-6 py-2.5 bg-walrus-mint text-walrus-black rounded-lg font-medium hover:bg-mint-800 transition-colors text-sm"
          >
            Upload a Video
          </Link>
        </div>
      </div>
    );
  }

  // Use mobile view for Twitter and mobile devices
  if (isMobile) {
    return <MobileWatchView video={video} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Custom Video Player with Green Theme */}
        <div className="mb-6">
          <CustomVideoPlayer
            videoId={video.id}
            videoUrl={video.walrusMasterUri}
            title={video.title}
            autoplay={false}
          />
        </div>

        {/* Video Info */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Main Column */}
          <div className="space-y-4">
            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground">
              {video.title}
            </h1>

            {/* Meta Row */}
            <div className="flex items-center gap-4 text-sm text-text-muted pb-4 border-b border-border/30">
              <span>{formatDuration(video.duration)}</span>
              <span>•</span>
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                🔒 Encrypted
              </span>
            </div>

            {/* Encryption Info */}
            <div className="py-3 px-4 bg-background-elevated border border-border/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    End-to-End Encrypted
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    This video is encrypted with AES-128-GCM. Segments are decrypted securely in your browser during playback.
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <details className="group py-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-walrus-mint transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 transform group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Technical Details & Blob IDs
              </summary>
              <div className="mt-3 pl-6 space-y-4 text-sm">
                {/* Video ID */}
                <div className="p-3 bg-background-elevated rounded-lg border border-border/20">
                  <p className="text-text-muted mb-1 text-xs font-medium">Video ID</p>
                  <p className="text-foreground font-mono text-xs break-all">{video.id}</p>
                </div>

                {/* Master Playlist */}
                <div className="p-3 bg-background-elevated rounded-lg border border-border/20">
                  <p className="text-text-muted mb-2 text-xs font-medium">🎬 Master Playlist (Encrypted)</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-text-muted text-xs mb-1">Blob ID:</p>
                      <p className="text-walrus-mint font-mono text-xs break-all">
                        {extractBlobId(video.walrusMasterUri)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs mb-1">Full URI:</p>
                      <a
                        href={video.walrusMasterUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline break-all text-xs"
                      >
                        {video.walrusMasterUri}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Poster */}
                {video.posterWalrusUri && (
                  <div className="p-3 bg-background-elevated rounded-lg border border-border/20">
                    <p className="text-text-muted mb-2 text-xs font-medium">🖼️ Poster Image</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-text-muted text-xs mb-1">Blob ID:</p>
                        <p className="text-walrus-mint font-mono text-xs break-all">
                          {extractBlobId(video.posterWalrusUri)}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-muted text-xs mb-1">Full URI:</p>
                        <a
                          href={video.posterWalrusUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline break-all text-xs"
                        >
                          {video.posterWalrusUri}
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Renditions */}
                {video.renditions.map((rendition: any) => (
                  <div key={rendition.name} className="p-3 bg-background-elevated rounded-lg border border-border/20">
                    <p className="text-text-muted mb-2 text-xs font-medium">
                      📊 {rendition.name} ({rendition.resolution})
                    </p>
                    <p className="text-foreground mb-3 text-xs">
                      {Math.floor(rendition.bitrate / 1000)} kbps • {rendition.segmentCount} encrypted segments
                    </p>

                    {/* Playlist Blob ID */}
                    <div className="space-y-2 mb-3 pb-3 border-b border-border/20">
                      <div>
                        <p className="text-text-muted text-xs mb-1">Playlist Blob ID:</p>
                        <p className="text-walrus-mint font-mono text-xs break-all">
                          {extractBlobId(rendition.walrusPlaylistUri)}
                        </p>
                      </div>
                      <div>
                        <p className="text-text-muted text-xs mb-1">Playlist URI:</p>
                        <a
                          href={rendition.walrusPlaylistUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline break-all text-xs"
                        >
                          {rendition.walrusPlaylistUri}
                        </a>
                      </div>
                    </div>

                    {/* Segment Blob IDs */}
                    <details className="group/segments">
                      <summary className="cursor-pointer text-xs text-text-muted hover:text-walrus-mint transition-colors flex items-center gap-1">
                        <svg className="w-3 h-3 transform group-open/segments:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Show {rendition.segmentCount} Segment Blob IDs
                      </summary>
                      <div className="mt-2 pl-4 space-y-2 max-h-60 overflow-y-auto">
                        {rendition.segments.map((segment: any) => (
                          <div key={segment.segIdx} className="text-xs">
                            <p className="text-text-muted mb-1">
                              Segment {segment.segIdx}: <span className="text-walrus-mint font-mono">{extractBlobId(segment.walrusUri)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Creator */}
            <div className="p-4 bg-background-elevated rounded-lg border border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-walrus-mint rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-walrus-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted mb-0.5">Created by</p>
                  <p className="text-sm text-foreground font-mono truncate">
                    {video.creatorId.slice(0, 8)}...{video.creatorId.slice(-6)}
                  </p>
                </div>
              </div>
            </div>

            {/* Walrus Badge */}
            <div className="p-4 bg-background-elevated rounded-lg border border-border/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-walrus-mint rounded flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-walrus-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-1">
                    Stored on Walrus
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Decentralized storage with no central point of failure.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Quality */}
            <div className="p-4 bg-background-elevated rounded-lg border border-border/30">
              <h3 className="text-sm font-medium text-foreground mb-3">Available Quality</h3>
              <div className="space-y-2">
                {video.renditions.map((rendition: any) => (
                  <div key={rendition.name} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{rendition.name}</span>
                    <span className="text-text-muted">{rendition.resolution}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
