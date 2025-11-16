/**
 * Process Payment for Video Access
 * Uses the tunnel contract's process_payment function for direct payments
 */

import { Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { Transaction as IotaTransaction } from '@iota/iota-sdk/transactions';
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

  // Get config based on network
  const tunnelPackageId = network === 'sui'
    ? process.env.NEXT_PUBLIC_SUI_TUNNEL_PACKAGE_ID!
    : process.env.NEXT_PUBLIC_IOTA_TUNNEL_PACKAGE_ID!;

  // Use custom coin type if provided, otherwise default to dKRILL
  const coinType = customCoinType || (network === 'sui'
    ? process.env.NEXT_PUBLIC_SUI_DEMO_KRILL_COIN!
    : process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN!);

  const rpcUrl = network === 'sui'
    ? process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443'
    : process.env.NEXT_PUBLIC_IOTA_RPC_URL || 'https://api.mainnet.iota.cafe';

  console.log('[processPayment] Config:', { tunnelPackageId, coinType, rpcUrl });

  // Create client based on network to fetch user's dKRILL coins
  const client = network === 'sui'
    ? new SuiClient({ url: rpcUrl })
    : new IotaClient({ url: rpcUrl });

  // Fetch user's dKRILL coin objects
  console.log('[processPayment] Fetching dKRILL coins for user:', userAddress);
  console.log('[processPayment] Network:', network);
  console.log('[processPayment] Coin type:', coinType);
  console.log('[processPayment] RPC URL:', rpcUrl);

  const coinsResponse = await client.getCoins({
    owner: userAddress,
    coinType: coinType,
  });

  console.log('[processPayment] getCoins response:', JSON.stringify(coinsResponse, null, 2));

  const coins = coinsResponse.data;
  console.log({ network, coinsResponse, coinType, userAddress });

  if (!coins || coins.length === 0) {
    console.error('[processPayment] No dKRILL coins found with specific coinType!');

    // Try fetching ALL coins to see what the user has
    console.log('[processPayment] Fetching ALL coins to debug...');
    const allCoinsResponse = await client.getCoins({
      owner: userAddress,
    });
    console.log('[processPayment] All coins:', JSON.stringify(allCoinsResponse, null, 2));

    throw new Error(`No dKRILL coins found. Please mint tokens first.\n\nSearched for: ${coinType}\n\nYou have ${allCoinsResponse.data?.length || 0} total coin(s)`);
  }

  console.log('[processPayment] Found', coins.length, 'dKRILL coin(s)');
  console.log('[processPayment] Using coin:', coins[0].coinObjectId, 'with balance:', coins[0].balance);

  // Build transaction with correct type based on network
  const tx = network === 'sui' ? new SuiTransaction() : new IotaTransaction();
  tx.setSender(userAddress);

  let paymentCoin;

  // Check if paying with native IOTA coin (use tx.gas to avoid gas coin issues)
  const isNativeIota = coinType === '0x2::iota::IOTA';

  if (isNativeIota) {
    // For native IOTA tokens, split from tx.gas (which automatically handles gas + payment)
    console.log('[processPayment] Using native IOTA for payment, splitting from tx.gas');
    [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(paymentAmount)]);
  } else {
    // For custom tokens (like dKRILL), fetch user's coin objects
    const client = new IotaClient({ url: rpcUrl });

    console.log('[processPayment] Fetching custom token coins for user:', userAddress);
    console.log('[processPayment] Network:', network);
    console.log('[processPayment] Coin type:', coinType);
    console.log('[processPayment] RPC URL:', rpcUrl);

    const coinsResponse = await client.getCoins({
      owner: userAddress,
      coinType: coinType,
    });

    console.log('[processPayment] getCoins response:', JSON.stringify(coinsResponse, null, 2));

    const coins = coinsResponse.data;

    if (!coins || coins.length === 0) {
      console.error('[processPayment] No coins found with specific coinType!');

      // Try fetching ALL coins to see what the user has
      console.log('[processPayment] Fetching ALL coins to debug...');
      const allCoinsResponse = await client.getCoins({
        owner: userAddress,
      });
      console.log('[processPayment] All coins:', JSON.stringify(allCoinsResponse, null, 2));

      throw new Error(`No ${coinType} coins found. Please mint tokens first.\n\nSearched for: ${coinType}\n\nYou have ${allCoinsResponse.data?.length || 0} total coin(s)`);
    }

    console.log('[processPayment] Found', coins.length, 'coin(s)');
    console.log('[processPayment] Using coin:', coins[0].coinObjectId, 'with balance:', coins[0].balance);

    // Use the first coin and split the payment amount from it
    [paymentCoin] = tx.splitCoins(
      tx.object(coins[0].coinObjectId),
      [tx.pure.u64(paymentAmount)]
    );
  }

  // Call process_payment function
  // public fun process_payment<T>(
  //     creator_config: &CreatorConfig,
  //     referrer: address,
  //     payment: Coin<T>,
  //     clock: &Clock,
  //     ctx: &mut TxContext,
  // )
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

  console.log('[processPayment] Transaction built, requesting wallet signature...');

  try {
    const result = await signAndExecuteTransaction({ transaction: tx });
    console.log('[processPayment] Payment successful!', result);
    return result.digest;
  } catch (error) {
    console.error('[processPayment] Payment failed:', error);
    throw error;
  }
}
