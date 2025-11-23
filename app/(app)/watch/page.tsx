'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Video {
  id: string;
  title: string;
  creatorId: string;
  createdAt: string;
  poster?: string; // Base64 data URL
  posterWalrusUri?: string; // DEPRECATED: Legacy Walrus-based thumbnails
  walrusMasterUri: string;
  duration?: number;
  network?: string;
  encryptionType?: 'per-video' | 'subscription-acl' | 'both';
  creator?: {
    name: string;
    avatar?: string;
    subscriberCount: number;
  };
  renditions: Array<{
    id: string;
    name: string;
    resolution: string;
    bitrate: number;
  }>;
}

// Helper function to fix Walrus URLs
const fixWalrusUrl = (url: string, network: string = 'mainnet'): string => {
  if (!url) return url;

  const AGGREGATOR_DOMAIN = 'aggregator.walrus.space';
  const TESTNET_AGGREGATOR = 'aggregator.walrus-testnet.walrus.space';
  const AGGREGATOR_REPLACEMENT = 'aggregator.mainnet.walrus.mirai.cloud';

  const targetAggregator = network === 'testnet'
    ? TESTNET_AGGREGATOR
    : AGGREGATOR_REPLACEMENT;

  let fixed = url;
  if (fixed.includes(TESTNET_AGGREGATOR)) {
    fixed = fixed.replace(TESTNET_AGGREGATOR, targetAggregator);
  } else if (fixed.includes(AGGREGATOR_DOMAIN)) {
    fixed = fixed.replace(AGGREGATOR_DOMAIN, targetAggregator);
  }

  return fixed;
};

// Video Card Component matching the design
const VideoCard = ({ video }: { video: Video }) => {
  const [imgError, setImgError] = useState(false);

  // Use base64 poster if available, otherwise fall back to Walrus URL
  const thumbnailUrl = video.poster
    ? video.poster
    : video.posterWalrusUri
    ? fixWalrusUrl(video.posterWalrusUri, video.network)
    : null;

  console.log(`[VideoCard] ${video.title}:`, {
    hasPoster: !!video.poster,
    posterLength: video.poster?.length,
    posterType: typeof video.poster,
    posterStart: video.poster?.substring(0, 50),
    hasPosterWalrusUri: !!video.posterWalrusUri,
    thumbnailUrl: thumbnailUrl?.substring(0, 50),
    startsWithData: thumbnailUrl?.startsWith('data:'),
    imgError,
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Link href={`/watch/${video.id}`}>
      <div className="w-full p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.34px] outline-offset-[-1.34px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:shadow-[5px_5px_0_0_black] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:scale-105 transition-all cursor-pointer">
        <div className="w-full relative flex flex-col justify-start items-start gap-4">
          {/* Thumbnail */}
          <div className="relative w-full h-56">
            {thumbnailUrl && !imgError ? (
              thumbnailUrl.startsWith('data:') ? (
                <img
                  className="absolute inset-0 w-full h-56 rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover z-0"
                  src={thumbnailUrl}
                  alt={video.title}
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="absolute inset-0 w-full h-56 z-0">
                  <Image
                    className="rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover"
                    src={thumbnailUrl}
                    alt={video.title}
                    fill
                    onError={() => setImgError(true)}
                  />
                </div>
              )
            ) : (
              <Image
                className="w-full h-56 rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover z-0"
                src="/logos/theorigin.png"
                alt="Default thumbnail"
                width={400}
                height={224}
              />
            )}

            {/* Play Button Overlay */}
            <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center z-10">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>

            {/* Encryption Type Badge */}
            {video.encryptionType && (
              <div className={`absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10 ${
                video.encryptionType === 'per-video'
                  ? 'bg-blue-500 text-white'
                  : video.encryptionType === 'subscription-acl'
                  ? 'bg-walrus-grape text-white'
                  : 'bg-gradient-to-r from-blue-500 to-walrus-grape text-white'
              }`}>
                {video.encryptionType === 'per-video' ? '💳 Pay Per View' : video.encryptionType === 'subscription-acl' ? '🔒 Subscription' : '🎫 PPV/Sub'}
              </div>
            )}

            {/* Duration Badge */}
            {video.duration && (
              <div className="p-1 absolute bottom-2 right-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center z-10">
                <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">
                  {formatDuration(video.duration)}
                </div>
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="w-full flex flex-col justify-start items-start gap-2">
            {/* Creator Info with Avatar */}
            <div className="flex items-center gap-2">
              {/* Creator Avatar */}
              {video.creator?.avatar ? (
                <img
                  src={video.creator.avatar}
                  alt={video.creator.name}
                  className="w-8 h-8 rounded-full object-cover border border-black"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-walrus-mint to-walrus-grape flex items-center justify-center border border-black">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              {/* Creator Name */}
              <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">
                {video.creator?.name || `${video.creatorId.slice(0, 6)}...${video.creatorId.slice(-4)}`}
              </div>
            </div>

            <div className="w-full inline-flex justify-between items-start gap-2">
              <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                <div className="text-black text-lg font-bold font-['Outfit'] line-clamp-1">{video.title}</div>
                <div className="inline-flex justify-start items-center gap-[5px]">
                  {video.creator && (
                    <>
                      <div className="text-black text-xs font-medium font-['Outfit']">
                        {video.creator.subscriberCount} {video.creator.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
                      </div>
                      <div className="text-black text-xs font-medium font-['Outfit']">•</div>
                    </>
                  )}
                  <div className="text-black text-xs font-medium font-['Outfit']">0 views</div>
                  <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•{formatTimeAgo(video.createdAt)}</div>
                </div>
              </div>
              <div className="flex justify-start items-center flex-shrink-0 gap-1">
                <div className="text-black text-lg font-semibold font-['Outfit']">2.5</div>
                <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/v1/videos?limit=50');
        if (response.ok) {
          const data = await response.json();
          console.log('[Watch] First video data:', data.videos?.[0]);
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
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      {/* Category Tabs */}
      <div className="pl-20 pr-12 pt-[51px] pb-4 flex items-center gap-4 overflow-x-auto flex-wrap">
        {['All', 'Live', 'Memes', 'DeFi', 'Gaming', 'RWAs', 'Move'].map((cat, i) => (
          <button
            key={cat}
            className={`px-6 py-2.5 rounded-full shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] ${
              i === 0 ? 'bg-black outline-white text-white' : 'bg-[#0668A6] outline-black text-white'
            } flex items-center gap-2.5 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all`}
          >
            <div className="text-base font-semibold font-['Outfit'] whitespace-nowrap">{cat}</div>
          </button>
        ))}
      </div>

      {/* Video Grid */}
      <div className="pl-20 pr-12 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white font-semibold text-lg">Loading videos...</p>
            </div>
          </div>
        ) : videos.length > 0 ? (
          <div className="flex flex-col gap-8">
            {/* Sponsored Section */}
            <div className="w-full pb-6 border-b-2 border-black flex flex-col gap-4">
              <div className="text-white text-2xl font-semibold font-['Outfit']">Sponsored</div>
              <div className="grid grid-cols-3 gap-6">
                {/* Sponsored Card 1 */}
                <div className="w-full p-4 bg-white rounded-2xl shadow-[3.1499998569488525px_3.1499998569488525px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.41px] outline-offset-[-1.41px] outline-black flex flex-col gap-2 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                  <div className="self-stretch flex flex-col justify-start items-start gap-4">
                    <div className="relative w-full">
                      <Image className="self-stretch h-56 rounded-xl shadow-[2.113614082336426px_2.113614082336426px_0px_0px_rgba(0,0,0,1.00)] border-[1.41px] border-black object-cover" src="/logos/theorigin.png" alt="Sponsored" width={400} height={224} />

                      {/* Play Button - Centered */}
                      <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>

                      {/* Duration Badge - Bottom Right */}
                      <div className="p-1 absolute bottom-2 right-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center">
                        <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_4px_7px_rgb(0_0_0_/_0.25)]">5:36</div>
                      </div>
                    </div>

                    <div className="self-stretch flex flex-col justify-start items-start gap-1">
                      <div className="justify-start text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_4px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                      <div className="self-stretch inline-flex justify-between items-start">
                        <div className="inline-flex flex-col justify-start items-start gap-1">
                          <div className="justify-start text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                          <div className="self-stretch inline-flex justify-start items-center gap-1.5">
                            <div className="justify-start text-black text-xs font-medium font-['Outfit']">533 views</div>
                            <div className="justify-start text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                          </div>
                        </div>
                        <div className="flex justify-start items-center gap-1">
                          <div className="justify-start text-black text-xl font-semibold font-['Outfit']">2.5</div>
                          <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sponsored Card 2 */}
                <div className="w-full p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.34px] outline-offset-[-1.34px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                  <div className="self-stretch flex flex-col justify-start items-start gap-4">
                    <div className="relative w-full">
                      <Image className="self-stretch h-56 rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover" src="/logos/theorigin.png" alt="Sponsored" width={400} height={224} />

                      {/* Play Button - Centered */}
                      <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>

                      {/* Duration Badge - Bottom Right */}
                      <div className="p-1 absolute bottom-2 right-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center">
                        <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">5:36</div>
                      </div>
                    </div>

                    <div className="self-stretch flex flex-col justify-start items-start gap-1">
                      <div className="justify-start text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                      <div className="self-stretch inline-flex justify-between items-start">
                        <div className="inline-flex flex-col justify-start items-start gap-1">
                          <div className="justify-start text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                          <div className="self-stretch inline-flex justify-start items-center gap-[5px]">
                            <div className="justify-start text-black text-xs font-medium font-['Outfit']">533 views</div>
                            <div className="justify-start text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                          </div>
                        </div>
                        <div className="flex justify-start items-center gap-1">
                          <div className="justify-start text-black text-xl font-semibold font-['Outfit']">2.5</div>
                          <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sponsored Card 3 */}
                <div className="w-full p-4 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.34px] outline-offset-[-1.34px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                  <div className="self-stretch flex flex-col justify-start items-start gap-4">
                    <div className="relative w-full">
                      <Image className="self-stretch h-56 rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover" src="/logos/theorigin.png" alt="Sponsored" width={400} height={224} />

                      {/* Play Button - Centered */}
                      <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>

                      {/* Duration Badge - Bottom Right */}
                      <div className="p-1 absolute bottom-2 right-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center">
                        <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">5:36</div>
                      </div>
                    </div>

                    <div className="self-stretch flex flex-col justify-start items-start gap-1">
                      <div className="justify-start text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                      <div className="self-stretch inline-flex justify-between items-start">
                        <div className="inline-flex flex-col justify-start items-start gap-1">
                          <div className="justify-start text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                          <div className="self-stretch inline-flex justify-start items-center gap-[5px]">
                            <div className="justify-start text-black text-xs font-medium font-['Outfit']">533 views</div>
                            <div className="justify-start text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                          </div>
                        </div>
                        <div className="flex justify-start items-center gap-1">
                          <div className="justify-start text-black text-xl font-semibold font-['Outfit']">2.5</div>
                          <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gaming Section */}
            <div className="w-full p-4 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-2.5">
              <div className="self-stretch flex flex-col justify-center items-center gap-4">
                <div className="self-stretch text-center text-[#EF4330] text-2xl font-bold font-['Outfit']">Gaming</div>
                <div className="self-stretch flex flex-col gap-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* Gaming Card 1 */}
                    <div className="w-full p-3 bg-white rounded-2xl shadow-[2.940000057220459px_2.940000057220459px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.32px] outline-offset-[-1.32px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                      <div className="self-stretch flex flex-col gap-4">
                        <div className="relative w-full">
                          <Image className="w-full h-44 rounded-xl shadow-[1.97270667552948px_1.97270667552948px_0px_0px_rgba(0,0,0,1.00)] border-[1.32px] border-black object-cover" src="/logos/theorigin.png" alt="Gaming" width={295} height={178} />

                          {/* Play Button */}
                          <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        <div className="self-stretch flex flex-col gap-1">
                          <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                          <div className="self-stretch inline-flex justify-between items-center">
                            <div className="inline-flex flex-col gap-1">
                              <div className="text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                              <div className="inline-flex gap-[4.90px]">
                                <div className="text-black text-xs font-medium font-['Outfit']">533 views</div>
                                <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-black text-xl font-semibold font-['Outfit']">0</div>
                              <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gaming Card 2 */}
                    <div className="w-full p-3 bg-white rounded-2xl shadow-[2.940000057220459px_2.940000057220459px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.32px] outline-offset-[-1.32px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                      <div className="self-stretch flex flex-col gap-4">
                        <div className="relative w-full">
                          <Image className="w-full h-44 rounded-xl shadow-[1.97270667552948px_1.97270667552948px_0px_0px_rgba(0,0,0,1.00)] border-[1.32px] border-black object-cover" src="/logos/theorigin.png" alt="Gaming" width={295} height={178} />

                          {/* Play Button */}
                          <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        <div className="self-stretch flex flex-col gap-1">
                          <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                          <div className="self-stretch inline-flex justify-between items-center">
                            <div className="inline-flex flex-col gap-1">
                              <div className="text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                              <div className="inline-flex gap-[4.90px]">
                                <div className="text-black text-xs font-medium font-['Outfit']">533 views</div>
                                <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-black text-xl font-semibold font-['Outfit']">3</div>
                              <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gaming Card 3 */}
                    <div className="w-full p-3 bg-white rounded-2xl shadow-[2.940000057220459px_2.940000057220459px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.32px] outline-offset-[-1.32px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                      <div className="self-stretch flex flex-col gap-4">
                        <div className="relative w-full">
                          <Image className="w-full h-44 rounded-xl shadow-[1.97270667552948px_1.97270667552948px_0px_0px_rgba(0,0,0,1.00)] border-[1.32px] border-black object-cover" src="/logos/theorigin.png" alt="Gaming" width={295} height={178} />

                          {/* Play Button */}
                          <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        <div className="self-stretch flex flex-col gap-1">
                          <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                          <div className="self-stretch inline-flex justify-between items-center">
                            <div className="inline-flex flex-col gap-1">
                              <div className="text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                              <div className="inline-flex gap-[4.90px]">
                                <div className="text-black text-xs font-medium font-['Outfit']">533 views</div>
                                <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-black text-xl font-semibold font-['Outfit']">1</div>
                              <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Show More Button */}
                  <div className="flex justify-center">
                    <button className="px-4 py-3 bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex items-center gap-4 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                      <div className="text-white text-xl font-bold font-['Montserrat']">Show more</div>
                      <div className="w-10 h-10 p-2 bg-black rounded-full flex justify-center items-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* All Videos Section */}
            <div className="mb-6">
              <h2 className="text-white text-2xl font-semibold font-['Outfit'] mb-4">All Videos</h2>
              <div className="grid grid-cols-3 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>

            {/* DeFi Section */}
            <div className="w-full p-4 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col gap-2.5">
              <div className="self-stretch flex flex-col justify-center items-center gap-4">
                <div className="self-stretch text-center text-[#EF4330] text-2xl font-bold font-['Outfit']">DeFi</div>
                <div className="self-stretch flex flex-col gap-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* DeFi Card 1 */}
                    <div className="w-full p-3 bg-white rounded-2xl shadow-[2.940000057220459px_2.940000057220459px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.32px] outline-offset-[-1.32px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                      <div className="self-stretch flex flex-col gap-4">
                        <div className="relative w-full">
                          <Image className="w-full h-44 rounded-xl shadow-[1.97270667552948px_1.97270667552948px_0px_0px_rgba(0,0,0,1.00)] border-[1.32px] border-black object-cover" src="/logos/theorigin.png" alt="DeFi" width={295} height={178} />

                          {/* Play Button */}
                          <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        <div className="self-stretch flex flex-col gap-1">
                          <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                          <div className="self-stretch inline-flex justify-between items-center">
                            <div className="inline-flex flex-col gap-1">
                              <div className="text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                              <div className="inline-flex gap-[4.90px]">
                                <div className="text-black text-xs font-medium font-['Outfit']">533 views</div>
                                <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-black text-xl font-semibold font-['Outfit']">0</div>
                              <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DeFi Card 2 */}
                    <div className="w-full p-3 bg-white rounded-2xl shadow-[2.940000057220459px_2.940000057220459px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.32px] outline-offset-[-1.32px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                      <div className="self-stretch flex flex-col gap-4">
                        <div className="relative w-full">
                          <Image className="w-full h-44 rounded-xl shadow-[1.97270667552948px_1.97270667552948px_0px_0px_rgba(0,0,0,1.00)] border-[1.32px] border-black object-cover" src="/logos/theorigin.png" alt="DeFi" width={295} height={178} />

                          {/* Play Button */}
                          <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        <div className="self-stretch flex flex-col gap-1">
                          <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                          <div className="self-stretch inline-flex justify-between items-center">
                            <div className="inline-flex flex-col gap-1">
                              <div className="text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                              <div className="inline-flex gap-[4.90px]">
                                <div className="text-black text-xs font-medium font-['Outfit']">533 views</div>
                                <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-black text-xl font-semibold font-['Outfit']">3</div>
                              <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DeFi Card 3 */}
                    <div className="w-full p-3 bg-white rounded-2xl shadow-[2.940000057220459px_2.940000057220459px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.32px] outline-offset-[-1.32px] outline-black flex flex-col gap-1.5 overflow-hidden hover:bg-[#FFEEE5] hover:scale-105 transition-all cursor-pointer">
                      <div className="self-stretch flex flex-col gap-4">
                        <div className="relative w-full">
                          <Image className="w-full h-44 rounded-xl shadow-[1.97270667552948px_1.97270667552948px_0px_0px_rgba(0,0,0,1.00)] border-[1.32px] border-black object-cover" src="/logos/theorigin.png" alt="DeFi" width={295} height={178} />

                          {/* Play Button */}
                          <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
                            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        <div className="self-stretch flex flex-col gap-1">
                          <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">Walrus</div>
                          <div className="self-stretch inline-flex justify-between items-center">
                            <div className="inline-flex flex-col gap-1">
                              <div className="text-black text-xl font-bold font-['Outfit']">IOTA Moveathon</div>
                              <div className="inline-flex gap-[4.90px]">
                                <div className="text-black text-xs font-medium font-['Outfit']">533 views</div>
                                <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="text-black text-xl font-semibold font-['Outfit']">1</div>
                              <Image src="/logos/sui-logo.png" alt="SUI" width={20} height={20} className="object-contain" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Show More Button */}
                  <div className="flex justify-center">
                    <button className="px-4 py-3 bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex items-center gap-4 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                      <div className="text-white text-xl font-bold font-['Montserrat']">Show more</div>
                      <div className="w-10 h-10 p-2 bg-black rounded-full flex justify-center items-center">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No videos yet</h3>
              <p className="text-white/80 mb-6">Be the first to upload a video to Walrus</p>
              <Link
                href="/upload"
                className="inline-block px-6 py-3 bg-[#FFEEE5] text-black font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Upload Video
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
