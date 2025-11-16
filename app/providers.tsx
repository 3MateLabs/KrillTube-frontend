'use client';

/**
 * Multi-chain wallet providers for Sui and IOTA integration
 * Note: Sui wallet always uses MAINNET, only Walrus storage network switches
 */

import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl as getSuiFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { IotaProvider } from '@/lib/providers/iota-provider';
import { WalletContextProvider } from '@/lib/context/WalletContext';
import '@mysten/dapp-kit/dist/index.css';
import '@iota/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

const suiNetworks = {
  mainnet: { url: getSuiFullnodeUrl('mainnet') },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <SuiClientProvider networks={suiNetworks} defaultNetwork="mainnet">
          <SuiWalletProvider autoConnect={false} storage={localStorage} storageKey="sui-wallet">
            <IotaProvider>
              <WalletContextProvider>
                {children}
              </WalletContextProvider>
            </IotaProvider>
          </SuiWalletProvider>
        </SuiClientProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
