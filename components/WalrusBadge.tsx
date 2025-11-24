'use client';

import Image from 'next/image';

interface WalrusBadgeProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

/**
 * Badge component to indicate content is stored on Walrus decentralized storage
 * Follows Walrus brand guidelines with mint/grape color scheme
 */
export function WalrusBadge({ variant = 'default', className = '' }: WalrusBadgeProps) {
  if (variant === 'icon-only') {
    return (
      <div
        className={`inline-flex items-center justify-center w-8 h-8 bg-walrus-mint rounded ${className}`}
        title="Stored on Walrus"
      >
        <img
          src="/logos/walrus-icon-color.svg"
          alt="Walrus"
          width={20}
          height={20}
          className="w-5 h-5"
        />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 bg-walrus-mint rounded-walrus ${className}`}
        title="Stored on Walrus decentralized storage"
      >
        <img
          src="/logos/walrus-icon-color.svg"
          alt="Walrus"
          width={16}
          height={16}
          className="w-4 h-4"
        />
        <span className="text-xs font-semibold text-walrus-black">WALRUS</span>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-walrus-mint to-mint-600 rounded-walrus shadow-sm ${className}`}
      title="Stored on Walrus decentralized storage"
    >
      <div className="flex-shrink-0 w-6 h-6 bg-white rounded flex items-center justify-center">
        <img
          src="/logos/walrus-icon-color.svg"
          alt="Walrus"
          width={20}
          height={20}
          className="w-5 h-5"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-walrus-black leading-tight">
          Stored on
        </span>
        <span className="text-sm font-bold text-walrus-black leading-tight">
          WALRUS
        </span>
      </div>
    </div>
  );
}

/**
 * Animated badge variant with pulse effect for hero sections
 */
export function WalrusBadgeAnimated({ className = '' }: { className?: string }) {
  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Pulse animation background */}
      <span className="absolute inset-0 bg-walrus-mint rounded-walrus animate-pulse opacity-75" />

      {/* Badge content */}
      <div className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-walrus-mint rounded-walrus border-2 border-mint-800">
        <div className="flex-shrink-0 w-7 h-7 bg-white rounded-full flex items-center justify-center">
          <img
            src="/logos/walrus-icon-color.svg"
            alt="Walrus"
            width={24}
            height={24}
            className="w-6 h-6"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-walrus-black leading-tight">
            Stored on
          </span>
          <span className="text-base font-bold text-walrus-black leading-tight tracking-wide">
            WALRUS
          </span>
        </div>
        <svg
          className="w-4 h-4 text-grape-800"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Small inline badge for lists and grids
 */
export function WalrusBadgeInline({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 bg-mint-600 rounded text-xs font-medium text-walrus-black ${className}`}
      title="Stored on Walrus"
    >
      <svg
        className="w-3 h-3 text-grape-800"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
        <path d="M10 6a1 1 0 011 1v4a1 1 0 11-2 0V7a1 1 0 011-1z" />
        <circle cx="10" cy="13" r="1" />
      </svg>
      Walrus
    </span>
  );
}
