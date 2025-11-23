/**
 * Creator Channel Service
 *
 * Manages creator channel operations on Sui blockchain:
 * - Create channels
 * - Update channel settings
 * - Add/remove subscribers
 * - Query channel data
 */

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const CLOCK_OBJECT_ID = '0x6';

export interface ChannelData {
  id: string;
  creator: string;
  name: string;
  description: string;
  subscriptionPrice: string;
  totalVideos: string;
  subscriberCount: string;
  createdAt: string;
}

export interface CreateChannelParams {
  name: string;
  description: string;
  subscriptionPrice: string; // in MIST (1 SUI = 10^9 MIST)
}

/**
 * Create a new creator channel on-chain
 *
 * @returns Channel ID and capability object ID
 */
export async function createChannel(
  packageId: string,
  params: CreateChannelParams,
  creatorKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<{
  channelId: string;
  capId: string;
  digest: string;
}> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::creator_channel::create_channel_entry`,
    arguments: [
      tx.pure.string(params.name),
      tx.pure.string(params.description),
      tx.pure.u64(params.subscriptionPrice),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: creatorKeypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showEvents: true,
    },
  });

  // Find the CreatorChannel object
  const channelObject = result.objectChanges?.find(
    (change) =>
      change.type === 'created' &&
      'objectType' in change &&
      change.objectType?.includes('::creator_channel::CreatorChannel')
  );

  // Find the ChannelCap object
  const capObject = result.objectChanges?.find(
    (change) =>
      change.type === 'created' &&
      'objectType' in change &&
      change.objectType?.includes('::creator_channel::ChannelCap')
  );

  if (!channelObject || !('objectId' in channelObject)) {
    throw new Error('Failed to create channel - channel object not found');
  }

  if (!capObject || !('objectId' in capObject)) {
    throw new Error('Failed to create channel - capability not found');
  }

  return {
    channelId: channelObject.objectId,
    capId: capObject.objectId,
    digest: result.digest,
  };
}

/**
 * Get channel data from blockchain
 */
export async function getChannelData(
  channelId: string,
  suiClient: SuiClient
): Promise<ChannelData> {
  const object = await suiClient.getObject({
    id: channelId,
    options: {
      showContent: true,
    },
  });

  if (!object.data || !object.data.content || object.data.content.dataType !== 'moveObject') {
    throw new Error('Channel not found or invalid data');
  }

  const fields = object.data.content.fields as any;

  return {
    id: channelId,
    creator: fields.creator,
    name: fields.name,
    description: fields.description,
    subscriptionPrice: fields.subscription_price,
    totalVideos: fields.total_videos,
    subscriberCount: fields.subscribers?.fields?.size || '0',
    createdAt: fields.created_at,
  };
}

/**
 * Check if an address is subscribed to a channel
 */
export async function isSubscribed(
  packageId: string,
  channelId: string,
  userAddress: string,
  suiClient: SuiClient
): Promise<boolean> {
  try {
    const result = await suiClient.devInspectTransactionBlock({
      transactionBlock: (() => {
        const tx = new Transaction();
        tx.moveCall({
          target: `${packageId}::creator_channel::is_subscribed`,
          arguments: [tx.object(channelId), tx.pure.address(userAddress)],
        });
        return tx;
      })(),
      sender: userAddress,
    });

    if (result.results && result.results[0]) {
      const returnValues = result.results[0].returnValues;
      if (returnValues && returnValues[0]) {
        // Parse boolean from return value
        const value = returnValues[0] as any;
        return value[0] === 1;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}

/**
 * Add a subscriber to a channel (creator only, for promotions/gifts)
 */
export async function addSubscriber(
  packageId: string,
  channelId: string,
  capId: string,
  subscriberAddress: string,
  creatorKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::creator_channel::add_subscriber`,
    arguments: [
      tx.object(channelId),
      tx.object(capId),
      tx.pure.address(subscriberAddress),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: creatorKeypair,
  });

  return result.digest;
}

/**
 * Remove a subscriber from a channel (creator only)
 */
export async function removeSubscriber(
  packageId: string,
  channelId: string,
  capId: string,
  subscriberAddress: string,
  creatorKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::creator_channel::remove_subscriber`,
    arguments: [
      tx.object(channelId),
      tx.object(capId),
      tx.pure.address(subscriberAddress),
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: creatorKeypair,
  });

  return result.digest;
}

/**
 * Update channel subscription price
 */
export async function updateChannelPrice(
  packageId: string,
  channelId: string,
  capId: string,
  newPrice: string,
  creatorKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::creator_channel::update_price`,
    arguments: [tx.object(channelId), tx.object(capId), tx.pure.u64(newPrice)],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: creatorKeypair,
  });

  return result.digest;
}

/**
 * Increment video count when creator uploads a new video
 */
export async function incrementVideoCount(
  packageId: string,
  channelId: string,
  capId: string,
  creatorKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<string> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::creator_channel::increment_video_count`,
    arguments: [tx.object(channelId), tx.object(capId)],
  });

  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: creatorKeypair,
  });

  return result.digest;
}
