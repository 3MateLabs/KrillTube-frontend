'use client';

/**
 * Chain Selector Component
 * Shows both Sui and IOTA wallet options in one modal
 */

import { useState } from 'react';
import { useWalletContext } from '@/lib/context/WalletContext';
import { ConnectButton as SuiConnectButton } from '@mysten/dapp-kit';
import { ConnectButton as IotaConnectButton } from '@iota/dapp-kit';
import { useDisconnectWallet as useIotaDisconnect } from '@iota/dapp-kit';
import { useDisconnectWallet as useSuiDisconnect } from '@mysten/dapp-kit';

export function ChainSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const { chain, address, isConnected } = useWalletContext();

  const { mutate: disconnectSui } = useSuiDisconnect();
  const { mutate: disconnectIota } = useIotaDisconnect();

  const handleDisconnect = () => {
    if (chain === 'sui') {
      disconnectSui();
    } else if (chain === 'iota') {
      disconnectIota();
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

  const getChainDisplayName = (c: 'sui' | 'iota') => {
    return c === 'sui' ? 'Sui' : 'IOTA';
  };

  const getChainIcon = (c: 'sui' | 'iota') => {
    if (c === 'sui') {
      return (
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.636 10.009a7.16 7.16 0 0 1 1.565 4.474 7.2 7.2 0 0 1-1.608 4.53l-.087.106-.023-.135a7 7 0 0 0-.07-.349c-.502-2.21-2.142-4.106-4.84-5.642-1.823-1.034-2.866-2.278-3.14-3.693-.177-.915-.046-1.834.209-2.62.254-.787.631-1.446.953-1.843l1.05-1.284a.46.46 0 0 1 .713 0l5.28 6.456zm1.66-1.283L12.26.123a.336.336 0 0 0-.52 0L4.704 8.726l-.023.029a9.33 9.33 0 0 0-2.07 5.872C2.612 19.803 6.816 24 12 24s9.388-4.197 9.388-9.373a9.32 9.32 0 0 0-2.07-5.871zM6.389 9.981l.63-.77.018.142q.023.17.055.34c.408 2.136 1.862 3.917 4.294 5.297 2.114 1.203 3.345 2.586 3.7 4.103a5.3 5.3 0 0 1 .109 1.801l-.004.034-.03.014A7.2 7.2 0 0 1 12 21.67c-3.976 0-7.2-3.218-7.2-7.188 0-1.705.594-3.27 1.587-4.503z"></path>
        </svg>
      );
    } else {
      return (
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" role="img" viewBox="0 0 24 24" className="h-4 w-4 text-black" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.4459 18.8235a.7393.7393 0 10-.7417-.7393.7401.7401 0 00.7417.7393zm9.1863 2.218a1.1578 1.1578 0 10-1.1602-1.1578 1.1586 1.1586 0 001.1602 1.1578zm-4.3951.392a.9858.9858 0 10-.9882-.9849.9866.9866 0 00.9882.985zm2.494 2.07a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm-4.5448-.3944a.9858.9858 0 10-.9873-.985.9866.9866 0 00.9873.985zm-1.7035-2.1676a.8625.8625 0 10-.8649-.8601.8633.8633 0 00.865.8601zm2.0492-1.6747a.8625.8625 0 10-.8634-.8657.8641.8641 0 00.8634.8657zm3.631-.296a.9858.9858 0 10-.9882-.985.9866.9866 0 00.9882.985zm-1.729-2.1428a.8625.8625 0 10-.8634-.8625.8641.8641 0 00.8633.8625zm-2.939.32a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7394zm-2.5188-.32a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm-.0248-1.7003a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm2.0995.0248a.6161.6161 0 10-.6169-.616.6169.6169 0 00.617.616zm2.37-.4672a.7393.7393 0 10-.74-.7394.741.741 0 00.74.7394zm-.4688-1.9708a.6161.6161 0 10-.617-.616.6169.6169 0 00.617.616zm-1.9508.7386a.5417.5417 0 10-.544-.5417.5425.5425 0 00.544.5417zm-1.7779.2216a.4433.4433 0 10-.4448-.4433.4449.4449 0 00.4448.4433zm2.4452-6.5515a.8625.8625 0 10-.8649-.8625.8633.8633 0 00.865.8625zm2.2468-.0256a.7393.7393 0 10-.7409-.7385.7401.7401 0 00.741.7385zm-.42-2.61a.7393.7393 0 10-.741-.7394.741.741 0 00.741.7394zm-2.2468-.0008a.8625.8625 0 10-.865-.8618.8633.8633 0 00.865.8618zm-2.618.5913a.9858.9858 0 10-.9898-.985.9858.9858 0 00.9897.985zm.4192 2.6116a.9858.9858 0 10-.9874-.9858.9874.9874 0 00.9874.9858zM3.1861 9.093a1.1578 1.1578 0 10-1.161-1.1578 1.1594 1.1594 0 001.161 1.1578zm-1.8035 5.2465A1.3794 1.3794 0 100 12.9602a1.381 1.381 0 001.3826 1.3794zm2.9637-2.3644a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm2.8653-1.4034a.9858.9858 0 10-.9882-.9858.9866.9866 0 00.9882.9858zm2.6172-.5921a.8625.8625 0 10-.8673-.8602.8625.8625 0 00.8673.8602zm2.2476.0008a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm.6913-2.4884a.6161.6161 0 10-.6177-.6153.6169.6169 0 00.6177.6153zm-.4192-2.6133a.6161.6161 0 10-.6185-.616.6169.6169 0 00.6185.616zm7.1612 11.4803a.6161.6161 0 10-.6178-.6153.6161.6161 0 00.6178.6153zM13.755 5.599a.5425.5425 0 10-.5433-.5416.5417.5417 0 00.5433.5416zm1.0378.8338a.4433.4433 0 10-.445-.4433.444.444 0 00.445.4433zm-.593 1.7739a.5425.5425 0 10-.5432-.5417.5425.5425 0 00.5433.5417zm-.2712 2.1675a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm.0248 4.6312a.6161.6161 0 10-.6177-.616.6169.6169 0 00.6177.616zm1.6787 1.1818a.5417.5417 0 10-.5433-.5417.5425.5425 0 00.5433.5417zm1.1602 1.281a.4433.4433 0 10-.444-.4433.444.444 0 00.444.4433zm1.309-.3472a.5417.5417 0 10-.5433-.5417.5417.5417 0 00.5433.5417zm-1.0586-1.6971a.6161.6161 0 10-.6177-.6153.6161.6161 0 00.6177.6153zm-1.7074-1.6507a.7393.7393 0 10-.7402-.7393.7401.7401 0 00.7402.7393zm5.5569 1.3802a.7393.7393 0 10-.741-.7393.741.741 0 00.741.7393zm-2.494-.9361a.7393.7393 0 10-.741-.7393.7401.7401 0 00.741.7393zm3.7286-.8378a.8625.8625 0 10-.8642-.8617.8633.8633 0 00.8642.8617zM16.5459 12a.8625.8625 0 10-.8633-.8625.8641.8641 0 00.8634.8625zm3.087.4185a.8625.8625 0 10-.8642-.8618.8633.8633 0 00.8642.8618zm3.383-1.4035a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9873.9857zm-2.4693-.961a.9858.9858 0 10-.9881-.9849.9866.9866 0 00.9881.985zm-3.0869-.4184a.9858.9858 0 10-.9874-.9857.9874.9874 0 00.9874.9857zm3.4822-2.4884a1.1578 1.1578 0 10-1.1602-1.1578 1.1594 1.1594 0 001.1602 1.1578zm-3.087-.4433a1.1578 1.1578 0 10-1.161-1.1578 1.1586 1.1586 0 001.161 1.1578zm1.1603 16.0355a1.3794 1.3794 0 10-1.3827-1.3778 1.3818 1.3818 0 001.3827 1.3778zm-1.5555-19.484a1.3794 1.3794 0 10-1.3834-1.3795 1.3818 1.3818 0 001.3834 1.3795z"></path>
        </svg>
      );
    }
  };

  // If connected, show connected state
  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-[32px] outline outline-[3px] outline-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
        >
          {getChainIcon(chain!)}
          <span className="text-sm text-black">{formatAddress(address)}</span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border-2 border-black z-50 overflow-hidden">
              <div className="p-3">
                <button
                  onClick={handleCopyAddress}
                  className="w-full text-left hover:bg-gray-50 rounded-lg p-2 transition-colors group flex items-center justify-between"
                  title="Click to copy address"
                >
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {getChainDisplayName(chain!)}
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
        className="px-6 py-2 bg-white text-black font-bold rounded-[32px] outline outline-[3px] outline-black hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all whitespace-nowrap"
      >
        Connect Wallet
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Wallet Modal */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border-2 border-black z-50 overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-black">Connect Wallet</h3>

              <div className="space-y-4">
                {/* Sui Wallets */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-black">Sui Wallets</h4>
                  <div className="sui-connect-wrapper">
                    <SuiConnectButton
                      connectText="Connect Sui Wallet"
                    />
                  </div>
                </div>

                {/* IOTA Wallets */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-black">IOTA Wallets</h4>
                  <div className="iota-connect-wrapper">
                    <IotaConnectButton
                      connectText="Connect IOTA Wallet"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx global>{`
            .sui-connect-wrapper button,
            .iota-connect-wrapper button {
              width: 100% !important;
              padding: 0.75rem !important;
              background: white !important;
              color: black !important;
              border: 2px solid black !important;
              border-radius: 0.75rem !important;
              font-weight: 600 !important;
              transition: all 0.2s !important;
            }

            .sui-connect-wrapper button:hover,
            .iota-connect-wrapper button:hover {
              background: #f0f0f0 !important;
            }
          `}</style>
        </>
      )}
    </div>
  );
}
