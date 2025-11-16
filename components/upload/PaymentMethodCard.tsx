/**
 * Payment Method Card
 * Individual payment method configuration with coin/USD toggle
 */

'use client';

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

interface PaymentMethodCardProps {
  config: FeeConfig;
  index: number;
  canRemove: boolean;
  coinMetadata?: CoinMetadata;
  coinPrice?: CoinPrice;
  onUpdateTokenType: (value: string) => void;
  onUpdateCoinAmount: (value: string) => void;
  onUpdateUsdAmount: (value: string) => void;
  onToggleInputMode: () => void;
  onRemove: () => void;
  formatNumber: (value: number) => string;
}

export function PaymentMethodCard({
  config,
  index,
  canRemove,
  coinMetadata,
  coinPrice,
  onUpdateTokenType,
  onUpdateCoinAmount,
  onUpdateUsdAmount,
  onToggleInputMode,
  onRemove,
  formatNumber,
}: PaymentMethodCardProps) {
  const symbol = coinMetadata?.symbol || config.tokenType.split('::').pop() || 'TOKEN';

  return (
    <div className="p-5 bg-black rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-white">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-bold font-['Outfit'] text-white">Payment Method {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-krill-orange hover:opacity-80 font-semibold font-['Outfit'] transition-opacity"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Token Type */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-semibold font-['Outfit'] text-white/70">Token Type</label>
            {coinMetadata?.iconUrl && (
              <img
                src={coinMetadata.iconUrl}
                alt={symbol}
                className="w-4 h-4 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            {coinMetadata && (
              <span className="text-xs text-krill-orange font-semibold font-['Outfit']">{symbol}</span>
            )}
          </div>
          <input
            type="text"
            value={config.tokenType}
            onChange={(e) => onUpdateTokenType(e.target.value)}
            placeholder="0x2::sui::SUI"
            className="w-full px-4 py-3 bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] outline outline-1 outline-black
              text-black placeholder-black/40 font-mono text-sm font-medium
              focus:outline-krill-orange focus:outline-2 transition-all"
          />
          <p className="text-xs text-white/50 font-medium font-['Outfit'] mt-1">
            Enter the full token type (e.g., 0x2::sui::SUI)
          </p>
        </div>

        {/* Amount per 1000 views */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold font-['Outfit'] text-white/70">
              Amount per 1,000 Views
              <span className="text-krill-orange">{config.inputMode === 'usd' ? ' (in USD)' : ''}</span>
            </label>
            <button
              type="button"
              onClick={onToggleInputMode}
              className="text-xs px-3 py-1.5 rounded-xl bg-krill-peach text-black font-semibold font-['Outfit'] shadow-[2px_2px_0_0_black] outline outline-1 outline-black hover:shadow-[1px_1px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              {config.inputMode === 'coin' ? 'USD' : symbol}
            </button>
          </div>

          {/* Input field based on mode */}
          {config.inputMode === 'coin' ? (
            <input
              type="text"
              value={config.amountPer1000Views}
              onChange={(e) => {
                // Strip commas and underscores for cleaner input
                const cleaned = e.target.value.replace(/[,_]/g, '');
                onUpdateCoinAmount(cleaned);
              }}
              placeholder="0 (e.g., 10_000 or 10,000)"
              className="w-full px-4 py-3 bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] outline outline-1 outline-black
                text-black placeholder-black/40 font-medium font-['Outfit']
                focus:outline-krill-orange focus:outline-2 transition-all"
            />
          ) : (
            <input
              type="text"
              value={config.usdAmountPer1000Views || ''}
              onChange={(e) => {
                // Strip commas and underscores for cleaner input
                const cleaned = e.target.value.replace(/[,_]/g, '');
                onUpdateUsdAmount(cleaned);
              }}
              placeholder="0 (e.g., 100.00)"
              className="w-full px-4 py-3 bg-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)] outline outline-1 outline-black
                text-black placeholder-black/40 font-medium font-['Outfit']
                focus:outline-krill-orange focus:outline-2 transition-all"
            />
          )}

          {/* Show conversion below input */}
          {config.inputMode === 'usd' &&
            config.usdAmountPer1000Views &&
            parseFloat(config.usdAmountPer1000Views) > 0 &&
            coinPrice && (
              <p className="text-xs text-white/50 font-medium font-['Outfit'] mt-2">
                ≈{' '}
                {coinMetadata?.iconUrl && (
                  <img
                    src={coinMetadata.iconUrl}
                    alt={symbol}
                    className="w-3.5 h-3.5 rounded-full inline align-middle"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}{' '}
                <span className="font-semibold text-krill-orange">
                  {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                    ? formatNumber(parseFloat(config.amountPer1000Views))
                    : '0'}{' '}
                  {symbol}
                </span>
              </p>
            )}

          {config.inputMode === 'coin' &&
            config.amountPer1000Views &&
            parseFloat(config.amountPer1000Views) > 0 &&
            coinPrice && (
              <p className="text-xs text-white/50 font-medium font-['Outfit'] mt-2">
                ≈{' '}
                <span className="font-semibold text-krill-orange">
                  ${formatNumber(parseFloat(config.amountPer1000Views) * coinPrice.usdPrice)} USD
                </span>
              </p>
            )}

          <p className="text-xs text-white/50 font-medium font-['Outfit'] mt-3">
            You will get{' '}
            {coinMetadata?.iconUrl && (
              <img
                src={coinMetadata.iconUrl}
                alt={symbol}
                className="w-3.5 h-3.5 rounded-full inline align-middle"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}{' '}
            <span className="font-semibold text-white">
              {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                ? formatNumber(parseFloat(config.amountPer1000Views))
                : '0'}{' '}
              {symbol}
            </span>
            {coinPrice && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
              <span className="text-krill-orange font-medium">
                {' '}
                (~${formatNumber(parseFloat(config.amountPer1000Views) * coinPrice.usdPrice)} USD)
              </span>
            )}{' '}
            per 1000 views and each viewer will pay{' '}
            {coinMetadata?.iconUrl && (
              <img
                src={coinMetadata.iconUrl}
                alt={symbol}
                className="w-3.5 h-3.5 rounded-full inline align-middle"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}{' '}
            <span className="font-semibold text-white">
              {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                ? formatNumber(parseFloat(config.amountPer1000Views) / 1000)
                : '0'}{' '}
              {symbol}
            </span>
            {coinPrice && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
              <span className="text-krill-orange font-medium">
                {' '}
                (~$
                {formatNumber((parseFloat(config.amountPer1000Views) / 1000) * coinPrice.usdPrice)}{' '}
                USD)
              </span>
            )}{' '}
            to watch your full video
          </p>
        </div>
      </div>
    </div>
  );
}
