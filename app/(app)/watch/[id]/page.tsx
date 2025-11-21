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
  const [creator, setCreator] = useState<any | null>(null);
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

          // Fetch creator profile data
          if (videoData.video.creatorId) {
            try {
              const creatorResponse = await fetch(`/api/v1/profile/${videoData.video.creatorId}`);
              if (creatorResponse.ok) {
                const creatorData = await creatorResponse.json();
                setCreator(creatorData.profile);
              }
            } catch (err) {
              console.error('Error fetching creator profile:', err);
              // Continue even if creator fetch fails
            }
          }
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
                encryptionType={video.encryptionType || 'per-video'}
                channelId={video.sealObjectId}
                creatorAddress={video.creatorId}
                creatorName={creator?.name}
                channelPrice={creator?.channelPrice}
                channelChain={creator?.channelChain}
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
                          <div className="justify-start text-black text-base font-bold font-['Outfit']">IOTA Moveathon</div>
                          <div className="self-stretch inline-flex justify-start items-start gap-1">
                            <div className="justify-start text-black text-xs font-medium font-['Outfit']">533 views</div>
                            <div className="justify-start text-black text-xs font-medium font-['Outfit'] tracking-tight">•3 years ago</div>
                          </div>
                        </div>
                        <div className="flex justify-start items-center">
                          <div className="inline-flex flex-col justify-start items-start gap-[2.94px]">
                            <div className="justify-start text-black text-base font-semibold font-['Outfit']">1</div>
                          </div>
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-4 h-4 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                {/* Profile Picture - Clickable */}
                {creator ? (
                  <Link href={`/profile/${video.creatorId}`} className="w-16 h-16 relative block">
                    {creator.avatar ? (
                      <img
                        className="w-16 h-16 rounded-full border-2 border-black object-cover"
                        src={creator.avatar}
                        alt={creator.name}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full border-2 border-black bg-gradient-to-br from-walrus-mint to-walrus-grape flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-black bg-gradient-to-br from-walrus-mint to-walrus-grape flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}

                {/* Name and Subscribers - Clickable */}
                <div className="flex flex-col justify-start items-start gap-1">
                  {creator ? (
                    <Link href={`/profile/${video.creatorId}`} className="text-black text-xl font-bold font-['Outfit'] hover:text-walrus-grape transition-colors">
                      {creator.name}
                    </Link>
                  ) : (
                    <div className="text-black text-xl font-bold font-['Outfit']">
                      {video.creatorId ? `${video.creatorId.slice(0, 6)}...${video.creatorId.slice(-4)}` : 'Anonymous'}
                    </div>
                  )}
                  <div className="text-black text-sm font-normal font-['Outfit']">
                    {creator ? `${creator.subscriberCount} ${creator.subscriberCount === 1 ? 'Subscriber' : 'Subscribers'}` : '0 Subscribers'}
                  </div>
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
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-4 h-4 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
