'use client';

import { useState, useRef, useEffect } from 'react';
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

type BackgroundTheme = 'white' | 'solid-black' | 'lavender' | 'pale-green' | 'light-pink' | 'light-brown';
type FontTheme = 'outfit' | 'satisfy' | 'montserrat' | 'russo-one' | 'kalam' | 'playfair' | 'inter' | 'poppins' | 'georgia' | 'merriweather' | 'roboto';

const backgroundThemes: { id: BackgroundTheme; name: string }[] = [
  { id: 'white', name: 'Solid White' },
  { id: 'solid-black', name: 'Solid Black' },
  { id: 'lavender', name: 'Lavender' },
  { id: 'pale-green', name: 'Pale Green' },
  { id: 'light-pink', name: 'Light Pink' },
  { id: 'light-brown', name: 'Light Brown' },
];

const fontThemes: { id: FontTheme; name: string; family: string }[] = [
  { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif" },
  { id: 'satisfy', name: 'Satisfy', family: "'Satisfy', cursive" },
  { id: 'montserrat', name: 'Montserrat', family: "'Montserrat', sans-serif" },
  { id: 'russo-one', name: 'Russo One', family: "'Russo One', sans-serif" },
  { id: 'kalam', name: 'Kalam', family: "'Kalam', cursive" },
  { id: 'playfair', name: 'Playfair Display', family: "'Playfair Display', serif" },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif" },
  { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif" },
  { id: 'georgia', name: 'Georgia', family: "'Georgia', serif" },
  { id: 'merriweather', name: 'Merriweather', family: "'Merriweather', serif" },
  { id: 'roboto', name: 'Roboto', family: "'Roboto', sans-serif" },
];

// Content section type for mixed content (text and images)
interface ContentSection {
  type: 'text' | 'image';
  content: string;
  caption?: string;
}

// Mock scroll content data - article length with images
const mockScrollContent: ScrollContent = {
  id: '1',
  title: 'DeFi alpha for how to earn up to 2000% on liquid staking',
  content: [], // Legacy field, using contentSections instead
  author: 'Matteo.sui',
  authorHandle: 'matteo.sui',
  subscriberCount: '356',
  views: 533,
  pages: 12,
  createdAt: '3 years ago',
};

// Rich content with interspersed images
const contentSections: ContentSection[] = [
  {
    type: 'text',
    content: `Introduction to Liquid Staking

The world of decentralized finance has evolved dramatically over the past few years, and liquid staking has emerged as one of the most compelling opportunities for yield generation. Unlike traditional staking where your assets are locked and illiquid, liquid staking allows you to maintain liquidity while still earning staking rewards.

In this comprehensive guide, we'll explore everything you need to know about liquid staking—from the fundamentals to advanced strategies that can help you maximize your returns while managing risk effectively.

What is Liquid Staking?

Liquid staking is a mechanism that allows users to stake their tokens and receive a liquid representation of those staked assets. This liquid token (often called a Liquid Staking Derivative or LSD) can be used across DeFi protocols while the underlying assets continue to earn staking rewards.

For example, when you stake ETH through a liquid staking protocol like Lido, you receive stETH in return. This stETH represents your staked ETH plus accumulated rewards, and can be used as collateral, traded, or deposited in other DeFi protocols.`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/450?random=20',
    caption: 'Visual representation of how liquid staking works',
  },
  {
    type: 'text',
    content: `The Benefits of Liquid Staking

1. Maintained Liquidity
Traditional staking locks your assets for extended periods, sometimes with lengthy unbonding periods. Liquid staking eliminates this constraint by providing you with a tradeable token that represents your staked position.

2. Composability
Liquid staking derivatives can be used across the DeFi ecosystem. You can provide liquidity, use them as collateral for borrowing, or deposit them in yield aggregators—all while continuing to earn base staking rewards.

3. Capital Efficiency
By unlocking the value of staked assets, liquid staking dramatically improves capital efficiency. Your single deposit can earn staking rewards, LP fees, lending interest, and more simultaneously.

4. Lower Barriers to Entry
Many liquid staking protocols allow users to stake any amount, removing the minimum requirements that exist for running your own validator (like the 32 ETH requirement for Ethereum).`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/400?random=21',
    caption: 'DeFi ecosystem integration possibilities',
  },
  {
    type: 'text',
    content: `Understanding the Risks

While liquid staking offers tremendous opportunities, it's crucial to understand the associated risks:

Smart Contract Risk
Liquid staking protocols are built on smart contracts. Any vulnerabilities in these contracts could lead to loss of funds. Always verify that protocols have undergone multiple audits from reputable security firms.

Slashing Risk
Validators can be penalized (slashed) for misbehavior or downtime. While most liquid staking protocols have insurance mechanisms, the risk isn't entirely eliminated.

De-peg Risk
Liquid staking tokens should trade at or near their underlying asset's value. However, market conditions can cause these tokens to trade at a discount, potentially resulting in losses if you need to exit your position.

Centralization Concerns
Some liquid staking protocols have become so dominant that they raise centralization concerns for the underlying network. This could lead to regulatory attention or technical vulnerabilities.`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/500?random=22',
    caption: 'Risk analysis framework for liquid staking protocols',
  },
  {
    type: 'text',
    content: `Chapter 1: Choosing the Right Protocol

Not all liquid staking protocols are created equal. Here's a comprehensive framework for evaluating them:

Total Value Locked (TVL)
TVL is a key indicator of trust and adoption. Higher TVL generally means more users trust the protocol with their assets. However, don't chase TVL blindly—newer, smaller protocols might offer better rates with acceptable risk profiles.

Security Audits
Look for protocols that have undergone multiple audits from reputable firms like Trail of Bits, OpenZeppelin, or Consensys Diligence. Review the audit reports to understand what issues were found and how they were addressed.

Team Credibility
Research the team behind the protocol. Are they doxxed? Do they have relevant experience? Have they delivered on previous projects? A strong, transparent team is essential.

Validator Selection
Understand how the protocol selects and monitors validators. Good protocols have rigorous onboarding processes and continuously monitor validator performance to minimize slashing risk.

Insurance and Safety Mechanisms
Does the protocol have insurance coverage? What happens if a validator is slashed? Understanding these mechanisms is crucial for assessing your actual risk exposure.`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/450?random=23',
    caption: 'Protocol comparison dashboard',
  },
  {
    type: 'text',
    content: `Chapter 2: Maximizing Your Returns

Now let's dive into strategies for maximizing your liquid staking returns:

Strategy 1: Recursive Leverage
One of the most popular strategies involves using your LSDs as collateral to borrow more of the underlying asset, which you then stake again. This "recursive" or "looped" strategy can multiply your effective yield.

For example:
1. Stake 10 ETH and receive 10 stETH
2. Deposit stETH as collateral on Aave
3. Borrow 7 ETH against your collateral
4. Stake the borrowed ETH for more stETH
5. Repeat until you reach your desired leverage

Warning: This strategy amplifies both gains AND losses. Liquidation risk increases significantly with leverage.

Strategy 2: Liquidity Provision
Many DEXs offer liquidity pools for LSDs paired with their underlying assets. By providing liquidity to these pools, you can earn trading fees on top of your staking rewards.

Popular options include:
• Curve Finance stETH/ETH pool
• Balancer wstETH pools
• Uniswap v3 concentrated liquidity positions`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/400?random=24',
    caption: 'Yield optimization strategies visualization',
  },
  {
    type: 'text',
    content: `Strategy 3: Yield Aggregators
Platforms like Yearn Finance and Convex offer vaults that automatically optimize LSD yields. These protocols continuously rebalance and compound rewards, saving you gas fees and time.

Strategy 4: Points and Airdrops
Many newer protocols offer points programs that may convert to token airdrops. Participating early in these programs can generate additional returns beyond base yields. Research upcoming protocols and consider diversifying across multiple points programs.

Strategy 5: Cross-Chain Arbitrage
Different chains often have varying liquid staking rates and opportunities. Advanced users can bridge assets to chains with better opportunities, though this adds complexity and risk.

Important Considerations:
• Gas costs can eat into profits, especially for smaller positions
• Always account for potential impermanent loss in LP positions
• Tax implications vary by jurisdiction—keep detailed records
• Don't over-optimize—sometimes simple is better`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/500?random=25',
    caption: 'Cross-chain opportunities map',
  },
  {
    type: 'text',
    content: `Chapter 3: Protocol Deep Dives

Let's examine some of the leading liquid staking protocols:

Lido Finance
Lido is the largest liquid staking protocol by TVL. It supports multiple chains including Ethereum, Polygon, and Solana. Their stETH token has deep liquidity and is widely integrated across DeFi.

Pros:
• Highest liquidity and integration
• Battle-tested smart contracts
• Extensive governance and community

Cons:
• Concerns about network centralization
• Lower yields compared to newer competitors

Rocket Pool
Rocket Pool takes a more decentralized approach, allowing anyone to run a minipool with just 16 ETH (or 8 ETH with additional RPL collateral). Their rETH token accrues value rather than rebasing.

Pros:
• More decentralized validator set
• Non-rebasing token simplifies accounting
• Strong community governance

Cons:
• Lower TVL means less liquidity
• More complex for node operators`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/450?random=26',
    caption: 'Protocol market share breakdown',
  },
  {
    type: 'text',
    content: `Frax Finance
Frax offers both frxETH (a standard LSD) and sfrxETH (the staking version). Their dual-token model creates unique opportunities for yield optimization.

Pros:
• Higher base yields
• Innovative tokenomics
• Integration with broader Frax ecosystem

Cons:
• More complexity
• Smaller market share

Emerging Protocols
Keep an eye on newer entrants like EigenLayer (restaking), Swell, and Stader. These protocols often offer higher yields and points programs to attract users, though they come with additional smart contract risk.`,
  },
  {
    type: 'text',
    content: `Chapter 4: Risk Management Framework

Successful liquid staking requires a robust risk management approach:

Position Sizing
Never stake more than you can afford to lose. Even the most battle-tested protocols can fail. A good rule of thumb is to limit any single protocol exposure to 20-30% of your total portfolio.

Diversification
Spread your stakes across multiple protocols, chains, and strategies. This reduces the impact of any single point of failure.

Regular Monitoring
Set up alerts for:
• Significant TVL changes
• Price de-pegs (>2% from expected value)
• Smart contract upgrades
• Governance proposals
• Validator performance issues

Exit Strategy
Always have a plan for exiting your positions. Know the unbonding periods, liquidity depth, and potential slippage for your positions.

Security Best Practices
• Use hardware wallets for large positions
• Verify contract addresses before interacting
• Be cautious of phishing attempts
• Consider using separate wallets for different protocols`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/400?random=27',
    caption: 'Risk management dashboard example',
  },
  {
    type: 'text',
    content: `Chapter 5: Tax and Legal Considerations

Liquid staking creates complex tax situations that vary by jurisdiction. Here are some general considerations:

Token Reception Events
When you receive an LSD token, some jurisdictions may treat this as a taxable event. Consult with a tax professional familiar with crypto taxation.

Rebasing Tokens
Tokens like stETH that rebase (increase in quantity) may create ongoing taxable income events. Non-rebasing tokens like rETH may be simpler from a tax perspective.

Record Keeping
Maintain detailed records of:
• All deposits and withdrawals
• Token prices at each transaction
• Protocol interactions and fees
• Any rewards received

Professional Advice
Given the complexity and evolving nature of crypto taxation, working with a crypto-savvy CPA or tax attorney is highly recommended.`,
  },
  {
    type: 'text',
    content: `Chapter 6: The Future of Liquid Staking

The liquid staking landscape continues to evolve rapidly. Here are trends to watch:

Restaking
EigenLayer and similar protocols allow you to "restake" your LSDs to secure additional networks, earning extra yield. This creates new opportunities but also compounds risk.

Layer 2 Expansion
As more activity moves to Layer 2s, expect liquid staking protocols to expand their presence on Arbitrum, Optimism, Base, and other L2s.

Institutional Adoption
As institutional interest in crypto grows, expect more regulated and compliant liquid staking products to emerge.

Cross-Chain Solutions
Future protocols will likely make it seamless to stake assets on one chain and use the resulting LSDs on another, further improving capital efficiency.

Governance Evolution
Expect continued innovation in how liquid staking protocols are governed, with potential shifts toward more decentralized and resilient structures.`,
  },
  {
    type: 'image',
    content: 'https://picsum.photos/800/500?random=28',
    caption: 'Future trends in the liquid staking ecosystem',
  },
  {
    type: 'text',
    content: `Conclusion

Liquid staking represents a fundamental evolution in how we think about staking and capital efficiency in DeFi. By maintaining liquidity while earning staking rewards, it unlocks new possibilities for yield generation and portfolio optimization.

However, these opportunities come with real risks. Smart contract vulnerabilities, slashing events, de-pegging, and regulatory uncertainty all present challenges that must be carefully managed.

Key Takeaways:

1. Start Small: Begin with a small position to understand how protocols work before committing larger amounts.

2. Diversify: Spread your stakes across multiple protocols and strategies to reduce risk.

3. Stay Informed: The DeFi space moves fast. Join Discord communities, follow protocol updates, and continuously educate yourself.

4. Manage Risk: Use proper position sizing, maintain exit strategies, and never invest more than you can afford to lose.

5. Think Long-Term: The best returns often come from patient, well-researched positions rather than chasing the highest APY.

Thank you for reading this comprehensive guide to liquid staking. If you found it valuable, consider subscribing for more DeFi alpha and strategies.

Stay safe, stay informed, and happy staking!

— Matteo.sui`,
  },
];

// Mock comments data
interface Comment {
  id: string;
  author: string;
  authorHandle: string;
  avatar: string;
  content: string;
  date: string;
  time: string;
}

const mockComments: Comment[] = [
  {
    id: '1',
    author: 'Matteo.sui',
    authorHandle: '@Matteo.sui',
    avatar: '/logos/eason.svg',
    content: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
    date: 'jun 30, 2025',
    time: '6:20PM',
  },
  {
    id: '2',
    author: 'Matteo.sui',
    authorHandle: '@Matteo.sui',
    avatar: '/logos/eason.svg',
    content: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
    date: 'jun 30, 2025',
    time: '6:20PM',
  },
  {
    id: '3',
    author: 'Matteo.sui',
    authorHandle: '@Matteo.sui',
    avatar: '/logos/eason.svg',
    content: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
    date: 'jun 30, 2025',
    time: '6:20PM',
  },
  {
    id: '4',
    author: 'Matteo.sui',
    authorHandle: '@Matteo.sui',
    avatar: '/logos/eason.svg',
    content: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
    date: 'jun 30, 2025',
    time: '6:20PM',
  },
  {
    id: '5',
    author: 'Matteo.sui',
    authorHandle: '@Matteo.sui',
    avatar: '/logos/eason.svg',
    content: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
    date: 'jun 30, 2025',
    time: '6:20PM',
  },
  {
    id: '6',
    author: 'Matteo.sui',
    authorHandle: '@Matteo.sui',
    avatar: '/logos/eason.svg',
    content: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
    date: 'jun 30, 2025',
    time: '6:20PM',
  },
];

export default function UnsealScrollPage() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('white');
  const [fontTheme, setFontTheme] = useState<FontTheme>('outfit');
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(127);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
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

  const currentFont = fontThemes.find(f => f.id === fontTheme)?.family || "'Outfit', sans-serif";

  const handleLike = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1);
    } else {
      setLikeCount(prev => prev + 1);
    }
    setIsLiked(!isLiked);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: scroll.title,
          text: `Check out "${scroll.title}" by ${scroll.author}`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Calculate the left offset for edge-to-edge content based on sidebar state
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

  // Helper function to render content sections with text and images
  const renderContentSections = (textColor: string, borderColor: string) => (
    <>
      {contentSections.map((section, index) => (
        <div key={index} className={`px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'} ${section.type === 'image' ? 'mb-8' : 'mb-6'}`}>
          {section.type === 'text' ? (
            <p
              className={`${textColor} text-[20px] leading-[29px] whitespace-pre-line`}
              style={{ fontFamily: currentFont }}
            >
              {section.content}
            </p>
          ) : (
            <figure>
              <img
                src={section.content}
                alt={section.caption || 'Article illustration'}
                className={`w-full h-auto rounded-xl border-[2px] ${borderColor}`}
              />
              {section.caption && (
                <figcaption className={`mt-2 text-center text-sm ${textColor} opacity-70`} style={{ fontFamily: currentFont }}>
                  {section.caption}
                </figcaption>
              )}
            </figure>
          )}
        </div>
      ))}
    </>
  );

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
            style={backgroundTheme === 'solid-black' ? {
              borderBottom: '5px solid #FFFFFF',
              boxShadow: '5px 5px 0px 1px #FFFFFF'
            } : {
              borderBottom: '5px solid #000000',
              boxShadow: '5px 5px 0px 1px #000000'
            }}
          />
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
                className={`px-4 py-3 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] bg-gradient-to-br from-[#EF4330] to-[#1AAACE]`}
              >
                <span className="text-white text-base font-bold font-['Outfit']">
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </span>
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
                  className="h-[54px] px-4 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] bg-gradient-to-br from-[#EF4330] to-[#1AAACE]"
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
                  className="h-[54px] px-4 rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_#000000] flex items-center gap-2 transition-all hover:shadow-[2px_2px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] bg-gradient-to-br from-[#EF4330] to-[#1AAACE]"
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

      {/* White theme - vertical scroll */}
      {backgroundTheme === 'white' && (
        <div className="relative w-full min-h-screen overflow-visible">
          {/* Pure white background - edge to edge */}
          <div
            className="absolute inset-0 top-0 bg-white transition-all duration-300"
            style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}
          />

          {/* Content container - vertical scroll */}
          <div className="relative z-10 flex flex-col items-center transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Content sections with interspersed images */}
            {renderContentSections('text-black', 'border-black/20')}

            {/* Bottom padding */}
            <div className="pb-24" />
          </div>
        </div>
      )}

      {/* Solid Black theme - vertical scroll */}
      {backgroundTheme === 'solid-black' && (
        <div className="relative w-full min-h-screen overflow-visible">
          {/* Pure black background - edge to edge */}
          <div
            className="absolute inset-0 top-0 bg-black transition-all duration-300"
            style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}
          />

          {/* Content container - vertical scroll */}
          <div className="relative z-10 flex flex-col items-center transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'}`}>
              <h2
                className="text-white text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Content sections with interspersed images */}
            {renderContentSections('text-white', 'border-white/30')}

            {/* Bottom padding */}
            <div className="pb-24" />
          </div>
        </div>
      )}

      {/* Lavender theme - vertical scroll */}
      {backgroundTheme === 'lavender' && (
        <div className="relative w-full min-h-screen overflow-visible">
          {/* Light lavender background - edge to edge */}
          <div
            className="absolute inset-0 top-0 bg-[#C5C5F0] transition-all duration-300"
            style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}
          />

          {/* Content container - vertical scroll */}
          <div className="relative z-10 flex flex-col items-center transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Content sections with interspersed images */}
            {renderContentSections('text-black', 'border-black/20')}

            {/* Bottom padding */}
            <div className="pb-24" />
          </div>
        </div>
      )}

      {/* Pale Green theme - vertical scroll */}
      {backgroundTheme === 'pale-green' && (
        <div className="relative w-full min-h-screen overflow-visible">
          {/* Light pale green background - edge to edge */}
          <div
            className="absolute inset-0 top-0 bg-[#C8E6C9] transition-all duration-300"
            style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}
          />

          {/* Content container - vertical scroll */}
          <div className="relative z-10 flex flex-col items-center transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Content sections with interspersed images */}
            {renderContentSections('text-black', 'border-black/20')}

            {/* Bottom padding */}
            <div className="pb-24" />
          </div>
        </div>
      )}

      {/* Light Pink theme - vertical scroll */}
      {backgroundTheme === 'light-pink' && (
        <div className="relative w-full min-h-screen overflow-visible">
          {/* Light pink background - edge to edge */}
          <div
            className="absolute inset-0 top-0 bg-[#F5D5E0] transition-all duration-300"
            style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}
          />

          {/* Content container - vertical scroll */}
          <div className="relative z-10 flex flex-col items-center transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Content sections with interspersed images */}
            {renderContentSections('text-black', 'border-black/20')}

            {/* Bottom padding */}
            <div className="pb-24" />
          </div>
        </div>
      )}

      {/* Light Brown theme - vertical scroll */}
      {backgroundTheme === 'light-brown' && (
        <div className="relative w-full min-h-screen overflow-visible">
          {/* Light brown background - edge to edge */}
          <div
            className="absolute inset-0 top-0 bg-[#BCAAA4] transition-all duration-300"
            style={{ left: isFullyHidden ? '-32px' : getSidebarOffset(), width: isFullyHidden ? 'calc(100% + 64px)' : getContentWidth() }}
          />

          {/* Content container - vertical scroll */}
          <div className="relative z-10 flex flex-col items-center transition-all duration-300">
            {/* Title */}
            <div className={`pt-12 px-8 w-full transition-all duration-300 ${isFullyHidden ? 'max-w-[1224px]' : 'max-w-[728px]'}`}>
              <h2
                className="text-black text-[48px] leading-[69px] mb-8"
                style={{ fontFamily: currentFont }}
              >
                {scroll.title}
              </h2>
            </div>

            {/* Content sections with interspersed images */}
            {renderContentSections('text-black', 'border-black/20')}

            {/* Bottom padding */}
            <div className="pb-24" />
          </div>
        </div>
      )}

      {/* Floating Action Buttons - Like, Comment, Share */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 bg-white rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000000]">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-2 py-1 rounded-full transition-all hover:scale-105 ${
            isLiked ? 'text-[#EF4330]' : 'text-black hover:text-[#EF4330]'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill={isLiked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="font-semibold font-['Outfit']">{likeCount}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => setIsCommentsOpen(true)}
          className="flex items-center gap-2 px-2 py-1 text-black hover:text-[#0668A6] transition-all hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="font-semibold font-['Outfit']">{mockComments.length * 122}</span>
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-2 py-1 text-black hover:text-[#0668A6] transition-all hover:scale-105"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="font-semibold font-['Outfit']">Share</span>
        </button>
      </div>

      {/* Comments Popup Modal */}
      {isCommentsOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
            onClick={() => setIsCommentsOpen(false)}
          />

          {/* Comments Panel - slides up from bottom */}
          <div className={`fixed bottom-0 left-16 right-16 z-[70] rounded-t-[32px] border-t-[3px] border-x-[3px] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] max-h-[80vh] flex flex-col animate-slide-up ${
            backgroundTheme === 'solid-black'
              ? 'bg-[#1a1a1a] border-white'
              : backgroundTheme === 'lavender'
              ? 'bg-[#C5C5F0] border-black'
              : backgroundTheme === 'pale-green'
              ? 'bg-[#C8E6C9] border-black'
              : backgroundTheme === 'light-pink'
              ? 'bg-[#F5D5E0] border-black'
              : backgroundTheme === 'light-brown'
              ? 'bg-[#BCAAA4] border-black'
              : 'bg-[#FFEEE5] border-black'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b-[2px] ${backgroundTheme === 'solid-black' ? 'border-white/10' : 'border-black/10'}`}>
              <h2 className={`text-2xl font-bold font-['Outfit'] ${backgroundTheme === 'solid-black' ? 'text-white' : 'text-black'}`}>Comments</h2>
              <div className="flex items-center gap-4">
                <span className={`text-base font-medium font-['Outfit'] ${backgroundTheme === 'solid-black' ? 'text-white/70' : 'text-black/70'}`}>{mockComments.length * 122} comments</span>
                <button
                  onClick={() => setIsCommentsOpen(false)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${backgroundTheme === 'solid-black' ? 'bg-white hover:bg-white/80' : 'bg-black hover:bg-black/80'}`}
                >
                  <svg className={`w-5 h-5 ${backgroundTheme === 'solid-black' ? 'text-black' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Add Comment Input */}
            <div className={`px-6 py-4 border-b-[2px] ${backgroundTheme === 'solid-black' ? 'border-white/10' : 'border-black/10'}`}>
              <div className={`flex items-center gap-3 p-3 rounded-2xl border-[2px] ${backgroundTheme === 'solid-black' ? 'bg-[#2a2a2a] border-white' : 'bg-white border-black'}`}>
                <img
                  src="/logos/eason.svg"
                  alt="Your avatar"
                  className={`w-10 h-10 rounded-full border-[2px] ${backgroundTheme === 'solid-black' ? 'border-white' : 'border-black'}`}
                />
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="add a comment...."
                  className={`flex-1 bg-transparent text-base font-['Outfit'] outline-none ${backgroundTheme === 'solid-black' ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
                />
                {commentText && (
                  <button className={`px-4 py-2 rounded-full text-sm font-semibold font-['Outfit'] transition-colors ${backgroundTheme === 'solid-black' ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80'}`}>
                    Post
                  </button>
                )}
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {mockComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-2xl border-[2px] ${backgroundTheme === 'solid-black' ? 'bg-[#2a2a2a] border-white' : 'bg-white border-black'}`}
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={comment.avatar}
                      alt={comment.author}
                      className={`w-10 h-10 rounded-full border-[2px] flex-shrink-0 ${backgroundTheme === 'solid-black' ? 'border-white' : 'border-black'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className={`text-base font-bold font-['Outfit'] ${backgroundTheme === 'solid-black' ? 'text-white' : 'text-black'}`}>
                          From {comment.authorHandle}
                        </h3>
                      </div>
                      <p className={`text-sm font-medium font-['Outfit'] mb-2 ${backgroundTheme === 'solid-black' ? 'text-white/80' : 'text-black/80'}`}>
                        {comment.content}
                      </p>
                      <div className="flex items-center justify-end gap-3">
                        <span className={`text-xs font-medium font-['Outfit'] ${backgroundTheme === 'solid-black' ? 'text-white/50' : 'text-black/50'}`}>
                          {comment.date} {comment.time}
                        </span>
                        <button className={`px-3 py-1.5 rounded-full text-xs font-semibold font-['Outfit'] transition-colors ${backgroundTheme === 'solid-black' ? 'bg-white text-black hover:bg-white/80' : 'bg-black text-white hover:bg-black/80'}`}>
                          View X
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
