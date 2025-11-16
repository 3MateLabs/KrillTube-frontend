/**
 * Cost Estimate Section
 * Displays storage cost estimation with network switcher and storage duration controls
 */

'use client';

import { UploadNetworkSwitcher } from '@/components/UploadNetworkSwitcher';

interface CostBreakdown {
  storage: { wal: string; usd: string };
  write: { wal: string; usd: string };
}

interface CostEstimate {
  totalWal: string;
  totalUsd: string;
  storageMB: string;
  breakdown: CostBreakdown;
}

interface StorageOption {
  label: string;
  epochs: number;
  category: 'days' | 'months' | 'years';
}

interface CostEstimateSectionProps {
  costEstimate: CostEstimate | null;
  isEstimating: boolean;
  walrusNetwork: 'mainnet' | 'testnet';
  storageOptionIndex: number;
  storageOptions: StorageOption[];
  onStorageOptionChange: (index: number) => void;
  testnetStorageDays: number;
  onTestnetStorageDaysChange: (days: number) => void;
}

export function CostEstimateSection({
  costEstimate,
  isEstimating,
  walrusNetwork,
  storageOptionIndex,
  storageOptions,
  onStorageOptionChange,
  testnetStorageDays,
  onTestnetStorageDaysChange,
}: CostEstimateSectionProps) {
  if (!costEstimate && !isEstimating) return null;

  const selectedStorageOption = storageOptions[storageOptionIndex];
  const displayLabel = walrusNetwork === 'testnet'
    ? `${testnetStorageDays} ${testnetStorageDays === 1 ? 'day' : 'days'}`
    : selectedStorageOption.label;

  return (
    <div className="p-5 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black relative">
      {/* Loading overlay */}
      {isEstimating && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-krill-orange"></div>
            <span className="text-black/70 text-sm font-medium font-['Outfit']">Calculating...</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-bold font-['Outfit'] text-black">
          Estimated Storage Cost
        </h3>
        <div className="ml-4">
          <UploadNetworkSwitcher />
        </div>
      </div>

      <div className="space-y-3">
        {/* Storage Duration */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <label className="text-sm font-semibold font-['Outfit'] text-black/70">
              Storage Duration:
            </label>
            <span className="text-black font-bold text-xl font-['Outfit']">
              {displayLabel}
            </span>
          </div>

          {walrusNetwork === 'mainnet' ? (
            <>
              {/* Mainnet: Full Slider with all options */}
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={storageOptions.length - 1}
                  value={storageOptionIndex}
                  onChange={(e) => onStorageOptionChange(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-orange"
                  style={{
                    background: `linear-gradient(to right,
                      var(--krill-orange) 0%,
                      var(--krill-orange) ${(storageOptionIndex / (storageOptions.length - 1)) * 100}%,
                      #000000 ${(storageOptionIndex / (storageOptions.length - 1)) * 100}%,
                      #000000 100%)`
                  }}
                />

                {/* Category Markers */}
                <div className="flex justify-between text-xs text-black/70 font-medium font-['Outfit'] mt-2 px-1">
                  <span>Days</span>
                  <span>Months</span>
                  <span>Years</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-start justify-between mt-3">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onStorageOptionChange(6)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      7 days
                    </button>
                    <button
                      type="button"
                      onClick={() => onStorageOptionChange(30)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      1 month
                    </button>
                    <button
                      type="button"
                      onClick={() => onStorageOptionChange(35)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      6 months
                    </button>
                    <button
                      type="button"
                      onClick={() => onStorageOptionChange(42)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      1 year
                    </button>
                  </div>
                  <p className="text-xs text-krill-orange font-medium font-['Outfit']">
                    💡 You can extend storage later or delete early to receive rebates
                  </p>
                </div>
                {costEstimate && (
                  <div className="text-right">
                    <div className="text-5xl font-bold font-['Outfit'] text-black">
                      {costEstimate.totalWal} <span className="text-3xl">WAL</span>
                    </div>
                    <div className="text-sm text-krill-orange font-medium font-['Outfit']">
                      (~${costEstimate.totalUsd} USD)
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Testnet: Simple 1-53 days slider */}
              <div className="relative">
                <input
                  type="range"
                  min="1"
                  max="53"
                  value={testnetStorageDays}
                  onChange={(e) => onTestnetStorageDaysChange(parseInt(e.target.value))}
                  className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-orange"
                  style={{
                    background: `linear-gradient(to right,
                      var(--krill-orange) 0%,
                      var(--krill-orange) ${((testnetStorageDays - 1) / 52) * 100}%,
                      #000000 ${((testnetStorageDays - 1) / 52) * 100}%,
                      #000000 100%)`
                  }}
                />

                {/* Range Markers */}
                <div className="flex justify-between text-xs text-black/70 font-medium font-['Outfit'] mt-2 px-1">
                  <span>1 day</span>
                  <span>53 days</span>
                </div>
              </div>

              {/* Quick Presets for Testnet */}
              <div className="flex items-start justify-between mt-3">
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onTestnetStorageDaysChange(1)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      1 day
                    </button>
                    <button
                      type="button"
                      onClick={() => onTestnetStorageDaysChange(7)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      7 days
                    </button>
                    <button
                      type="button"
                      onClick={() => onTestnetStorageDaysChange(30)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      30 days
                    </button>
                    <button
                      type="button"
                      onClick={() => onTestnetStorageDaysChange(53)}
                      className="px-3 py-1.5 text-xs font-semibold font-['Outfit'] bg-krill-peach text-black rounded-xl shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      53 days
                    </button>
                  </div>
                  <p className="text-xs text-krill-orange font-medium font-['Outfit']">
                    ℹ️ Testnet maximum: 53 days (free storage)
                  </p>
                </div>
                {costEstimate && (
                  <div className="text-5xl font-bold font-['Outfit'] text-krill-orange">
                    Free
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Storage Size */}
        {costEstimate && (
          <>
            <div className="flex items-baseline justify-between pt-3 border-t-2 border-black">
              <span className="text-black/70 font-semibold font-['Outfit']">Estimated Storage:</span>
              <span className="text-black font-mono font-semibold">
                {costEstimate.storageMB} MB
              </span>
            </div>

            {/* Breakdown - Only show for mainnet */}
            {walrusNetwork === 'mainnet' && (
              <div className="pt-3 border-t-2 border-black space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-black/70 font-semibold font-['Outfit']">Storage Cost:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-black font-mono font-semibold">
                      {costEstimate.breakdown.storage.wal} WAL
                    </span>
                    <span className="text-black/70 font-['Outfit']">
                      (~${costEstimate.breakdown.storage.usd})
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-black/70 font-semibold font-['Outfit']">Write Cost:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-black font-mono font-semibold">
                      {costEstimate.breakdown.write.wal} WAL
                    </span>
                    <span className="text-black/70 font-['Outfit']">
                      (~${costEstimate.breakdown.write.usd})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-black/70 font-medium font-['Outfit'] mt-3">
              {walrusNetwork === 'testnet'
                ? 'Testnet storage is free. No payment required.'
                : 'This is an estimate. Actual cost may vary slightly based on final file size.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
