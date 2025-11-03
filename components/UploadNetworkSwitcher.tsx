'use client';

import { useNetwork } from '@/contexts/NetworkContext';
import { useState } from 'react';

export function UploadNetworkSwitcher() {
  const { walrusNetwork, setWalrusNetwork } = useNetwork();
  const [showInfo, setShowInfo] = useState(false);

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWalrusNetwork(e.target.value as 'mainnet' | 'testnet');
  };

  const isMainnet = walrusNetwork === 'mainnet';

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        {/* Network Selector */}
        <div className="flex items-center gap-3">
          <label htmlFor="network-select" className="text-sm font-medium text-text-muted">
            Storage Network
          </label>
          <select
            id="network-select"
            value={walrusNetwork}
            onChange={handleNetworkChange}
            className="pl-3 pr-8 py-2 bg-background-elevated border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-walrus-mint cursor-pointer appearance-none bg-no-repeat bg-right"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.75rem center'
            }}
          >
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
          </select>
        </div>

        {/* Cost Estimation */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Cost:</span>
          <span className="text-sm font-semibold text-foreground">
            {isMainnet ? 'User Paid' : 'Free'}
          </span>

          {/* Info Icon */}
          <button
            onClick={() => setShowInfo(true)}
            className="p-1 rounded hover:bg-background-elevated transition-colors"
            title="Learn more"
          >
            <svg className="w-4 h-4 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowInfo(false)}
          />

          {/* Modal */}
          <div className="relative max-w-md w-full bg-background border border-border rounded-lg shadow-lg">
            <div className="p-6">
              {/* Close Button */}
              <button
                onClick={() => setShowInfo(false)}
                className="absolute top-3 right-3 p-1 rounded hover:bg-background-elevated transition-colors text-text-muted"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Header */}
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Storage Networks
              </h3>

              {/* Content */}
              <div className="space-y-4 text-sm">
                {/* Mainnet */}
                <div>
                  <h4 className="font-medium text-foreground mb-2">Mainnet (User Paid)</h4>
                  <ul className="space-y-1 text-text-muted ml-4">
                    <li>• Permanent storage on Walrus</li>
                    <li>• Production-ready reliability</li>
                    <li>• User pays with WAL from their wallet</li>
                  </ul>
                </div>

                {/* Testnet */}
                <div>
                  <h4 className="font-medium text-foreground mb-2">Testnet (Free)</h4>
                  <ul className="space-y-1 text-text-muted ml-4">
                    <li>• Completely free to use</li>
                    <li>• Perfect for testing uploads</li>
                    <li>• Files may be wiped after some time (~100 days)</li>
                  </ul>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowInfo(false)}
                className="mt-6 w-full py-2 px-4 bg-background-elevated hover:bg-background-hover border border-border rounded-lg text-foreground font-medium transition-colors"
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
