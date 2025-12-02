'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PaymentModal } from '@/components/modals/PaymentModal';

interface PhotoContent {
  id: string;
  title: string;
  description: string | null;
  creatorId: string;
  creatorName: string | null;
  creatorAvatar: string | null;
  network: string;
  createdAt: string;
  imageCount: number;
  thumbnailImageId: string | null;
  price: {
    amount: string;
    decimals: number;
    coinType: string;
  } | null;
}

// Sample images for the photo feed - landscape images
const sampleImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop', // Mountains landscape
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop', // Nature forest
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&h=600&fit=crop', // Forest path
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=600&fit=crop', // Waterfall
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop', // Lake mountains
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop', // Foggy mountains
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop', // Sunlight forest
  'https://images.unsplash.com/photo-1518173946687-a4c036bc1e9e?w=800&h=600&fit=crop', // Valley
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop', // Mountain lake
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop', // Rocky mountains
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&h=600&fit=crop', // Misty lake
  'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&h=600&fit=crop', // Autumn forest
  'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&h=600&fit=crop', // Lake reflection
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop', // Green hills
  'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=800&h=600&fit=crop', // Lavender field
];

// Sample avatar images for profile pictures
const sampleAvatars = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', // Man avatar
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', // Woman avatar 1
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', // Man avatar 2
];

// Mock data for photos (will be replaced with API data)
const mockPhotos: (PhotoContent & { images: string[] })[] = [
  {
    id: '1',
    title: 'Haulout Hackathon',
    description: 'Bacon ipsum dolor amet prosciutto boudin tail landjaeger, tongue tenderloin turducken sirloin fatback biltong t-bone cow short loin ribeye chicken. Drumstick tongue pig tail. Filet mignon bresaola venison salami, tail beef fatback cow picanha pork. Capicola ham hock pork belly shankle, alcatra short ribs hamburger meatloaf tenderloin kevin andouille. Porchetta spare ribs cupim, jowl frankfurter sausage boudin. Leberkas fatback pork chop, ham hock chicken brisket ribeye ground round turducken strip steak ball tip corned beef. Shank tri-tip pastrami kevin, pig burgdoggen short ribs bacon frankfurter salami jerky ham hock brisket.',
    creatorId: '0x1234...5678',
    creatorName: 'Haulout Hackathon',
    creatorAvatar: sampleAvatars[0],
    network: 'mainnet',
    createdAt: '2022-01-15',
    imageCount: 15,
    thumbnailImageId: null,
    price: { amount: '5000000000', decimals: 9, coinType: 'sui' },
    images: sampleImages, // All 15 images
  },
  {
    id: '2',
    title: 'Design Sprint Workshop',
    description: 'Pork belly bresaola andouille, strip steak meatball jerky short ribs. Spare ribs brisket chicken meatloaf sausage ham hock. Beef ribs andouille frankfurter, tail salami porchetta.',
    creatorId: '0x2345...6789',
    creatorName: 'Design Sprint Workshop',
    creatorAvatar: sampleAvatars[1],
    network: 'mainnet',
    createdAt: '2023-01-15',
    imageCount: 1,
    thumbnailImageId: null,
    price: { amount: '4000000000', decimals: 9, coinType: 'sui' },
    images: [sampleImages[2]],
  },
  {
    id: '3',
    title: 'User Research Meetup',
    description: 'Biltong shankle pancetta jerky, rump cap beef ribs meatball. Chuck shoulder beef bacon, brisket sirloin tail. Hamburger swine beef ribs, sausage prosciutto pork chop.',
    creatorId: '0x3456...7890',
    creatorName: 'User Research Meetup',
    creatorAvatar: sampleAvatars[2],
    network: 'mainnet',
    createdAt: '2024-01-15',
    imageCount: 1,
    thumbnailImageId: null,
    price: { amount: '6000000000', decimals: 9, coinType: 'sui' },
    images: [sampleImages[3]],
  },
];

// Format time ago
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 30) return `${diffInDays} days ago`;
  if (diffInYears >= 1) return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
};

// Format price from raw amount
const formatPrice = (amount: string, decimals: number) => {
  const value = parseInt(amount) / Math.pow(10, decimals);
  return value.toString();
};

// Photo Card Component - matches the Figma design
const PhotoCard = ({
  photo,
  isUnlocked,
  onUnlockClick,
  onViewImage
}: {
  photo: PhotoContent & { images?: string[] };
  isUnlocked: boolean;
  onUnlockClick: () => void;
  onViewImage: (index: number) => void;
}) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Check if description text is actually truncated (overflows 3 lines)
  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current) {
        // Compare scrollHeight (full content height) vs clientHeight (visible height)
        setIsTextTruncated(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
      }
    };
    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [photo.description]);

  // Determine if this is a multi-image post
  const isMultiImage = photo.imageCount > 1;

  // Get images from photo data
  const images = photo.images || [];
  const mainImage = images[0] || '';
  const secondImage = images[1] || images[0] || '';
  const thirdImage = images[2] || images[1] || images[0] || '';

  return (
    <div className="w-full p-6 bg-[#FFEFE6] rounded-[32px] border-[3px] border-black shadow-[5px_5px_0px_1px_#000000] flex flex-col gap-6">
      {/* Profile and Description Section */}
      <div className="flex flex-col gap-3">
        {/* Header - Profile and Subscribe */}
        <div className="flex justify-between items-start">
          {/* Name and Info */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-[50px] h-[50px] rounded-full border border-white shadow-[3px_3px_0px_#000000] overflow-hidden flex-shrink-0">
              <img
                src={photo.creatorAvatar || sampleAvatars[0]}
                alt={photo.creatorName || 'Creator'}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Text */}
            <div className="flex flex-col gap-1">
              <h3 className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">
                {photo.title}
              </h3>
              <span className="text-black text-[12px] font-medium font-['Outfit'] leading-[15px]">
                834 Subscribers
              </span>
            </div>
          </div>

          {/* Subscribe Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSubscribed(!isSubscribed);
            }}
            className={`px-4 py-2.5 rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_#000000] transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] ${
              isSubscribed ? 'bg-black text-white' : 'bg-white text-black'
            }`}
          >
            <span className="text-[16px] font-bold font-['Outfit'] leading-[20px]">
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </span>
          </button>
        </div>

        {/* Description with See More */}
        <div className="relative">
          <p
            ref={descriptionRef}
            className={`text-black text-[16px] font-normal font-['Outfit'] leading-[20px] ${
              !isDescriptionExpanded ? 'line-clamp-3' : ''
            }`}
          >
            {photo.description}
          </p>
          {isTextTruncated && !isDescriptionExpanded && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDescriptionExpanded(true);
              }}
              className="text-[#0668A6] text-[16px] font-semibold font-['Outfit'] leading-[20px] hover:underline mt-1"
            >
              See more
            </button>
          )}
          {isDescriptionExpanded && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDescriptionExpanded(false);
              }}
              className="text-[#0668A6] text-[16px] font-semibold font-['Outfit'] leading-[20px] hover:underline mt-1"
            >
              See less
            </button>
          )}
        </div>
      </div>

      {/* Image Section - Click to unlock or view */}
      {isMultiImage ? (
        /* Multi-image layout - left large image, right column with 2 stacked images */
        <div className="flex gap-4 w-full h-[448px]">
          {/* Main large image - left side */}
          <div
            className={`flex-1 h-full rounded-[32px] border-[3px] border-black overflow-hidden relative cursor-pointer ${isUnlocked ? 'hover:brightness-90' : ''} transition-all`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isUnlocked) {
                onViewImage(0);
              } else {
                onUnlockClick();
              }
            }}
          >
            <img
              src={mainImage}
              alt="Photo preview"
              className={`w-full h-full object-cover ${isUnlocked ? '' : 'blur-[20px] scale-110'} transition-all duration-500`}
            />
            {/* Lock Icon - only show when locked */}
            {!isUnlocked && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
                <svg className="w-[84px] h-[84px] text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
                </svg>
                <span className="text-white text-sm font-bold font-['Outfit'] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                  Click to unlock
                </span>
              </div>
            )}
            {/* View indicator when unlocked */}
            {isUnlocked && (
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 rounded-full flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                <span className="text-white text-xs font-medium">View</span>
              </div>
            )}
          </div>

          {/* Right column with 2 stacked images */}
          <div className="flex flex-col gap-4 w-[45%]">
            {/* Top right image */}
            <div
              className={`flex-1 rounded-[32px] border-[3px] border-black overflow-hidden relative cursor-pointer ${isUnlocked ? 'hover:brightness-90' : ''} transition-all`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isUnlocked) {
                  onViewImage(1);
                } else {
                  onUnlockClick();
                }
              }}
            >
              <img
                src={secondImage}
                alt="Photo preview"
                className={`w-full h-full object-cover ${isUnlocked ? '' : 'blur-[20px] scale-110'} transition-all duration-500`}
              />
              {/* Lock Icon - only show when locked */}
              {!isUnlocked && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <svg className="w-[60px] h-[60px] text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Bottom right card with +N count */}
            <div
              className={`flex-1 rounded-[32px] border-[3px] border-black overflow-hidden relative cursor-pointer ${isUnlocked ? 'hover:brightness-90' : ''} transition-all`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isUnlocked) {
                  onViewImage(2);
                } else {
                  onUnlockClick();
                }
              }}
            >
              <img
                src={thirdImage}
                alt="Photo preview"
                className={`w-full h-full object-cover ${isUnlocked ? '' : 'blur-[20px] scale-110'} transition-all duration-500`}
              />
              {/* Count overlay showing remaining images - only show when there are more than 3 images */}
              {photo.imageCount > 3 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className={`text-white font-bold font-['Outfit'] drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] ${isUnlocked ? 'text-[48px]' : 'text-[64px] leading-[81px]'}`}>
                    +{photo.imageCount - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Single image layout */
        <div
          className={`w-full h-[448px] rounded-[32px] border-[3px] border-black overflow-hidden relative cursor-pointer ${isUnlocked ? 'hover:brightness-90' : ''} transition-all`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isUnlocked) {
              onViewImage(0);
            } else {
              onUnlockClick();
            }
          }}
        >
          <img
            src={mainImage}
            alt="Photo preview"
            className={`w-full h-full object-cover ${isUnlocked ? '' : 'blur-[20px] scale-110'} transition-all duration-500`}
          />
          {/* Lock Icon - only show when locked */}
          {!isUnlocked && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
              <svg className="w-[84px] h-[84px] text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4z"/>
              </svg>
              <span className="text-white text-sm font-bold font-['Outfit'] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                Click to unlock
              </span>
            </div>
          )}
          {/* View indicator when unlocked */}
          {isUnlocked && (
            <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 rounded-full flex items-center gap-1.5 opacity-0 hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <span className="text-white text-xs font-medium">View</span>
            </div>
          )}
        </div>
      )}

      {/* Actions and Info Section */}
      <div className="flex justify-between items-center">
        {/* Views and Date */}
        <div className="flex items-center gap-1 text-black text-[14px] font-medium font-['Outfit'] leading-[18px]">
          <span>533 views</span>
          <span>•</span>
          <span>57 likes</span>
          <span>•</span>
          <span>{formatTimeAgo(photo.createdAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-10 h-10 bg-white rounded-full border-[2px] border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>

          {/* Comment Button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-10 h-10 bg-white rounded-full border-[2px] border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <img src="/logos/comment.svg" alt="Comment" width={24} height={24} />
          </button>

          {/* Share Button */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="w-10 h-10 bg-white rounded-full border-[2px] border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="black">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>

          {/* Price with Sui logo */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="h-10 px-3 bg-white rounded-full border-[2px] border-black shadow-[3px_3px_0px_#000000] flex items-center justify-center gap-0.5 hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <span className="text-black text-[16px] font-semibold font-['Outfit'] leading-[20px]">
              {photo.price ? formatPrice(photo.price.amount, photo.price.decimals) : '0'}
            </span>
            <img src="/logos/sui-logo.png" alt="SUI" width={16} height={16} className="object-contain" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Fullscreen Image Viewer Component
const ImageViewer = ({
  images,
  initialIndex = 0,
  onClose
}: {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={goToPrevious}
          className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={goToNext}
          className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Image */}
      <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
      </div>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 rounded-full">
          <span className="text-white text-sm font-medium font-['Outfit']">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      )}

      {/* Thumbnail Strip - scrollable for large image sets */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 max-w-[90vw] overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<(PhotoContent & { images?: string[] })[]>(mockPhotos);
  const [loading, setLoading] = useState(false);
  const [unlockedPhotos, setUnlockedPhotos] = useState<Set<string>>(new Set());
  const [selectedPhoto, setSelectedPhoto] = useState<(PhotoContent & { images?: string[] }) | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[] | null>(null);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // Handle unlock click - opens payment modal
  const handleUnlockClick = (photo: PhotoContent & { images?: string[] }) => {
    setSelectedPhoto(photo);
    setShowPaymentModal(true);
  };

  // Handle payment completion
  const handlePayWithToken = (coinType: string) => {
    if (selectedPhoto) {
      // In production, this would trigger actual blockchain payment
      // For demo, we'll just unlock the photo
      console.log(`Processing payment with ${coinType} for photo ${selectedPhoto.id}`);
      setUnlockedPhotos(prev => new Set([...prev, selectedPhoto.id]));
      setShowPaymentModal(false);
      setSelectedPhoto(null);
    }
  };

  // Handle get demo tokens
  const handleGetDemoTokens = () => {
    // In production, this would redirect to faucet or token distribution
    console.log('Redirecting to demo token faucet...');
    window.open('https://faucet.sui.io/', '_blank');
  };

  // Get creator configs for selected photo
  const getCreatorConfigs = () => {
    if (!selectedPhoto?.price) return [];
    return [{
      coinType: selectedPhoto.price.coinType === 'sui' ? '0x2::sui::SUI' : selectedPhoto.price.coinType,
      pricePerView: selectedPhoto.price.amount,
      decimals: selectedPhoto.price.decimals,
      chain: 'sui',
    }];
  };

  // Fetch photos from API
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/v1/image-content?limit=12');
        if (response.ok) {
          const data = await response.json();
          if (data.contents && data.contents.length > 0) {
            setPhotos(data.contents);
          }
          // If no data, keep using mock data
        }
      } catch (error) {
        console.error('Error fetching photos:', error);
        // Keep using mock data on error
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      {/* Photos Content Section - No hero banner, direct to content */}
      <div className="px-8 pt-10 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg font-semibold font-['Outfit']">Loading photos...</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          /* Empty State */
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No photos yet</h3>
              <p className="text-white/80 mb-6">Be the first to upload a photo collection</p>
              <Link
                href="/upload/image"
                className="inline-block px-6 py-3 bg-[#FFEEE5] text-black font-bold rounded-[32px] shadow-[3px_3px_0_0_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                Upload Photos
              </Link>
            </div>
          </div>
        ) : (
          /* Photos Grid - Single column for large cards, centered */
          <div className="flex flex-col gap-6 max-w-[808px] mx-auto">
            {photos.map((photo) => (
              <div key={photo.id}>
                <PhotoCard
                  photo={photo}
                  isUnlocked={unlockedPhotos.has(photo.id)}
                  onUnlockClick={() => handleUnlockClick(photo)}
                  onViewImage={(index) => {
                    if (photo.images && photo.images.length > 0) {
                      setViewerImages(photo.images);
                      setViewerInitialIndex(index);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {photos.length > 0 && (
          <div className="flex justify-center mt-8 pb-8">
            <button className="px-6 py-3 bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex items-center gap-3 hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
              <span className="text-white text-lg font-bold font-['Outfit']">Load more</span>
              <div className="w-8 h-8 bg-black rounded-full flex justify-center items-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPhoto && (
        <div className="fixed inset-0 z-50">
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedPhoto(null);
            }}
            onPayWithToken={handlePayWithToken}
            onGetDemoTokens={handleGetDemoTokens}
            creatorConfigs={getCreatorConfigs()}
            encryptionType="per-video"
          />
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      {viewerImages && (
        <ImageViewer
          images={viewerImages}
          initialIndex={viewerInitialIndex}
          onClose={() => {
            setViewerImages(null);
            setViewerInitialIndex(0);
          }}
        />
      )}
    </div>
  );
}
