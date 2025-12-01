'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ConnectWallet } from './ConnectWallet';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
  onToggleCollapse?: () => void;
  isSidebarCollapsed?: boolean;
  showHamburgerOnly?: boolean;
}

export function Header({ onMenuClick, isSidebarOpen = true, onToggleCollapse, isSidebarCollapsed = false, showHamburgerOnly = false }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const pathname = usePathname();

  const isTransparent = pathname === '/scrolls' || pathname.startsWith('/scrolls/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  // Determine margin based on sidebar state
  const getMarginClass = () => {
    if (showHamburgerOnly) return 'ml-0';
    if (isSidebarCollapsed) return 'ml-[160px]';
    return 'ml-[320px]';
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[60] w-full ${isTransparent ? '' : 'bg-[#0668A6]'}`}>
      <div className={`flex items-center gap-12 px-8 py-5 transition-all duration-300 ${getMarginClass()}`}>
        {/* Hamburger menu - only shown when sidebar is fully hidden */}
        {showHamburgerOnly && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onToggleCollapse}
              className="p-2 bg-black rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="p-2 bg-black rounded-[32px] inline-flex justify-center items-center pointer-events-none">
                <img src="/logos/hambuger.svg" alt="Menu" width={24} height={24} className="w-6 h-6" />
              </div>
            </button>
            <div className="px-4 py-2 bg-black rounded-[32px] inline-flex justify-center items-center gap-1.5">
              <img src="/logos/kril_tube_icon.png" alt="Krill Tube" width={32} height={32} className="w-8 h-8 rounded-full" />
              <div className="justify-start text-white text-base font-bold font-['Outfit']">Krill Tube</div>
            </div>
          </div>
        )}
        {/* Search Bar - Takes up most space */}
        <div className="flex-1 min-w-0">
          <form onSubmit={handleSearch} className="w-full">
            <div className="w-full h-14 p-2 bg-cyan-500/30 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-center items-center gap-2.5">
              <div className="self-stretch px-5 py-[5px] inline-flex justify-between items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by handle...."
                  className="flex-1 bg-transparent text-white placeholder-white outline-none text-base font-medium font-['Outfit']"
                />
                <img src="/logos/search.svg" alt="Search" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
              </div>
            </div>
          </form>
        </div>

        {/* Right Section - Compact buttons */}
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Bell Icon */}
          <button className="w-14 h-14 rounded-full border-[3px] border-white bg-gradient-to-br from-[#EF4330]/70 to-[#1AAACE]/70 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:opacity-80 transition-opacity">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* History/Clock Icon */}
          <button className="w-14 h-14 rounded-full border-[3px] border-white bg-gradient-to-br from-[#EF4330]/70 to-[#1AAACE]/70 shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center hover:opacity-80 transition-opacity">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Upload Button */}
          <Link
            href="/upload"
            className={`font-bold h-14 px-6 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base w-[86px] whitespace-nowrap flex items-center justify-center ${
              isTransparent
                ? 'bg-white/20 text-white border-[3px] border-black'
                : 'bg-white text-black outline outline-[3px] outline-black'
            }`}
          >
            Upload
          </Link>

          {/* Connect Wallet Button */}
          <ConnectWallet isTransparent={isTransparent} />
        </div>
      </div>
    </header>
  );
}
