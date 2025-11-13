'use client';

/**
 * Modern wallet connection component
 */

import { ConnectButton } from '@mysten/dapp-kit';

export function ConnectWallet() {
  return (
    <div className="wallet-button-wrapper">
      <ConnectButton connectText="Connect Wallet" />

      <style jsx global>{`
        .wallet-button-wrapper button {
          background: transparent !important;
          color: black !important;
          font-weight: 700 !important;
          font-size: 0.875rem !important;
          font-family: 'Outfit', sans-serif !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          width: auto !important;
          height: auto !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

        .wallet-button-wrapper button:hover {
          transform: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        .wallet-button-wrapper button:active {
          transform: none !important;
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
