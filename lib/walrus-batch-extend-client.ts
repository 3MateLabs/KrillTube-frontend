'use client';

/**
 * Client-side batch blob extend using PTBs
 * Uses direct Move calls to batch multiple extend operations in a single transaction
 */

import { SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Transaction } from '@mysten/sui/transactions';

const NETWORK = 'mainnet';
const WAL_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';
const MAINNET_SYSTEM_OBJECT_ID = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

export interface BatchExtendOptions {
  blobObjectIds: string[];
  epochs: number;
  signAndExecuteTransaction: (params: {
    transaction: any;
    options?: any;
  }) => Promise<{ digest: string; effects?: any }>;
  walletAddress: string;
}

export interface BatchExtendResult {
  digest: string;
  blobCount: number;
  totalCostWal: string;
  totalCostMist: string;
  epochs: number;
}

/**
 * Get blob metadata from blockchain
 */
async function getBlobMetadata(suiClient: SuiClient, blobObjectId: string) {
  const blobObject = await suiClient.getObject({
    id: blobObjectId,
    options: { showContent: true },
  });

  if (!blobObject.data?.content || blobObject.data.content.dataType !== 'moveObject') {
    throw new Error(`Invalid blob object: ${blobObjectId}`);
  }

  const fields = blobObject.data.content.fields as any;

  return {
    blobObjectId,
    blobId: fields.blob_id,
    endEpoch: parseInt(fields.storage?.fields?.end_epoch || '0'),
    size: parseInt(fields.size || '0'),
    deletable: fields.deletable,
  };
}

/**
 * Batch extend multiple blobs in a SINGLE PTB transaction
 *
 * This uses Sui's Programmable Transaction Blocks to:
 * - Calculate total cost for all blobs
 * - Split WAL coin ONCE for total amount
 * - Call extend_blob for EACH blob in the SAME transaction
 * - Transfer remaining coin back to sender
 *
 * Benefits:
 * - 1 signature instead of N signatures
 * - 1 gas fee instead of N gas fees
 * - ~10 seconds instead of minutes
 * - Atomic operation (all or nothing)
 */
export async function batchExtendBlobs(
  options: BatchExtendOptions
): Promise<BatchExtendResult> {
  const { blobObjectIds, epochs, signAndExecuteTransaction, walletAddress } = options;

  if (blobObjectIds.length === 0) {
    throw new Error('No blob object IDs provided');
  }

  console.log(`[BatchExtend] Starting batch extend for ${blobObjectIds.length} blobs...`);

  const suiClient = new SuiClient({
    url: 'https://fullnode.mainnet.sui.io:443',
  });

  const walrusClient = suiClient.$extend(walrus({ network: NETWORK }));

  // Step 1: Get current Walrus package ID from System object
  const systemObjectDetails = await suiClient.getObject({
    id: MAINNET_SYSTEM_OBJECT_ID,
    options: { showContent: true },
  });

  const systemContent = systemObjectDetails.data?.content as any;
  const walrusPackageId = systemContent?.fields?.package_id;

  if (!walrusPackageId) {
    throw new Error('Could not determine Walrus package ID from System object');
  }

  console.log('[BatchExtend] System Object ID:', MAINNET_SYSTEM_OBJECT_ID);
  console.log('[BatchExtend] Current Walrus Package ID:', walrusPackageId);

  // Step 2: Fetch metadata for all blobs to get sizes
  console.log('[BatchExtend] Fetching metadata for all blobs...');
  const blobMetadataList = await Promise.all(
    blobObjectIds.map(id => getBlobMetadata(suiClient, id))
  );

  console.log('[BatchExtend] Blob metadata fetched:', {
    count: blobMetadataList.length,
    totalSize: blobMetadataList.reduce((sum, b) => sum + b.size, 0),
  });

  // Step 3: Calculate total cost for ALL blobs
  console.log('[BatchExtend] Calculating total cost...');
  const costPromises = blobMetadataList.map(blob =>
    walrusClient.walrus.storageCost(blob.size, epochs)
  );
  const costs = await Promise.all(costPromises);

  const totalCostMist = costs.reduce((sum, cost) => sum + BigInt(cost.storageCost), BigInt(0));
  const totalCostWal = Number(totalCostMist) / 1e9;

  console.log(`[BatchExtend] Total cost: ${totalCostWal} WAL (${totalCostMist} MIST)`);

  // Step 4: Get user's WAL coins
  const walCoins = await suiClient.getCoins({
    owner: walletAddress,
    coinType: WAL_TYPE,
  });

  if (!walCoins.data || walCoins.data.length === 0) {
    throw new Error('No WAL tokens found. Please acquire WAL tokens to pay for extension.');
  }

  // Sort by balance (largest first) and use the largest coin
  const sortedCoins = walCoins.data.sort((a, b) => Number(b.balance) - Number(a.balance));
  const primaryCoin = sortedCoins[0];

  if (Number(primaryCoin.balance) < Number(totalCostMist)) {
    throw new Error(
      `Insufficient WAL. Need ${totalCostWal} WAL, but largest coin has ${Number(primaryCoin.balance) / 1e9} WAL`
    );
  }

  console.log(`[BatchExtend] Using WAL coin: ${primaryCoin.coinObjectId} (balance: ${Number(primaryCoin.balance) / 1e9} WAL)`);

  // Step 5: Build batch PTB transaction
  console.log('[BatchExtend] Building batch PTB transaction...');
  const tx = new Transaction();

  // Split coin ONCE for total amount needed
  const [paymentCoin] = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [totalCostMist]);

  // Add extend_blob call for EACH blob in the SAME transaction
  for (let i = 0; i < blobMetadataList.length; i++) {
    const blob = blobMetadataList[i];
    console.log(`[BatchExtend] Adding extend call ${i + 1}/${blobMetadataList.length} for blob ${blob.blobObjectId.slice(0, 10)}...`);

    tx.moveCall({
      target: `${walrusPackageId}::system::extend_blob`,
      arguments: [
        tx.object(MAINNET_SYSTEM_OBJECT_ID), // System object (mutable)
        tx.object(blob.blobObjectId), // Blob object (mutable)
        tx.pure.u32(epochs), // extended_epochs
        paymentCoin, // Payment coin (borrowed, not consumed)
      ],
    });
  }

  // Transfer remaining coin back to sender
  tx.transferObjects([paymentCoin], walletAddress);

  // Set gas budget for complex batch operation
  tx.setGasBudget(500_000_000); // 0.5 SUI (higher for batch operations)

  console.log('[BatchExtend] PTB built with', blobMetadataList.length, 'extend calls');
  console.log('[BatchExtend] Requesting wallet signature...');

  // Step 6: Sign and execute
  const result = await signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
    },
  });

  console.log('[BatchExtend] ✅ Batch extend transaction executed:', result.digest);

  // Wait for transaction
  await suiClient.waitForTransaction({
    digest: result.digest,
    options: { showEffects: true },
  });

  return {
    digest: result.digest,
    blobCount: blobObjectIds.length,
    totalCostWal: totalCostWal.toFixed(9),
    totalCostMist: totalCostMist.toString(),
    epochs,
  };
}
