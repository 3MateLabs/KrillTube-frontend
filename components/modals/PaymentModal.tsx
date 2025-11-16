'use client';

/**
 * Payment Modal
 * Shows payment options when user opens a video
 */

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayWithDKRILL: () => void;
  onPayWithIOTA: () => void;
  onGetDemoTokens: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  onPayWithDKRILL,
  onPayWithIOTA,
  onGetDemoTokens,
}: PaymentModalProps) {
  if (!isOpen) return null;

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
          <div className="w-32 h-32 bg-white rounded-full border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]"></div>
          {/* Amount */}
          <div className="text-2xl font-bold text-white">0.01 $dKRILL</div>
        </button>

        {/* IOTA Option */}
        <button
          onClick={onPayWithIOTA}
          className="flex flex-col items-center gap-6 hover:scale-105 transition-transform"
        >
          {/* Token Icon Circle */}
          <div className="w-32 h-32 bg-white rounded-full border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]"></div>
          {/* Amount */}
          <div className="text-2xl font-bold text-white">0.01 $IOTA</div>
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
