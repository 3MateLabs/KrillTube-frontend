/**
 * SEAL Configuration
 *
 * Configuration for SEAL package and network settings
 */

export const SEAL_CONFIG = {
  // SEAL Package ID - Deployed on Sui Mainnet
  PACKAGE_ID: process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID || '0x0',

  // Sui Network
  NETWORK: (process.env.NEXT_PUBLIC_SUI_NETWORK || 'mainnet') as 'testnet' | 'mainnet',
  RPC_URL: process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443',

  // Server-side operator keypair for channel creation
  OPERATOR_PRIVATE_KEY: process.env.SUI_OPERATOR_PRIVATE_KEY,
} as const;

export const CLOCK_OBJECT_ID = '0x6';

/**
 * Validate SEAL configuration
 */
export function validateSealConfig() {
  if (!SEAL_CONFIG.PACKAGE_ID || SEAL_CONFIG.PACKAGE_ID === '0x0') {
    throw new Error(
      'SEAL_PACKAGE_ID not configured. Please deploy the contract and set NEXT_PUBLIC_SEAL_PACKAGE_ID'
    );
  }

  if (!SEAL_CONFIG.OPERATOR_PRIVATE_KEY) {
    throw new Error('SUI_OPERATOR_PRIVATE_KEY not configured for channel creation');
  }
}

/**
 * Check if SEAL is configured (non-throwing)
 */
export function isSealConfigured(): boolean {
  return !!(
    SEAL_CONFIG.PACKAGE_ID &&
    SEAL_CONFIG.PACKAGE_ID !== '0x0' &&
    SEAL_CONFIG.OPERATOR_PRIVATE_KEY
  );
}
