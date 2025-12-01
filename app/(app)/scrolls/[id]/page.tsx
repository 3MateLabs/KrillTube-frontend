'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSidebarContext } from '@/lib/context/SidebarContext';

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

type BackgroundTheme = 'scroll' | 'crusty-black' | 'faded-white' | 'parchment';
type FontTheme = 'outfit' | 'satisfy' | 'montserrat' | 'russo-one' | 'pacifico' | 'playfair';

const backgroundThemes: { id: BackgroundTheme; name: string }[] = [
  { id: 'scroll', name: 'Scroll' },
  { id: 'crusty-black', name: 'Crusty Black' },
  { id: 'faded-white', name: 'Faded White' },
  { id: 'parchment', name: 'Parchment' },
];

const fontThemes: { id: FontTheme; name: string; family: string }[] = [
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif" },
  { id: 'satisfy', name: 'Satisfy', family: "'Satisfy', cursive" },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'russo-one', name: 'Russo One', family: "'Russo One', sans-serif" },
  { id: 'pacifico', name: 'Pacifico', family: "'Pacifico', cursive" },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif" },
];

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
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('scroll');
  const [fontTheme, setFontTheme] = useState<FontTheme>('outfit');
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const { isSidebarCollapsed, isFullyHidden } = useSidebarContext();

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Only close if clicking outside the dropdown containers
      const target = e.target as Node;
      if (isBackgroundOpen && backgroundRef.current && !backgroundRef.current.contains(target)) {
        setIsBackgroundOpen(false);
      }
      if (isFontOpen && fontRef.current && !fontRef.current.contains(target)) {
        setIsFontOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBackgroundOpen(false);
        setIsFontOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBackgroundOpen, isFontOpen]);

  const scroll = mockScrollContent;
  const totalPages = scroll.content.length;

  const currentFont = fontThemes.find(f => f.id === fontTheme)?.family || "'Outfit', sans-serif";

  // Calculate the left offset for edge-to-edge content based on sidebar state
  // Main content starts at: ml-[320px] when expanded, ml-[160px] when collapsed, ml-0 when hidden
  // Background needs to extend left to touch/overlap the sidebar edge
  const getSidebarOffset = () => {
    if (isFullyHidden) return '0px';
    if (isSidebarCollapsed) return '-160px';
    return '-320px';
  };

  const getContentWidth = () => {
    if (isFullyHidden) return '100%';
    if (isSidebarCollapsed) return 'calc(100% + 160px)';
    return 'calc(100% + 320px)';
  };

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
      <div className="relative h-[320px] -mt-[60px] pt-[60px] overflow-visible z-20">
        {/* Background Image Container - Extends left to touch sidebar */}
        <div className="absolute inset-0 transition-all duration-300" style={{ left: getSidebarOffset(), width: getContentWidth() }}>
          <img
            src="/scrolls-hero.png"
            alt="Underwater coral reef"
            className="w-full h-full object-cover"
            style={backgroundTheme === 'crusty-black' ? {
              borderBottom: '5px solid #FFFFFF',
              boxShadow: '5px 5px 0px 1px #FFFFFF'
            } : (backgroundTheme === 'faded-white' || backgroundTheme === 'parchment') ? {
              borderBottom: '5px solid #000000',
              boxShadow: '5px 5px 0px 1px #000000'
            } : undefined}
          />
          {/* Bottom drop shadow - neubrutalism style (only for scroll theme) */}
          {backgroundTheme === 'scroll' && (
            <div className="absolute bottom-[-5px] left-[5px] right-[-5px] h-[5px] bg-black"></div>
          )}
        </div>

        {/* Content overlay - Stays within main content area */}
        <div className="relative z-30 h-full px-8 overflow-visible">
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
                <h2 className="text-white text-[48px] font-semibold leading-[58px]" style={{ fontFamily: "'Fredoka'" }}>
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

            {/* Right section: Change background and Font dropdowns */}
            <div className="flex items-center gap-4">
              {/* Change background dropdown */}
              <div className="relative" ref={backgroundRef}>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isBackgroundOpen}
                  aria-label="Change background theme"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBackgroundOpen(prev => !prev);
                    setIsFontOpen(false);
                  }}
                  className="h-[54px] px-4 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]"
                  style={{ background: 'linear-gradient(126.87deg, #EF4330 -17.16%, #1AAACE 118.83%)' }}
                >
                  <span className="text-white text-[16px] font-bold font-['Montserrat'] leading-[20px]">
                    Change background
                  </span>
                  <div className="w-[30px] h-[30px] bg-[#090909] rounded-[15px] flex items-center justify-center">
                    <svg className={`w-6 h-6 text-white transition-transform ${isBackgroundOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                  </div>
                </button>

                {/* Dropdown menu */}
                {isBackgroundOpen && (
                  <div
                    role="listbox"
                    aria-label="Background themes"
                    className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[200px] rounded-2xl border-[3px] border-black shadow-[3px_3px_0px_#000000] overflow-hidden bg-[#FFEEE5] z-50"
                  >
                    {backgroundThemes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        role="option"
                        aria-selected={backgroundTheme === theme.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => {
                          setBackgroundTheme(theme.id);
                          setIsBackgroundOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setBackgroundTheme(theme.id);
                            setIsBackgroundOpen(false);
                          }
                        }}
                        className={`w-full px-4 py-3 text-left text-[16px] font-semibold font-['Outfit'] cursor-pointer transition-colors ${
                          backgroundTheme === theme.id
                            ? 'bg-[#EF4330] text-white'
                            : 'bg-[#FFEEE5] text-black hover:bg-[#FFD4C4]'
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Font dropdown */}
              <div className="relative" ref={fontRef}>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isFontOpen}
                  aria-label="Change font"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFontOpen(prev => !prev);
                    setIsBackgroundOpen(false);
                  }}
                  className="h-[54px] px-4 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]"
                  style={{ background: 'linear-gradient(126.87deg, #EF4330 -17.16%, #1AAACE 118.83%)' }}
                >
                  <span className="text-white text-[16px] font-bold font-['Montserrat'] leading-[20px]">
                    Font
                  </span>
                  <div className="w-[30px] h-[30px] bg-[#090909] rounded-[15px] flex items-center justify-center">
                    <svg className={`w-6 h-6 text-white transition-transform ${isFontOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 10l5 5 5-5H7z" />
                    </svg>
                  </div>
                </button>

                {/* Dropdown menu */}
                {isFontOpen && (
                  <div
                    role="listbox"
                    aria-label="Font themes"
                    className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[150px] rounded-2xl border-[3px] border-black shadow-[3px_3px_0px_#000000] overflow-hidden bg-[#FFEEE5] z-50"
                  >
                    {fontThemes.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        role="option"
                        aria-selected={fontTheme === theme.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => {
                          setFontTheme(theme.id);
                          setIsFontOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setFontTheme(theme.id);
                            setIsFontOpen(false);
                          }
                        }}
                        className={`w-full px-4 py-3 text-left text-[16px] font-semibold cursor-pointer transition-colors ${
                          fontTheme === theme.id
                            ? 'bg-[#EF4330] text-white'
                            : 'bg-[#FFEEE5] text-black hover:bg-[#FFD4C4]'
                        }`}
                        style={{ fontFamily: theme.family }}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Content Area */}
      {backgroundTheme === 'scroll' && (
        <div className="relative flex justify-center py-8">
          {/* Scroll container */}
          <div className="relative w-full max-w-[1148px] min-h-[1000px]">
            {/* Scroll background image */}
            <img
              src="/scrolls/scroll-background.png"
              alt="Scroll background"
              className="w-full h-auto"
            />

            {/* Text content overlay - positioned on the scroll */}
            <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 w-[607px] max-h-[675px] overflow-y-auto scrollbar-hide">
              <p
                className="text-black text-[20px] font-semibold leading-[25px] whitespace-pre-line"
                style={{ fontFamily: currentFont }}
              >
                {scroll.content[currentPage]}
              </p>
            </div>

            {/* Navigation controls - positioned at bottom */}
            <div className="absolute bottom-[5%] left-0 right-0 flex items-center justify-center gap-8 px-8">
              {/* Left controls: Comment, Share, Last Page */}
              <div className="flex items-center gap-2">
                <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                  <img src="/logos/comment.svg" alt="Comment" width={24} height={24} />
                </button>
                <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                  <img src="/logos/share.svg" alt="Share" width={24} height={24} />
                </button>
                <button onClick={handleLastPage} className="h-[40px] px-2 bg-white rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Last Page</span>
                </button>
              </div>

              {/* Right controls: Prev Page and Next Page */}
              <div className="flex items-center gap-2">
                <button onClick={handlePrevPage} disabled={currentPage === 0} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                  <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Prev Page</span>
                </button>
                <button onClick={handleNextPage} disabled={currentPage === totalPages - 1} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === totalPages - 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                  <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Next Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crusty Black theme - separate container for edge to edge */}
      {backgroundTheme === 'crusty-black' && (
        <div className="relative w-full min-h-[1149px] overflow-visible">
          {/* Crusty black SVG background - edge to edge, extends left to sidebar like hero banner */}
          <div className="absolute inset-0 top-0 transition-all duration-300" style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}>
            <img
              src="/logos/crusty-black.svg"
              alt="Crusty black background"
              className="w-full h-full object-cover object-left-bottom"
            />
          </div>

          {/* Content container - positioned over the SVG, centered */}
          <div className="relative z-10 flex flex-col items-center min-h-[1149px] transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[607px]'}`}>
              <h2
                className="text-white text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Text content */}
            <div className={`px-8 pb-48 flex-1 overflow-y-auto scrollbar-hide w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[607px]'}`}>
              <p
                className="text-white text-[20px] leading-[29px] whitespace-pre-line"
                style={{ fontFamily: currentFont }}
              >
                {scroll.content[currentPage]}
              </p>
            </div>
          </div>

          {/* Navigation controls - positioned at bottom */}
          <div className={`absolute bottom-[5%] left-0 right-0 flex items-center px-8 z-20 transition-all duration-300 ${isFullyHidden ? 'justify-between max-w-[1224px] mx-auto' : 'justify-center gap-8'}`}>
            {/* Left controls: Comment, Share, Last Page */}
            <div className="flex items-center gap-2">
              <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                <img src="/logos/comment.svg" alt="Comment" width={24} height={24} />
              </button>
              <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                <img src="/logos/share.svg" alt="Share" width={24} height={24} />
              </button>
              <button onClick={handleLastPage} className="h-[40px] px-2 bg-white rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Last Page</span>
              </button>
            </div>

            {/* Right controls: Prev Page and Next Page */}
            <div className="flex items-center gap-2">
              <button onClick={handlePrevPage} disabled={currentPage === 0} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Prev Page</span>
              </button>
              <button onClick={handleNextPage} disabled={currentPage === totalPages - 1} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === totalPages - 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#FFFFFF] hover:shadow-[2px_2px_0px_#FFFFFF] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Next Page</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faded White theme - same layout as crusty-black but with black text */}
      {backgroundTheme === 'faded-white' && (
        <div className="relative w-full min-h-[1149px] overflow-visible">
          {/* Faded white SVG background - edge to edge, extends left to sidebar like hero banner */}
          <div className="absolute inset-0 top-0 transition-all duration-300" style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}>
            <img
              src="/logos/faded-white.svg"
              alt="Faded white background"
              className="w-full h-full object-cover object-left-bottom"
            />
          </div>

          {/* Content container - positioned over the SVG, centered */}
          <div className="relative z-10 flex flex-col items-center min-h-[1149px] transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[607px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Text content */}
            <div className={`px-8 pb-48 flex-1 overflow-y-auto scrollbar-hide w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[607px]'}`}>
              <p
                className="text-black text-[20px] leading-[29px] whitespace-pre-line"
                style={{ fontFamily: currentFont }}
              >
                {scroll.content[currentPage]}
              </p>
            </div>
          </div>

          {/* Navigation controls - positioned at bottom */}
          <div className={`absolute bottom-[5%] left-0 right-0 flex items-center px-8 z-20 transition-all duration-300 ${isFullyHidden ? 'justify-between max-w-[1224px] mx-auto' : 'justify-center gap-8'}`}>
            {/* Left controls: Comment, Share, Last Page */}
            <div className="flex items-center gap-2">
              <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                <img src="/logos/comment.svg" alt="Comment" width={24} height={24} />
              </button>
              <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                <img src="/logos/share.svg" alt="Share" width={24} height={24} />
              </button>
              <button onClick={handleLastPage} className="h-[40px] px-2 bg-white rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Last Page</span>
              </button>
            </div>

            {/* Right controls: Prev Page and Next Page */}
            <div className="flex items-center gap-2">
              <button onClick={handlePrevPage} disabled={currentPage === 0} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Prev Page</span>
              </button>
              <button onClick={handleNextPage} disabled={currentPage === totalPages - 1} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === totalPages - 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Next Page</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parchment theme - same layout as crusty-black/faded-white but with brown parchment background */}
      {backgroundTheme === 'parchment' && (
        <div className="relative w-full min-h-[1149px] overflow-visible">
          {/* Parchment SVG background - edge to edge, extends left to sidebar like hero banner */}
          <div className="absolute inset-0 top-0 transition-all duration-300" style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}>
            <img
              src="/logos/parchment.svg"
              alt="Parchment background"
              className="w-full h-full object-cover object-left-bottom"
            />
          </div>

          {/* Content container - positioned over the SVG, centered */}
          <div className="relative z-10 flex flex-col items-center min-h-[1149px] transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[607px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Text content */}
            <div className={`px-8 pb-48 flex-1 overflow-y-auto scrollbar-hide w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[607px]'}`}>
              <p
                className="text-black text-[20px] leading-[29px] whitespace-pre-line"
                style={{ fontFamily: currentFont }}
              >
                {scroll.content[currentPage]}
              </p>
            </div>
          </div>

          {/* Navigation controls - positioned at bottom */}
          <div className={`absolute bottom-[5%] left-0 right-0 flex items-center px-8 z-20 transition-all duration-300 ${isFullyHidden ? 'justify-between max-w-[1224px] mx-auto' : 'justify-center gap-8'}`}>
            {/* Left controls: Comment, Share, Last Page */}
            <div className="flex items-center gap-2">
              <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                <img src="/logos/comment.svg" alt="Comment" width={24} height={24} />
              </button>
              <button className="w-[40px] h-[40px] rounded-[20px] border-[2px] border-black bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center">
                <img src="/logos/share.svg" alt="Share" width={24} height={24} />
              </button>
              <button onClick={handleLastPage} className="h-[40px] px-2 bg-white rounded-[20px] border-[2px] border-black shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Last Page</span>
              </button>
            </div>

            {/* Right controls: Prev Page and Next Page */}
            <div className="flex items-center gap-2">
              <button onClick={handlePrevPage} disabled={currentPage === 0} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Prev Page</span>
              </button>
              <button onClick={handleNextPage} disabled={currentPage === totalPages - 1} className={`h-[40px] px-3 rounded-[20px] border-[2px] border-black transition-all ${currentPage === totalPages - 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-white shadow-[3px_3px_0px_#000000] hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px]'}`}>
                <span className="text-black text-[16px] font-bold font-['Outfit'] leading-[20px]">Next Page</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
