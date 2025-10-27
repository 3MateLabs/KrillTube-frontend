'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { WalrusBadgeInline } from './WalrusBadge';

interface VideoCardProps {
  id: string;
  title: string;
  thumbnail?: string;
  creator?: string;
  duration?: string;
  views?: number;
  uploadedAt?: Date | string;
  variant?: 'default' | 'featured' | 'compact';
  accentColor?: string;
}

export function VideoCard({
  id,
  title,
  thumbnail,
  creator = 'Anonymous',
  duration,
  views,
  uploadedAt,
  variant = 'default',
  accentColor,
}: VideoCardProps) {
  const [imageError, setImageError] = useState(false);
  const formattedViews = views ? formatViews(views) : '0 views';
  const formattedDate = uploadedAt ? formatDate(uploadedAt) : 'Just now';

  if (variant === 'featured') {
    return (
      <Link
        href={`/watch/${id}`}
        className="group block relative overflow-hidden rounded-walrus bg-gradient-to-br from-walrus-grape via-grape-800 to-blueberry aspect-[16/9] transition-transform hover:scale-[1.02]"
        style={accentColor ? { backgroundImage: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` } : undefined}
      >
        {/* Thumbnail */}
        {thumbnail && !imageError && (
          <div className="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity">
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover"
              unoptimized
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {/* Content Overlay */}
        <div className="relative h-full p-6 flex flex-col justify-between">
          {/* Top badges */}
          <div className="flex items-start justify-between">
            <WalrusBadgeInline className="bg-white/90 text-walrus-black" />
            {duration && (
              <span className="px-2 py-1 bg-black/70 text-white text-xs font-semibold rounded">
                {duration}
              </span>
            )}
          </div>

          {/* Title and info */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 drop-shadow-lg">
              {title}
            </h3>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <span className="font-medium">{creator}</span>
              <span>•</span>
              <span>{formattedViews}</span>
            </div>
          </div>

          {/* Play button */}
          <div className="absolute bottom-6 right-6">
            <div className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-all group-hover:scale-110 shadow-xl">
              <svg
                className="w-5 h-5 text-walrus-black ml-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        href={`/watch/${id}`}
        className="group flex gap-3 p-2 rounded-walrus hover:bg-background-elevated transition-all"
      >
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-40 aspect-video bg-background-elevated rounded overflow-hidden">
          {thumbnail && !imageError ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
              unoptimized
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-walrus-mint to-walrus-grape">
              <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
          )}
          {duration && (
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-xs font-semibold rounded">
              {duration}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-1">
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-walrus-mint transition-colors">
            {title}
          </h4>
          <div className="flex flex-col gap-1 text-xs text-text-muted">
            <span>{creator}</span>
            <div className="flex items-center gap-2">
              <span>{formattedViews}</span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      href={`/watch/${id}`}
      className="group block cursor-pointer p-3 rounded-xl border-b border-walrus-mint"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-background-elevated rounded-xl overflow-hidden mb-3">
        {thumbnail && !imageError ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
            <svg className="w-16 h-16 text-white/30" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
        )}

        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/90 text-white text-xs font-semibold rounded">
            {duration}
          </div>
        )}
      </div>

      {/* Video info */}
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground line-clamp-2 leading-tight">
          {title}
        </h3>
        <div className="space-y-1">
          <div className="text-sm text-text-muted truncate">{creator}</div>
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <span>{formattedViews}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Helper functions
function formatViews(views: number): string {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
