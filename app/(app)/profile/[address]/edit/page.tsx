'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useWalletContext } from '@/lib/context/WalletContext';

interface CreatorProfile {
  id: string;
  walletAddress: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  channelPrice: string | null;
  channelChain: string | null;
}

export default function EditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const { address: userAddress } = useWalletContext();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [channelPrice, setChannelPrice] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Check if this is the user's own profile
  const isOwnProfile = userAddress?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/v1/profile/${address}`);

        if (!response.ok) {
          // If profile doesn't exist, continue with empty form (will be created on save)
          console.log('Profile not found, will create on save');
          setLoading(false);
          return;
        }

        const data = await response.json();
        const profileData = data.profile;
        setProfile(profileData);

        // Populate form fields
        setName(profileData.name || '');
        setBio(profileData.bio || '');
        setChannelPrice(profileData.channelPrice || '');
        setAvatarPreview(profileData.avatar || null);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        // Don't show error for new profiles, just continue with empty form
        console.log('Will create new profile on save');
      } finally {
        setLoading(false);
      }
    };

    if (address) {
      fetchProfile();
    }
  }, [address]);

  // Separate effect for security redirect after wallet loads
  useEffect(() => {
    if (userAddress && address && !isOwnProfile) {
      router.push(`/profile/${address}`);
    }
  }, [userAddress, address, isOwnProfile, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOwnProfile) {
      setError('You can only edit your own profile');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/v1/profile/${address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          bio,
          channelPrice: channelPrice || null,
          channelChain: channelPrice ? 'sui' : null,
          avatar: avatarPreview || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      // Redirect to profile page on success
      router.push(`/profile/${address}`);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      setSaving(false);
    }
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

  // Don't show error page for new profiles - just continue to form

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] pl-20 pr-12 pt-12 pb-6">
      <div className="max-w-[1000px] mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-white text-3xl font-bold font-['Outfit']">Edit Profile</h1>
          <Link
            href={`/profile/${address}`}
            className="px-6 py-3 bg-white/20 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <div className="text-base font-bold font-['Outfit'] text-white">Cancel</div>
          </Link>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <div className="w-full p-8 bg-[#FFEEE5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black">
            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-[#EF4330] rounded-2xl outline outline-[3px] outline-offset-[-3px] outline-black">
                <p className="text-white font-semibold font-['Outfit']">{error}</p>
              </div>
            )}

            {/* Avatar Section */}
            <div className="mb-8">
              <label className="block text-black text-lg font-bold font-['Outfit'] mb-4">
                Profile Picture
              </label>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 bg-white rounded-full shadow-[3px_3px_0_0_black] outline outline-[3px] outline-offset-[-3px] outline-black overflow-hidden flex-shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={name || 'Profile picture'}
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
                <div>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="inline-block px-6 py-3 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                  >
                    <div className="text-base font-bold font-['Outfit'] text-black">
                      {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                    </div>
                  </label>
                  <p className="text-black/60 text-sm font-normal font-['Outfit'] mt-2">
                    Max 2MB. Stored in database (will migrate to Walrus later)
                  </p>
                </div>
              </div>
            </div>

            {/* Name Field */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-black text-lg font-bold font-['Outfit'] mb-3">
                Profile Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-6 py-4 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black text-black text-base font-medium font-['Outfit'] focus:outline-[#EF4330] focus:outline-[3px] transition-all"
                placeholder="Enter your profile name"
              />
            </div>

            {/* Bio Field */}
            <div className="mb-6">
              <label htmlFor="bio" className="block text-black text-lg font-bold font-['Outfit'] mb-3">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="w-full px-6 py-4 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black text-black text-base font-medium font-['Outfit'] focus:outline-[#EF4330] focus:outline-[3px] transition-all resize-none"
                placeholder="Tell people about yourself..."
              />
            </div>

            {/* Subscription Settings */}
            <div className="pt-6 border-t-2 border-black">
              <h3 className="text-black text-xl font-bold font-['Outfit'] mb-4">
                Subscription Settings
              </h3>
              <p className="text-black/70 text-sm font-normal font-['Outfit'] mb-6">
                Set a subscription price (in SUI) to allow users to subscribe and access all your videos uploaded with "Subscription ACL" encryption.
              </p>

              {/* Subscription Price */}
              <div className="mb-6">
                <label htmlFor="channelPrice" className="block text-black text-base font-bold font-['Outfit'] mb-3">
                  Subscription Price (Optional)
                </label>
                <input
                  type="text"
                  id="channelPrice"
                  value={channelPrice}
                  onChange={(e) => setChannelPrice(e.target.value)}
                  className="w-full px-6 py-4 bg-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black text-black text-base font-medium font-['Outfit'] focus:outline-[#EF4330] focus:outline-[3px] transition-all"
                  placeholder="e.g., 10 SUI"
                />
                <p className="text-black/60 text-sm font-normal font-['Outfit'] mt-2">
                  Leave empty if you don't want to enable subscriptions. Subscriptions are available on Sui network only.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-4 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-4 bg-[#EF4330] text-white rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-base font-bold font-['Outfit'] flex items-center gap-2">
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
