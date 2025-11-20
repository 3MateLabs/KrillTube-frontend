'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { VideoCard } from '@/components/VideoCard';
import { useWalletContext } from '@/lib/context/WalletContext';

interface CreatorProfile {
  id: string;
  walletAddress: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  createdAt: string;
  videoCount: number;
  subscriberCount: number;
  channelPrice: string | null;
  channelChain: string | null;
}

interface Video {
  id: string;
  title: string;
  posterWalrusUri: string | null;
  duration: number | null;
  createdAt: string;
  encryptionType: string;
}

export default function ProfilePage() {
  const params = useParams();
  const address = params.address as string;
  const { address: userAddress } = useWalletContext();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check if this is the user's own profile
  const isOwnProfile = userAddress?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/v1/profile/${address}`);

        if (!response.ok) {
          throw new Error('Profile not found');
        }

        const data = await response.json();
        setProfile(data.profile);
        setVideos(data.videos || []);
        setIsSubscribed(data.isSubscribed || false);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchProfile();
    }
  }, [address]);

  const handleSubscribe = async () => {
    // TODO: Implement subscription payment flow
    console.log('Subscribe to channel');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white font-medium font-['Outfit']">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    // Show "Complete Profile" prompt for own profile (even on errors, since API should auto-create)
    const showCompleteProfilePrompt = isOwnProfile;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            {showCompleteProfilePrompt ? (
              <>
                <h3 className="text-2xl font-bold text-white mb-2 font-['Outfit']">Welcome to KrillTube!</h3>
                <p className="text-white/80 mb-6 font-['Outfit']">
                  Let's set up your creator profile to get started
                </p>
                <div className="flex flex-col gap-4">
                  <Link
                    href={`/profile/${address}/edit`}
                    className="inline-block px-6 py-3 bg-[#EF4330] text-white font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-['Outfit']"
                  >
                    Complete Your Profile
                  </Link>
                  <Link
                    href="/watch"
                    className="inline-block px-6 py-3 bg-white/20 text-white font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-white hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-['Outfit']"
                  >
                    Browse Videos
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-white mb-2 font-['Outfit']">Profile not found</h3>
                <p className="text-white/80 mb-6 font-['Outfit']">{error || 'This creator does not exist'}</p>
                <Link
                  href="/"
                  className="inline-block px-6 py-3 bg-white text-black font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-['Outfit']"
                >
                  Go Home
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] pl-20 pr-12 pt-12 pb-6">
      {/* Profile Header */}
      <div className="max-w-[1400px] mx-auto mb-8">
        <div className="w-full p-8 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 bg-white rounded-full shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black overflow-hidden flex-shrink-0">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0668A6] to-[#1AAACE]">
                  <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="flex-1">
              <h1 className="text-black text-3xl font-bold font-['Outfit'] mb-2">
                {profile.name}
              </h1>

              {/* Wallet Address */}
              <div className="mb-3 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full outline outline-1 outline-offset-[-1px] outline-black">
                <div className="text-black text-sm font-semibold font-['Outfit']">
                  {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mb-3">
                <div className="text-black text-base font-medium font-['Outfit']">
                  <span className="font-bold">{profile.videoCount}</span> {profile.videoCount === 1 ? 'Video' : 'Videos'}
                </div>
                <div className="text-black text-base font-medium font-['Outfit']">
                  <span className="font-bold">{profile.subscriberCount}</span> {profile.subscriberCount === 1 ? 'Subscriber' : 'Subscribers'}
                </div>
              </div>

              {/* Bio */}
              {profile.bio ? (
                <p className="text-black text-base font-normal font-['Outfit'] mb-4 max-w-2xl">
                  {profile.bio}
                </p>
              ) : isOwnProfile ? (
                <p className="text-black/60 text-base font-normal font-['Outfit'] mb-4 max-w-2xl italic">
                  Add a bio to tell people about your channel...
                </p>
              ) : null}

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {/* Edit Profile Button (Own Profile) */}
                {isOwnProfile && (
                  <Link
                    href={`/profile/${address}/edit`}
                    className="px-8 py-3 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  >
                    <div className="text-base font-bold font-['Outfit'] text-black">
                      Edit Profile
                    </div>
                  </Link>
                )}

                {/* Subscribe Button (Other's Profile) */}
                {!isOwnProfile && profile.channelPrice && (
                  <>
                    <button
                      onClick={handleSubscribe}
                      disabled={isSubscribed}
                      className={`px-8 py-3 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${
                        isSubscribed
                          ? 'bg-black text-white cursor-not-allowed'
                          : 'bg-[#EF4330] text-white hover:bg-[#EF4330]/90'
                      }`}
                    >
                      <div className="text-base font-bold font-['Outfit']">
                        {isSubscribed ? 'Subscribed' : `Subscribe for ${profile.channelPrice}`}
                      </div>
                    </button>

                    {isSubscribed && (
                      <div className="px-4 py-2 bg-white rounded-full outline outline-1 outline-offset-[-1px] outline-black">
                        <div className="text-black text-sm font-semibold font-['Outfit']">
                          ✓ Access to all videos
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Section */}
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-white text-2xl font-bold font-['Outfit']">
            Videos
          </h2>
        </div>

        {/* Video Grid */}
        {videos.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 font-['Outfit']">No videos yet</h3>
              <p className="text-white/80 mb-6 font-['Outfit']">
                {isOwnProfile ? 'Start sharing your content with the world' : 'This creator hasn\'t uploaded any videos'}
              </p>
              {isOwnProfile && (
                <Link
                  href="/upload"
                  className="inline-block px-8 py-4 bg-[#EF4330] text-white font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all font-['Outfit']"
                >
                  Upload Your First Video
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                thumbnail={video.posterWalrusUri}
                creator={profile.name}
                uploadedAt={video.createdAt}
                duration={video.duration}
                variant="default"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
