'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Video {
  id: string;
  title: string;
  creatorId: string;
  createdAt: string;
  posterWalrusUri?: string;
  walrusMasterUri: string;
  duration?: number;
  renditions: Array<{
    id: string;
    name: string;
    resolution: string;
    bitrate: number;
  }>;
}

// Video Card Component matching the design
const VideoCard = ({ video }: { video: Video }) => {
  const [imgError, setImgError] = useState(false);

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
          <div className="relative w-full">
            {video.posterWalrusUri && !imgError ? (
              <img
                className="w-full h-56 rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover"
                src={video.posterWalrusUri}
                alt={video.title}
                onError={() => setImgError(true)}
              />
            ) : (
              <Image
                className="w-full h-56 rounded-xl shadow-[2.0129659175872803px_2.0129659175872803px_0px_0px_rgba(0,0,0,1.00)] border-[1.34px] border-black object-cover"
                src="/logos/theorigin.png"
                alt="Default thumbnail"
                width={400}
                height={224}
              />
            )}

            {/* Play Button Overlay */}
            <div className="w-8 h-8 p-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 rounded-2xl inline-flex justify-center items-center">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>

            {/* Duration Badge */}
            {video.duration && (
              <div className="p-1 absolute bottom-2 right-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-center items-center">
                <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">
                  {formatDuration(video.duration)}
                </div>
              </div>
            )}
          </div>

          {/* Video Info */}
          <div className="w-full flex flex-col justify-start items-start gap-1">
            <div className="text-black text-sm font-semibold font-['Outfit'] [text-shadow:_0px_3px_7px_rgb(0_0_0_/_0.25)]">
              {video.creatorId.slice(0, 6)}...{video.creatorId.slice(-4)}
            </div>
            <div className="w-full inline-flex justify-between items-start gap-2">
              <div className="flex-1 inline-flex flex-col justify-start items-start gap-1">
                <div className="text-black text-lg font-bold font-['Outfit'] line-clamp-1">{video.title}</div>
                <div className="inline-flex justify-start items-center gap-[5px]">
                  <div className="text-black text-xs font-medium font-['Outfit']">0 views</div>
                  <div className="text-black text-xs font-medium font-['Outfit'] tracking-tight">•{formatTimeAgo(video.createdAt)}</div>
                </div>
              </div>
              <div className="flex justify-start items-center flex-shrink-0 gap-1">
                <div className="text-black text-lg font-semibold font-['Outfit']">2.5</div>
                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                          <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="w-5 h-5 text-black" xmlns="http://www.w3.org/2000/svg"><path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" /></svg>
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
