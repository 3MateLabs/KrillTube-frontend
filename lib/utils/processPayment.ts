/**
 * Process Payment for Video Access
 * Uses the tunnel contract's process_payment function for direct payments
 */

import { coinWithBalance as suiCoinWithBalance, Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { coinWithBalance as iotaCoinWithBalance, Transaction as IotaTransaction } from '@iota/iota-sdk/transactions';
import { SuiClient } from '@mysten/sui/client';
import { IotaClient } from '@iota/iota-sdk/client';

export interface ProcessPaymentParams {
  network: 'sui' | 'iota';
  creatorConfigId: string;
  referrerAddress: string; // Use '0x0' for no referrer
  paymentAmount: number; // In smallest unit (e.g., 0.01 dKRILL = 10_000 with 6 decimals)
  signAndExecuteTransaction: (args: { transaction: SuiTransaction | IotaTransaction }) => Promise<any>;
  userAddress: string;
  coinType?: string; // Optional: Override default coin type (e.g., '0x2::iota::IOTA' for native IOTA)
}

export async function processPayment({
  network,
  creatorConfigId,
  referrerAddress,
  paymentAmount,
  signAndExecuteTransaction,
  userAddress,
  coinType: customCoinType,
}: ProcessPaymentParams): Promise<string> {
  console.log('[processPayment] Starting payment process', {
    network,
    creatorConfigId,
    referrerAddress,
    paymentAmount,
  });

  // Separate flows for SUI and IOTA
  if (network === 'sui') {
    // SUI FLOW
    const tunnelPackageId = process.env.NEXT_PUBLIC_SUI_TUNNEL_PACKAGE_ID!;
    const coinType = customCoinType || process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN!;
    const rpcUrl = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443';

    console.log('[processPayment] SUI Config:', { tunnelPackageId, coinType, rpcUrl });

    const client = new SuiClient({ url: rpcUrl });

    // Fetch user's coins
    console.log('[processPayment] Fetching SUI coins for user:', userAddress);
    const coinsResponse = await client.getCoins({
      owner: userAddress,
      coinType: coinType,
    });

    console.log('[processPayment] getCoins response:', JSON.stringify(coinsResponse, null, 2));

    const coins = coinsResponse.data;
    console.log({ network, coinsResponse, coinType, userAddress });

    if (!coins || coins.length === 0) {
      console.error('[processPayment] No coins found with specific coinType!');

      // Try fetching ALL coins to see what the user has
      console.log('[processPayment] Fetching ALL coins to debug...');
      const allCoinsResponse = await client.getCoins({
        owner: userAddress,
      });
      console.log('[processPayment] All coins:', JSON.stringify(allCoinsResponse, null, 2));

      throw new Error(`No coins found. Please mint tokens first.\n\nSearched for: ${coinType}\n\nYou have ${allCoinsResponse.data?.length || 0} total coin(s)`);
    }

    console.log('[processPayment] Found', coins.length, 'coin(s)');
    console.log('[processPayment] Using coin:', coins[0].coinObjectId, 'with balance:', coins[0].balance);

    // Build SUI transaction
    const tx = new SuiTransaction();
    tx.setSender(userAddress);

    // For SUI, use the coinWithBalance helper
    const paymentCoin = suiCoinWithBalance({
      balance: paymentAmount,
      type: coinType,
      useGasCoin: true
    })(tx);

    tx.moveCall({
      target: `${tunnelPackageId}::tunnel::process_payment`,
      typeArguments: [coinType],
      arguments: [
        tx.object(creatorConfigId), // creator_config: &CreatorConfig
        tx.pure.address(referrerAddress), // referrer: address (use 0x0 for none)
        paymentCoin, // payment: Coin<T>
        tx.object('0x6'), // clock: &Clock (0x6 is the Clock object ID)
      ],
    });

    console.log('[processPayment] SUI transaction built, requesting wallet signature...');

    try {
      const result = await signAndExecuteTransaction({ transaction: tx });
      console.log('[processPayment] SUI payment successful!', result);
      return result.digest;
    } catch (error) {
      console.error('[processPayment] SUI payment failed:', error);
      throw error;
    }
  } else if (network === 'iota') {
    // IOTA FLOW
    const tunnelPackageId = process.env.NEXT_PUBLIC_IOTA_TUNNEL_PACKAGE_ID!;
    const coinType = customCoinType || process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN!;
    const rpcUrl = process.env.NEXT_PUBLIC_IOTA_RPC_URL || 'https://api.mainnet.iota.cafe';

    console.log('[processPayment] IOTA Config:', { tunnelPackageId, coinType, rpcUrl });

    const client = new IotaClient({ url: rpcUrl });

    // Fetch user's coins
    console.log('[processPayment] Fetching IOTA coins for user:', userAddress);
    const coinsResponse = await client.getCoins({
      owner: userAddress,
      coinType: coinType,
    });

    console.log('[processPayment] getCoins response:', JSON.stringify(coinsResponse, null, 2));

    const coins = coinsResponse.data;
    console.log({ network, coinsResponse, coinType, userAddress });

    if (!coins || coins.length === 0) {
      console.error('[processPayment] No coins found with specific coinType!');

      // Try fetching ALL coins to see what the user has
      console.log('[processPayment] Fetching ALL coins to debug...');
      const allCoinsResponse = await client.getCoins({
        owner: userAddress,
      });
      console.log('[processPayment] All coins:', JSON.stringify(allCoinsResponse, null, 2));

      throw new Error(`No coins found. Please mint tokens first.\n\nSearched for: ${coinType}\n\nYou have ${allCoinsResponse.data?.length || 0} total coin(s)`);
    }

    console.log('[processPayment] Found', coins.length, 'coin(s)');
    console.log('[processPayment] Using coin:', coins[0].coinObjectId, 'with balance:', coins[0].balance);

    // Build IOTA transaction
    const tx = new IotaTransaction();
    tx.setSender(userAddress);

    // For IOTA, use the coinWithBalance helper
    const paymentCoin = iotaCoinWithBalance({
      balance: paymentAmount,
      type: coinType,
      useGasCoin: true
    })(tx);

    tx.moveCall({
      target: `${tunnelPackageId}::tunnel::process_payment`,
      typeArguments: [coinType],
      arguments: [
        tx.object(creatorConfigId), // creator_config: &CreatorConfig
        tx.pure.address(referrerAddress), // referrer: address (use 0x0 for none)
        paymentCoin, // payment: Coin<T>
        tx.object('0x6'), // clock: &Clock (0x6 is the Clock object ID)
      ],
    });

    console.log('[processPayment] IOTA transaction built, requesting wallet signature...');

    try {
      const result = await signAndExecuteTransaction({ transaction: tx });
      console.log('[processPayment] IOTA payment successful!', result);
      return result.digest;
    } catch (error) {
      console.error('[processPayment] IOTA payment failed:', error);
      throw error;
    }
  } else {
    // Invalid network
    throw new Error(`Invalid network: ${network}. Must be 'sui' or 'iota'.`);
  }
}
