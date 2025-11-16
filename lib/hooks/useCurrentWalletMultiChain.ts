/**
 * useCurrentWalletMultiChain - Abstracted hook for multi-chain wallet access
 * Returns the current network and respective wallet objects
 */

'use client';

import { useCurrentWallet as useSuiCurrentWallet } from '@mysten/dapp-kit';
import { useCurrentWallet as useIotaCurrentWallet } from '@iota/dapp-kit';
import { useWalletContext } from '@/lib/context/WalletContext';

export type WalletNetwork = 'sui' | 'iota' | null;

export interface MultiChainWalletState {
  network: WalletNetwork;
  suiWallet: ReturnType<typeof useSuiCurrentWallet>['currentWallet'] | null;
  iotaWallet: ReturnType<typeof useIotaCurrentWallet>['currentWallet'] | null;
}

/**
 * Hook to get the current wallet for whichever chain is connected
 *
 * @returns {MultiChainWalletState} Object containing:
 *  - network: 'sui' | 'iota' | null - The currently active network
 *  - suiWallet: Wallet object if Sui is connected, null otherwise
 *  - iotaWallet: Wallet object if IOTA is connected, null otherwise
 *
 * @example
 * ```tsx
 * const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();
 *
 * if (network === 'sui' && suiWallet) {
 *   // Use Sui wallet
 *   console.log('Sui wallet:', suiWallet.name);
 * } else if (network === 'iota' && iotaWallet) {
 *   // Use IOTA wallet
 *   console.log('IOTA wallet:', iotaWallet.name);
 * }
 * ```
 */
export function useCurrentWalletMultiChain(): MultiChainWalletState {
  const { chain } = useWalletContext();
  const { currentWallet: suiWallet } = useSuiCurrentWallet();
  const { currentWallet: iotaWallet } = useIotaCurrentWallet();

  // Determine network based on context and wallet connections
  let network: WalletNetwork = chain;

  // Auto-detect if no active chain is set - default to IOTA
  if (!network) {
    if (iotaWallet) {
      network = 'iota';
    } else if (suiWallet) {
      network = 'sui';
    } else {
      // Default to IOTA even if no wallet is connected
      network = 'iota';
    }
  }

  return {
    network,
    suiWallet: network === 'sui' ? suiWallet : null,
    iotaWallet: network === 'iota' ? iotaWallet : null,
  };
}
