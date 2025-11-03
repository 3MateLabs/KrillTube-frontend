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
  value: number;
  label: string;
}

interface CostEstimateSectionProps {
  costEstimate: CostEstimate | null;
  isEstimating: boolean;
  walrusNetwork: 'mainnet' | 'testnet';
  storageOptionIndex: number;
  storageOptions: StorageOption[];
  onStorageOptionChange: (index: number) => void;
}

export function CostEstimateSection({
  costEstimate,
  isEstimating,
  walrusNetwork,
  storageOptionIndex,
  storageOptions,
  onStorageOptionChange,
}: CostEstimateSectionProps) {
  if (!costEstimate && !isEstimating) return null;

  const selectedStorageOption = storageOptions[storageOptionIndex];

  return (
    <div className="p-5 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg relative">
      {/* Loading overlay */}
      {isEstimating && (
        <div className="absolute inset-0 bg-background-elevated/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-walrus-mint"></div>
            <span className="text-text-muted text-sm">Calculating...</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Estimated Storage Cost
        </h3>
        <div className="ml-4">
          <UploadNetworkSwitcher />
        </div>
      </div>

      <div className="space-y-3">
        {/* Storage Duration */}
        {walrusNetwork === 'mainnet' ? (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-sm font-medium text-text-muted">
                Storage Duration:
              </label>
              <span className="text-foreground font-bold text-xl">
                {selectedStorageOption.label}
              </span>
            </div>

            {/* Categorical Slider */}
            <div className="relative">
              <input
                type="range"
                min="0"
                max={storageOptions.length - 1}
                value={storageOptionIndex}
                onChange={(e) => onStorageOptionChange(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-walrus-mint"
                style={{
                  background: `linear-gradient(to right,
                    var(--walrus-mint) 0%,
                    var(--walrus-mint) ${(storageOptionIndex / (storageOptions.length - 1)) * 100}%,
                    #4b5563 ${(storageOptionIndex / (storageOptions.length - 1)) * 100}%,
                    #4b5563 100%)`
                }}
              />

              {/* Category Markers */}
              <div className="flex justify-between text-xs text-text-muted mt-2 px-1">
                <span className="font-medium">Days</span>
                <span className="font-medium">Months</span>
                <span className="font-medium">Years</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => onStorageOptionChange(6)}
                className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => onStorageOptionChange(30)}
                className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
              >
                1 month
              </button>
              <button
                type="button"
                onClick={() => onStorageOptionChange(35)}
                className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
              >
                6 months
              </button>
              <button
                type="button"
                onClick={() => onStorageOptionChange(42)}
                className="px-3 py-1.5 text-xs bg-background-hover text-text-muted rounded-lg hover:bg-walrus-mint/20 hover:text-walrus-mint transition-colors"
              >
                1 year
              </button>
            </div>

            <p className="text-xs text-walrus-mint mt-3">
              💡 You can extend storage later or delete early to receive rebates
            </p>
          </div>
        ) : (
          <div className="p-3 bg-background-hover rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text-muted">Storage Duration:</span>
              <span className="text-foreground font-semibold">100 days</span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              ℹ️ You can store data in testnet for 100 days and it will be expired
            </p>
          </div>
        )}

        {/* Total Cost */}
        {costEstimate && (
          <>
            <div className="flex items-baseline justify-between pt-3 border-t border-border">
              <span className="text-text-muted">Total Cost:</span>
              {walrusNetwork === 'testnet' ? (
                <span className="text-walrus-mint font-bold text-lg">
                  Free
                </span>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="text-foreground font-mono font-bold text-lg">
                    {costEstimate.totalWal} WAL
                  </span>
                  <span className="text-walrus-mint font-medium">
                    (~${costEstimate.totalUsd} USD)
                  </span>
                </div>
              )}
            </div>

            {/* Storage Size */}
            <div className="flex items-baseline justify-between">
              <span className="text-text-muted">Estimated Storage:</span>
              <span className="text-foreground font-mono">
                {costEstimate.storageMB} MB
              </span>
            </div>

            {/* Breakdown - Only show for mainnet */}
            {walrusNetwork === 'mainnet' && (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-text-muted">Storage Cost:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground font-mono">
                      {costEstimate.breakdown.storage.wal} WAL
                    </span>
                    <span className="text-text-muted">
                      (~${costEstimate.breakdown.storage.usd})
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-text-muted">Write Cost:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-foreground font-mono">
                      {costEstimate.breakdown.write.wal} WAL
                    </span>
                    <span className="text-text-muted">
                      (~${costEstimate.breakdown.write.usd})
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-text-muted mt-3">
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
