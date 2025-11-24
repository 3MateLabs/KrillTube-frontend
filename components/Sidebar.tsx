'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useWalletContext } from '@/lib/context/WalletContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isOpen = true, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const { address, isConnected } = useWalletContext();
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string | null } | null>(null);

  const showText = !isCollapsed || isHovered;

  // Fetch user profile
  const fetchProfile = async () => {
    if (!address) {
      setUserProfile(null);
      return;
    }

    try {
      const response = await fetch(`/api/v1/profile/${address}`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          name: data.profile.name,
          avatar: data.profile.avatar,
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  // Initial fetch when address changes
  useEffect(() => {
    fetchProfile();
  }, [address]);

  // Refetch profile when navigating (especially from edit page)
  useEffect(() => {
    if (address && pathname) {
      // Refetch when navigating to profile or away from edit page
      if (pathname.startsWith('/profile/') || pathname === '/') {
        fetchProfile();
      }
    }
  }, [pathname, address]);

  // Refetch profile when window regains focus (in case user edited in another tab)
  useEffect(() => {
    const handleFocus = () => {
      if (address) {
        fetchProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [address]);

  // Listen for profile update events (triggered from edit page)
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (address) {
        fetchProfile();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [address]);

  // Get display name: profile name > shortened address
  const getDisplayName = () => {
    if (userProfile?.name && !userProfile.name.startsWith('Creator 0x')) {
      return userProfile.name;
    }
    if (address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return '@EasonC13';
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => isCollapsed && setIsHovered(false)}
        className={`
          fixed top-0 left-0 bottom-0 z-40 h-screen
          bg-[#0668A6] shadow-[0_4px_15px_rgba(42,42,42,0.31)] border-r-[3px] border-black backdrop-blur-[100px]
          overflow-y-auto overflow-x-hidden
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${showText ? 'w-72' : 'w-20'}
        `}
      >
        {/* Logo */}
        <div className={`mt-[18px] inline-flex items-center gap-3 transition-all duration-300 ${showText ? 'w-56 mx-[29px] justify-start' : 'w-full justify-center'}`}>
          <button
            onClick={onToggleCollapse}
            className="p-2 bg-black rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="p-2 bg-black rounded-[32px] inline-flex justify-center items-center">
              <img src="/logos/hamburger-menu.svg" alt="Menu" width={24} height={24} className="w-6 h-6" />
            </div>
          </button>
          {showText && (
            <Link href="/" className="flex-1 p-2 bg-black rounded-[32px] inline-flex flex-col justify-start items-start gap-2.5">
              <div className="self-stretch p-2 bg-black rounded-[32px] inline-flex justify-center items-center gap-2">
                <img src="/logos/kril_tube_icon.png" alt="Krill Tube" width={24} height={24} className="rounded-full" />
                <div className="justify-start text-white text-base font-bold font-['Outfit'] whitespace-nowrap">Krill Tube</div>
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <div className={`mt-[17px] mb-6 inline-flex flex-col justify-start items-start gap-4 transition-all duration-300 ${showText ? 'w-56 mx-[29px]' : 'mx-auto w-fit'}`}>
          {/* Main Menu */}
          <div className={`px-4 py-8 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5 ${showText ? 'self-stretch' : ''}`}>
            <div className={`flex flex-col justify-center items-start gap-4 ${showText ? 'self-stretch' : ''}`}>
              <Link
                href="/"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/home.svg" alt="Home" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Home</div>}
              </Link>

              <Link
                href="/watch"
                onClick={onClose}
                className={`px-4 py-2 rounded-[32px] inline-flex justify-start items-center gap-2.5 transition-colors ${
                  pathname === '/watch'
                    ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black'
                    : 'hover:bg-white/50'
                } ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/watch.svg" alt="Watch" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/watch' ? 'brightness-0 invert' : ''}`} />
                {showText && <div className={`justify-start text-base font-semibold font-['Outfit'] whitespace-nowrap ${pathname === '/watch' ? 'text-white' : 'text-black'}`}>Watch</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/playlist.svg" alt="Playlists" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Playlists</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/about.svg" alt="About" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">About</div>}
              </Link>

              <Link
                href="/subscriptions"
                onClick={onClose}
                className={`px-4 py-2 rounded-[32px] inline-flex justify-start items-center gap-2.5 transition-colors ${
                  pathname === '/subscriptions'
                    ? 'bg-[#CF2C2F] outline outline-[3px] outline-offset-[-3px] outline-black'
                    : 'hover:bg-white/50'
                } ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/subscriptions.svg" alt="Subscriptions" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/subscriptions' ? 'brightness-0 invert' : ''}`} />
                {showText && <div className={`justify-start text-base font-semibold font-['Outfit'] whitespace-nowrap ${pathname === '/subscriptions' ? 'text-white' : 'text-black'}`}>Subscriptions</div>}
              </Link>
            </div>
          </div>

          {/* Explore Menu */}
          <div className={`px-4 py-8 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5 ${showText ? 'self-stretch' : ''}`}>
            <div className={`flex flex-col justify-center items-start gap-4 ${showText ? 'self-stretch' : ''}`}>
              {showText ? (
                <div className="self-stretch px-4 pb-4 border-b-2 border-black inline-flex justify-center items-center gap-2.5">
                  <div className="flex-1 justify-start text-black text-xl font-semibold font-['Outfit']">Explore</div>
                  <div className="w-10 h-10 bg-black rounded-full flex justify-center items-center">
                    <img src="/logos/explore.svg" alt="Explore" width={24} height={24} className="w-6 h-6" />
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 border-b-2 border-black inline-flex justify-center items-center">
                  <div className="w-10 h-10 bg-black rounded-full flex justify-center items-center">
                    <img src="/logos/explore.svg" alt="Explore" width={24} height={24} className="w-6 h-6" />
                  </div>
                </div>
              )}

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/photos.svg" alt="Photos" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Photos</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/scrolls.svg" alt="Scrolls" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Scrolls</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/meme.svg" alt="Meme" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Meme</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/earn.svg" alt="Earn" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Earn</div>}
              </Link>
            </div>
          </div>

          {/* User Menu */}
          <div className={`px-4 py-8 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5 ${showText ? 'self-stretch' : ''}`}>
            <div className={`flex flex-col justify-center items-start gap-4 ${showText ? 'self-stretch' : ''}`}>
              {isConnected && address && (
                <Link
                  href={`/profile/${address}`}
                  onClick={onClose}
                  className={`px-4 py-2 rounded-[32px] inline-flex justify-start items-center gap-2.5 transition-colors ${
                    pathname === `/profile/${address}`
                      ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black'
                      : 'hover:bg-white/50'
                  } ${showText ? 'self-stretch' : ''}`}
                >
                  <svg className={`w-6 h-6 flex-shrink-0 ${pathname === `/profile/${address}` ? 'text-white' : 'text-black'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {showText && <div className={`justify-start text-base font-semibold font-['Outfit'] whitespace-nowrap ${pathname === `/profile/${address}` ? 'text-white' : 'text-black'}`}>Your Channel</div>}
                </Link>
              )}

              <Link
                href="/library"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/your Uploads.svg" alt="Your Uploads" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Your Uploads</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <img src="/logos/send feedback.svg" alt="Send feedback" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Send feedback</div>}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg ${showText ? 'self-stretch' : ''}`}
              >
                <div className="w-6 h-6 relative overflow-hidden flex-shrink-0">
                  <div className="w-5 h-5 left-[1px] top-[1px] absolute bg-black" />
                </div>
                {showText && <div className="justify-start text-black text-base font-semibold font-['Outfit'] whitespace-nowrap">Setting</div>}
              </Link>
            </div>
          </div>

          {/* User Profile - Clickable */}
          {isConnected && address ? (
            <Link
              href={`/profile/${address}`}
              onClick={onClose}
              className={`inline-flex items-center gap-3 transition-all duration-300 hover:opacity-80 ${showText ? 'self-stretch justify-center' : 'w-full justify-start ml-4'}`}
            >
              <div className="w-[50px] h-[50px] flex-shrink-0 bg-black rounded-full shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white overflow-hidden">
                {userProfile?.avatar ? (
                  <img
                    src={userProfile.avatar}
                    alt={getDisplayName()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0668A6] to-[#1AAACE]">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              {showText && (
                <div className="flex-1 h-[52px] p-2 bg-black rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center">
                  <div className="text-white text-base font-semibold font-['Montserrat'] whitespace-nowrap">
                    {getDisplayName()}
                  </div>
                </div>
              )}
            </Link>
          ) : (
            <div className={`inline-flex items-center gap-3 transition-all duration-300 ${showText ? 'self-stretch justify-center' : 'w-full justify-start ml-4'}`}>
              <div className="w-[50px] h-[50px] flex-shrink-0">
                <img className="w-[50px] h-[50px] rounded-full object-cover" src="/eason.svg" alt="User" width={50} height={50} />
              </div>
              {showText && (
                <div className="flex-1 h-[52px] p-2 bg-black rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center">
                  <div className="text-white text-base font-semibold font-['Montserrat'] whitespace-nowrap">@EasonC13</div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
