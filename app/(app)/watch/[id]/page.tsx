'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer';
import { StorageManagement } from '@/components/StorageManagement';
import { formatDuration } from '@/lib/types';

// Sidebar MenuItem Component
const MenuItem = ({ icon, text, selected = false, rounded = false, href = '#' }: { icon: React.ReactNode; text: string; selected?: boolean; rounded?: boolean; href?: string }) => (
  <Link href={href} className={`self-stretch px-4 py-2 ${selected ? 'bg-[#EF4330] text-white' : 'text-black'} ${rounded ? 'rounded-[32px]' : ''} outline ${selected ? 'outline-[3px] outline-offset-[-3px] outline-black' : ''} flex items-center gap-2.5 hover:bg-[#EF4330]/20 transition-colors`}>
    <div className="w-6 h-6 relative overflow-hidden">
      {icon}
    </div>
    <div className="text-base font-semibold font-['Outfit']">{text}</div>
  </Link>
);

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;

  const [video, setVideo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/v1/videos/${videoId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Video not found');
          } else {
            setError('Failed to load video');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.video) {
          setVideo(data.video);
        } else {
          setError('Video not available');
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching video:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  if (loading) {
    return (
      <div className="w-full min-h-screen relative bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-semibold text-lg">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="w-full min-h-screen relative bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {error || 'Video not found'}
          </h2>
          <p className="text-white/80 mb-6">
            This video may have been removed or the link is incorrect.
          </p>
          <Link
            href="/home"
            className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen relative bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE] overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 h-full fixed left-0 top-0 bg-[#1AAACE]/30 shadow-[0_4px_15px_rgba(42,42,42,0.31)] border-r-[3px] border-black backdrop-blur-[100px] z-50">
        <div className="w-56 absolute left-[29px] top-[18px] flex gap-3">
          <div className="w-12 h-12 px-3 py-px bg-black rounded-3xl shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white flex items-center justify-center">
            <div className="w-5 h-4 bg-white" />
          </div>
          <div className="flex-1 p-2 bg-black rounded-[32px]">
            <div className="p-2 bg-black rounded-[32px] flex items-center justify-center">
              <div className="text-white text-base font-bold font-['Outfit']">LOGO</div>
            </div>
          </div>
        </div>

        <div className="w-56 absolute left-[29px] top-[111px] flex flex-col gap-4">
          {/* Main Menu */}
          <div className="self-stretch px-4 py-8 bg-white/20 rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col items-center gap-2.5">
            <div className="self-stretch flex flex-col gap-4">
              <MenuItem icon={<div className="w-full h-full bg-black" />} text="Home" href="/home" />
              <MenuItem icon={<Image src="/logos/watch.svg" alt="Watch" width={24} height={24} className="w-full h-full" />} text="Watch" selected href="#" />
              <MenuItem icon={<div className="w-full h-full bg-black" />} text="Playlists" href="#" />
              <MenuItem icon={<Image src="/logos/about.svg" alt="About" width={24} height={24} className="w-full h-full" />} text="About" href="#" />
              <MenuItem icon={<Image src="/logos/subscriptions.svg" alt="Subscriptions" width={24} height={24} className="w-full h-full" />} text="Subscriptions" rounded href="#" />
            </div>
          </div>

          {/* Explore Menu */}
          <div className="self-stretch px-4 py-8 bg-white/20 rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col items-center gap-2.5">
            <div className="self-stretch flex flex-col gap-4">
              <div className="self-stretch px-4 pb-4 border-b-2 border-black flex items-center justify-center gap-2.5">
                <div className="flex-1 text-black text-xl font-semibold font-['Outfit']">Explore</div>
              </div>
              <MenuItem icon={<Image src="/logos/photos.svg" alt="Photos" width={24} height={24} className="w-full h-full" />} text="Photos" />
              <MenuItem icon={<Image src="/logos/scrolls.svg" alt="Scrolls" width={24} height={24} className="w-full h-full" />} text="Scrolls" />
              <MenuItem icon={<div className="w-full h-full bg-black" />} text="Meme" />
              <MenuItem icon={<Image src="/logos/earn.svg" alt="Earn" width={24} height={24} className="w-full h-full" />} text="Earn" />
            </div>
          </div>

          {/* User Menu */}
          <div className="self-stretch px-4 py-8 bg-white/20 rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col items-center gap-2.5">
            <div className="self-stretch flex flex-col gap-4">
              <MenuItem icon={<Image src="/logos/your Uploads.svg" alt="Your Uploads" width={24} height={24} className="w-full h-full" />} text="Your Uploads" href="/library" />
              <MenuItem icon={<Image src="/logos/send feedback.svg" alt="Send feedback" width={24} height={24} className="w-full h-full" />} text="Send feedback" />
              <MenuItem icon={<div className="w-full h-full bg-black" />} text="Setting" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-72 min-h-screen">
        {/* Header */}
        <div className="w-full px-8 py-4 flex items-center justify-between gap-8 border-b-[3px] border-black">
          {/* Search Bar */}
          <div className="flex-1 max-w-2xl h-12 p-2 bg-[#1AAACE]/30 rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-2 outline-offset-[-2px] outline-black">
            <div className="w-full h-full px-5 py-[5px] flex justify-between items-center">
              <input
                type="text"
                placeholder="Search videos..."
                className="flex-1 bg-transparent text-white placeholder-white/60 outline-none font-medium font-['Outfit']"
              />
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/upload"
              className="px-6 py-2 bg-white rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              <div className="text-black text-base font-bold font-['Outfit']">Upload</div>
            </Link>
            <button className="px-6 py-2 bg-white rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
              <div className="text-black text-base font-bold font-['Outfit']">Connect Wallet</div>
            </button>
          </div>
        </div>

        {/* Video Content */}
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          {/* Video Player */}
          <div className="mb-6 rounded-2xl overflow-hidden shadow-[5px_5px_0_1px_rgba(0,0,0,1)] outline outline-[3px] outline-black">
            <CustomVideoPlayer
              videoId={video.id}
              videoUrl={video.walrusMasterUri}
              network={video.network || 'mainnet'}
              title={video.title}
              autoplay={false}
            />
          </div>

          {/* Video Info Grid */}
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            {/* Main Column */}
            <div className="space-y-4">
              {/* Title Card */}
              <div className="p-6 bg-white rounded-2xl shadow-[5px_5px_0_1px_rgba(0,0,0,1)] outline outline-[3px] outline-black">
                <h1 className="text-2xl font-bold text-black font-['Outfit'] mb-3">
                  {video.title}
                </h1>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-black/70 font-['Outfit'] font-medium pb-4 border-b-2 border-black/10">
                  <span>{formatDuration(video.duration)}</span>
                  <span>•</span>
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="px-3 py-1 bg-[#EF4330] text-white rounded-full text-xs font-bold">
                    🔒 Encrypted
                  </span>
                </div>

                {/* Creator Info */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00579B] to-[#1AAACE] rounded-full flex items-center justify-center shrink-0 shadow-[3px_3px_0_0_black] outline outline-2 outline-black">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-black/60 font-['Outfit']">Created by</p>
                    <p className="text-sm text-black font-mono font-semibold">
                      {video.creatorId.slice(0, 8)}...{video.creatorId.slice(-6)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Encryption Info Card */}
              <div className="p-6 bg-white rounded-2xl shadow-[5px_5px_0_1px_rgba(0,0,0,1)] outline outline-[3px] outline-black">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#EF4330] rounded-full flex items-center justify-center shrink-0 shadow-[3px_3px_0_0_black] outline outline-2 outline-black">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-black font-['Outfit'] mb-2">
                      End-to-End Encrypted
                    </h3>
                    <p className="text-sm text-black/70 font-['Outfit'] leading-relaxed">
                      This video is encrypted with AES-128-GCM. Segments are decrypted securely in your browser during playback. Your privacy is guaranteed by decentralized Walrus storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Storage Management (Mainnet Only) */}
              <div className="p-6 bg-white rounded-2xl shadow-[5px_5px_0_1px_rgba(0,0,0,1)] outline outline-[3px] outline-black">
                <StorageManagement
                  videoId={video.id}
                  network={video.network || 'mainnet'}
                  creatorId={video.creatorId}
                  masterBlobObjectId={video.masterBlobObjectId}
                  masterEndEpoch={video.masterEndEpoch}
                />
              </div>

              {/* Walrus Badge */}
              <div className="p-6 bg-white rounded-2xl shadow-[5px_5px_0_1px_rgba(0,0,0,1)] outline outline-[3px] outline-black">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#1AAACE] rounded-full flex items-center justify-center shrink-0 shadow-[3px_3px_0_0_black] outline outline-2 outline-black">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-black font-['Outfit'] mb-1">
                      Stored on Walrus
                    </h3>
                    <p className="text-xs text-black/70 font-['Outfit'] leading-relaxed">
                      Decentralized storage with no central point of failure. Your content lives forever on the blockchain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Available Quality */}
              <div className="p-6 bg-white rounded-2xl shadow-[5px_5px_0_1px_rgba(0,0,0,1)] outline outline-[3px] outline-black">
                <h3 className="text-base font-bold text-black font-['Outfit'] mb-3">Available Quality</h3>
                <div className="space-y-2">
                  {video.renditions.map((rendition: any) => (
                    <div key={rendition.name} className="flex items-center justify-between py-2 px-3 bg-gradient-to-r from-[#1AAACE]/20 to-transparent rounded-lg">
                      <span className="text-sm font-semibold text-black font-['Outfit']">{rendition.name}</span>
                      <span className="text-xs text-black/60 font-['Outfit']">{rendition.resolution}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
