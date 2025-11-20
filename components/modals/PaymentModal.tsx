'use client';

/**
 * Payment Modal
 * Shows payment options when user opens a video
 */

import Image from 'next/image';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayWithDKRILL: () => void;
  onPayWithSUI: () => void;
  onGetDemoTokens: () => void;
  dKrillPrice?: string; // Price in human-readable format (e.g., "10.00")
  suiPrice?: string; // Price in human-readable format (e.g., "0.01")
  dKrillDecimals?: number; // Token decimals for dKRILL
  suiDecimals?: number; // Token decimals for SUI
}

export function PaymentModal({
  isOpen,
  onClose,
  onPayWithDKRILL,
  onPayWithSUI,
  onGetDemoTokens,
  dKrillPrice,
  suiPrice,
  dKrillDecimals = 6,
  suiDecimals = 9,
}: PaymentModalProps) {
  if (!isOpen) return null;

  // Format price with decimals
  const formatPrice = (priceInSmallestUnit: string | undefined, decimals: number): string => {
    if (!priceInSmallestUnit) return '0.00';
    const price = parseFloat(priceInSmallestUnit) / Math.pow(10, decimals);
    return price.toFixed(2);
  };

  const formattedDKrillPrice = formatPrice(dKrillPrice, dKrillDecimals);
  const formattedSuiPrice = formatPrice(suiPrice, suiDecimals);

  return (
    <div className="absolute inset-0 bg-[#2C5F7E] z-30 flex flex-col items-center justify-center">
      {/* Title */}
      <h2 className="text-3xl font-bold text-white mb-12">Pay in</h2>

      {/* Payment Options */}
      <div className="flex items-center justify-center gap-24 mb-12">
        {/* dKRILL Option */}
        <button
          onClick={onPayWithDKRILL}
          className="flex flex-col items-center gap-6 hover:scale-105 transition-transform"
        >
          {/* Token Icon Circle */}
          <div className="w-32 h-32 bg-white rounded-full border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] flex items-center justify-center overflow-hidden">
            <Image
              src="/logos/krilll.png"
              alt="dKRILL Token"
              width={120}
              height={120}
              className="object-contain"
            />
          </div>
          {/* Amount */}
          <div className="text-2xl font-bold text-white">{formattedDKrillPrice} $dKRILL</div>
        </button>

        {/* SUI Option */}
        <button
          onClick={onPayWithSUI}
          className="flex flex-col items-center gap-6 hover:scale-105 transition-transform"
        >
          {/* Token Icon Circle with SUI SVG */}
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
          {/* Amount */}
          <div className="text-2xl font-bold text-white">{formattedSuiPrice} $SUI</div>
        </button>
      </div>

      {/* Get Demo Tokens Button */}
      <button
        onClick={onGetDemoTokens}
        className="px-8 py-4 bg-white text-black text-lg font-bold rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
      >
        Get dKRILL for Demo for free!
      </button>
    </div>
  );
}
