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
  creatorName: string;
  creatorAddress: string;
  channelPrice?: string;
  channelChain?: string;
}

export function SubscriptionPrompt({
  isOpen,
  onClose,
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
      <div className="w-full max-w-md p-8 bg-white rounded-[32px] shadow-[5px_5px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-walrus-grape rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-black font-['Outfit'] mb-2">
            Subscription Required
          </h2>
          <p className="text-base text-black/70 font-['Outfit']">
            This video is exclusive to {creatorName}'s subscribers
          </p>
        </div>

        {/* Subscription Info */}
        <div className="p-4 bg-[#FFEEE5] rounded-xl border-2 border-black mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-black font-['Outfit']">
              Subscription Price
            </span>
            <span className="text-lg font-bold text-black font-['Outfit']">
              {formattedPrice}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-black font-['Outfit']">
              Network
            </span>
            <span className="text-sm font-bold text-black font-['Outfit'] uppercase">
              {chain}
            </span>
          </div>
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-black font-['Outfit'] mb-3">
            Benefits of subscribing:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-walrus-mint flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-black font-['Outfit']">
                Unlimited access to all subscriber-only videos
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-walrus-mint flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-black font-['Outfit']">
                Access to all future uploads
              </span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-walrus-mint flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-black font-['Outfit']">
                Support your favorite creator
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Subscribe Button */}
          <Link
            href={`/profile/${creatorAddress}`}
            className="w-full px-6 py-3 bg-walrus-grape text-white text-center font-bold font-['Outfit'] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            Subscribe to {creatorName}
          </Link>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-white text-black font-semibold font-['Outfit'] rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
