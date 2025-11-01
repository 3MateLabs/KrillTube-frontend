'use client';

import Link from 'next/link';
import { ConnectWallet } from './ConnectWallet';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-transparent pointer-events-none" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern-subtle opacity-30 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3 px-4 lg:px-6 py-4 max-w-[2000px] mx-auto">
          {/* Left section: Menu + Logo */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Hamburger Menu */}
            <button
              onClick={onMenuClick}
              className="group p-2 rounded-xl hover:bg-background-elevated active:scale-95 transition-all duration-200 text-foreground"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

          {/* KrillTube Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <img
                src="/logos/krilll.png"
                alt="KrillTube Logo"
                className="w-full h-full"
              />
            </div>
            <span className="text-lg font-bold text-foreground group-hover:text-walrus-mint transition-colors">
              KrillTube
            </span>
          </a>
        </div>

          {/* Center section: Search */}
          <div className="flex-1 max-w-xl mx-2 lg:mx-8">
            <form onSubmit={handleSearch} className="relative group">
              <div className={`
                absolute inset-0 bg-gradient-to-r from-walrus-mint/20 to-walrus-grape/20 rounded-full blur-md opacity-0 transition-opacity duration-300
                ${isSearchFocused ? 'opacity-100' : 'group-hover:opacity-50'}
              `} />

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search videos..."
                  className={`
                    w-full pl-12 pr-4 py-2.5
                    border-2 rounded-full
                    bg-background-elevated/80 backdrop-blur-sm
                    text-foreground text-sm placeholder:text-text-muted
                    focus:outline-none transition-all duration-300
                    ${isSearchFocused
                      ? 'border-walrus-mint shadow-lg shadow-mint-900/20 bg-background-elevated'
                      : 'border-border/50 hover:border-border'
                    }
                  `}
                />
                <div className="absolute left-4 pointer-events-none">
                  <svg
                    className={`w-5 h-5 transition-colors ${isSearchFocused ? 'text-walrus-mint' : 'text-text-muted'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 p-1 rounded-full hover:bg-background-hover transition-colors text-text-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right section: Upload + Wallet */}
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Upload Button */}
            <Link
              href="/upload"
              className="group relative flex items-center gap-2 px-4 lg:px-5 py-2.5 overflow-hidden rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95"
            >
              {/* White background */}
              <div className="absolute inset-0 bg-white group-hover:bg-gray-100 transition-all" />

              {/* Glow effect */}
              <div className="absolute inset-0 bg-white blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />

              {/* Content */}
              <div className="relative flex items-center gap-2 text-walrus-black">
                <svg
                  className="w-5 h-5 group-hover:rotate-12 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="hidden sm:inline">Upload</span>
              </div>
            </Link>

            {/* Wallet Connection */}
            <div className="flex items-center gap-3 pl-2 lg:pl-3 border-l border-border/30">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
