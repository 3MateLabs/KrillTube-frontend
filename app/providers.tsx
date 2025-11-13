'use client';

/**
 * Wallet providers for Sui integration
 * Note: Sui wallet always uses MAINNET, only Walrus storage network switches
 */

import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { Toaster } from 'react-hot-toast';
import '@mysten/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

const networks = {
  mainnet: { url: getFullnodeUrl('mainnet') },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <SuiClientProvider networks={networks} defaultNetwork="mainnet">
          <WalletProvider autoConnect>
            <Toaster position="top-right" />
            {children}
          </WalletProvider>
        </SuiClientProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
