'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, History, Settings } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  creatorId: string;
  createdAt: string;
  posterWalrusUri?: string;
  walrusMasterUri: string;
  duration?: number;
  views?: number;
  rating?: number;
}

// Video Card Component
const VideoCard = ({ video }: { video: Video }) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInYears > 0) return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
    if (diffInDays === 0) return 'Today';
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <Link href={`/watch/${video.id}`}>
      <div className="bg-[#FFEEE5] rounded-3xl shadow-[5px_5px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black overflow-hidden hover:shadow-[7px_7px_0_0_black] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer">
        {/* Video Thumbnail */}
        <div className="relative w-full aspect-video bg-gradient-to-br from-[#00579B] to-[#1AAACE] overflow-hidden">
          {video.posterWalrusUri ? (
            <Image
              src={video.posterWalrusUri}
              alt={video.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>

          {/* Duration Badge */}
          {video.duration && (
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 rounded text-white text-sm font-bold">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="p-4">
          <div className="text-sm font-semibold text-gray-700 mb-1">{video.creatorId.slice(0, 8)}...</div>
          <h3 className="text-xl font-bold text-black mb-2 line-clamp-1">{video.title}</h3>
          <div className="flex items-center justify-between text-sm text-gray-700">
            <span>{video.views || 0} views • {formatTimeAgo(video.createdAt)}</span>
            {video.rating && (
              <div className="flex items-center gap-1 font-bold">
                <span>{video.rating}</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function HomeRedesign() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/v1/videos?limit=12');
        if (response.ok) {
          const data = await response.json();
          setVideos(data.videos || []);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] border-r-[3px] border-black z-50">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b-[3px] border-black">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-sm" />
          </div>
          <span className="text-white text-xl font-bold">LOGO</span>
        </div>

        {/* Main Menu */}
        <div className="p-4">
          <div className="bg-[#FFEEE5] rounded-2xl shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black p-2 mb-4">
            <Link href="/home" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/50 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="font-semibold">Home</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 bg-[#EF4330] text-white rounded-lg shadow-[2px_2px_0_0_black] outline outline-2 outline-black">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="font-bold">Watch</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/50 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              <span className="font-semibold">Playlists</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/50 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">About</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-full hover:bg-white/50 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="font-semibold">Subscriptions</span>
            </Link>
          </div>

          {/* Explore Section */}
          <div className="bg-[#FFEEE5] rounded-2xl shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black p-4 mb-4">
            <h3 className="font-bold text-lg mb-3 pb-2 border-b-2 border-black">Explore</h3>
            <div className="space-y-2">
              <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Photos</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Scrolls</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Meme</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Earn</span>
              </Link>
            </div>
          </div>

          {/* User Menu */}
          <div className="bg-[#FFEEE5] rounded-2xl shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black p-4">
            <div className="space-y-2">
              <Link href="/library" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                  <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Your Uploads</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-sm">Send feedback</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/50 transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-semibold text-sm">Setting</span>
              </Link>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-3 p-3 bg-black rounded-full">
            <div className="w-10 h-10 bg-gray-400 rounded-full" />
            <span className="text-white font-bold">@User</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] border-b-[3px] border-black">
          <div className="flex items-center justify-between gap-4 px-8 py-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-3xl">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by handle...."
                  className="w-full px-6 py-3 bg-transparent border-2 border-white rounded-full text-white placeholder-white/70 outline-none focus:border-white/90 font-medium"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                <Bell className="w-5 h-5 text-white" />
              </button>
              <button className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors">
                <History className="w-5 h-5 text-white" />
              </button>
              <Link href="/upload" className="px-6 py-3 bg-[#FFEEE5] text-black font-bold rounded-full shadow-[3px_3px_0_0_black] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                Upload
              </Link>
              <button className="px-6 py-3 bg-[#FFEEE5] text-black font-bold rounded-full shadow-[3px_3px_0_0_black] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                Connect Wallet
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-8 pb-4 flex items-center gap-3 overflow-x-auto">
            {['All', 'Live', 'Memes', 'DeFi', 'Gaming', 'RWAs', 'Move'].map((cat, i) => (
              <button
                key={cat}
                className={`px-6 py-2 rounded-full font-semibold whitespace-nowrap transition-all ${
                  i === 0
                    ? 'bg-black text-white outline outline-2 outline-white'
                    : 'bg-transparent text-white border-2 border-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Video Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white font-semibold text-lg">Loading videos...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Sponsored Section */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6">Sponsored</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.slice(0, 6).map((video) => (
                    <VideoCard key={video.id} video={{ ...video, views: 533, rating: 2.5 }} />
                  ))}
                </div>
              </section>

              {/* Gaming Section */}
              <section className="mb-12">
                <div className="bg-[#FFEEE5] rounded-3xl shadow-[5px_5px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black p-8">
                  <h2 className="text-3xl font-bold text-[#EF4330] text-center mb-6">Gaming</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.slice(0, 3).map((video) => (
                      <VideoCard key={video.id} video={{ ...video, views: 450, rating: 4.2 }} />
                    ))}
                  </div>
                </div>
              </section>

              {/* All Videos */}
              {videos.length > 6 && (
                <section>
                  <h2 className="text-3xl font-bold text-white mb-6">More Videos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.slice(6).map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
