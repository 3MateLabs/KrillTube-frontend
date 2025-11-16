'use client';

/**
 * Connect Wallet Modal
 * Shows when users try to play videos without connecting their wallet
 */

import { ChainSelector } from '@/components/wallet/ChainSelector';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-[#2C5F7E] rounded-3xl p-8 max-w-md w-full mx-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">
              Connect wallet to continue
            </h2>
            <p className="text-white/80 text-sm">
              You need to connect your wallet to play videos
            </p>
          </div>

          {/* Connect Wallet Button */}
          <div className="flex justify-center">
            <ChainSelector />
          </div>
        </div>
      </div>
    </>
  );
}
