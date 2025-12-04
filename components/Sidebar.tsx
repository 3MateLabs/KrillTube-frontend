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
  hideWhenCollapsed?: boolean;
}

export function Sidebar({ isOpen = true, onClose, isCollapsed = false, onToggleCollapse = () => {}, hideWhenCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { address, isConnected } = useWalletContext();
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string | null } | null>(null);

  const showText = !isCollapsed;

  // If hideWhenCollapsed is true and sidebar is collapsed, hide the entire sidebar
  const shouldHide = hideWhenCollapsed && isCollapsed;

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

  // Don't render sidebar at all when it should be hidden
  if (shouldHide) {
    return null;
  }

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
        className={`
          fixed top-0 left-0 bottom-0 z-[70] h-screen
          bg-[#0668A6] shadow-[0_4px_15px_rgba(42,42,42,0.31)] border-r-[3px] border-black backdrop-blur-[100px]
          overflow-y-auto overflow-x-hidden
          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
          transition-[width] duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${showText ? 'w-72' : 'w-[120px]'}
        `}
      >
        {/* Logo Section - Now inside sidebar */}
        <div className={`flex items-center gap-3 pt-[18px] pb-4 transition-all duration-300 ${showText ? 'px-[29px]' : 'px-2 justify-center'}`}>
          <button
            onClick={onToggleCollapse}
            className="p-2 bg-black rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
          >
            <div className="p-2 bg-black rounded-[32px] inline-flex justify-center items-center pointer-events-none">
              <img src="/logos/hambuger.svg" alt="Menu" width={24} height={24} className="w-6 h-6" />
            </div>
          </button>
          {showText && (
            <div className="flex-1 px-4 py-2 bg-black rounded-[32px] inline-flex justify-center items-center gap-1.5">
              <img src="/logos/kril_tube_icon.png" alt="Krill Tube" width={32} height={32} className="w-8 h-8 rounded-full" />
              <div className="justify-start text-white text-base font-bold font-['Outfit']">Krill Tube</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className={`mb-6 inline-flex flex-col justify-start items-center gap-4 transition-all duration-300 ${showText ? 'w-56 mx-[29px]' : 'w-full px-3'}`}>
          {/* Main Menu */}
          <div className={`px-4 py-6 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5 ${showText ? 'self-stretch' : 'w-full'}`}>
            <div className={`flex flex-col justify-center gap-3 ${showText ? 'items-start self-stretch' : 'items-center w-full'}`}>
              <Link
                href="/"
                onClick={onClose}
                className={`inline-flex transition-colors ${
                  showText
                    ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === '/' ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                    : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                }`}
              >
                {!showText && pathname === '/' ? (
                  <div className="px-5 py-3 bg-[#EF4330] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                    <img src="/logos/home.svg" alt="Home" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
                    <div className="text-white font-semibold font-['Outfit'] text-xs">Home</div>
                  </div>
                ) : (
                  <>
                    <img src="/logos/home.svg" alt="Home" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/' && showText ? 'brightness-0 invert' : ''}`} />
                    <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'} ${pathname === '/' && showText ? 'text-white' : 'text-black'}`}>Home</div>
                  </>
                )}
              </Link>

              <Link
                href="/watch"
                onClick={onClose}
                className={`inline-flex transition-colors ${
                  showText
                    ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === '/watch' ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                    : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                }`}
              >
                {!showText && pathname === '/watch' ? (
                  <div className="px-5 py-3 bg-[#EF4330] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                    <img src="/logos/watch.svg" alt="Watch" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
                    <div className="text-white font-semibold font-['Outfit'] text-xs">Watch</div>
                  </div>
                ) : (
                  <>
                    <img src="/logos/watch.svg" alt="Watch" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/watch' && showText ? 'brightness-0 invert' : ''}`} />
                    <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'} ${pathname === '/watch' && showText ? 'text-white' : 'text-black'}`}>Watch</div>
                  </>
                )}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex ${showText ? 'justify-start items-center gap-2.5 self-stretch' : 'flex-col justify-center items-center gap-1'} hover:bg-white/50 transition-colors rounded-lg`}
              >
                <img src="/logos/playlist.svg" alt="Playlists" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                <div className={`text-black font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'}`}>Playlists</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex ${showText ? 'justify-start items-center gap-2.5 self-stretch' : 'flex-col justify-center items-center gap-1'} hover:bg-white/50 transition-colors rounded-lg`}
              >
                <img src="/logos/about.svg" alt="About" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                <div className={`text-black font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'}`}>About</div>
              </Link>

              <Link
                href="/subscriptions"
                onClick={onClose}
                className={`inline-flex transition-colors ${
                  showText
                    ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === '/subscriptions' ? 'bg-[#CF2C2F] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                    : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                }`}
              >
                {!showText && pathname === '/subscriptions' ? (
                  <div className="px-5 py-3 bg-[#CF2C2F] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                    <img src="/logos/subscriptions.svg" alt="Subscriptions" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
                    <div className="text-white font-semibold font-['Outfit'] text-xs">Subs</div>
                  </div>
                ) : (
                  <>
                    <img src="/logos/subscriptions.svg" alt="Subscriptions" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/subscriptions' && showText ? 'brightness-0 invert' : ''}`} />
                    <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'} ${pathname === '/subscriptions' && showText ? 'text-white' : 'text-black'}`}>{showText ? 'Subscriptions' : 'Subs'}</div>
                  </>
                )}
              </Link>
            </div>
          </div>

          {/* Explore Menu */}
          <div className={`px-4 py-6 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5 ${showText ? 'self-stretch' : 'w-full'}`}>
            <div className={`flex flex-col justify-center gap-3 ${showText ? 'items-start self-stretch' : 'items-center w-full'}`}>
              {showText ? (
                <div className="self-stretch px-4 pb-4 border-b-2 border-black inline-flex justify-center items-center gap-2.5">
                  <div className="flex-1 justify-start text-black text-xl font-semibold font-['Outfit']">Explore</div>
                  <div className="w-10 h-10 bg-black rounded-full flex justify-center items-center">
                    <img src="/logos/explore.svg" alt="Explore" width={24} height={24} className="w-6 h-6" />
                  </div>
                </div>
              ) : (
                <div className="pb-3 border-b-2 border-black inline-flex flex-col justify-center items-center gap-1 w-full">
                  <div className="w-10 h-10 bg-black rounded-full flex justify-center items-center">
                    <img src="/logos/explore.svg" alt="Explore" width={24} height={24} className="w-6 h-6" />
                  </div>
                  <div className="text-black text-xs font-semibold font-['Outfit']">Explore</div>
                </div>
              )}

              <Link
                href="/photos"
                onClick={onClose}
                className={`inline-flex transition-colors ${
                  showText
                    ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === '/photos' ? 'bg-[#CF2C2F] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                    : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                }`}
              >
                {!showText && pathname === '/photos' ? (
                  <div className="px-5 py-3 bg-[#CF2C2F] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                    <img src="/logos/photos.svg" alt="Photos" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
                    <div className="text-white font-semibold font-['Outfit'] text-xs">Photos</div>
                  </div>
                ) : (
                  <>
                    <img src="/logos/photos.svg" alt="Photos" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/photos' && showText ? 'brightness-0 invert' : ''}`} />
                    <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'} ${pathname === '/photos' && showText ? 'text-white' : 'text-black'}`}>Photos</div>
                  </>
                )}
              </Link>

              <Link
                href="/scrolls"
                onClick={onClose}
                className={`inline-flex transition-colors ${
                  showText
                    ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === '/scrolls' ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                    : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                }`}
              >
                {!showText && pathname === '/scrolls' ? (
                  <div className="px-5 py-3 bg-[#EF4330] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                    <img src="/logos/scrolls.svg" alt="Scrolls" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
                    <div className="text-white font-semibold font-['Outfit'] text-xs">Scrolls</div>
                  </div>
                ) : (
                  <>
                    <img src="/logos/scrolls.svg" alt="Scrolls" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/scrolls' && showText ? 'brightness-0 invert' : ''}`} />
                    <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'} ${pathname === '/scrolls' && showText ? 'text-white' : 'text-black'}`}>Scrolls</div>
                  </>
                )}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex ${showText ? 'justify-start items-center gap-2.5 self-stretch' : 'flex-col justify-center items-center gap-1'} hover:bg-white/50 transition-colors rounded-lg`}
              >
                <img src="/logos/meme.svg" alt="Meme" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                <div className={`text-black font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'}`}>Meme</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex ${showText ? 'justify-start items-center gap-2.5 self-stretch' : 'flex-col justify-center items-center gap-1'} hover:bg-white/50 transition-colors rounded-lg`}
              >
                <img src="/logos/earn.svg" alt="Earn" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                <div className={`text-black font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'}`}>Earn</div>
              </Link>
            </div>
          </div>

          {/* User Menu */}
          <div className={`px-4 py-6 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5 ${showText ? 'self-stretch' : 'w-full'}`}>
            <div className={`flex flex-col justify-center gap-3 ${showText ? 'items-start self-stretch' : 'items-center w-full'}`}>
              {isConnected && address && (
                <Link
                  href={`/profile/${address}`}
                  onClick={onClose}
                  className={`inline-flex transition-colors ${
                    showText
                      ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === `/profile/${address}` ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                      : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                  }`}
                >
                  {!showText && pathname === `/profile/${address}` ? (
                    <div className="px-5 py-3 bg-[#EF4330] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                      <svg className="w-6 h-6 flex-shrink-0 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className="text-white font-semibold font-['Outfit'] text-xs">Channel</div>
                    </div>
                  ) : (
                    <>
                      <svg className={`w-6 h-6 flex-shrink-0 ${pathname === `/profile/${address}` && showText ? 'text-white' : 'text-black'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs text-center'} ${pathname === `/profile/${address}` && showText ? 'text-white' : 'text-black'}`}>{showText ? 'Your Channel' : 'Channel'}</div>
                    </>
                  )}
                </Link>
              )}

              <Link
                href="/library"
                onClick={onClose}
                className={`inline-flex transition-colors ${
                  showText
                    ? `px-4 py-2 rounded-[32px] justify-start items-center gap-2.5 self-stretch ${pathname === '/library' ? 'bg-[#EF4330] outline outline-[3px] outline-offset-[-3px] outline-black' : 'hover:bg-white/50'}`
                    : 'flex-col justify-center items-center gap-1 hover:bg-white/50 rounded-lg px-2 py-2'
                }`}
              >
                {!showText && pathname === '/library' ? (
                  <div className="px-5 py-3 bg-[#EF4330] rounded-[16px] outline outline-[2px] outline-offset-[-2px] outline-black flex flex-col items-center gap-1">
                    <img src="/logos/your Uploads.svg" alt="Your Uploads" width={24} height={24} className="w-6 h-6 flex-shrink-0 brightness-0 invert" />
                    <div className="text-white font-semibold font-['Outfit'] text-xs">Uploads</div>
                  </div>
                ) : (
                  <>
                    <img src="/logos/your Uploads.svg" alt="Your Uploads" width={24} height={24} className={`w-6 h-6 flex-shrink-0 ${pathname === '/library' && showText ? 'brightness-0 invert' : ''}`} />
                    <div className={`font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs text-center'} ${pathname === '/library' && showText ? 'text-white' : 'text-black'}`}>{showText ? 'Your Uploads' : 'Uploads'}</div>
                  </>
                )}
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex ${showText ? 'justify-start items-center gap-2.5 self-stretch' : 'flex-col justify-center items-center gap-1'} hover:bg-white/50 transition-colors rounded-lg`}
              >
                <img src="/logos/send feedback.svg" alt="Send feedback" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                <div className={`text-black font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs text-center'}`}>Feedback</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className={`px-4 py-2 inline-flex ${showText ? 'justify-start items-center gap-2.5 self-stretch' : 'flex-col justify-center items-center gap-1'} hover:bg-white/50 transition-colors rounded-lg`}
              >
                <img src="/logos/lets-icons_setting-line.svg" alt="Setting" width={24} height={24} className="w-6 h-6 flex-shrink-0" />
                <div className={`text-black font-semibold font-['Outfit'] ${showText ? 'text-base' : 'text-xs'}`}>Setting</div>
              </Link>
            </div>
          </div>

          {/* User Profile - Clickable */}
          {isConnected && address ? (
            <Link
              href={`/profile/${address}`}
              onClick={onClose}
              className={`inline-flex items-center gap-3 transition-all duration-300 hover:opacity-80 ${showText ? 'self-stretch justify-center' : 'w-full justify-center'}`}
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
            <div className={`inline-flex items-center gap-3 transition-all duration-300 ${showText ? 'self-stretch justify-center' : 'w-full justify-center'}`}>
              <div className="w-[50px] h-[50px] flex-shrink-0">
                <img className="w-[50px] h-[50px] rounded-full object-cover" src="/logos/eason.svg" alt="User" width={50} height={50} />
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
