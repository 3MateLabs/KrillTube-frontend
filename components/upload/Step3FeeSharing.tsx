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
      <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
        <h3 className="text-lg font-bold font-['Outfit'] text-black mb-4">Revenue Sharing</h3>
        <p className="text-sm text-black/70 font-medium font-['Outfit'] mb-6">
          Configure how your video revenue will be shared. The platform automatically takes 10% to
          maintain the service.{' '}
          <button
            type="button"
            onClick={onShowPlatformFeeDialog}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-krill-peach text-krill-orange font-bold shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-help"
            title="Compare with other platforms"
          >
            <span className="text-xs font-bold">?</span>
          </button>
        </p>

        {/* Referrer Share Slider */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold font-['Outfit'] text-black/70">Referrer Share</label>
            <span className="text-2xl font-bold font-['Outfit'] text-krill-orange">{referrerSharePercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={referrerSharePercent}
            onChange={(e) => onReferrerShareChange(parseInt(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-orange"
            style={{
              background: `linear-gradient(to right,
                var(--krill-orange) 0%,
                var(--krill-orange) ${(referrerSharePercent / 90) * 100}%,
                #000000 ${(referrerSharePercent / 90) * 100}%,
                #000000 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-black/70 font-medium font-['Outfit'] mt-2">
            <span>0%</span>
            <span>45%</span>
            <span>90%</span>
          </div>
          <p className="text-xs text-black/70 font-medium font-['Outfit'] mt-3">
            Set how much of your revenue goes to referrers who bring viewers to your content
          </p>
        </div>

        {/* Revenue Distribution */}
        <div className="mb-6">
          <h4 className="text-sm font-bold font-['Outfit'] text-black mb-4">Revenue Distribution</h4>
          <RevenuePieChart
            creatorPercent={creatorPercent}
            referrerSharePercent={referrerSharePercent}
            platformPercent={platformPercent}
          />
        </div>

        {/* Revenue Examples */}
        <div>
          <h4 className="text-sm font-bold font-['Outfit'] text-black mb-3">Example Scenarios</h4>
          <RevenueExamples
            referrerSharePercent={referrerSharePercent}
            onShowPlatformFeeDialog={onShowPlatformFeeDialog}
          />
        </div>
      </div>
    </div>
  );
}
