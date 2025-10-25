'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VideoCard } from '@/components/VideoCard';
import { WalrusBadgeAnimated } from '@/components/WalrusBadge';

interface Asset {
  id: string;
  title: string;
  creatorId: string;
  status: string;
  createdAt: string;
  posterUrl?: string;
  latestRevision?: any;
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch('/api/v1/assets?limit=12');
        if (response.ok) {
          const data = await response.json();
          setAssets(data.assets || []);
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // Featured videos (first 2)
  const featuredVideos = assets.slice(0, 2);
  const recentVideos = assets.slice(2);

  return (
    <div className="min-h-screen bg-background">
      {/* Video Grid */}
      {assets.length > 0 ? (
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10">
            {assets.map((asset) => (
              <VideoCard
                key={asset.id}
                id={asset.id}
                title={asset.title}
                thumbnail={asset.posterUrl}
                creator={`${asset.creatorId.slice(0, 6)}...${asset.creatorId.slice(-4)}`}
                uploadedAt={asset.createdAt}
                variant="default"
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-foreground border-t-transparent"></div>
          <p className="text-text-muted mt-4">Loading videos...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && assets.length === 0 && (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-md mx-auto px-6">
            <svg className="w-24 h-24 text-text-muted/40 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No videos yet
            </h3>
            <p className="text-text-muted mb-6 text-sm">
              Be the first to upload a video to Walrus
            </p>
            <Link
              href="/upload"
              className="inline-block px-6 py-3 bg-walrus-mint text-walrus-black rounded-lg text-sm font-medium hover:bg-mint-800 transition-colors"
            >
              Upload Video
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
