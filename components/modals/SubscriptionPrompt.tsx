/**
 * Subscription Prompt Modal
 * Shows when user tries to watch subscriber-only content without subscription
 */

'use client';

import React from 'react';
import Link from 'next/link';

export interface SubscriptionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void; // Callback to handle subscription
  subscribing?: boolean; // Loading state
  creatorName: string;
  creatorAddress: string;
  channelPrice?: string;
  channelChain?: string;
}

export function SubscriptionPrompt({
  isOpen,
  onClose,
  onSubscribe,
  subscribing = false,
  creatorName,
  creatorAddress,
  channelPrice,
  channelChain,
}: SubscriptionPromptProps) {
  if (!isOpen) return null;

  const formattedPrice = channelPrice || '0 SUI';
  const chain = channelChain || 'sui';

  return (
    <div className="absolute inset-0 bg-[#2C5F7E]/95 z-40 flex flex-col items-center justify-center">
      {/* Modal Container */}
      <div className="w-full max-w-sm p-6 bg-white rounded-[32px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-walrus-grape rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-black font-['Outfit'] mb-2">
            Subscription Required
          </h2>
          <p className="text-sm text-black/70 font-['Outfit']">
            This video is exclusive to {creatorName}'s subscribers
          </p>
        </div>

        {/* Subscription Info */}
        <div className="p-3 bg-[#FFEEE5] rounded-xl border-2 border-black mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-black font-['Outfit']">
              Subscription Price
            </span>
            <span className="text-base font-bold text-black font-['Outfit']">
              {formattedPrice}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-black font-['Outfit']">
              Network
            </span>
            <span className="text-xs font-bold text-black font-['Outfit'] uppercase">
              {chain}
            </span>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-black font-['Outfit'] mb-2">
            Benefits of subscribing:
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-walrus-mint flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-black font-['Outfit']">
                Unlimited access to all subscriber-only videos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-walrus-mint flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-black font-['Outfit']">
                Access to all future uploads
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 text-walrus-mint flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-black font-['Outfit']">
                Support your favorite creator
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Subscribe Button */}
          <button
            onClick={onSubscribe}
            disabled={subscribing}
            className={`w-full px-4 py-2.5 text-white text-center text-sm font-bold font-['Outfit'] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black transition-all ${
              subscribing
                ? 'bg-walrus-grape/50 cursor-not-allowed'
                : 'bg-walrus-grape hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {subscribing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {subscribing ? 'Subscribing...' : `Subscribe to ${creatorName}`}
            </div>
          </button>

          {/* View Profile Link */}
          <Link
            href={`/profile/${creatorAddress}`}
            className="w-full px-4 py-2.5 bg-white text-black text-center text-sm font-semibold font-['Outfit'] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            View Profile
          </Link>

          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={subscribing}
            className="w-full px-4 py-2 bg-white/50 text-black text-sm font-normal font-['Outfit'] rounded-[32px] border-2 border-black hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
