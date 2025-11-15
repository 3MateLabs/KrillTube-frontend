'use client';

/**
 * Multi-chain wallet connection component
 * Supports Sui and IOTA wallets
 */

import { ChainSelector } from './wallet/ChainSelector';

export function ConnectWallet() {
  return (
    <div className="flex items-center gap-3">
      <ChainSelector />
    </div>
  );
}
