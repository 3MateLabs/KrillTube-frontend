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
  allowSubscription: boolean;
  onToggleSubscription: () => void;
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
  allowSubscription,
  onToggleSubscription,
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
      {/* Subscription Option */}
      <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
        <label className="flex items-start gap-4 cursor-pointer">
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              checked={allowSubscription}
              onChange={onToggleSubscription}
              className="w-5 h-5 rounded border-2 border-black cursor-pointer accent-krill-orange"
            />
          </div>
          <div className="flex-1">
            <div className="text-base font-bold font-['Outfit'] text-black mb-1">
              Enable Subscription Access
            </div>
            <div className="text-sm font-medium font-['Outfit'] text-black/70">
              Allow your channel subscribers to access this content at no additional cost
            </div>
          </div>
        </label>
      </div>
      <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold font-['Outfit'] text-black">Payment Methods</h3>
          <button
            type="button"
            onClick={onAddFeeConfig}
            className="px-4 py-2 bg-krill-orange text-white rounded-[32px] font-semibold font-['Outfit'] text-sm shadow-[2px_2px_0_0_black] outline outline-2 outline-white hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1"
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
      <div className="p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black">
        <h3 className="text-lg font-bold font-['Outfit'] text-black mb-4">Monetization Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-black/70 font-semibold font-['Outfit']">Total Payment Methods:</span>
            <span className="text-black font-bold font-['Outfit']">{feeConfigs.length}</span>
          </div>
          {feeConfigs.map((config, index) => (
            <div key={config.id} className="flex justify-between text-sm py-2 border-t-2 border-black">
              <span className="text-black/70 font-semibold font-['Outfit']">Method {index + 1}:</span>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 text-black font-semibold font-['Outfit']">
                  {coinMetadataCache[config.tokenType]?.iconUrl && (
                    <img
                      src={coinMetadataCache[config.tokenType].iconUrl!}
                      alt={coinMetadataCache[config.tokenType]?.symbol || 'Token'}
                      className="w-4 h-4 rounded-full"
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
                    <div className="text-xs text-krill-orange font-semibold font-['Outfit']">
                      ~$
                      {formatNumber(
                        parseFloat(config.amountPer1000Views) *
                          coinPriceCache[config.tokenType].usdPrice
                      )}{' '}
                      USD
                    </div>
                  )}
                <div className="text-xs text-black/70 font-medium font-['Outfit']">per 1,000 views</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
