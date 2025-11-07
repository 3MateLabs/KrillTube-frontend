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
          background: white !important;
          color: black !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          padding: 0.5rem 1.5rem !important;
          border-radius: 32px !important;
          border: 3px solid black !important;
          outline: 3px solid black !important;
          transition: all 0.2s ease !important;
          box-shadow: none !important;
        }

        .wallet-button-wrapper button:hover {
          transform: translate(2px, 2px) !important;
          box-shadow: 3px 3px 0 1px rgba(0, 0, 0, 1) !important;
        }

        .wallet-button-wrapper button:active {
          transform: translate(0, 0) !important;
          box-shadow: none !important;
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
