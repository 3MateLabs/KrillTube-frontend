/**
 * Revenue Examples
 * Shows revenue distribution with and without referrer
 */

'use client';

interface RevenueExamplesProps {
  referrerSharePercent: number;
  onShowPlatformFeeDialog: () => void;
}

export function RevenueExamples({
  referrerSharePercent,
  onShowPlatformFeeDialog,
}: RevenueExamplesProps) {
  return (
    <div className="mt-4 space-y-3">
      {/* Example with referrer */}
      <div className="p-3 bg-krill-peach rounded-xl shadow-[2px_2px_0_0_rgba(0,0,0,1)] outline outline-1 outline-black">
        <p className="text-xs text-black/70 font-medium font-['Outfit']">
          <span className="font-bold text-black">Example 1: With Referrer</span> - If
          viewers pays 10 SUI to watch your video in total (with referral):
        </p>
        <ul className="mt-2 space-y-1 text-xs text-black/70 font-medium font-['Outfit'] ml-4">
          <li>
            • You receive:{' '}
            <span className="text-krill-orange font-bold">
              {((100 - referrerSharePercent - 10) / 100 * 10).toFixed(2)} SUI
            </span>
          </li>
          <li>
            • Referrer receives:{' '}
            <span className="text-walrus-grape font-bold">
              {(referrerSharePercent / 100 * 10).toFixed(2)} SUI
            </span>
          </li>
          <li>
            • Platform receives: <span className="text-krill-gray font-bold">1.00 SUI</span>
          </li>
        </ul>
      </div>

      {/* Example without referrer */}
      <div className="p-3 bg-krill-peach rounded-xl shadow-[2px_2px_0_0_rgba(0,0,0,1)] outline outline-1 outline-black">
        <p className="text-xs text-black/70 font-medium font-['Outfit']">
          <span className="font-bold text-black">Example 2: No Referrer</span> - If
          viewers pay 10 SUI to watch your video in total (without referral):
        </p>
        <ul className="mt-2 space-y-1 text-xs text-black/70 font-medium font-['Outfit'] ml-4">
          <li>
            • You receive:{' '}
            <span className="text-krill-orange font-bold">
              {((100 - 10) / 100 * 10).toFixed(2)} SUI
            </span>{' '}
            <span className="text-black/50">(you get the referrer's share too!)</span>
          </li>
          <li>
            • Referrer receives: <span className="text-walrus-grape font-bold">0.00 SUI</span>{' '}
            <span className="text-black/50">(no referrer)</span>
          </li>
          <li>
            • Platform receives: <span className="text-krill-gray font-bold">1.00 SUI</span>
          </li>
        </ul>
      </div>

      <p className="text-xs text-krill-orange font-medium font-['Outfit'] italic">
        💡 When there's no referrer, you keep their share! The platform always takes 10%.{' '}
        <button
          type="button"
          onClick={onShowPlatformFeeDialog}
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-krill-peach text-krill-orange font-bold shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-help"
          title="Compare with other platforms"
        >
          <span className="text-xs font-bold">?</span>
        </button>
      </p>
    </div>
  );
}
