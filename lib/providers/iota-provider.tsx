'use client';

/**
 * IOTA Wallet Provider
 * Wraps @iota/dapp-kit providers for wallet connectivity
 */

import { IotaClientProvider, WalletProvider } from '@iota/dapp-kit';
import { getFullnodeUrl } from '@iota/iota-sdk/client';
import { safeLocalStorage } from '@/lib/utils/storage';

// Network configuration
const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
};

interface IotaProviderProps {
  children: React.ReactNode;
}

export function IotaProvider({ children }: IotaProviderProps) {
  return (
    <IotaClientProvider networks={networks} defaultNetwork="mainnet">
      <WalletProvider autoConnect={true} storage={safeLocalStorage} storageKey="iota-wallet">
        {children}
      </WalletProvider>
    </IotaClientProvider>
  );
}
