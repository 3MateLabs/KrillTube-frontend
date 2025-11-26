'use client';

/**
 * Multi-chain wallet connection component
 * Supports Sui and IOTA wallets
 */

import { ChainSelector } from './wallet/ChainSelector';

interface ConnectWalletProps {
  isTransparent?: boolean;
}

export function ConnectWallet({ isTransparent = false }: ConnectWalletProps) {
  return (
    <div className="flex items-center gap-3">
      <ChainSelector isTransparent={isTransparent} />
    </div>
  );
}
