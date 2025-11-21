/**
 * Subscription Service
 *
 * Handles subscription payments and management:
 * - Subscribe to channels with SUI payment
 * - Check subscription status
 * - Query subscription events
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const CLOCK_OBJECT_ID = '0x6';

export interface SubscribeParams {
  channelId: string;
  paymentAmount: string; // in MIST (1 SUI = 10^9 MIST)
}

/**
 * Subscribe to a creator channel
 *
 * Pays the subscription fee and adds user to the channel's ACL
 *
 * @returns Transaction digest
 */
export async function subscribeToChannel(
  packageId: string,
  params: SubscribeParams,
  subscriberKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<string> {
  const tx = new Transaction();

  // Split payment from gas coin
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(params.paymentAmount)]);

  tx.moveCall({
    target: `${packageId}::creator_channel::subscribe_entry`,
    arguments: [tx.object(params.channelId), paymentCoin, tx.object(CLOCK_OBJECT_ID)],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: subscriberKeypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  return result.digest;
}

/**
 * Get all subscription events for a channel
 *
 * Returns list of SubscriberAdded events
 */
export async function getChannelSubscriptionEvents(
  packageId: string,
  channelId: string,
  suiClient: SuiClient
): Promise<
  Array<{
    subscriber: string;
    paymentAmount: string;
    timestamp: string;
  }>
> {
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${packageId}::creator_channel::SubscriberAdded`,
    },
  });

  return events.data
    .filter((event) => {
      const parsedJson = event.parsedJson as any;
      return parsedJson.channel_id === channelId;
    })
    .map((event) => {
      const parsedJson = event.parsedJson as any;
      return {
        subscriber: parsedJson.subscriber,
        paymentAmount: parsedJson.payment_amount,
        timestamp: parsedJson.timestamp,
      };
    });
}

/**
 * Get video access events for a subscriber
 *
 * Returns list of VideoAccessGranted events showing which videos were accessed
 */
export async function getSubscriberAccessEvents(
  packageId: string,
  subscriberAddress: string,
  suiClient: SuiClient
): Promise<
  Array<{
    channelId: string;
    videoId: string;
    timestamp: string;
  }>
> {
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${packageId}::creator_channel::VideoAccessGranted`,
    },
  });

  return events.data
    .filter((event) => {
      const parsedJson = event.parsedJson as any;
      return parsedJson.accessed_by === subscriberAddress;
    })
    .map((event) => {
      const parsedJson = event.parsedJson as any;
      return {
        channelId: parsedJson.channel_id,
        videoId: Buffer.from(parsedJson.video_id).toString('hex'),
        timestamp: parsedJson.timestamp,
      };
    });
}

/**
 * Estimate subscription cost in SUI
 *
 * Converts MIST to SUI for display
 */
export function formatSubscriptionPrice(priceInMist: string): string {
  const sui = parseInt(priceInMist) / 1_000_000_000;
  return `${sui.toFixed(2)} SUI`;
}

/**
 * Convert SUI to MIST for transactions
 */
export function suiToMist(sui: number): string {
  return (sui * 1_000_000_000).toString();
}

/**
 * Get subscriber list for a channel (from on-chain data)
 */
export async function getChannelSubscribers(
  packageId: string,
  channelId: string,
  suiClient: SuiClient
): Promise<string[]> {
  try {
    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: (() => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::creator_channel::get_subscribers`,
          arguments: [tx.object(channelId)],
        });
        return tx;
      })(),
      sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
    });

    if (result.results && result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues[0]) {
        // Parse vector<address> from return value
        // This is a simplified parser - production should use proper BCS deserialization
        const bytes = returnValues[0][0];
        // TODO: Implement proper BCS deserialization for vector<address>
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error('Error getting channel subscribers:', error);
    return [];
  }
}
