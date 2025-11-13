'use client';

import Link from 'next/link';
import Image from 'next/image';
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
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#0668A6]">
      <div className="flex items-center gap-12 px-12 py-5 lg:ml-72">
        {/* Hamburger Menu - Mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center"
        >
          <Image src="/logos/hambuger.svg" alt="Menu" width={24} height={24} className="w-6 h-6 invert" />
        </button>

        {/* Search Bar - Takes up most space */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSearch} className="w-full">
            <div className="w-full h-14 px-8 bg-transparent rounded-full border-[3px] border-black flex justify-between items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by handle...."
                className="flex-1 bg-transparent text-white placeholder-white outline-none text-base font-medium font-['Outfit']"
              />
              <Image src="/logos/search.svg" alt="Search" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
            </div>
          </form>
        </div>

        {/* Right Section - Compact buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bell Icon */}
          <button className="w-14 h-14 rounded-full border-[3px] border-white bg-gradient-to-br from-[#EF4330]/70 to-[#1AAACE]/70 flex items-center justify-center hover:opacity-80 transition-opacity">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* History/Clock Icon */}
          <button className="w-14 h-14 rounded-full border-[3px] border-white bg-gradient-to-br from-[#EF4330]/70 to-[#1AAACE]/70 flex items-center justify-center hover:opacity-80 transition-opacity">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Upload Button */}
          <Link
            href="/upload"
            className="h-14 px-6 bg-white rounded-full border-[3px] border-black text-black text-sm font-bold font-['Outfit'] hover:bg-[#FFEEE5] transition-colors whitespace-nowrap flex items-center"
          >
            Upload
          </Link>

          {/* Connect Wallet Button */}
          <div className="h-14 px-6 bg-white rounded-full outline outline-[3px] outline-offset-[-3px] outline-black inline-flex items-center hover:bg-[#FFEEE5] transition-colors">
            <div className="text-black text-base font-bold font-['Outfit']">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
