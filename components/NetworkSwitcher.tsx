'use client';

import { useNetwork } from '@/contexts/NetworkContext';
import { useState } from 'react';

export function NetworkSwitcher() {
  const { walrusNetwork, setWalrusNetwork } = useNetwork();
  const [showModal, setShowModal] = useState(false);

  const handleSwitch = () => {
    setShowModal(true);
  };

  const confirmSwitch = () => {
    const newNetwork = walrusNetwork === 'mainnet' ? 'testnet' : 'mainnet';
    setWalrusNetwork(newNetwork);
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleSwitch}
        className="group relative flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-background-elevated/80 backdrop-blur-sm hover:bg-background-elevated hover:border-walrus-mint/50 transition-all duration-200"
      >
        {/* Network indicator dot */}
        <div
          className={`w-2 h-2 rounded-full ${
            walrusNetwork === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'
          } animate-pulse`}
        />

        {/* Network text */}
        <span className="text-sm font-medium text-foreground">
          {walrusNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}
        </span>

        {/* Dropdown arrow */}
        <svg
          className="w-4 h-4 text-text-muted group-hover:text-walrus-mint transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative bg-background border border-border/50 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-walrus-mint/10 to-walrus-grape/10 rounded-2xl blur-xl" />

            <div className="relative space-y-4">
              <h3 className="text-xl font-bold text-foreground">
                Switch Walrus to {walrusNetwork === 'mainnet' ? 'Testnet' : 'Mainnet'}?
              </h3>

              <div className="space-y-2 text-sm text-text-muted">
                <p>
                  {walrusNetwork === 'mainnet' ? (
                    <>
                      <strong className="text-yellow-500">Walrus Testnet</strong> is completely free!
                      Server handles all storage costs. Perfect for testing.
                    </>
                  ) : (
                    <>
                      <strong className="text-green-500">Walrus Mainnet</strong> provides
                      permanent storage (server pays storage costs).
                    </>
                  )}
                </p>
                <p className="text-xs opacity-75">
                  {walrusNetwork === 'mainnet' ? (
                    <>💡 Testnet: Free for all users. Files may be wiped anytime. No wallet needed for uploads.</>
                  ) : (
                    <>⚠️ Mainnet: Costs are minimal (1 epoch). Files stored permanently.</>
                  )}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 bg-background-elevated hover:bg-background-hover transition-all text-foreground font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSwitch}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-walrus-mint to-walrus-grape hover:opacity-90 transition-all text-walrus-black font-bold shadow-lg"
                >
                  Switch Network
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
