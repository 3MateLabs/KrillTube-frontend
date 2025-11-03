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
      <div className="p-3 bg-background-hover rounded-lg">
        <p className="text-xs text-text-muted">
          <span className="font-semibold text-foreground">Example 1: With Referrer</span> - If
          viewers pays 10 SUI to watch your video in total (with referral):
        </p>
        <ul className="mt-2 space-y-1 text-xs text-text-muted ml-4">
          <li>
            • You receive:{' '}
            <span className="text-walrus-mint font-semibold">
              {((100 - referrerSharePercent - 10) / 100 * 10).toFixed(2)} SUI
            </span>
          </li>
          <li>
            • Referrer receives:{' '}
            <span className="text-purple-400 font-semibold">
              {(referrerSharePercent / 100 * 10).toFixed(2)} SUI
            </span>
          </li>
          <li>
            • Platform receives: <span className="text-gray-400 font-semibold">1.00 SUI</span>
          </li>
        </ul>
      </div>

      {/* Example without referrer */}
      <div className="p-3 bg-background-hover rounded-lg">
        <p className="text-xs text-text-muted">
          <span className="font-semibold text-foreground">Example 2: No Referrer</span> - If
          viewers pay 10 SUI to watch your video in total (without referral):
        </p>
        <ul className="mt-2 space-y-1 text-xs text-text-muted ml-4">
          <li>
            • You receive:{' '}
            <span className="text-walrus-mint font-semibold">
              {((100 - 10) / 100 * 10).toFixed(2)} SUI
            </span>{' '}
            <span className="text-walrus-mint/70">(you get the referrer's share too!)</span>
          </li>
          <li>
            • Referrer receives: <span className="text-purple-400 font-semibold">0.00 SUI</span>{' '}
            <span className="text-text-muted/70">(no referrer)</span>
          </li>
          <li>
            • Platform receives: <span className="text-gray-400 font-semibold">1.00 SUI</span>
          </li>
        </ul>
      </div>

      <p className="text-xs text-walrus-mint/80 italic">
        💡 When there's no referrer, you keep their share! The platform always takes 10%.{' '}
        <button
          type="button"
          onClick={onShowPlatformFeeDialog}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-background-hover hover:bg-border text-walrus-mint transition-colors cursor-help"
          title="Compare with other platforms"
        >
          <span className="text-xs font-bold">?</span>
        </button>
      </p>
    </div>
  );
}
