'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type WalrusNetwork = 'mainnet' | 'testnet';

interface NetworkConfig {
  walrusPublisher: string;
  walrusAggregator: string;
  useHttpApi: boolean; // Testnet uses HTTP API (free), Mainnet uses wallet SDK
}

interface NetworkContextType {
  walrusNetwork: WalrusNetwork;
  setWalrusNetwork: (network: WalrusNetwork) => void;
  config: NetworkConfig;
}

const walrusConfigs: Record<WalrusNetwork, NetworkConfig> = {
  mainnet: {
    walrusPublisher: '', // No public publisher on mainnet
    walrusAggregator: 'https://aggregator.mainnet.walrus.mirai.cloud',
    useHttpApi: false, // Server uploads to mainnet via HTTP API
  },
  testnet: {
    walrusPublisher: 'https://publisher.walrus-testnet.walrus.space',
    walrusAggregator: 'https://aggregator.walrus-testnet.walrus.space',
    useHttpApi: false, // Server uploads to testnet via HTTP API (completely free for users!)
  },
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to testnet
  const [walrusNetwork, setWalrusNetworkState] = useState<WalrusNetwork>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('walrusNetwork');
      if (stored === 'mainnet' || stored === 'testnet') {
        return stored;
      }
    }
    // Default to testnet
    return 'testnet';
  });

  const setWalrusNetwork = (newNetwork: WalrusNetwork) => {
    setWalrusNetworkState(newNetwork);
    if (typeof window !== 'undefined') {
      localStorage.setItem('walrusNetwork', newNetwork);
      // No page reload needed - only Walrus URLs change, Sui stays on mainnet
    }
  };

  const config = walrusConfigs[walrusNetwork];

  return (
    <NetworkContext.Provider value={{ walrusNetwork, setWalrusNetwork, config }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
