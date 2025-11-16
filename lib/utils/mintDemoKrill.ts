/**
 * Mint Demo KRILL Tokens
 * Utility function to mint demo tokens for testing
 */

import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';

interface MintDemoKrillParams {
  network: 'sui' | 'iota';
  recipientAddress: string;
  signAndExecuteTransaction: (args: { transaction: Transaction }) => Promise<any>;
}

export async function mintDemoKrill({
  network,
  recipientAddress,
  signAndExecuteTransaction,
}: MintDemoKrillParams): Promise<string> {
  console.log('[mintDemoKrill] Starting mint process', { network, recipientAddress });

  // Get config based on network
  const packageId = network === 'sui'
    ? process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN!.split('::')[0]
    : process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN!.split('::')[0];

  const treasuryCapId = network === 'sui'
    ? process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN_TREASURY_CAP_ID!
    : process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN_TREASURY_CAP_ID!;

  console.log('[mintDemoKrill] Config:', { packageId, treasuryCapId });

  // Build transaction to mint 1000 dKRILL
  const tx = new Transaction();

  tx.setSender(recipientAddress);

  // Call the public entry mint function - it should transfer to tx.sender() automatically
  tx.moveCall({
    target: `${packageId}::demo_krill_coin::mint`,
    arguments: [
      tx.object(treasuryCapId),
      tx.pure.u64(1000_000_000), // 1000 dKRILL tokens (assuming 6 decimals)
    ],
  });

  console.log('[mintDemoKrill] Transaction built, requesting wallet signature...');

  try {
    const result = await signAndExecuteTransaction({ transaction: tx });
    console.log('[mintDemoKrill] Mint successful!', result);
    return result.digest;
  } catch (error) {
    console.error('[mintDemoKrill] Mint failed:', error);
    throw error;
  }
}
