/**
 * Reusable component for displaying WAL prices with USD equivalents
 */

'use client';

import { useEffect, useState } from 'react';

interface PriceDisplayProps {
  walAmount: number | string;
  className?: string;
  showUsdFirst?: boolean; // If true, show "$1.25 (0.5 WAL)" instead of "0.5 WAL (~$1.25)"
  walPriceUsd?: number; // Optionally pass pre-fetched price
}

export function PriceDisplay({
  walAmount,
  className = '',
  showUsdFirst = false,
  walPriceUsd,
}: PriceDisplayProps) {
  const [usdValue, setUsdValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const walNum = typeof walAmount === 'string' ? parseFloat(walAmount) : walAmount;

  useEffect(() => {
    async function fetchPrice() {
      if (walPriceUsd !== undefined) {
        setUsdValue(walNum * walPriceUsd);
        return;
      }

      setIsLoading(true);
      try {
        // WAL token type
        const walTokenType = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';
        const response = await fetch(`/api/v1/coin-price/${encodeURIComponent(walTokenType)}`);
        if (response.ok) {
          const { price } = await response.json();
          setUsdValue(walNum * price);
        }
      } catch (error) {
        console.error('Failed to fetch WAL price:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrice();
  }, [walNum, walPriceUsd]);

  // Format WAL amount
  const walFormatted = walNum.toFixed(6);

  // Format USD amount
  const usdFormatted = usdValue !== null ? `$${usdValue.toFixed(2)}` : null;

  if (isLoading || usdValue === null) {
    // Show WAL only while loading
    return <span className={className}>{walFormatted} WAL</span>;
  }

  if (showUsdFirst) {
    return (
      <span className={className}>
        {usdFormatted} <span className="text-text-muted">({walFormatted} WAL)</span>
      </span>
    );
  }

  return (
    <span className={className}>
      {walFormatted} WAL <span className="text-text-muted">(~{usdFormatted})</span>
    </span>
  );
}

/**
 * Simple component that just displays formatted price if data is already available
 */
export function FormattedPrice({
  formattedTotal,
  className = '',
}: {
  formattedTotal: string;
  className?: string;
}) {
  return <span className={className}>{formattedTotal}</span>;
}
