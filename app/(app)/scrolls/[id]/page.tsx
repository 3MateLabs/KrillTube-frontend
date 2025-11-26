'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

interface ScrollContent {
  id: string;
  title: string;
  content: string[];
  author: string;
  authorHandle: string;
  subscriberCount: string;
  views: number;
  pages: number;
  createdAt: string;
}

// Mock scroll content data
const mockScrollContent: ScrollContent = {
  id: '1',
  title: 'DeFi alpha for how to earn up to 2000% on liquid staking',
  content: [
    `Bacon ipsum dolor amet prosciutto boudin tail landjaeger, tongue tenderloin turducken sirloin fatback biltong t-bone cow short loin ribeye chicken. Drumstick tongue pig tail. Filet mignon bresaola venison salami, tail beef fatback cow picanha pork.

Turducken sirloin rump pork belly boudin frankfurter capicola meatball chislic.

Kielbasa prosciutto hamburger porchetta ground round bresaola strip steak cow, burgdoggen ham hock jowl pork loin ham t-bone. Turkey pork buffalo cupim, drumstick prosciutto kevin meatball. Rump pork chop chicken, burgdoggen swine kevin cow pork belly meatloaf. Bacon boudin kielbasa, flank jowl chislic corned beef pork belly jerky. Cupim pork ham andouille, shank jowl kevin chislic drumstick biltong ribeye tail pork belly shoulder tri-tip.

Corned beef fatback porchetta, kevin jerky spare ribs frankfurter beef. Shank buffalo corned beef sirloin. Tenderloin salami andouille burgdoggen shoulder, frankfurter landjaeger pastrami meatball. Kielbasa short loin picanha filet mignon flank biltong boudin doner ham hock brisket pork loin salami pancetta chuck. Ball tip pork bacon, kevin short loin flank shank frankfurter kielbasa capicola tail. Drumstick turducken strip steak pork loin capicola bacon buffalo.

Jerky pastrami drumstick shank pork belly frankfurter kevin pancetta porchetta. Flank hamburger turkey, tail chislic kevin filet mignon. Boudin ham hock turkey, cow andouille landjaeger chuck tail flank meatball ribeye chicken picanha. Kevin kielbasa beef ribs shoulder biltong rump meatball picanha turkey salami.`,
    `Chapter 2: Advanced Strategies

The key to maximizing your liquid staking returns lies in understanding the underlying mechanics of each protocol. By carefully selecting protocols with strong fundamentals and proven track records, you can significantly reduce risk while maintaining high yield potential.

Consider diversifying across multiple chains and protocols to spread risk. Monitor your positions regularly and be prepared to rebalance when opportunities arise.

Remember: High returns always come with higher risk. Never invest more than you can afford to lose.

The most successful DeFi participants are those who take the time to understand the protocols they're using. Read the documentation, join the community discussions, and stay updated on any changes or upgrades.`,
    `Chapter 3: Protocol Analysis

When evaluating liquid staking protocols, consider:

• Total Value Locked (TVL) - Higher TVL often indicates greater trust
• Team credibility and track record - Look for doxxed teams with experience
• Smart contract audits - Multiple audits from reputable firms are essential
• Community engagement - Active Discord/Telegram with responsive team
• Tokenomics and emission schedule - Understand how rewards are distributed

The best protocols combine security with competitive yields. Don't chase the highest APY without understanding the risks involved.

Always start with a small position to test the protocol before committing larger amounts.`,
    `Chapter 4: Conclusion

Liquid staking represents one of the most exciting opportunities in DeFi today. By following the strategies outlined in this scroll, you can position yourself to capture significant returns while managing risk appropriately.

Key takeaways:
• Diversify across multiple protocols
• Understand the risks before investing
• Monitor your positions regularly
• Stay informed about protocol updates
• Never invest more than you can afford to lose

Stay informed, stay safe, and happy staking!

Thank you for reading this scroll. If you found it valuable, consider subscribing for more alpha content.`,
  ],
  author: 'Matteo.sui',
  authorHandle: 'matteo.sui',
  subscriberCount: '356',
  views: 533,
  pages: 4,
  createdAt: '3 years ago',
};

export default function UnsealScrollPage() {
  const params = useParams();
  const [currentPage, setCurrentPage] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const scroll = mockScrollContent;
  const totalPages = scroll.content.length;

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    setCurrentPage(totalPages - 1);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#0668A6] via-[#0668A6] to-[#1AAACE]">
      {/* Hero Banner - Same design as parent scrolls page */}
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
          {/* Title - Right aligned, absolute positioned */}
          <p
            className="absolute right-8 top-8 w-[759px] text-white text-right drop-shadow-lg [text-shadow:_2px_2px_4px_rgb(0_0_0_/_0.7)]"
            style={{
              fontFamily: "'Fredericka the Great'",
              fontWeight: 400,
              fontSize: '48px',
              lineHeight: '59px'
            }}
          >
            {scroll.title}
          </p>

          {/* Author info and controls - Left aligned, bottom area */}
          <div className="absolute left-8 bottom-6 flex flex-row items-end justify-between w-[calc(100%-64px)]">
            {/* Left section: Author info */}
            <div className="flex flex-row items-end gap-4">
              {/* Text container */}
              <div className="flex flex-col items-start gap-1">
                <h2 className="text-white text-[48px] font-semibold leading-[58px]" style={{ fontFamily: "'Fredoka One', cursive" }}>
                  {scroll.author}
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-white text-[16px] font-medium font-['Outfit'] leading-[20px]">
                    @{scroll.authorHandle}
                  </span>
                  <span className="text-white text-[16px] font-medium font-['Outfit'] leading-[20px] tracking-[0.02em]">
                    •{scroll.subscriberCount} Subscribers
                  </span>
                </div>
                <span className="text-white text-[20px] font-medium font-['Outfit'] leading-[25px]">
                  {scroll.views} views •{scroll.pages} pages •{scroll.createdAt}
                </span>
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

            {/* Right section: Change background and Font buttons */}
            <div className="flex items-center gap-4">
              {/* Change background button */}
              <button
                className="h-[54px] px-4 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]"
                style={{ background: 'linear-gradient(126.87deg, #EF4330 -17.16%, #1AAACE 118.83%)' }}
              >
                <span className="text-white text-[16px] font-bold font-['Montserrat'] leading-[20px]">
                  Change background
                </span>
                <div className="w-[30px] h-[30px] bg-[#090909] rounded-[15px] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5H7z" />
                  </svg>
                </div>
              </button>

              {/* Font button */}
              <button
                className="h-[54px] px-4 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]"
                style={{ background: 'linear-gradient(126.87deg, #EF4330 -17.16%, #1AAACE 118.83%)' }}
              >
                <span className="text-white text-[16px] font-bold font-['Montserrat'] leading-[20px]">
                  Font
                </span>
                <div className="w-[30px] h-[30px] bg-[#090909] rounded-[15px] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M7 10l5 5 5-5H7z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Content Area */}
      <div className="relative flex justify-center py-8">
        {/* Scroll image container */}
        <div className="relative w-full max-w-[1148px] min-h-[1000px]">
          {/* Scroll background image */}
          <img
            src="/scrolls/scroll-background.png"
            alt="Scroll background"
            className="w-full h-auto"
          />

          {/* Text content overlay - positioned on the scroll */}
          <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 w-[607px] max-h-[675px] overflow-y-auto scrollbar-hide">
            <p className="text-black text-[20px] font-semibold font-['Outfit'] leading-[25px] whitespace-pre-line">
              {scroll.content[currentPage]}
            </p>
          </div>

          {/* Navigation controls - positioned at bottom */}
          <div className="absolute bottom-[5%] left-0 right-0 flex items-center justify-center gap-8 px-8">
            {/* Left controls: arrows and Last Page */}
            <div className="flex items-center gap-2">
              {/* Left arrow */}
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`w-[40px] h-[40px] rounded-[20px] border-[2px] border-black flex items-center justify-center transition-all ${
                  currentPage === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'
                }`}
              >
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>

              {/* Right arrow */}
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className={`w-[40px] h-[40px] rounded-[20px] border-[2px] border-black flex items-center justify-center transition-all ${
                  currentPage === totalPages - 1
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'
                }`}
              >
                <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                </svg>
              </button>

              {/* Last Page button */}
              <button
                onClick={handleLastPage}
                className="h-[40px] px-2 bg-white rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">
                  Last Page
                </span>
              </button>
            </div>

            {/* Right controls: Prev Page and Next Page */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`h-[40px] px-2 rounded-[20px] border-[2px] border-black transition-all ${
                  currentPage === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'
                }`}
              >
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">
                  Prev Page
                </span>
              </button>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className={`h-[40px] px-2 rounded-[20px] border-[2px] border-black transition-all ${
                  currentPage === totalPages - 1
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'
                }`}
              >
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">
                  Next Page
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
