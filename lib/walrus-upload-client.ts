'use client';

/**
 * Client-side Walrus upload using @mysten/walrus SDK
 * This requires wallet signing and uses WAL tokens from user's wallet
 *
 * Flow:
 * 1. Encode blob client-side
 * 2. Sign transaction to register blob (pays WAL for storage)
 * 3. Upload encoded data to storage nodes
 * 4. Sign transaction to certify blob (pays for write operation)
 */

import { SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Transaction } from '@mysten/sui/transactions';

const NETWORK = 'mainnet';
const WAL_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

export interface WalrusUploadResult {
  blobId: string;
  blobObjectId: string;
  size: number;
  endEpoch: number;
  url: string;
  cost: string; // in WAL
}

export interface UploadProgress {
  step: number;
  totalSteps: number;
  message: string;
}

/**
 * Upload a file to Walrus using wallet signatures
 * User must have WAL tokens in their wallet to pay for storage
 */
export async function uploadWithWallet(
  file: File,
  epochs: number,
  signAndExecuteTransaction: (params: {
    transaction: any;
    options?: any;
  }) => Promise<{ digest: string; effects?: any; objectChanges?: any }>,
  walletAddress: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<WalrusUploadResult> {
  const totalSteps = 6;

  const updateProgress = (step: number, message: string) => {
    if (onProgress) {
      onProgress({ step, totalSteps, message });
    }
    console.log(`[${step}/${totalSteps}] ${message}`);
  };

  try {
    // Create Walrus-enabled client
    const suiClient = new SuiClient({
      url: 'https://fullnode.mainnet.sui.io:443',
    });
    const walrusClient = suiClient.$extend(walrus({ network: NETWORK }));

    // Step 1: Check WAL balance
    updateProgress(1, 'Checking WAL balance...');
    const walCoins = await suiClient.getCoins({
      owner: walletAddress,
      coinType: WAL_TYPE,
    });

    if (!walCoins.data || walCoins.data.length === 0) {
      throw new Error('No WAL tokens found. Please acquire WAL tokens to pay for storage.');
    }

    const totalBalance = walCoins.data.reduce((sum, coin) => sum + Number(coin.balance), 0) / 1e9;
    console.log(`Total WAL Balance: ${totalBalance.toFixed(4)} WAL`);

    // Step 2: Encode the file
    updateProgress(2, 'Encoding file...');
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const encoded = await walrusClient.walrus.encodeBlob(fileBytes);
    console.log(`Encoded blob ID: ${encoded.blobId}`);

    // Step 3: Register blob on-chain (requires signature + WAL payment)
    // SDK will automatically select and consume WAL coins from signer's wallet
    updateProgress(3, 'Creating registration transaction (requires signature)...');
    const registerTx = new Transaction();
    walrusClient.walrus.registerBlobTransaction({
      transaction: registerTx,
      blobId: encoded.blobId,
      rootHash: encoded.rootHash,
      size: fileBytes.length,
      deletable: true,
      epochs,
      owner: walletAddress,
    });

    // Set gas budget for Walrus registration (complex operation)
    registerTx.setGasBudget(200_000_000); // 0.2 SUI

    console.log('Requesting wallet signature for registration...');
    const registerResult = await signAndExecuteTransaction({
      transaction: registerTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log(`Registration TX: ${registerResult.digest}`);

    // Step 4: Get blob object ID from transaction
    updateProgress(4, 'Fetching blob object...');
    const txDetails = await suiClient.waitForTransaction({
      digest: registerResult.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('Transaction object changes:', JSON.stringify(txDetails.objectChanges, null, 2));

    const blobType = await walrusClient.walrus.getBlobType();
    console.log('Looking for blob type:', blobType);

    // Find the created blob object - try multiple approaches
    let blobObject = txDetails.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType === blobType
    ) as { objectId: string } | undefined;

    // If not found, try looking for any created object that looks like a blob
    if (!blobObject) {
      console.log('Blob not found with exact type match, trying alternative search...');
      blobObject = txDetails.objectChanges?.find(
        (obj: any) => obj.type === 'created' && obj.objectType?.includes('::blob::Blob')
      ) as { objectId: string } | undefined;
    }

    if (!blobObject) {
      console.error('Available object changes:', txDetails.objectChanges);
      throw new Error(`Blob object not found in transaction. Expected type: ${blobType}`);
    }

    console.log(`Blob object ID: ${blobObject.objectId}`);

    // Step 5: Upload encoded data to storage nodes
    updateProgress(5, 'Uploading to storage nodes...');
    const confirmations = await walrusClient.walrus.writeEncodedBlobToNodes({
      blobId: encoded.blobId,
      metadata: encoded.metadata,
      sliversByNode: encoded.sliversByNode,
      deletable: true,
      objectId: blobObject.objectId,
    });

    console.log('Upload complete. Confirmations:', confirmations);

    // Step 6: Certify blob on-chain (requires signature + write payment)
    updateProgress(6, 'Creating certification transaction (requires signature)...');
    const certifyTx = new Transaction();
    walrusClient.walrus.certifyBlobTransaction({
      transaction: certifyTx,
      blobId: encoded.blobId,
      blobObjectId: blobObject.objectId,
      confirmations,
      deletable: true,
    });

    // Set gas budget for Walrus certification
    certifyTx.setGasBudget(200_000_000); // 0.2 SUI

    console.log('Requesting wallet signature for certification...');
    const certifyResult = await signAndExecuteTransaction({
      transaction: certifyTx,
      options: {
        showEffects: true,
      },
    });

    console.log(`Certification TX: ${certifyResult.digest}`);

    // Wait for certification
    const certifyTxDetails = await suiClient.waitForTransaction({
      digest: certifyResult.digest,
      options: {
        showEffects: true,
      },
    });

    if (certifyTxDetails.effects?.status?.status !== 'success') {
      throw new Error('Certification failed');
    }

    // Get blob details for endEpoch
    const blobDetails = await suiClient.getObject({
      id: blobObject.objectId,
      options: { showContent: true },
    });

    const endEpoch = (blobDetails.data?.content as any)?.fields?.storage?.fields?.end_epoch || 0;

    updateProgress(6, '✅ Upload complete!');

    return {
      blobId: encoded.blobId,
      blobObjectId: blobObject.objectId,
      size: file.size,
      endEpoch: parseInt(endEpoch),
      url: `https://aggregator.walrus.space/v1/${encoded.blobId}`,
      cost: 'Paid from wallet', // TODO: Calculate actual cost from gas used
    };

  } catch (error) {
    console.error('Walrus SDK upload error:', error);

    if (error instanceof Error && error.message.includes('WAL')) {
      throw new Error(`Insufficient WAL tokens: ${error.message}`);
    }

    throw error;
  }
}
