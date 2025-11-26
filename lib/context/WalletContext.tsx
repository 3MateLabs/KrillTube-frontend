'use client';

/**
 * Multi-Chain Wallet Context
 * Abstracts wallet connection for Sui and IOTA chains
 * Based on walrus-platform pattern
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useCurrentAccount as useSuiAccount } from '@mysten/dapp-kit';
// IOTA disabled - using Sui/Walrus only
// import { useCurrentAccount as useIotaAccount } from '@iota/dapp-kit';

export type SupportedChain = 'sui' | 'iota';

interface WalletState {
  chain: SupportedChain | null;
  address: string | null;
  isConnected: boolean;
}

interface WalletContextType extends WalletState {
  setActiveChain: (chain: SupportedChain) => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [activeChain, setActiveChainState] = useState<SupportedChain | null>(null);

  // Get connected accounts from both chains
  const suiAccount = useSuiAccount();
  // IOTA disabled - using Sui/Walrus only
  // const iotaAccount = useIotaAccount();
  const iotaAccount = null as { address: string } | null;

  // Determine current wallet state based on active chain
  const getWalletState = useCallback((): WalletState => {
    if (activeChain === 'sui' && suiAccount?.address) {
      return {
        chain: 'sui',
        address: suiAccount.address,
        isConnected: true,
      };
    }

    if (activeChain === 'iota' && iotaAccount?.address) {
      return {
        chain: 'iota',
        address: iotaAccount.address,
        isConnected: true,
      };
    }

    // Auto-detect if no active chain is set - prioritize IOTA
    if (!activeChain) {
      if (iotaAccount?.address) {
        return {
          chain: 'iota',
          address: iotaAccount.address,
          isConnected: true,
        };
      }
      if (suiAccount?.address) {
        return {
          chain: 'sui',
          address: suiAccount.address,
          isConnected: true,
        };
      }
    }

    return {
      chain: null,
      address: null,
      isConnected: false,
    };
  }, [activeChain, suiAccount, iotaAccount]);

  const setActiveChain = useCallback((chain: SupportedChain) => {
    setActiveChainState(chain);
  }, []);

  const disconnect = useCallback(() => {
    setActiveChainState(null);
  }, []);

  const state = getWalletState();

  const value: WalletContextType = {
    ...state,
    setActiveChain,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within WalletContextProvider');
  }
  return context;
}
