'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VideoCard } from '@/components/VideoCard';

interface Asset {
  id: string;
  title: string;
  creatorId: string;
  status: string;
  createdAt: string;
  posterUrl?: string;
  latestRevision?: any;
}

export default function LibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 24,
    offset: 0,
    hasMore: false,
  });

  const fetchAssets = async (offset = 0) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/assets?limit=24&offset=${offset}`);
      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
        setPagination(data.pagination || { total: 0, limit: 24, offset: 0, hasMore: false });
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleNextPage = () => {
    const nextOffset = pagination.offset + pagination.limit;
    fetchAssets(nextOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, pagination.offset - pagination.limit);
    fetchAssets(prevOffset);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border/30">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Library</h1>
          <p className="text-sm text-text-muted">
            {pagination.total > 0
              ? `${pagination.total} ${pagination.total === 1 ? 'video' : 'videos'}`
              : 'No videos yet'}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-foreground border-t-transparent mb-4"></div>
            <p className="text-text-muted">Loading videos...</p>
          </div>
        </div>
      ) : assets.length === 0 ? (
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-md mx-auto px-6">
            <svg className="w-24 h-24 text-text-muted/40 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No videos yet
            </h3>
            <p className="text-text-muted mb-6 text-sm">
              Upload your first video to get started
            </p>
            <Link
              href="/upload"
              className="inline-block px-6 py-3 bg-walrus-mint text-walrus-black rounded-lg text-sm font-medium hover:bg-mint-800 transition-colors"
            >
              Upload Video
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Video Grid */}
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

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="mt-12 flex justify-center items-center gap-4">
                <button
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
                >
                  Previous
                </button>

                <span className="text-sm text-text-muted">
                  Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                  {Math.ceil(pagination.total / pagination.limit)}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasMore}
                  className="px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:border-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
