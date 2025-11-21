/**
 * Process Payment for Video Access
 * Uses the tunnel contract's process_payment function for direct payments
 *
 * IOTA payments are processed on the backend for security
 * SUI payments are still processed on the frontend (for now)
 */

import { coinWithBalance as suiCoinWithBalance, Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { coinWithBalance as iotaCoinWithBalance, Transaction as IotaTransaction } from '@iota/iota-sdk/transactions';
import { SuiClient } from '@mysten/sui/client';
import { IotaClient } from '@iota/iota-sdk/client';
import { createSuiClientWithRateLimitHandling } from '@/lib/suiClientRateLimitSwitch';

export interface ProcessPaymentParams {
  network: 'sui' | 'iota';
  creatorConfigId: string;
  referrerAddress: string; // Use '0x0' for no referrer
  paymentAmount: number; // In smallest unit (e.g., 0.01 dKRILL = 10_000 with 6 decimals)
  signAndExecuteTransaction: (args: { transaction: SuiTransaction | IotaTransaction }) => Promise<any>;
  signTransaction?: (args: { transaction: IotaTransaction }) => Promise<{ transactionBlockBytes: string; signature: string }>;
  userAddress: string;
  coinType?: string; // Optional: Override default coin type (e.g., '0x2::iota::IOTA' for native IOTA)
  videoId: string; // Video ID for backend payment processing
}

export async function processPayment({
  network,
  creatorConfigId,
  referrerAddress,
  paymentAmount,
  signAndExecuteTransaction,
  signTransaction,
  userAddress,
  coinType: customCoinType,
  videoId,
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

    // Use rate-limited SuiClient with automatic RPC endpoint rotation
    const client = createSuiClientWithRateLimitHandling();

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

      // Send transaction digest to backend for verification and recording
      console.log('[processPayment] Sending payment to backend for verification...');
      const backendResponse = await fetch('/api/v1/payment/process-sui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          digest: result.digest,
          videoId,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        console.error('[processPayment] Backend verification failed:', errorData);
        throw new Error(errorData.error || 'Backend payment verification failed');
      }

      const backendData = await backendResponse.json();
      console.log('[processPayment] Payment verified and recorded:', backendData);

      return result.digest;
    } catch (error) {
      console.error('[processPayment] SUI payment failed:', error);
      throw error;
    }
  } else if (network === 'iota') {
    // IOTA FLOW - Build transaction and process via backend
    const tunnelPackageId = process.env.NEXT_PUBLIC_IOTA_TUNNEL_PACKAGE_ID!;
    const coinType = customCoinType || process.env.NEXT_PUBLIC_IOTA_DEMO_KRILL_COIN!;
    const rpcUrl = process.env.NEXT_PUBLIC_IOTA_RPC_URL || 'https://api.mainnet.iota.cafe';

    console.log('[processPayment] IOTA Config:', { tunnelPackageId, coinType, rpcUrl });

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

    console.log('[processPayment] IOTA transaction built, preparing to sign...');

    try {
      let transactionBytes: string;
      let signature: string;

      if (signTransaction) {
        // Use signTransaction hook (signs but doesn't execute)
        console.log('[processPayment] Signing transaction with signTransaction hook...');
        const signResult = await signTransaction({ transaction: tx });
        transactionBytes = signResult.transactionBlockBytes;
        signature = signResult.signature;
      } else {
        // Fallback: build transaction bytes manually
        console.log('[processPayment] Building transaction bytes...');
        const client = new IotaClient({ url: rpcUrl });
        const txBytes = await tx.build({ client });

        // Convert Uint8Array to base64
        const base64Encode = (bytes: Uint8Array): string => {
          const binary = String.fromCharCode(...bytes);
          return btoa(binary);
        };
        transactionBytes = base64Encode(txBytes);

        // Request signature from wallet (this will execute, but we need the signature)
        console.log('[processPayment] Requesting signature from wallet...');
        const result = await signAndExecuteTransaction({ transaction: tx });

        // Extract signature from result
        // Note: This depends on the wallet implementation
        signature = result.signature || '';

        if (!signature) {
          throw new Error('Failed to get signature from wallet. Please use a compatible IOTA wallet.');
        }
      }

      console.log('[processPayment] Transaction signed, sending to backend for execution...');

      // Send to backend for execution and validation
      const response = await fetch('/api/v1/payment/process-iota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionBytes,
          signature,
          videoId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Backend payment processing failed');
      }

      const data = await response.json();
      console.log('[processPayment] IOTA payment processed successfully!', data);

      return data.digest;
    } catch (error) {
      console.error('[processPayment] IOTA payment failed:', error);
      throw error;
    }
  } else {
    // Invalid network
    throw new Error(`Invalid network: ${network}. Must be 'sui' or 'iota'.`);
  }
}
