'use client';

/**
 * Modern wallet connection component
 */

import { ConnectButton } from '@mysten/dapp-kit';

export function ConnectWallet() {
  return (
    <div className="flex items-center gap-3">
      {/* Custom styled wrapper for ConnectButton */}
      <div className="wallet-button-wrapper">
        <ConnectButton />
      </div>

      <style jsx global>{`
        .wallet-button-wrapper button {
          background: linear-gradient(135deg, var(--mint-700) 0%, var(--mint-800) 100%) !important;
          color: var(--walrus-black) !important;
          font-weight: 600 !important;
          font-size: 0.875rem !important;
          padding: 0.625rem 1.25rem !important;
          border-radius: 0.75rem !important;
          border: none !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 4px 12px rgba(151, 240, 229, 0.2) !important;
        }

        .wallet-button-wrapper button:hover {
          transform: scale(1.05) !important;
          box-shadow: 0 6px 20px rgba(151, 240, 229, 0.35) !important;
          background: linear-gradient(135deg, var(--mint-600) 0%, var(--mint-700) 100%) !important;
        }

        .wallet-button-wrapper button:active {
          transform: scale(0.98) !important;
        }

        /* Disconnect button styling */
        .wallet-button-wrapper [role="menu"] button {
          background: transparent !important;
          color: #F7F7F7 !important;
          padding: 0.5rem 1rem !important;
          border-radius: 0.5rem !important;
          box-shadow: none !important;
          font-weight: 500 !important;
        }

        .wallet-button-wrapper [role="menu"] button:hover {
          background: var(--mint-500) !important;
          transform: none !important;
        }

        /* Dropdown menu styling */
        .wallet-button-wrapper [role="menu"] {
          background: var(--background-elevated) !important;
          border: 1px solid var(--border) !important;
          border-radius: 1rem !important;
          padding: 0.5rem !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5) !important;
        }
      `}</style>
    </div>
  );
}
