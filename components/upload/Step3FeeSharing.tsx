/**
 * Step 3: Fee Sharing
 * Referrer share configuration with pie chart and revenue examples
 */

'use client';

import { RevenuePieChart } from './RevenuePieChart';
import { RevenueExamples } from './RevenueExamples';

interface Step3FeeSharingProps {
  referrerSharePercent: number;
  onReferrerShareChange: (value: number) => void;
  onShowPlatformFeeDialog: () => void;
}

export function Step3FeeSharing({
  referrerSharePercent,
  onReferrerShareChange,
  onShowPlatformFeeDialog,
}: Step3FeeSharingProps) {
  const creatorPercent = 100 - referrerSharePercent - 10; // 10% is platform fee
  const platformPercent = 10;

  return (
    <div className="space-y-6">
      {/* Referrer Share Configuration */}
      <div className="p-6 bg-background-elevated border-2 border-border rounded-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Sharing</h3>
        <p className="text-sm text-text-muted mb-6">
          Configure how your video revenue will be shared. The platform automatically takes 10% to
          maintain the service.{' '}
          <button
            type="button"
            onClick={onShowPlatformFeeDialog}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-background-hover hover:bg-border text-walrus-mint transition-colors cursor-help"
            title="Compare with other platforms"
          >
            <span className="text-xs font-bold">?</span>
          </button>
        </p>

        {/* Referrer Share Slider */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-medium text-foreground">Referrer Share</label>
            <span className="text-2xl font-bold text-walrus-mint">{referrerSharePercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={referrerSharePercent}
            onChange={(e) => onReferrerShareChange(parseInt(e.target.value))}
            className="w-full h-2 bg-background-hover rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-walrus-mint
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-walrus-mint
              [&::-moz-range-thumb]:cursor-pointer
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:shadow-lg"
          />
          <div className="flex justify-between text-xs text-text-muted mt-2">
            <span>0%</span>
            <span>45%</span>
            <span>90%</span>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Set how much of your revenue goes to referrers who bring viewers to your content
          </p>
        </div>

        {/* Revenue Distribution */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-4">Revenue Distribution</h4>
          <RevenuePieChart
            creatorPercent={creatorPercent}
            referrerSharePercent={referrerSharePercent}
            platformPercent={platformPercent}
          />
        </div>

        {/* Revenue Examples */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Example Scenarios</h4>
          <RevenueExamples
            referrerSharePercent={referrerSharePercent}
            onShowPlatformFeeDialog={onShowPlatformFeeDialog}
          />
        </div>
      </div>
    </div>
  );
}
