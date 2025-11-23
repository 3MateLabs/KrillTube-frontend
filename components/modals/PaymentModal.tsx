'use client';

/**
 * Payment Modal
 * Shows payment options when user opens a video
 * Dynamically renders only the payment tokens configured by the creator
 */

import { useState } from 'react';
import Image from 'next/image';

interface CreatorConfig {
  coinType: string; // e.g., "0x2::sui::SUI" or dKRILL coin type
  pricePerView: string; // Price in smallest unit
  decimals: number; // Token decimals
  chain: string; // "iota", "sui", etc.
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayWithToken: (coinType: string) => void; // Generic payment handler with coin type
  onSubscribe?: () => void; // Subscription handler
  onGetDemoTokens: () => void;
  creatorConfigs?: CreatorConfig[]; // Array of accepted payment tokens (optional with default)
  subscriptionPrice?: string; // Subscription price
  encryptionType?: 'per-video' | 'subscription-acl' | 'both'; // Payment type
}

export function PaymentModal({
  isOpen,
  onClose,
  onPayWithToken,
  onSubscribe,
  onGetDemoTokens,
  creatorConfigs = [], // Default to empty array
  subscriptionPrice,
  encryptionType = 'per-video',
}: PaymentModalProps) {
  // Track which payment method is selected (for 'both' type)
  const [selectedMethod, setSelectedMethod] = useState<'ppv' | 'subscribe' | null>(
    encryptionType === 'both' ? null : encryptionType === 'subscription-acl' ? 'subscribe' : 'ppv'
  );

  if (!isOpen) return null;

  // Format price with decimals
  const formatPrice = (priceInSmallestUnit: string, decimals: number): string => {
    const price = parseFloat(priceInSmallestUnit) / Math.pow(10, decimals);
    return price.toFixed(2);
  };

  // Helper to get token display name and icon
  const getTokenInfo = (coinType: string) => {
    if (coinType.includes('dkrill') || coinType.toLowerCase().includes('krill')) {
      return {
        symbol: '$dKRILL',
        icon: '/logos/krilll.png',
        isImage: true,
      };
    } else if (coinType.includes('0x2::sui::SUI')) {
      return {
        symbol: '$SUI',
        icon: 'sui', // Will use SVG
        isImage: false,
      };
    }
    // Default fallback for unknown tokens
    return {
      symbol: coinType.split('::').pop() || 'TOKEN',
      icon: null,
      isImage: false,
    };
  };

  // Get total price formatted for "both" mode
  const getTotalPriceDisplay = () => {
    if (creatorConfigs.length === 0) return '0.00';
    return creatorConfigs
      .map(config => {
        const tokenInfo = getTokenInfo(config.coinType);
        return `${formatPrice(config.pricePerView, config.decimals)} ${tokenInfo.symbol}`;
      })
      .join(' or ');
  };

  // subscriptionPrice is already in human-readable format (SUI), not MIST
  const formattedSubscriptionPrice = subscriptionPrice || '0.00';

  // For 'both' type, show method selection first
  if (encryptionType === 'both' && selectedMethod === null) {
    return (
      <div className="absolute inset-0 bg-[#2C5F7E] z-30 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-white mb-12">Choose Payment Method</h2>

        <div className="flex items-center justify-center gap-12 mb-12">
          {/* Pay-per-View Option */}
          <button
            onClick={() => setSelectedMethod('ppv')}
            className="flex flex-col items-center gap-6 p-8 bg-white/10 rounded-3xl border-4 border-white hover:bg-white/20 hover:scale-105 transition-all"
          >
            <div className="text-4xl">💳</div>
            <div className="text-2xl font-bold text-white">Pay-per-View</div>
            <div className="text-base text-white/80">One-time payment</div>
            <div className="text-lg font-semibold text-white">{getTotalPriceDisplay()}</div>
          </button>

          {/* Subscribe Option */}
          <button
            onClick={() => setSelectedMethod('subscribe')}
            className="flex flex-col items-center gap-6 p-8 bg-white/10 rounded-3xl border-4 border-white hover:bg-white/20 hover:scale-105 transition-all"
          >
            <div className="text-4xl">⭐</div>
            <div className="text-2xl font-bold text-white">Subscribe</div>
            <div className="text-base text-white/80">Access all videos</div>
            <div className="text-lg font-semibold text-white">{formattedSubscriptionPrice}</div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="px-8 py-3 text-white/80 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // For subscription-only, go straight to subscribe
  if (selectedMethod === 'subscribe' && onSubscribe) {
    return (
      <div className="absolute inset-0 bg-[#2C5F7E] z-30 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-white mb-12">Subscribe to Channel</h2>

        <button
          onClick={onSubscribe}
          className="flex flex-col items-center gap-6 hover:scale-105 transition-transform"
        >
          <div className="w-32 h-32 bg-white rounded-full border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center">
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              role="img"
              viewBox="0 0 24 24"
              className="h-20 w-20 text-[#0668A6]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.636 10.009a7.16 7.16 0 0 1 1.565 4.474 7.2 7.2 0 0 1-1.608 4.53l-.087.106-.023-.135a7 7 0 0 0-.07-.349c-.502-2.21-2.142-4.106-4.84-5.642-1.823-1.034-2.866-2.278-3.14-3.693-.177-.915-.046-1.834.209-2.62.254-.787.631-1.446.953-1.843l1.05-1.284a.46.46 0 0 1 .713 0l5.28 6.456zm1.66-1.283L12.26.123a.336.336 0 0 0-.52 0L4.704 8.726l-.023.029a9.33 9.33 0 0 0-2.07 5.872C2.612 19.803 6.816 24 12 24s9.388-4.197 9.388-9.373a9.32 9.32 0 0 0-2.07-5.871zM6.389 9.981l.63-.77.018.142q.023.17.055.34c.408 2.136 1.862 3.917 4.294 5.297 2.114 1.203 3.345 2.586 3.7 4.103a5.3 5.3 0 0 1 .109 1.801l-.004.034-.03.014A7.2 7.2 0 0 1 12 21.67c-3.976 0-7.2-3.218-7.2-7.188 0-1.705.594-3.27 1.587-4.503z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-white">{formattedSubscriptionPrice}</div>
        </button>

        <div className="mt-8 flex gap-4">
          {encryptionType === 'both' && (
            <button
              onClick={() => setSelectedMethod(null)}
              className="px-6 py-3 text-white/80 hover:text-white transition-colors"
            >
              ← Back
            </button>
          )}
          <button
            onClick={onClose}
            className="px-6 py-3 text-white/80 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Pay-per-view: Show currency selection (dynamic based on creator configs)
  return (
    <div className="absolute inset-0 bg-[#2C5F7E] z-30 flex flex-col items-center justify-center">
      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-12">
        {encryptionType === 'both' ? 'Pay-per-View - Choose Currency' : 'Pay in'}
      </h2>

      {/* Payment Options - Dynamically render only configured tokens */}
      {creatorConfigs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12 max-w-6xl mx-auto px-8">
          {creatorConfigs.map((config) => {
            const tokenInfo = getTokenInfo(config.coinType);
            const formattedPrice = formatPrice(config.pricePerView, config.decimals);

            return (
              <button
                key={config.coinType}
                onClick={() => onPayWithToken(config.coinType)}
                className="flex flex-col items-center gap-6 hover:scale-105 transition-transform"
              >
                {/* Token Icon Circle */}
                <div className="w-32 h-32 bg-white rounded-full border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center overflow-hidden">
                  {tokenInfo.isImage && tokenInfo.icon ? (
                    <Image
                      src={tokenInfo.icon}
                      alt={tokenInfo.symbol}
                      width={120}
                      height={120}
                      className="object-contain"
                    />
                  ) : tokenInfo.icon === 'sui' ? (
                    <svg
                      stroke="currentColor"
                      fill="currentColor"
                      strokeWidth="0"
                      role="img"
                      viewBox="0 0 24 24"
                      className="h-20 w-20 text-[#0668A6]"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.636 10.009a7.16 7.16 0 0 1 1.565 4.474 7.2 7.2 0 0 1-1.608 4.53l-.087.106-.023-.135a7 7 0 0 0-.07-.349c-.502-2.21-2.142-4.106-4.84-5.642-1.823-1.034-2.866-2.278-3.14-3.693-.177-.915-.046-1.834.209-2.62.254-.787.631-1.446.953-1.843l1.05-1.284a.46.46 0 0 1 .713 0l5.28 6.456zm1.66-1.283L12.26.123a.336.336 0 0 0-.52 0L4.704 8.726l-.023.029a9.33 9.33 0 0 0-2.07 5.872C2.612 19.803 6.816 24 12 24s9.388-4.197 9.388-9.373a9.32 9.32 0 0 0-2.07-5.871zM6.389 9.981l.63-.77.018.142q.023.17.055.34c.408 2.136 1.862 3.917 4.294 5.297 2.114 1.203 3.345 2.586 3.7 4.103a5.3 5.3 0 0 1 .109 1.801l-.004.034-.03.014A7.2 7.2 0 0 1 12 21.67c-3.976 0-7.2-3.218-7.2-7.188 0-1.705.594-3.27 1.587-4.503z" />
                    </svg>
                  ) : (
                    <div className="text-4xl font-bold text-[#0668A6]">
                      {tokenInfo.symbol.charAt(0)}
                    </div>
                  )}
                </div>
                {/* Amount */}
                <div className="text-2xl font-bold text-white">
                  {formattedPrice} {tokenInfo.symbol}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-white text-lg mb-12 text-center">
          <p className="mb-4">No payment options configured for this video.</p>
          <p className="text-white/60 text-sm">The creator hasn't set up payment tokens yet.</p>
        </div>
      )}

      {/* Get Demo Tokens Button - Show only if dKRILL is one of the payment options */}
      {creatorConfigs.some(c => c.coinType.toLowerCase().includes('krill')) && (
        <button
          onClick={onGetDemoTokens}
          className="px-8 py-4 bg-white text-black text-lg font-bold rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          Get dKRILL for Demo for free!
        </button>
      )}

      {/* Back button for 'both' type */}
      {encryptionType === 'both' && (
        <button
          onClick={() => setSelectedMethod(null)}
          className="mt-6 px-6 py-3 text-white/80 hover:text-white transition-colors"
        >
          ← Back to payment methods
        </button>
      )}
    </div>
  );
}
