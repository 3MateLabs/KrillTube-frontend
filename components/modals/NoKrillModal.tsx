'use client';

/**
 * No dKRILL Modal
 * Shows when user tries to pay with dKRILL but doesn't have any tokens
 */

import Image from 'next/image';

interface NoKrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetDemoTokens: () => void;
}

export function NoKrillModal({
  isOpen,
  onClose,
  onGetDemoTokens,
}: NoKrillModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-[#2C5F7E] z-30 flex flex-col items-center justify-center">
      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-8">No dKRILL Found</h2>

      {/* dKRILL Token Icon */}
      <div className="w-40 h-40 bg-white rounded-full border-4 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center overflow-hidden mb-8">
        <Image
          src="/logos/krilll.png"
          alt="dKRILL Token"
          width={150}
          height={150}
          className="object-contain"
        />
      </div>

      {/* Message */}
      <p className="text-white text-lg mb-12 text-center max-w-md">
        You need dKRILL tokens to watch this video. Get free demo tokens to test it out!
      </p>

      {/* Get Demo Tokens Button */}
      <button
        onClick={onGetDemoTokens}
        className="px-8 py-4 bg-white text-black text-lg font-bold font-['Outfit'] rounded-[32px] border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
      >
        Get dKRILL for Demo for free!
      </button>

      {/* Close Button (Optional - for better UX) */}
      <button
        onClick={onClose}
        className="mt-6 px-6 py-3 text-white text-base font-semibold font-['Outfit'] underline hover:opacity-80 transition-opacity"
      >
        Cancel
      </button>
    </div>
  );
}
