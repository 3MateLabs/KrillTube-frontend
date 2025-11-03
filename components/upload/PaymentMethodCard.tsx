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
    <div className="p-5 bg-background-elevated border-2 border-border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground">Payment Method {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Token Type */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium text-text-muted">Token Type</label>
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
              <span className="text-xs text-walrus-mint font-medium">{symbol}</span>
            )}
          </div>
          <input
            type="text"
            value={config.tokenType}
            onChange={(e) => onUpdateTokenType(e.target.value)}
            placeholder="0x2::sui::SUI"
            className="w-full px-4 py-3 bg-background border border-border rounded-lg
              text-foreground placeholder-text-muted/50 font-mono text-sm
              focus:outline-none focus:ring-2 focus:ring-walrus-mint"
          />
          <p className="text-xs text-text-muted mt-1">
            Enter the full token type (e.g., 0x2::sui::SUI)
          </p>
        </div>

        {/* Amount per 1000 views */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-muted">
              Amount per 1,000 Views{config.inputMode === 'usd' ? ' (in USD)' : ''}
            </label>
            <button
              type="button"
              onClick={onToggleInputMode}
              className="text-xs px-2 py-1 rounded bg-background-hover hover:bg-border text-walrus-mint font-medium transition-colors"
            >
              {config.inputMode === 'coin' ? 'USD' : symbol}
            </button>
          </div>

          {/* Input field based on mode */}
          {config.inputMode === 'coin' ? (
            <input
              type="number"
              value={config.amountPer1000Views}
              onChange={(e) => onUpdateCoinAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.000001"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                text-foreground placeholder-text-muted/50
                focus:outline-none focus:ring-2 focus:ring-walrus-mint"
            />
          ) : (
            <input
              type="number"
              value={config.usdAmountPer1000Views || ''}
              onChange={(e) => onUpdateUsdAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 bg-background border border-border rounded-lg
                text-foreground placeholder-text-muted/50
                focus:outline-none focus:ring-2 focus:ring-walrus-mint"
            />
          )}

          {/* Show conversion below input */}
          {config.inputMode === 'usd' &&
            config.usdAmountPer1000Views &&
            parseFloat(config.usdAmountPer1000Views) > 0 &&
            coinPrice && (
              <p className="text-xs text-text-muted mt-2">
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
                <span className="font-semibold text-walrus-mint">
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
              <p className="text-xs text-text-muted mt-2">
                ≈{' '}
                <span className="font-semibold text-walrus-mint">
                  ${formatNumber(parseFloat(config.amountPer1000Views) * coinPrice.usdPrice)} USD
                </span>
              </p>
            )}

          <p className="text-xs text-text-muted mt-3">
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
            <span className="font-semibold text-foreground">
              {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                ? formatNumber(parseFloat(config.amountPer1000Views))
                : '0'}{' '}
              {symbol}
            </span>
            {coinPrice && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
              <span className="text-walrus-mint font-medium">
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
            <span className="font-semibold text-foreground">
              {config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0
                ? formatNumber(parseFloat(config.amountPer1000Views) / 1000)
                : '0'}{' '}
              {symbol}
            </span>
            {coinPrice && config.amountPer1000Views && parseFloat(config.amountPer1000Views) > 0 && (
              <span className="text-walrus-mint font-medium">
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
