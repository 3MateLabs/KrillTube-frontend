'use client';

import { useNetwork } from '@/contexts/NetworkContext';
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
import { useState, useEffect } from 'react';

export function UploadNetworkSwitcher() {
  const { walrusNetwork, setWalrusNetwork } = useNetwork();
  const { network } = useCurrentWalletMultiChain();
  const [showInfo, setShowInfo] = useState(false);

  // Force testnet when IOTA wallet is connected
  const isIotaWallet = network === 'iota';

  useEffect(() => {
    if (isIotaWallet && walrusNetwork !== 'testnet') {
      console.log('[UploadNetworkSwitcher] IOTA wallet detected, forcing testnet');
      setWalrusNetwork('testnet');
    }
  }, [isIotaWallet, walrusNetwork, setWalrusNetwork]);

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Prevent changing network if IOTA wallet is connected
    if (isIotaWallet) {
      return;
    }
    setWalrusNetwork(e.target.value as 'mainnet' | 'testnet');
  };

  const isMainnet = walrusNetwork === 'mainnet';

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        {/* Network Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="network-select" className="text-sm font-medium font-['Outfit'] text-black/70">
            Storage Network
          </label>
          <div className="relative">
            <select
              id="network-select"
              value={walrusNetwork}
              onChange={handleNetworkChange}
              disabled={isIotaWallet}
              className={`pl-4 pr-10 py-2.5 bg-black rounded-[32px]
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                outline outline-2 outline-offset-[-2px]
                text-white text-base font-semibold font-['Outfit']
                transition-all
                appearance-none bg-no-repeat bg-right
                ${isIotaWallet
                  ? 'opacity-70 cursor-not-allowed'
                  : 'cursor-pointer focus:outline-[3px] focus:outline-krill-orange hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px]'
                }`}
              style={{
                backgroundImage: isIotaWallet
                  ? 'none'  // Hide dropdown arrow when disabled
                  : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23FFF' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 1rem center'
              }}
            >
              {!isIotaWallet && <option value="mainnet">Mainnet</option>}
              <option value="testnet">Testnet</option>
            </select>
            {isIotaWallet && (
              <div className="absolute -right-2 -top-2 px-2 py-0.5 bg-[#1AAACE] rounded-full
                shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
                outline outline-1 outline-offset-[-1px] outline-black">
                <span className="text-white text-xs font-bold font-['Outfit']">IOTA</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost Estimation */}
        <div className="flex items-center gap-2">
          {/* Info Icon */}
          <button
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-full
              bg-white
              shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
              outline outline-1 outline-offset-[-1px] outline-black
              flex items-center justify-center
              hover:shadow-[1px_1px_0_0_black]
              hover:translate-x-[1px] hover:translate-y-[1px]
              transition-all"
            title="Learn more"
          >
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          />

          {/* Modal */}
          <div className="relative max-w-md w-full bg-[#FFEEE5] rounded-[32px]
            shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)]
            outline outline-[3px] outline-offset-[-3px] outline-black">
            <div className="p-6">
              {/* Close Button */}
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full
                  bg-white
                  shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
                  outline outline-1 outline-offset-[-1px] outline-black
                  flex items-center justify-center
                  hover:shadow-[1px_1px_0_0_black]
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  transition-all"
              >
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Header */}
              <h3 className="text-xl font-bold font-['Outfit'] text-black mb-4">
                Storage Networks
              </h3>

              {/* Content */}
              <div className="space-y-4 text-sm font-['Outfit']">
                {/* IOTA Notice */}
                {isIotaWallet && (
                  <div className="p-4 bg-[#1AAACE]/10 rounded-2xl
                    shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                    outline outline-2 outline-offset-[-2px] outline-[#1AAACE]">
                    <h4 className="font-bold text-black mb-2 text-base flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#1AAACE] rounded-full text-white text-xs">IOTA</span>
                      Testnet Only
                    </h4>
                    <p className="text-black/70">
                      IOTA wallets currently only support Walrus testnet. Mainnet support coming soon!
                    </p>
                  </div>
                )}

                {/* Mainnet */}
                <div className="p-4 bg-white rounded-2xl
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                  outline outline-2 outline-offset-[-2px] outline-black">
                  <h4 className="font-bold text-black mb-2 text-base">Mainnet (User Paid)</h4>
                  <ul className="space-y-1 text-black/70 ml-4">
                    <li>• Permanent storage on Walrus</li>
                    <li>• Production-ready reliability</li>
                    <li>• User pays with WAL from their wallet</li>
                    {isIotaWallet && <li className="text-[#1AAACE] font-semibold">• Not available for IOTA wallets yet</li>}
                  </ul>
                </div>

                {/* Testnet */}
                <div className="p-4 bg-white rounded-2xl
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                  outline outline-2 outline-offset-[-2px] outline-[#1AAACE]">
                  <h4 className="font-bold text-black mb-2 text-base">Testnet (Free)</h4>
                  <ul className="space-y-1 text-black/70 ml-4">
                    <li>• Completely free to use</li>
                    <li>• Perfect for testing uploads</li>
                    <li>• Files may be wiped after some time (~100 days)</li>
                    {isIotaWallet && <li className="text-[#1AAACE] font-semibold">• Available for IOTA wallets ✓</li>}
                  </ul>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowInfo(false)}
                className="mt-6 w-full py-3 px-4 bg-[#EF4330] text-white rounded-[32px]
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)]
                  outline outline-2 outline-offset-[-2px] outline-white
                  font-bold font-['Outfit'] text-base
                  hover:shadow-[2px_2px_0_0_black]
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
