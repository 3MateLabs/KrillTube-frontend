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
        <ConnectButton connectText="Connect Wallet" />
      </div>

      <style jsx global>{`
        .wallet-button-wrapper {
          width: 160px !important;
          min-width: 160px !important;
          max-width: 160px !important;
        }

        .wallet-button-wrapper button {
          background: white !important;
          color: black !important;
          font-weight: 700 !important;
          font-size: 1rem !important;
          padding: 0.5rem 1.5rem !important;
          border-radius: 32px !important;
          border: none !important;
          outline: 3px solid black !important;
          outline-offset: 0px !important;
          transition: all 0.2s ease !important;
          box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 1.00) !important;
          width: 100% !important;
          height: 56px !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

        .wallet-button-wrapper button > * {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          max-width: 100% !important;
        }

        .wallet-button-wrapper button:hover {
          transform: translate(2px, 2px) !important;
          box-shadow: 3px 3px 0 1px rgba(0, 0, 0, 1) !important;
        }

        .wallet-button-wrapper button:active {
          transform: translate(0, 0) !important;
          box-shadow: none !important;
        }

        /* Hide dropdown arrow/icon */
        .wallet-button-wrapper button svg {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
