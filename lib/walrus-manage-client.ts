'use client';

/**
 * Client-side Walrus blob management (extend/delete)
 * Uses @mysten/walrus SDK which includes WASM - browser only!
 */

import { SuiClient } from '@mysten/sui/client';
import { walrus, WalrusClient } from '@mysten/walrus';
import { Transaction } from '@mysten/sui/transactions';

const NETWORK = 'mainnet';

export interface BlobMetadata {
  blobObjectId: string;
  blobId: string;
  endEpoch: number;
  size: number;
  deletable: boolean;
}

export interface ExtendCost {
  costMist: string;
  costWal: string;
  durationDays: number;
}

/**
 * Get blob metadata from blockchain
 */
export async function getBlobMetadata(
  blobObjectId: string
): Promise<BlobMetadata> {
  const suiClient = new SuiClient({
    url: 'https://fullnode.mainnet.sui.io:443',
  });

  const blobObject = await suiClient.getObject({
    id: blobObjectId,
    options: { showContent: true },
  });

  if (!blobObject.data?.content || blobObject.data.content.dataType !== 'moveObject') {
    throw new Error('Invalid blob object');
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
 * Calculate cost to extend blob storage
 */
export async function calculateExtendCost(
  size: number,
  epochs: number
): Promise<ExtendCost> {
  const suiClient = new SuiClient({
    url: 'https://fullnode.mainnet.sui.io:443',
  });

  const walrusClient = suiClient.$extend(walrus({ network: NETWORK }));

  const { storageCost } = await walrusClient.walrus.storageCost(size, epochs);
  const costWal = Number(storageCost) / 1_000_000_000;

  return {
    costMist: storageCost.toString(),
    costWal: costWal.toFixed(9),
    durationDays: epochs * 14, // Each epoch is ~2 weeks on mainnet
  };
}

/**
 * Extend blob storage duration
 */
export async function extendBlob(
  blobObjectId: string,
  epochs: number,
  signAndExecuteTransaction: (params: {
    transaction: any;
    options?: any;
  }) => Promise<{ digest: string; effects?: any }>,
  walletAddress: string
): Promise<{ digest: string; newEndEpoch: number }> {
  const suiClient = new SuiClient({
    url: 'https://fullnode.mainnet.sui.io:443',
  });

  const walrusClient = suiClient.$extend(walrus({ network: NETWORK }));

  // Get current blob info
  const blobInfo = await getBlobMetadata(blobObjectId);

  console.log('Extending blob:', {
    blobObjectId,
    currentEndEpoch: blobInfo.endEpoch,
    additionalEpochs: epochs,
  });

  // WAL token type
  const WAL_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

  // MAINNET CONSTANTS - Hardcoded to avoid version mismatch
  const MAINNET_SYSTEM_OBJECT_ID = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

  // Get the CURRENT package ID from the System object
  // Don't use blob type - the blob may be from an old package version!
  const systemObjectDetails = await suiClient.getObject({
    id: MAINNET_SYSTEM_OBJECT_ID,
    options: { showContent: true },
  });

  const systemContent = systemObjectDetails.data?.content as any;
  const walrusPackageId = systemContent?.fields?.package_id;

  if (!walrusPackageId) {
    throw new Error('Could not determine Walrus package ID from System object');
  }

  console.log('System Object ID:', MAINNET_SYSTEM_OBJECT_ID);
  console.log('Current Walrus Package ID:', walrusPackageId);
  console.log('System Version:', systemContent?.fields?.version);

  // Calculate cost first
  const { storageCost } = await walrusClient.walrus.storageCost(blobInfo.size, epochs);
  console.log(`Extension will cost: ${Number(storageCost) / 1e9} WAL (${storageCost} MIST)`);

  // Get user's WAL coins
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

  if (Number(primaryCoin.balance) < Number(storageCost)) {
    throw new Error(`Insufficient WAL. Need ${Number(storageCost) / 1e9} WAL, but largest coin has ${Number(primaryCoin.balance) / 1e9} WAL`);
  }

  console.log(`Using WAL coin: ${primaryCoin.coinObjectId} (balance: ${Number(primaryCoin.balance) / 1e9} WAL)`);

  // Build extend transaction DIRECTLY calling the Move contract
  // This avoids the SDK's withWal wrapper that automatically calls coin::destroy_zero
  const tx = new Transaction();

  // CRITICAL: Split the coin to only provide the amount needed
  // The Move function debits from the coin, so we split off exactly what's needed
  const [paymentCoin] = tx.splitCoins(tx.object(primaryCoin.coinObjectId), [storageCost]);

  // Call extend_blob directly on the Walrus system
  // Note: extend_blob takes &mut Coin<WAL>, so it borrows but doesn't consume the coin
  tx.moveCall({
    target: `${walrusPackageId}::system::extend_blob`,
    arguments: [
      tx.object(MAINNET_SYSTEM_OBJECT_ID), // System object (mutable) - hardcoded mainnet
      tx.object(blobObjectId), // Blob object (mutable)
      tx.pure.u32(epochs), // extended_epochs
      paymentCoin, // Payment coin (will be debited but not consumed)
    ],
  });

  // CRITICAL: Transfer the remaining coin back to sender
  // The moveCall borrows &mut Coin but doesn't consume it, so we must transfer it
  tx.transferObjects([paymentCoin], walletAddress);

  // Set gas budget for Walrus operations (complex transactions need more gas)
  tx.setGasBudget(100_000_000); // 0.1 SUI

  // Sign and execute
  console.log('Requesting wallet signature for extend...');
  const result = await signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
    },
  });

  console.log('Extend transaction:', result.digest);

  // Wait for transaction
  await suiClient.waitForTransaction({
    digest: result.digest,
    options: { showEffects: true },
  });

  // Calculate new end epoch
  const newEndEpoch = blobInfo.endEpoch + epochs;

  return {
    digest: result.digest,
    newEndEpoch,
  };
}

/**
 * Delete a deletable blob and reclaim storage rebate
 */
export async function deleteBlob(
  blobObjectId: string,
  signAndExecuteTransaction: (params: {
    transaction: any;
    options?: any;
  }) => Promise<{ digest: string; effects?: any }>,
  walletAddress: string
): Promise<{ digest: string }> {
  const suiClient = new SuiClient({
    url: 'https://fullnode.mainnet.sui.io:443',
  });

  const walrusClient = suiClient.$extend(walrus({ network: NETWORK }));

  // Verify blob is deletable
  const blobInfo = await getBlobMetadata(blobObjectId);

  if (!blobInfo.deletable) {
    throw new Error('Blob is not deletable. Only blobs created with deletable=true can be deleted.');
  }

  console.log('Deleting blob:', {
    blobObjectId,
    blobId: blobInfo.blobId,
    size: blobInfo.size,
  });

  // Build delete transaction - storage rebate goes to owner
  const tx = new Transaction();
  walrusClient.walrus.deleteBlobTransaction({
    transaction: tx,
    blobObjectId,
    owner: walletAddress, // Storage rebate will be returned to this address
  });

  // Set gas budget for Walrus operations
  tx.setGasBudget(100_000_000); // 0.1 SUI

  // Sign and execute
  console.log('Requesting wallet signature for delete...');
  const result = await signAndExecuteTransaction({
    transaction: tx,
    options: {
      showEffects: true,
    },
  });

  console.log('Delete transaction:', result.digest);

  // Wait for transaction
  await suiClient.waitForTransaction({
    digest: result.digest,
    options: { showEffects: true },
  });

  return {
    digest: result.digest,
  };
}
