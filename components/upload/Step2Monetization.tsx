/**
 * Step 2: Monetization
 * Payment methods configuration
 */

'use client';

import { PaymentMethodCard } from './PaymentMethodCard';

type CoinMetadata = {
  decimals: number;
  name: string;
  symbol: string;
  description: string;
  iconUrl: string | null;
};

type CoinPrice = {
  usdPrice: number;
  timestamp: number;
};

type FeeConfig = {
  id: string;
  tokenType: string;
  amountPer1000Views: string;
  usdAmountPer1000Views?: string;
  inputMode?: 'coin' | 'usd';
};

interface Step2MonetizationProps {
  feeConfigs: FeeConfig[];
  coinMetadataCache: Record<string, CoinMetadata>;
  coinPriceCache: Record<string, CoinPrice>;
  onAddFeeConfig: () => void;
  onRemoveFeeConfig: (id: string) => void;
  onUpdateTokenType: (id: string, value: string) => void;
  onUpdateCoinAmount: (id: string, value: string) => void;
  onUpdateUsdAmount: (id: string, value: string) => void;
  onToggleInputMode: (id: string) => void;
  formatNumber: (value: number) => string;
}

export function Step2Monetization({
  feeConfigs,
  coinMetadataCache,
  coinPriceCache,
  onAddFeeConfig,
  onRemoveFeeConfig,
  onUpdateTokenType,
  onUpdateCoinAmount,
  onUpdateUsdAmount,
  onToggleInputMode,
  formatNumber,
}: Step2MonetizationProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-background-elevated border-2 border-border rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Payment Methods</h3>
          <button
            type="button"
            onClick={onAddFeeConfig}
            className="text-sm text-walrus-mint hover:text-mint-800 font-medium transition-colors flex items-center gap-1"
          >
            <span className="text-lg">+</span> Add Payment Method
          </button>
        </div>

        <div className="space-y-4">
          {feeConfigs.map((config, index) => (
            <PaymentMethodCard
              key={config.id}
              config={config}
              index={index}
              canRemove={feeConfigs.length > 1}
              coinMetadata={coinMetadataCache[config.tokenType]}
              coinPrice={coinPriceCache[config.tokenType]}
              onUpdateTokenType={(value) => onUpdateTokenType(config.id, value)}
              onUpdateCoinAmount={(value) => onUpdateCoinAmount(config.id, value)}
              onUpdateUsdAmount={(value) => onUpdateUsdAmount(config.id, value)}
              onToggleInputMode={() => onToggleInputMode(config.id)}
              onRemove={() => onRemoveFeeConfig(config.id)}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </div>

      {/* Monetization Summary */}
      <div className="p-6 bg-background-elevated border-2 border-walrus-mint/30 rounded-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Monetization Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Total Payment Methods:</span>
            <span className="text-foreground font-semibold">{feeConfigs.length}</span>
          </div>
          {feeConfigs.map((config, index) => (
            <div key={config.id} className="flex justify-between text-sm py-2 border-t border-border">
              <span className="text-text-muted">Method {index + 1}:</span>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 text-foreground font-medium">
                  {coinMetadataCache[config.tokenType]?.iconUrl && (
                    <img
                      src={coinMetadataCache[config.tokenType].iconUrl!}
                      alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                      className="w-3.5 h-3.5 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span>
                    {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                      ? formatNumber(parseFloat(config.amountPer1000Views))
                      : '0'}{' '}
                    {coinMetadataCache[config.tokenType]?.symbol ||
                      config.tokenType.split('::').pop() ||
                      'TOKEN'}
                  </span>
                </div>
                {coinPriceCache[config.tokenType] &&
                  config.amountPer1000Views &&
                  parseFloat(config.amountPer1000Views) > 0 && (
                    <div className="text-xs text-walrus-mint font-medium">
                      ~$
                      {formatNumber(
                        parseFloat(config.amountPer1000Views) *
                          coinPriceCache[config.tokenType].usdPrice
                      )}{' '}
                      USD
                    </div>
                  )}
                <div className="text-xs text-text-muted">per 1,000 views</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
