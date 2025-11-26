'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Scroll {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  views: number;
  pages: number;
  createdAt: string;
  price: number;
  author: string;
}

// Mock data for scrolls
const mockScrolls: Scroll[] = [
  {
    id: '1',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '2',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '3',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '4',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '5',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '6',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '7',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
  {
    id: '8',
    title: 'Defi alpha for how to earn up to 2000% on liquid staking',
    description: 'With global warming perspective fucked up...',
    thumbnail: '/scrolls/scroll-thumbnail.png',
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
];

const categories = ['Latest', 'Trending', 'Unvercy', 'DeFi', 'Gaming', 'Mints', 'Whales'];

// Scroll Card Component
const ScrollCard = ({ scroll }: { scroll: Scroll }) => {
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

  return (
    <div className="w-full p-3 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.34px] outline-offset-[-1.34px] outline-black flex gap-3 hover:bg-[#FFEEE5] hover:shadow-[4px_4px_0_0_black] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer">
      {/* Thumbnail */}
      <div className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]">
        <img
          src="https://i.imgur.com/pkTKVOL.png"
          alt={scroll.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="flex flex-col gap-1">
          {/* Title */}
          <h3 className="text-black text-sm font-bold font-['Outfit'] line-clamp-2 leading-tight">
            {scroll.title}
          </h3>
          {/* Description */}
          <p className="text-black/70 text-xs font-medium font-['Outfit'] line-clamp-2">
            {scroll.description}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-black/60 text-xs font-medium font-['Outfit']">
            <span>{scroll.views} views</span>
            <span>•</span>
            <span>{scroll.pages} pages</span>
            <span>•</span>
            <span>{formatTimeAgo(scroll.createdAt)}</span>
          </div>

          {/* Price and Unlock Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-black text-base font-semibold font-['Outfit']">{scroll.price}</span>
              <img src="/logos/sui-logo.png" alt="SUI" width={16} height={16} className="object-contain" />
            </div>
            <button className="px-3 py-1.5 bg-[#FFEEE5] rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] outline outline-[1.5px] outline-offset-[-1.5px] outline-black text-black text-xs font-semibold font-['Outfit'] hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
              Unlock scroll
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ScrollsPage() {
  const [activeCategory, setActiveCategory] = useState('Latest');
  const [isSubscribed, setIsSubscribed] = useState(false);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      {/* Hero Banner - Full width with overlay content */}
      <div className="relative w-full h-[320px] -mt-[60px]">
        {/* Background Image - Full bleed */}
        <img
          src="/scrolls-hero.png"
          alt="Underwater coral reef"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Content overlay on image */}
        <div className="absolute inset-0 flex flex-col justify-end px-8 pb-4 pt-[60px]">
          {/* Hero Text - Centered in upper area */}
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white text-xl md:text-2xl font-bold font-['Outfit'] text-center max-w-lg drop-shadow-lg [text-shadow:_2px_2px_4px_rgb(0_0_0_/_0.7)]" style={{ fontStyle: 'italic' }}>
              The ocean only reveals its secrets to a few. For the rest, the scrolls surface on krilltube
            </p>
          </div>

          {/* Scrolls Title and Subscribe - Bottom of image */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <h1 className="text-white text-3xl font-bold font-['Outfit']">Scrolls</h1>
              <p className="text-white/80 text-sm font-medium font-['Outfit']">3M Subscribers</p>
            </div>
            <button
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`px-5 py-2 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-[2px] outline-offset-[-2px] outline-black text-sm font-semibold font-['Outfit'] transition-all hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] ${
                isSubscribed
                  ? 'bg-black text-white'
                  : 'bg-white text-black'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>

          {/* Category Tabs - Bottom of image */}
          <div className="flex items-center gap-3 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full shadow-[2px_2px_0_0_black] outline outline-[2px] outline-offset-[-2px] whitespace-nowrap transition-all hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] ${
                  activeCategory === cat
                    ? 'bg-black outline-white text-white'
                    : 'bg-[#FFEEE5] outline-black text-black'
                }`}
              >
                <span className="text-sm font-semibold font-['Outfit']">{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrolls Content Section */}
      <div className="px-8 py-6">
        {/* Scrolls Grid - 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockScrolls.map((scroll) => (
            <ScrollCard key={scroll.id} scroll={scroll} />
          ))}
        </div>

        {/* Load More Button */}
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
      </div>
    </div>
  );
}
