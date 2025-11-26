'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Scroll {
  id: string;
  title: string;
  description: string;
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
    views: 533,
    pages: 4,
    createdAt: '2024-01-15',
    price: 2.5,
    author: 'alphaGems.sui',
  },
];

const categories = ['Latest', 'Trending', 'Memes', 'DeFi', 'Gaming', 'RWAs', 'Move'];

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
    <div className="w-full p-3 bg-[#FFEFE6] rounded-[10px] border-[3px] border-black shadow-[3px_3px_0px_0px_#000000] flex flex-row gap-3 hover:shadow-[1px_1px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] transition-all cursor-pointer">
      {/* Product photo */}
      <div className="w-[120px] h-[165px] flex-shrink-0 rounded-[5px] overflow-hidden">
        <img
          src="/scrolls/scroll-thumbnail.png"
          alt={scroll.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* About product */}
      <div className="flex flex-col justify-between items-start flex-1 py-1">
        {/* Container - title, description, author */}
        <div className="flex flex-col items-start gap-1">
          {/* Title */}
          <h3 className="text-black text-[14px] font-bold font-['Outfit'] leading-[18px] line-clamp-2">
            {scroll.title}
          </h3>
          {/* Description */}
          <p className="text-black/70 text-[12px] font-normal font-['Outfit'] leading-[16px] line-clamp-2">
            {scroll.description}
          </p>
          {/* Author */}
          <span className="text-black text-[12px] font-semibold font-['Outfit'] leading-[16px]">
            @{scroll.author}
          </span>
        </div>

        {/* Bottom section - views/date and price/button */}
        <div className="flex flex-col items-start gap-2 w-full">
          {/* Views and date */}
          <div className="flex items-center gap-1 text-black text-[12px] font-medium font-['Outfit'] leading-[16px]">
            <span>{scroll.views} views</span>
            <span>•</span>
            <span>{scroll.pages} pages</span>
            <span>•</span>
            <span>{formatTimeAgo(scroll.createdAt)}</span>
          </div>

          {/* Price and Unseal Button */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-0">
              <span className="text-black text-[18px] font-semibold font-['Outfit'] leading-[22px]">{scroll.price}</span>
              <img src="/logos/sui-logo.png" alt="SUI" width={18} height={18} className="object-contain" />
            </div>
            <Link
              href={`/scrolls/${scroll.id}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0668A6] rounded-[8px] border-[2px] border-black shadow-[2px_2px_0px_0px_#000000] hover:shadow-[1px_1px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_519_87)">
                  <path d="M17.5108 0.862502C16.7788 0.854674 16.2025 1.07916 15.9844 1.55391C14.9167 3.87914 13.6996 5.6386 12.2768 7.05141C12.4209 7.09966 12.5609 7.15894 12.6958 7.22874C13.3046 7.54317 13.8803 8.06217 14.3511 8.6745C14.8219 9.28683 15.1878 9.99235 15.3251 10.7136C15.3601 10.8968 15.3795 11.0832 15.3794 11.2687C17.2061 10.1268 19.3665 9.33638 21.9829 8.86346C22.6818 8.73703 23.0916 7.52133 22.9863 6.11396L21.3383 6.06708L22.7709 4.90397C22.5764 4.22396 22.2546 3.55613 21.7792 2.99522C21.0513 2.13675 20.0716 1.52447 19.1205 1.18181L17.9034 1.91278L18.0353 0.904971C17.8536 0.87919 17.6785 0.86419 17.5108 0.862456L17.5108 0.862502ZM11.5752 7.80732C11.5254 7.80975 11.4787 7.81791 11.4346 7.82935C10.8732 8.31 10.281 8.74796 9.65626 9.15497C9.69572 9.17044 9.73454 9.18624 9.77344 9.20335C10.4355 9.4936 11.0596 10.007 11.5767 10.6389C12.2028 11.404 12.6839 12.3705 12.7778 13.3459C13.2623 12.86 13.7735 12.4111 14.3174 11.9997C14.5094 11.6924 14.5485 11.3215 14.4639 10.8776C14.3615 10.3404 14.0588 9.73243 13.6553 9.20766C13.2517 8.68294 12.7469 8.241 12.293 8.00649C12.0093 7.85996 11.7701 7.79789 11.5752 7.80727L11.5752 7.80732ZM8.67333 9.83616C8.60841 9.83864 8.54724 9.84882 8.48733 9.8625C6.75296 10.8357 4.78008 11.6431 2.51958 12.4875C2.54649 12.4895 2.57302 12.4919 2.60021 12.4948C3.09835 12.549 3.58815 12.7296 4.0606 13.0046L5.82718 12.2341L5.08594 13.7678C5.36696 14.0225 5.63921 14.3058 5.89894 14.6116C6.87207 15.7569 7.67851 17.2303 8.10647 18.7409C8.10657 18.7414 8.10633 18.7419 8.10647 18.7424C8.24616 19.235 8.34601 19.7228 8.40235 20.1955C9.38626 17.925 10.4827 16.0115 11.7935 14.4299C12.1357 13.423 11.691 12.1608 10.8999 11.1941C10.4574 10.6533 9.91665 10.223 9.42193 10.0061C9.14368 9.88402 8.89365 9.82763 8.67333 9.83616ZM15.3121 12.407C14.9694 12.6437 14.6341 12.8996 14.3072 13.1716C16.1428 13.6057 17.1644 14.8461 18.0879 16.0852C18.5784 16.7433 19.0534 17.4028 19.6406 17.9924C20.7745 18.4212 21.6642 18.2915 22.6362 17.2922C18.316 15.99 18.1311 12.9511 15.312 12.4069L15.3121 12.407ZM2.27785 13.3547C1.76818 13.3652 1.42191 13.6245 1.1836 14.1325C0.911256 14.7132 0.850131 15.6546 1.20413 16.8074C1.47366 17.6853 1.97851 18.5754 2.55179 19.2273C3.12507 19.8792 3.76585 20.2621 4.20994 20.2776H4.21144C4.38568 20.2837 4.51862 20.2456 4.62451 20.1487L4.61574 20.1398L4.71385 20.0417C4.75102 19.9869 4.7851 19.9223 4.81637 19.8454C4.94808 19.522 4.97012 18.9758 4.72993 18.2985C4.40719 17.3884 3.83368 16.8017 3.16547 16.6682L2.08885 16.4543L3.01758 15.8684L4.82087 14.7346C4.0404 13.9461 3.20133 13.4406 2.50637 13.365C2.42668 13.3563 2.3506 13.3532 2.2778 13.3547L2.27785 13.3547ZM13.3521 13.6081L12.2022 14.7976C16.9104 15.6356 14.8014 21.4072 19.6699 23.0564L18.5083 20.3714C20.0442 21.1284 21.6672 21.4318 23.0889 20.9353C16.7247 18.969 18.5739 14.9829 13.3521 13.6081ZM5.40816 15.3997L4.19091 16.1657C4.80872 16.5642 5.27888 17.2235 5.55615 18.0056C5.67662 18.3451 5.74988 18.6714 5.7788 18.9796L6.87755 17.884C6.4988 16.9845 5.98529 16.1231 5.40826 15.3996L5.40816 15.3997ZM7.20704 18.7922L5.23533 20.7609L5.22802 20.7536C5.02857 20.9384 4.78477 21.0707 4.51618 21.1257C5.60686 21.8229 6.60886 22.0326 7.17924 21.5739C7.37893 21.4133 7.50938 21.1821 7.57627 20.8987C7.55705 20.3041 7.4543 19.6511 7.26422 18.9812C7.24632 18.9181 7.22644 18.8553 7.20704 18.7922Z" fill="white"/>
                </g>
                <defs>
                  <clipPath id="clip0_519_87">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              <span className="text-white text-[13px] font-bold font-['Nunito_Sans'] leading-[18px]">Unseal scroll</span>
            </Link>
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
      {/* Hero Banner - Background extends to sidebar, content stays in main area */}
      <div className="relative h-[320px] -mt-[60px] pt-[60px]">
        {/* Background Image Container - Extends left to touch sidebar */}
        <div className="absolute inset-0 -left-[320px] lg:-left-[320px]" style={{ width: 'calc(100% + 320px)' }}>
          <img
            src="/scrolls-hero.png"
            alt="Underwater coral reef"
            className="w-full h-full object-cover"
          />
          {/* Bottom drop shadow - neubrutalism style */}
          <div className="absolute bottom-[-5px] left-[5px] right-[-5px] h-[5px] bg-black"></div>
        </div>

        {/* Content overlay - Stays within main content area */}
        <div className="relative z-10 h-full px-8">
          {/* Quote Text - Right aligned, absolute positioned */}
          <p
            className="absolute right-8 top-8 w-[759px] text-white text-right drop-shadow-lg [text-shadow:_2px_2px_4px_rgb(0_0_0_/_0.7)]"
            style={{
              fontFamily: "'Fredericka the Great'",
              fontWeight: 400,
              fontSize: '48px',
              lineHeight: '59px'
            }}
          >
            The ocean only reveals its secrets to a few. For the rest, the scrolls surface on krill.tube
          </p>

          {/* Scrolls Title and Subscribe - Left aligned, bottom area */}
          <div className="absolute left-8 bottom-6 flex flex-row items-end gap-10">
            {/* Text container */}
            <div className="flex flex-col items-start">
              <h1 className="text-white text-[48px] font-semibold leading-[58px]" style={{ fontFamily: "'Fredoka One', cursive" }}>Scrolls</h1>
              <p className="text-white text-[20px] font-medium font-['Outfit'] leading-[25px]">34k Subscribers</p>
            </div>
            {/* Subscribe button */}
            <button
              onClick={() => setIsSubscribed(!isSubscribed)}
              className={`px-2 py-2 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] ${
                isSubscribed
                  ? 'bg-black'
                  : 'bg-gradient-to-br from-[#EF4330] to-[#1AAACE]'
              }`}
              style={{ background: isSubscribed ? '#000' : 'linear-gradient(126.87deg, #EF4330 -17.16%, #1AAACE 118.83%)' }}
            >
              <div className="flex flex-row justify-center items-center px-2 py-2 rounded-[32px]" style={{ background: 'linear-gradient(126.87deg, #EF4330 -17.16%, #1AAACE 118.83%)' }}>
                <span className="text-white text-[16px] font-bold font-['Outfit'] leading-[20px]">
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </span>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Category Tabs - Below the underwater image */}
      <div className="flex items-center gap-2 overflow-x-auto px-8 py-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full shadow-[2px_2px_0_0_black] outline outline-[2px] outline-offset-[-2px] whitespace-nowrap transition-all hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] ${
              activeCategory === cat
                ? 'bg-black outline-white text-white'
                : 'bg-[#0668A6] outline-black text-white'
            }`}
          >
            <span className="text-sm font-semibold font-['Outfit']">{cat}</span>
          </button>
        ))}
      </div>

      {/* Scrolls Content Section */}
      <div className="px-8 pb-6">
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
