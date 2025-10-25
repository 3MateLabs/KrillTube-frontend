'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { VideoPlayer } from '@/components/VideoPlayer';
import { formatDuration, formatBytes } from '@/lib/types';

export default function WatchPage() {
  const params = useParams();
  const assetId = params.id as string;

  const [manifest, setManifest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/v1/assets/${assetId}`);

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

        if (data.manifest) {
          setManifest(data.manifest);
        } else {
          setError('Video manifest not available');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching asset:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

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

  if (error || !manifest) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Video Player */}
        <div className="bg-black rounded-lg overflow-hidden mb-4">
          <VideoPlayer
            src={manifest.masterPlaylist.url}
            poster={manifest.poster?.url}
            autoPlay={false}
            onError={(err) => setError(err)}
          />
        </div>

        {/* Video Info */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Main Column */}
          <div className="space-y-4">
            {/* Title */}
            <h1 className="text-xl font-semibold text-foreground">
              {manifest.title}
            </h1>

            {/* Meta Row */}
            <div className="flex items-center gap-4 text-sm text-text-muted pb-4 border-b border-border/30">
              <span>{formatDuration(manifest.duration)}</span>
              <span>•</span>
              <span>{new Date(manifest.uploadedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span>{formatBytes(manifest.totalSize)}</span>
            </div>

            {/* Description */}
            {manifest.description && (
              <div className="py-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {manifest.description}
                </p>
              </div>
            )}

            {/* Technical Details */}
            <details className="group py-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-walrus-mint transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 transform group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Technical Details
              </summary>
              <div className="mt-3 pl-6 space-y-3 text-sm">
                <div>
                  <p className="text-text-muted mb-1">Master Playlist</p>
                  <a
                    href={manifest.masterPlaylist.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-walrus-mint hover:underline break-all"
                  >
                    {manifest.masterPlaylist.url}
                  </a>
                </div>

                {manifest.renditions.map((rendition: any) => (
                  <div key={rendition.quality}>
                    <p className="text-text-muted mb-1">
                      {rendition.quality} ({rendition.resolution})
                    </p>
                    <p className="text-foreground mb-1">
                      {Math.floor(rendition.bitrate / 1000)} kbps • {rendition.segments.length} segments
                    </p>
                    <a
                      href={rendition.playlist.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-walrus-mint hover:underline break-all"
                    >
                      {rendition.playlist.url}
                    </a>
                  </div>
                ))}

                <div>
                  <p className="text-text-muted mb-1">Asset ID</p>
                  <p className="text-foreground font-mono text-xs break-all">{manifest.assetId}</p>
                </div>
              </div>
            </details>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Uploader */}
            <div className="p-4 bg-background-elevated rounded-lg border border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-walrus-mint rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-walrus-black" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted mb-0.5">Uploaded by</p>
                  <p className="text-sm text-foreground font-mono truncate">
                    {manifest.uploadedBy.slice(0, 8)}...{manifest.uploadedBy.slice(-6)}
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

            {/* Quality */}
            <div className="p-4 bg-background-elevated rounded-lg border border-border/30">
              <h3 className="text-sm font-medium text-foreground mb-3">Available Quality</h3>
              <div className="space-y-2">
                {manifest.renditions.map((rendition: any) => (
                  <div key={rendition.quality} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{rendition.quality}</span>
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
