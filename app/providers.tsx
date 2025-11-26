'use client';

/**
 * Multi-chain wallet providers for Sui and IOTA integration
 * Note: Sui wallet always uses MAINNET, only Walrus storage network switches
 */

import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl as getSuiFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
// IOTA disabled - using Sui/Walrus only
// import { IotaProvider } from '@/lib/providers/iota-provider';
import { WalletContextProvider } from '@/lib/context/WalletContext';
import { safeLocalStorage } from '@/lib/utils/storage';
import '@mysten/dapp-kit/dist/index.css';
// IOTA disabled - using Sui/Walrus only
// import '@iota/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

const suiNetworks = {
  mainnet: { url: getSuiFullnodeUrl('mainnet') },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
          <SuiWalletProvider autoConnect={true} storage={safeLocalStorage} storageKey="sui-wallet">
            {/* IOTA disabled - using Sui/Walrus only */}
            <WalletContextProvider>
              {children}
            </WalletContextProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
