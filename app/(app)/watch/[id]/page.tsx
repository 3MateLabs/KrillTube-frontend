'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CustomVideoPlayer } from '@/components/CustomVideoPlayer';

export default function WatchPage() {
  const params = useParams();
  const videoId = params.id as string;

  const [video, setVideo] = useState<any | null>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current video
        const videoResponse = await fetch(`/api/v1/videos/${videoId}`);

        if (!videoResponse.ok) {
          if (videoResponse.status === 404) {
            setError('Video not found');
          } else {
            setError('Failed to load video');
          }
          setLoading(false);
          return;
        }

        const videoData = await videoResponse.json();

        if (videoData.video) {
          setVideo(videoData.video);
        } else {
          setError('Video not available');
          setLoading(false);
          return;
        }

        // Fetch all videos for recommendations
        const videosResponse = await fetch('/api/v1/videos?limit=50');
        if (videosResponse.ok) {
          const videosData = await videosResponse.json();
          setAllVideos(videosData.videos || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load video');
        setLoading(false);
      }
    };

    fetchData();
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

  // Helper function to format time ago
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

  // Filter videos by section (excluding current video)
  const otherVideos = allVideos.filter(v => v.id !== videoId);

  return (
    <div className="w-full min-h-screen bg-[#0668A6]">
      {/* Main Content */}
      <div className="pl-20 pr-12 pt-12 pb-4 flex flex-col justify-start items-start gap-0">
        {/* Top Row - Video Player and Recommended Videos */}
        <div className="w-full flex justify-start items-start gap-6">
          {/* Left - Video Player */}
          <div className="flex-1">
            <div className="w-full max-w-[970px] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black overflow-hidden bg-black">
              <CustomVideoPlayer
                videoId={video.id}
                videoUrl={video.walrusMasterUri}
                network={video.network || 'mainnet'}
                title={video.title}
                autoplay={false}
              />
            </div>
          </div>

          {/* Right - Category Tabs and Recommended Videos */}
          <div className="w-80 flex flex-col justify-start items-start gap-4">
            {/* Category Tabs */}
            <div className="w-full flex flex-wrap justify-start items-center gap-2">
              <div className="px-4 py-2 bg-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-white flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">All</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Live</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Memes</div>
              </div>
              <div className="px-4 py-2 bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-start items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Gaming</div>
              </div>
            </div>

            {/* Recommended Videos Container */}
            <div className="w-full flex flex-col justify-start items-start gap-2">
              {/* Demo Cards */}
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="w-full p-2.5 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-2.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer">
                  <div className="self-stretch inline-flex justify-center items-center gap-2">
                    <Image
                      className="w-32 h-24 rounded-lg shadow-[1.4795299768447876px_1.4795299768447876px_0px_0px_rgba(0,0,0,1.00)] border-1 border-black object-cover"
                      src="/logos/theorigin.png"
                      alt="Video thumbnail"
                      width={136}
                      height={96}
                    />
                    <div className="inline-flex flex-col justify-start items-start gap-2">
                      <div className="self-stretch inline-flex justify-between items-start">
                        <div className="justify-start text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_5px_rgb(0_0_0_/_0.25)]">Walrus</div>
                        <div className="w-5 h-5 relative overflow-hidden">
                          <div className="w-[3.20px] h-3 left-[8px] top-[3.20px] absolute bg-black" />
                        </div>
                      </div>
                      <div className="self-stretch inline-flex justify-start items-end gap-4">
                        <div className="inline-flex flex-col justify-start items-start gap-2">
                          <div className="justify-start text-black text-base font-bold font-['Outfit']">Haulout Hackathon</div>
                          <div className="self-stretch inline-flex justify-start items-start gap-1">
                            <div className="justify-start text-black text-xs font-medium font-['Outfit']">533 views</div>
                            <div className="justify-start text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                          </div>
                        </div>
                        <div className="flex justify-start items-center">
                          <div className="inline-flex flex-col justify-start items-start gap-[2.94px]">
                            <div className="justify-start text-black text-base font-semibold font-['Outfit']">1</div>
                          </div>
                          <Image className="w-4 h-4" src="/logos/sui-logo.png" alt="SUI" width={16} height={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creator Info and Actions Row */}
        <div className="w-full flex justify-start items-start gap-6 -mt-44">
          <div className="flex-1 max-w-[970px]">
            <div className="w-full inline-flex justify-between items-center">
              <div className="flex justify-start items-center gap-4">
                {/* Profile Picture */}
                <div className="w-16 h-16 relative">
                  <Image className="w-16 h-16 rounded-full border-2 border-black object-cover" src="/logos/eason.svg" alt="Creator" width={64} height={64} />
                </div>

                {/* Name and Subscribers */}
                <div className="flex flex-col justify-start items-start gap-1">
                  <div className="text-black text-xl font-bold font-['Outfit']">{video.title}</div>
                  <div className="text-black text-sm font-normal font-['Outfit']">834 Subscribers</div>
                </div>

                {/* Subscribe Button */}
                <div className="px-6 py-2.5 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <div className="text-black text-base font-bold font-['Outfit']">Subscribe</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-start items-center gap-3">
                {/* Like Button */}
                <div className="w-12 h-12 bg-white rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </div>

                {/* Bookmark Button */}
                <div className="w-12 h-12 bg-white rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>

                {/* Tip Button */}
                <div className="w-12 h-12 bg-white rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-center items-center gap-1 cursor-pointer hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <span className="text-black text-base font-semibold font-['Outfit']">5</span>
                  <Image className="w-4 h-4" src="/logos/sui-logo.png" alt="SUI" width={16} height={16} />
                </div>
              </div>
            </div>
          </div>
          <div className="w-80"></div>
        </div>

        {/* Description Section - Left Side Only */}
        <div className="w-full flex justify-start items-start gap-6 mt-6">
          <div className="flex-1 max-w-[970px]">
            <div className="w-full p-6 bg-[#F5F0E8] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black flex flex-col justify-start items-start gap-3">
              <div className="text-black text-xl font-bold font-['Outfit']">Description</div>
              <div className="text-black text-base font-normal font-['Outfit']">No Description was provided....</div>
            </div>
          </div>
          <div className="w-80"></div>
        </div>

        {/* Black divider line */}
        <div className="w-full h-[2px] bg-black mt-6"></div>

        {/* Comments Section - Full Width */}
        <div className="w-full mt-6">
          <div className="w-full p-4 bg-[#F5F0E8] rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-2.5">
              <div className="self-stretch inline-flex justify-between items-end">
                <div className="justify-start text-black text-2xl font-semibold font-['Outfit']">Comments</div>
                <div className="justify-start text-black text-sm font-semibold font-['Outfit']">734 comments</div>
              </div>
              <div className="self-stretch flex flex-col justify-start items-start gap-3">
                {[1, 2, 3, 4, 5, 6].map((index) => (
                  <div key={index} className="self-stretch h-32 p-4 bg-white rounded-2xl outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col justify-start items-start gap-2.5">
                    <div className="self-stretch inline-flex justify-start items-center gap-5">
                      <div className="w-10 inline-flex flex-col justify-start items-end gap-[5px]">
                        <div className="self-stretch h-10 relative">
                          <Image className="w-10 h-10 rounded-full object-cover" src="/logos/matteodotsui.svg" alt="User" width={40} height={40} />
                        </div>
                      </div>
                      <div className="flex-1 inline-flex flex-col justify-start items-start gap-2.5">
                        <div className="self-stretch justify-start text-black text-xl font-semibold font-['Outfit']">From @Matteo.sui</div>
                        <div className="self-stretch justify-start text-black text-base font-normal font-['Outfit']">@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep</div>
                      </div>
                    </div>
                    <div className="self-stretch inline-flex justify-end items-center gap-2">
                      <div className="justify-start text-black text-xs font-medium font-['Outfit']">jun 30, 2025  6:20PM</div>
                      <div className="px-2.5 py-[5px] bg-black rounded-[5px] outline outline-[0.50px] outline-offset-[-0.50px] outline-white inline-flex flex-col justify-start items-start gap-2.5">
                        <div className="inline-flex justify-start items-center gap-[5px]">
                          <div className="justify-start text-white text-xs font-semibold font-['Inter']">View X</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
