'use client';

/**
 * Chain Selector Component
 * Shows wallet options for multiple blockchains
 * Active chains: Sui, IOTA
 * Coming soon: Solana, Ethereum, BNB Chain, Base, Tron, Monad, Hyperliquid, Avalanche
 */

import { useState, useEffect, useMemo } from 'react';
import { useWalletContext } from '@/lib/context/WalletContext';
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
import { ConnectButton as SuiConnectButton, useSuiClientQuery } from '@mysten/dapp-kit';
// IOTA disabled - using Sui/Walrus only
// import { ConnectButton as IotaConnectButton } from '@iota/dapp-kit';
// import { useDisconnectWallet as useIotaDisconnect } from '@iota/dapp-kit';
import { useDisconnectWallet as useSuiDisconnect } from '@mysten/dapp-kit';

// Chain Icons
const SuiIcon = () => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    role="img"
    viewBox="0 0 24 24"
    className="h-5 w-5 text-blue-600"
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.636 10.009a7.16 7.16 0 0 1 1.565 4.474 7.2 7.2 0 0 1-1.608 4.53l-.087.106-.023-.135a7 7 0 0 0-.07-.349c-.502-2.21-2.142-4.106-4.84-5.642-1.823-1.034-2.866-2.278-3.14-3.693-.177-.915-.046-1.834.209-2.62.254-.787.631-1.446.953-1.843l1.05-1.284a.46.46 0 0 1 .713 0l5.28 6.456zm1.66-1.283L12.26.123a.336.336 0 0 0-.52 0L4.704 8.726l-.023.029a9.33 9.33 0 0 0-2.07 5.872C2.612 19.803 6.816 24 12 24s9.388-4.197 9.388-9.373a9.32 9.32 0 0 0-2.07-5.871zM6.389 9.981l.63-.77.018.142q.023.17.055.34c.408 2.136 1.862 3.917 4.294 5.297 2.114 1.203 3.345 2.586 3.7 4.103a5.3 5.3 0 0 1 .109 1.801l-.004.034-.03.014A7.2 7.2 0 0 1 12 21.67c-3.976 0-7.2-3.218-7.2-7.188 0-1.705.594-3.27 1.587-4.503z" />
  </svg>
);

const SolanaIcon = () => {
  const gradientId = useMemo(() => `solana-gradient-${Math.random().toString(36).substring(2, 11)}`, []);

  return (
    <svg viewBox="0 0 508.07 398.17" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient
          id={`${gradientId}-1`}
          x1="0.908"
          y1="0.2"
          x2="0.358"
          y2="1.364"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#00ffa3" />
          <stop offset="1" stopColor="#dc1fff" />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-2`}
          x1="0.668"
          y1="0.087"
          x2="0.117"
          y2="1.464"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#00ffa3" />
          <stop offset="1" stopColor="#dc1fff" />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-3`}
          x1="0.787"
          y1="0.169"
          x2="0.237"
          y2="1.545"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#00ffa3" />
          <stop offset="1" stopColor="#dc1fff" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId}-1)`}
        d="M84.53,358.89A16.63,16.63,0,0,1,96.28,354H501.73a8.3,8.3,0,0,1,5.87,14.18l-80.09,80.09a16.61,16.61,0,0,1-11.75,4.86H10.31A8.31,8.31,0,0,1,4.43,439Z"
        transform="translate(-1.98 -55)"
      />
      <path
        fill={`url(#${gradientId}-2)`}
        d="M84.53,59.85A17.08,17.08,0,0,1,96.28,55H501.73a8.3,8.3,0,0,1,5.87,14.18l-80.09,80.09a16.61,16.61,0,0,1-11.75,4.86H10.31A8.31,8.31,0,0,1,4.43,140Z"
        transform="translate(-1.98 -55)"
      />
      <path
        fill={`url(#${gradientId}-3)`}
        d="M427.51,208.42a16.61,16.61,0,0,0-11.75-4.86H10.31a8.31,8.31,0,0,0-5.88,14.18l80.1,80.09a16.6,16.6,0,0,0,11.75,4.86H501.73a8.3,8.3,0,0,0,5.87-14.18Z"
        transform="translate(-1.98 -55)"
      />
    </svg>
  );
};

const IotaIcon = () => (
  <svg
    stroke="currentColor"
    fill="currentColor"
    strokeWidth="0"
    role="img"
    viewBox="0 0 24 24"
    className="h-5 w-5 text-black"
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z" />
  </svg>
);

const EthereumIcon = () => (
  <svg
    viewBox="0 0 256 417"
    className="h-5 w-5"
    preserveAspectRatio="xMidYMid"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#343434"
      d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"
    />
    <path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z" />
    <path
      fill="#3C3C3B"
      d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"
    />
    <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z" />
    <path fill="#141414" d="M127.961 287.958l127.96-75.637-127.96-58.162z" />
    <path fill="#393939" d="M0 212.32l127.96 75.638v-133.8z" />
  </svg>
);

// Placeholder icons for new chains - can be replaced with actual logos
const BNBIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="12" fill="#F3BA2F" />
    <path
      fill="white"
      d="M12 4.5l2.5 2.5L12 9.5 9.5 7 12 4.5zm-5 5l2.5 2.5L7 14.5 4.5 12 7 9.5zm10 0l2.5 2.5L17 14.5 14.5 12 17 9.5zM12 14.5l2.5 2.5L12 19.5 9.5 17 12 14.5zm0-2.5l2.5-2.5L12 7 9.5 9.5 12 12z"
    />
  </svg>
);

const BaseIcon = () => (
  <img
    src="https://i.imgur.com/Jgwmt2p.png"
    alt="Base"
    className="h-5 w-5 object-contain"
  />
);

const TronIcon = () => (
  <img
    src="https://i.imgur.com/hzf7OzH.png"
    alt="Tron"
    className="h-5 w-5 object-contain"
  />
);

const MonadIcon = () => (
  <img
    src="https://i.imgur.com/dBRUsNN.png"
    alt="Monad"
    className="h-5 w-5 object-contain"
  />
);

const HyperliquidIcon = () => (
  <img
    src="https://i.imgur.com/3tsuV5X.png"
    alt="Hyperliquid"
    className="h-5 w-5 object-contain"
  />
);

const AvalancheIcon = () => (
  <img
    src="https://i.imgur.com/rm28hPd.png"
    alt="Avalanche"
    className="h-5 w-5 object-contain"
  />
);

interface ChainSelectorProps {
  isTransparent?: boolean;
}

export function ChainSelector({ isTransparent = false }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const { chain, address, isConnected } = useWalletContext();
  const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();

  const { mutate: disconnectSui } = useSuiDisconnect();
  // IOTA disabled - using Sui/Walrus only
  // const { mutate: disconnectIota } = useIotaDisconnect();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const disconnectIota = null as (() => void) | null;

  // Handle custom button clicks to trigger actual connect buttons
  useEffect(() => {
    const handleSuiClick = () => {
      const actualButton = document.querySelector('.sui-connect-wrapper .hidden button') as HTMLButtonElement;
      if (actualButton) actualButton.click();
    };

    const handleIotaClick = () => {
      const actualButton = document.querySelector('.iota-connect-wrapper .hidden button') as HTMLButtonElement;
      if (actualButton) actualButton.click();
    };

    const suiButton = document.querySelector('.sui-connect-wrapper .wallet-chain-button[data-chain="sui"]');
    const iotaButton = document.querySelector('.iota-connect-wrapper .wallet-chain-button[data-chain="iota"]');

    if (suiButton) {
      suiButton.addEventListener('click', handleSuiClick);
    }
    if (iotaButton) {
      iotaButton.addEventListener('click', handleIotaClick);
    }

    return () => {
      if (suiButton) {
        suiButton.removeEventListener('click', handleSuiClick);
      }
      if (iotaButton) {
        iotaButton.removeEventListener('click', handleIotaClick);
      }
    };
  }, [isOpen]);

  // Get current wallet based on network
  const currentWallet = network === 'sui' ? suiWallet : network === 'iota' ? iotaWallet : null;
  const walletName = currentWallet?.name || 'Unknown Wallet';

  // Fetch SuiNS name for Sui addresses (reverse resolution)
  const { data: suinsData } = useSuiClientQuery(
    'resolveNameServiceNames',
    { address: address || '' },
    {
      enabled: !!address && chain === 'sui',
      refetchOnWindowFocus: false,
    }
  );

  // Extract the first SuiNS name from the result
  const suinsName = suinsData?.data?.[0] || null;

  // Debug logging
  useEffect(() => {
    console.log('[ChainSelector] Wallet state:', {
      network,
      chain,
      address,
      isConnected,
      suiWallet: suiWallet?.name,
      iotaWallet: iotaWallet?.name,
      currentWallet: walletName,
      suinsName,
      suinsData,
    });
  }, [network, chain, address, isConnected, suiWallet, iotaWallet, walletName, suinsName, suinsData]);

  const handleDisconnect = () => {
    console.log('[ChainSelector] Disconnecting wallet:', {
      network,
      chain,
      walletName,
    });

    // Cast to allow IOTA branch to compile (IOTA is currently disabled but code kept for future)
    const currentChain = chain as typeof chain | 'iota';
    const currentNetwork = network as typeof network | 'iota';

    if (currentChain === 'sui' || currentNetwork === 'sui') {
      console.log('[ChainSelector] Disconnecting Sui wallet');
      disconnectSui();
    } else if (currentChain === 'iota' || currentNetwork === 'iota') {
      console.log('[ChainSelector] Disconnecting IOTA wallet');
      if (disconnectIota) {
        disconnectIota();
      }
    }
    setIsOpen(false);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Get display address: SuiNS name > formatted address
  const getDisplayAddress = () => {
    if (chain === 'sui' && suinsName) {
      // Remove .sui suffix and add @ prefix
      const nameWithoutSuffix = suinsName.replace('.sui', '');
      return `@${nameWithoutSuffix}`;
    }
    return address ? formatAddress(address) : '';
  };

  const getChainDisplayName = (c: 'sui' | 'iota') => {
    return c === 'sui' ? 'Sui' : 'IOTA';
  };

  const getChainIcon = (c: 'sui' | 'iota') => {
    if (c === 'sui') {
      return <SuiIcon />;
    } else {
      return <IotaIcon />;
    }
  };

  // If connected, show connected state
  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 h-14 px-6 font-bold rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all ${
            isTransparent
              ? 'bg-white/20 text-white border-[3px] border-black'
              : 'bg-white text-black outline outline-[3px] outline-black'
          }`}
        >
          {getChainIcon(chain!)}
          <span className={`text-base ${isTransparent ? 'text-white' : 'text-black'}`}>{getDisplayAddress()}</span>
        </button>

        {isOpen && (
          <>
            {/* Transparent backdrop for click-outside-to-close */}
            <div
              className="fixed inset-0 bg-transparent z-[99998]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown - positioned below button */}
            <div className="absolute top-[calc(100%+8px)] right-0 w-64 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black z-[99999] overflow-hidden">
              <div className="p-3">
                {/* Wallet Name */}
                <div className="px-2 py-1 mb-2">
                  <div className="text-xs text-gray-500 mb-0.5">Connected Wallet</div>
                  <div className="text-sm font-bold text-black flex items-center gap-2">
                    {getChainIcon(chain!)}
                    {walletName}
                  </div>
                </div>

                {/* SuiNS Name (if available) */}
                {chain === 'sui' && suinsName && (
                  <div className="px-2 py-1 mb-2">
                    <div className="text-xs text-gray-500 mb-0.5">SuiNS Name</div>
                    <div className="text-sm font-bold text-blue-600">
                      {suinsName}
                    </div>
                  </div>
                )}

                {/* Address (Click to Copy) */}
                <button
                  onClick={handleCopyAddress}
                  className="w-full text-left hover:bg-gray-50 rounded-lg p-2 transition-colors group flex items-center justify-between"
                  title="Click to copy address"
                >
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {getChainDisplayName(chain!)} Address
                    </div>
                    <div className="font-mono text-xs text-black group-hover:text-blue-600">
                      {formatAddress(address)}
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>

              <div className="border-t border-gray-200">
                <button
                  onClick={handleDisconnect}
                  className="w-full px-3 py-2 text-left hover:bg-red-50 text-sm font-semibold text-red-600 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Toast Notification */}
            {showCopied && (
              <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-[100] animate-fade-in">
                Address copied!
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Not connected - show both wallet options immediately
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-14 px-6 font-bold rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all whitespace-nowrap flex items-center justify-center ${
          isTransparent
            ? 'bg-white/20 text-white border-[3px] border-black'
            : 'bg-white text-black outline outline-[3px] outline-black'
        }`}
      >
        Connect Wallet
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 z-[99998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Wallet Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] bg-white rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1.00)] border-[3px] border-black z-[99999] overflow-hidden flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors z-10"
            >
              <svg
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="p-8 overflow-y-auto">
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-black mb-2 font-['Outfit']">
                  Select Blockchain
                </h3>
                <p className="text-sm text-black/70 font-['Outfit']">
                  Choose a blockchain to connect your wallet. You can only connect to one chain at a time.
                </p>
              </div>

              {/* Blockchain Options */}
              <div className="space-y-3">
                {/* Sui */}
                <div className="sui-connect-wrapper">
                  <button className="wallet-chain-button" data-chain="sui">
                    <SuiIcon />
                    <div className="flex-1 text-left">
                      <div className="text-black text-base font-semibold font-['Outfit']">Sui</div>
                      <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Sui wallets</div>
                    </div>
                  </button>
                  <div className="hidden">
                    <SuiConnectButton />
                  </div>
                </div>

                {/* IOTA */}
                <div className="iota-connect-wrapper">
                  <button className="wallet-chain-button" data-chain="iota">
                    <IotaIcon />
                    <div className="flex-1 text-left">
                      <div className="text-black text-base font-semibold font-['Outfit']">IOTA</div>
                      <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect IOTA wallets</div>
                    </div>
                  </button>
                  {/* IOTA disabled - using Sui/Walrus only
                  <div className="hidden">
                    <IotaConnectButton />
                  </div>
                  */}
                </div>

                {/* Solana - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <SolanaIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Solana</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Solana wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* Ethereum - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <EthereumIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Ethereum</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Ethereum wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* BNB - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <BNBIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">BNB Chain</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect BNB Smart Chain wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* Base - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <BaseIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Base</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Base wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* Tron - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <TronIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Tron</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Tron wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* Monad - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <MonadIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Monad</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Monad wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* Hyperliquid - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <HyperliquidIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Hyperliquid</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Hyperliquid wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>

                {/* Avalanche - Coming Soon */}
                <button
                  disabled
                  className="w-full p-4 bg-gray-100 rounded-xl border-[3px] border-gray-300 flex items-center gap-3 cursor-not-allowed opacity-60 relative"
                >
                  <AvalancheIcon />
                  <div className="flex-1 text-left">
                    <div className="text-black text-base font-semibold font-['Outfit']">Avalanche</div>
                    <div className="text-black/60 text-xs font-medium font-['Outfit']">Connect Avalanche wallets</div>
                  </div>
                  <span className="px-2 py-1 bg-black/10 rounded text-black/70 text-xs font-bold font-['Outfit']">
                    Coming Soon
                  </span>
                </button>
              </div>
            </div>
          </div>

          <style jsx global>{`
            .wallet-chain-button {
              width: 100% !important;
              padding: 1rem !important;
              background: white !important;
              color: black !important;
              border: 3px solid black !important;
              border-radius: 0.75rem !important;
              box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 1) !important;
              font-weight: 600 !important;
              font-family: 'Outfit', sans-serif !important;
              transition: all 0.2s !important;
              display: flex !important;
              align-items: center !important;
              gap: 0.75rem !important;
              cursor: pointer !important;
            }

            .wallet-chain-button:hover {
              background: #FFEEE5 !important;
              transform: translateX(1px) translateY(1px) !important;
              box-shadow: 2px 2px 0px 0px rgba(0, 0, 0, 1) !important;
            }

            .sui-connect-wrapper .wallet-chain-button[data-chain="sui"]:active,
            .iota-connect-wrapper .wallet-chain-button[data-chain="iota"]:active {
              transform: translateX(0px) translateY(0px) !important;
              box-shadow: none !important;
            }
          `}</style>
        </>
      )}
    </div>
  );
}
