/**
 * Client-side Walrus SDK for browser-based uploads
 * Users sign transactions with their wallet before uploading
 *
 * UPLOAD RELAY CONFIGURATION (RECOMMENDED FOR BROWSER UPLOADS):
 * ============================================================
 * Upload relays handle the fan-out to 100+ storage nodes on the server side,
 * which solves browser resource limitations (ERR_INSUFFICIENT_RESOURCES).
 *
 * Benefits:
 * - Server-side fan-out reduces browser network strain
 * - Automatic retries on failed node uploads
 * - Better success rates for large uploads
 *
 * Cost: Upload relay requires a tip payment (40 MIST per KiB of encoded data)
 * - The SDK automatically calculates and adds tip to the transaction
 * - User sees tip payment in wallet approval along with storage costs
 *
 * Configuration Options:
 * 1. UPLOAD_RELAY_ENABLED=true: Use upload relay (default, recommended for browser)
 * 2. UPLOAD_RELAY_ENABLED=false: Direct node uploads (no tip, but browser makes ~2200 requests per blob)
 */

'use client';

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import type { Signer } from '@mysten/sui/cryptography';
import { createSuiClientWithRateLimitHandling } from '@/lib/suiClientRateLimitSwitch';

const DEFAULT_NETWORK = 'mainnet';
const DEFAULT_EPOCHS = 50;

// Network-specific epoch constraints (from Walrus documentation)
// Testnet: 1 day/epoch, max 53 epochs (53 days)
// Mainnet: 2 weeks/epoch, max 53 epochs (~2 years)
const MAX_EPOCHS_TESTNET = 53;
const MAX_EPOCHS_MAINNET = 53;

const WAL_TOKEN_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

// Upload relay URLs (public Mysten Labs infrastructure)
const UPLOAD_RELAY_URLS = {
  mainnet: 'https://upload-relay.mainnet.walrus.space',
  testnet: 'https://upload-relay.testnet.walrus.space',
};

// Toggle upload relay (can be controlled via env var)
// Default: ENABLED (upload relay works properly with SDK v0.8.1)
const UPLOAD_RELAY_ENABLED = process.env.NEXT_PUBLIC_UPLOAD_RELAY_ENABLED !== 'false';

// Maximum tip amount in MIST (100 million MIST = 0.1 WAL)
// For reference: 1 MB encoded ~= 1,300 KiB = 52,000 MIST = 0.000052 WAL
const MAX_TIP_MIST = 100_000_000;

/**
 * Validate and clamp epochs to network-specific maximum
 */
export function validateEpochs(epochs: number, network: 'testnet' | 'mainnet'): number {
  const maxEpochs = network === 'testnet' ? MAX_EPOCHS_TESTNET : MAX_EPOCHS_MAINNET;

  if (epochs > maxEpochs) {
    console.warn(`[Walrus] Requested ${epochs} epochs exceeds ${network} maximum of ${maxEpochs}. Capping to ${maxEpochs}.`);
    return maxEpochs;
  }

  if (epochs < 1) {
    console.warn(`[Walrus] Epochs must be at least 1. Setting to 1.`);
    return 1;
  }

  return epochs;
}

/**
 * Get maximum epochs for a network
 */
export function getMaxEpochs(network: 'testnet' | 'mainnet'): number {
  return network === 'testnet' ? MAX_EPOCHS_TESTNET : MAX_EPOCHS_MAINNET;
}

/**
 * Create Walrus client for browser uploads
 *
 * Two modes:
 * 1. Upload Relay (default): Server-side fan-out, requires tip payment
 * 2. Direct Nodes: Browser-side fan-out, no tip but high network load
 */
export function createWalrusClient(network: 'testnet' | 'mainnet' = DEFAULT_NETWORK) {
  // Use rate-limited SuiClient with automatic RPC endpoint rotation
  const suiClient = createSuiClientWithRateLimitHandling();

  if (UPLOAD_RELAY_ENABLED) {
    return new WalrusClient({
      network,
      suiClient,
      uploadRelay: {
        host: UPLOAD_RELAY_URLS[network],
        timeout: 300000, // 5 minutes for large blob uploads
        sendTip: {
          max: MAX_TIP_MIST,
        },
      },
    });
  } else {
    return new WalrusClient({
      network,
      suiClient,
      storageNodeClientOptions: {
        timeout: 300000, // 5 minutes for large blob uploads
      },
    });
  }
}

/**
 * Upload a single blob with user signature
 */
export async function uploadBlobWithSigner(
  data: Uint8Array,
  signer: Signer,
  options?: {
    network?: 'testnet' | 'mainnet';
    epochs?: number;
    deletable?: boolean;
  }
): Promise<{
  blobId: string;
  blobObject: any;
  cost: { storageCost: bigint; writeCost: bigint; totalCost: bigint };
}> {
  const network = options?.network || DEFAULT_NETWORK;
  const epochs = options?.epochs || DEFAULT_EPOCHS;
  const deletable = options?.deletable ?? true;

  const client = createWalrusClient(network);
  const cost = await client.storageCost(data.length, epochs);

  const result = await client.writeBlob({
    blob: data,
    deletable,
    epochs,
    signer,
  });

  return {
    blobId: result.blobId,
    blobObject: result.blobObject,
    cost,
  };
}

/**
 * Upload multiple files as a quilt with a Signer (for server-side/CLI use)
 *
 * NOTE: For browser wallet uploads, use uploadQuiltWithWallet() instead.
 */
export async function uploadQuiltWithSigner(
  blobs: Array<{
    contents: Uint8Array;
    identifier: string;
    tags?: Record<string, string>;
  }>,
  signer: Signer,
  options?: {
    network?: 'testnet' | 'mainnet';
    epochs?: number;
    deletable?: boolean;
  }
): Promise<{
  blobId: string;
  blobObject: any;
  index: {
    patches: Array<{
      patchId: string;
      identifier: string;
      startIndex: number;
      endIndex: number;
      tags: Record<string, string>;
    }>;
  };
  cost: { storageCost: bigint; writeCost: bigint; totalCost: bigint };
}> {
  const network = options?.network || DEFAULT_NETWORK;
  const epochs = options?.epochs || DEFAULT_EPOCHS;
  const deletable = options?.deletable ?? true;

  const client = createWalrusClient(network);
  const totalSize = blobs.reduce((sum, blob) => sum + blob.contents.length, 0);
  const cost = await client.storageCost(totalSize, epochs);

  const result = await client.writeQuilt({
    blobs,
    deletable,
    epochs,
    signer,
  });

  const normalizedPatches = result.index.patches.map(patch => ({
    ...patch,
    tags: patch.tags instanceof Map
      ? Object.fromEntries(patch.tags)
      : (patch.tags || {})
  }));

  return {
    blobId: result.blobId,
    blobObject: result.blobObject,
    index: {
      patches: normalizedPatches
    },
    cost,
  };
}

/**
 * Upload multiple files as a quilt with browser wallet (dApp Kit)
 *
 * IMPORTANT: Uses LOWER-LEVEL SDK methods (registerBlobTransaction, certifyBlobTransaction)
 * instead of writeFilesFlow API. This approach manually handles coin selection to bypass
 * the CoinWithBalance intent bug in @mysten/sui SDK.
 *
 * This implementation matches walrus-drive's working pattern:
 * 1. Manually query and select WAL coins
 * 2. Encode blob manually with encodeBlob()
 * 3. Create Transaction object and pass coin as tx.object(coinId)
 * 4. Use registerBlobTransaction() and certifyBlobTransaction()
 *
 * @param blobs - Array of file contents with identifiers
 * @param signAndExecute - Function from useSignAndExecuteTransaction().mutateAsync
 * @param ownerAddress - Wallet address that will own the blob
 * @param options - Network, epochs, deletable settings
 * @returns Uploaded quilt information with blob ID and patches
 */
export async function uploadQuiltWithWallet(
  blobs: Array<{
    contents: Uint8Array;
    identifier: string;
    tags?: Record<string, string>;
  }>,
  signAndExecute: (args: { transaction: any }) => Promise<{ digest: string; effects?: any; objectChanges?: any }>,
  ownerAddress: string,
  options?: {
    network?: 'testnet' | 'mainnet';
    epochs?: number;
    deletable?: boolean;
  }
): Promise<{
  blobId: string;
  blobObject: any;
  index: {
    patches: Array<{
      patchId: string;
      identifier: string;
      startIndex: number;
      endIndex: number;
      tags: Record<string, string>;
    }>;
  };
  cost: { storageCost: bigint; writeCost: bigint; totalCost: bigint };
}> {
  const network = options?.network || DEFAULT_NETWORK;
  const epochs = options?.epochs || DEFAULT_EPOCHS;
  const deletable = options?.deletable ?? true;

  // For $extend pattern, use plain SuiClient (not rate-limited)
  // Rate limiting is handled by WalrusClient constructor elsewhere
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
  const { Transaction } = await import('@mysten/sui/transactions');
  const { walrus } = await import('@mysten/walrus');

  const walrusClient = suiClient.$extend(walrus({ network }));
  const totalSize = blobs.reduce((sum, blob) => sum + blob.contents.length, 0);
  const regularClient = createWalrusClient(network);
  const cost = await regularClient.storageCost(totalSize, epochs);

  try {
    console.log('[Walrus SDK] Fetching WAL coins...');
    const walCoins = await suiClient.getCoins({
      owner: ownerAddress,
      coinType: WAL_TOKEN_TYPE,
    });

    if (!walCoins.data || walCoins.data.length === 0) {
      throw new Error('No WAL tokens found in wallet');
    }

    const sortedCoins = walCoins.data.sort((a, b) => Number(b.balance) - Number(a.balance));
    const primaryCoin = sortedCoins[0];
    console.log(`[Walrus SDK] Using coin: ${primaryCoin.coinObjectId} (${(Number(primaryCoin.balance) / 1_000_000_000).toFixed(4)} WAL)`);

    console.log('[Walrus SDK] Combining blobs...');
    const combinedBlob = new Uint8Array(totalSize);
    let offset = 0;
    const patchBoundaries: Array<{ identifier: string; start: number; end: number; tags: Record<string, string> }> = [];

    for (const blob of blobs) {
      combinedBlob.set(blob.contents, offset);
      patchBoundaries.push({
        identifier: blob.identifier,
        start: offset,
        end: offset + blob.contents.length,
        tags: blob.tags || {}
      });
      offset += blob.contents.length;
    }

    console.log(`[Walrus SDK] Encoding blob (${(totalSize / 1024 / 1024).toFixed(2)} MB)...`);
    const encoded = await walrusClient.walrus.encodeBlob(combinedBlob);
    console.log(`[Walrus SDK] ✓ Blob encoded, ID: ${encoded.blobId}`);

    console.log('[Walrus SDK] Creating registration transaction...');
    const registerTxObj = new Transaction();
    const registerTx = await walrusClient.walrus.registerBlobTransaction({
      transaction: registerTxObj,
      blobId: encoded.blobId,
      rootHash: encoded.rootHash,
      size: combinedBlob.length,
      deletable,
      epochs,
      owner: ownerAddress,
      walCoin: registerTxObj.object(primaryCoin.coinObjectId),
    });

    console.log('[Walrus SDK] ⏳ Waiting for wallet signature (check your wallet popup)...');
    const registerResult = await signAndExecute({ transaction: registerTx });
    console.log(`[Walrus SDK] ✓ Registration transaction signed: ${registerResult.digest}`);

    const txDetails = await suiClient.waitForTransaction({
      digest: registerResult.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    const blobType = await walrusClient.walrus.getBlobType();
    const blobObjectChange = txDetails.objectChanges?.find(
      (obj: any) => obj.type === 'created' && obj.objectType === blobType
    ) as { objectId: string } | undefined;

    if (!blobObjectChange) {
      throw new Error('Blob object not found in transaction result');
    }

    console.log('[Walrus SDK] Uploading to storage nodes...');
    const confirmations = await walrusClient.walrus.writeEncodedBlobToNodes({
      blobId: encoded.blobId,
      metadata: encoded.metadata,
      sliversByNode: encoded.sliversByNode,
      deletable,
      objectId: blobObjectChange.objectId,
    });
    console.log(`[Walrus SDK] ✓ Uploaded to ${Object.keys(confirmations).length} nodes`);

    console.log('[Walrus SDK] Creating certification transaction...');
    const certifyTxObj = new Transaction();
    const certifyTx = await walrusClient.walrus.certifyBlobTransaction({
      transaction: certifyTxObj,
      blobId: encoded.blobId,
      blobObjectId: blobObjectChange.objectId,
      confirmations,
      deletable,
    });

    console.log('[Walrus SDK] ⏳ Waiting for certification signature...');
    const certifyResult = await signAndExecute({ transaction: certifyTx });
    console.log(`[Walrus SDK] ✓ Certification signed: ${certifyResult.digest}`);

    const certifyTxDetails = await suiClient.waitForTransaction({
      digest: certifyResult.digest,
      options: { showEffects: true },
    });

    if (certifyTxDetails.effects?.status?.status !== 'success') {
      throw new Error('Certification transaction failed');
    }

    const patches = patchBoundaries.map((boundary, idx) => ({
      patchId: `${encoded.blobId}@${boundary.start}:${boundary.end}`,
      identifier: boundary.identifier,
      startIndex: idx,
      endIndex: idx + 1,
      tags: boundary.tags
    }));

    return {
      blobId: encoded.blobId,
      blobObject: {
        ...blobObjectChange,
        blobId: encoded.blobId, // Add blobId to blobObject for upload orchestrator
      } as any,
      index: { patches },
      cost,
    };
  } catch (error) {
    console.error('[Walrus] Upload error:', error);
    throw error;
  }
}


/**
 * Upload multiple blobs individually (not as quilt) with browser wallet
 *
 * OPTIMIZED APPROACH using batched PTB (Programmable Transaction Blocks):
 * - Step 1: Encode all blobs in parallel
 * - Step 2: Batch register calls into PTBs (50 blobs per transaction to avoid wallet limits)
 * - Step 3: Upload all blobs to storage nodes in parallel with 30 retries
 * - Step 4: Batch certify calls into PTBs (50 blobs per transaction)
 *
 * For N blobs, this requires:
 * - Registration: ceil(N/50) * 1 signature
 * - Certification: ceil(N/50) * 1 signature
 * - Total: ~2-10 signatures instead of N*2 signatures!
 *
 * Example: 100 blobs = 2 register PTBs + 2 certify PTBs = 4 signatures (vs 200 signatures!)
 *
 * @param blobs - Array of blobs to upload
 * @param signAndExecute - Function from useSignAndExecuteTransaction().mutateAsync
 * @param ownerAddress - Wallet address that will own the blobs
 * @param options - Network, epochs, deletable settings
 * @returns Array of uploaded blob results with blob IDs
 */
export async function uploadMultipleBlobsWithWallet(
  blobs: Array<{
    contents: Uint8Array;
    identifier: string;
  }>,
  signAndExecute: (args: { transaction: any }) => Promise<{ digest: string; effects?: any; objectChanges?: any }>,
  ownerAddress: string,
  options?: {
    network?: 'testnet' | 'mainnet';
    epochs?: number;
    deletable?: boolean;
  }
): Promise<Array<{
  identifier: string;
  blobId: string;
  blobObjectId: string;
  size: number;
}>> {
  const network = options?.network || DEFAULT_NETWORK;
  const requestedEpochs = options?.epochs || DEFAULT_EPOCHS;
  const epochs = validateEpochs(requestedEpochs, network);
  const deletable = options?.deletable ?? true;

  // For testnet, use free HTTP uploads (no wallet signatures needed)
  // Note: Walrus runs on Sui, so IOTA wallets don't sign Walrus transactions
  if (network === 'testnet') {
    console.log('[Upload] Using free HTTP uploads for testnet');
    const publisherUrl = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER || 'https://publisher.walrus-testnet.walrus.space';

    const results: Array<{
      identifier: string;
      blobId: string;
      blobObjectId: string;
      size: number;
    }> = [];

    // Upload with retry logic (30 attempts with exponential backoff)
    for (const blob of blobs) {
      const maxRetries = 30;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[HTTP Upload] Uploading ${blob.identifier} (${(blob.contents.length / 1024).toFixed(2)} KB) - attempt ${attempt}/${maxRetries}...`);

          const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochs}`, {
            method: 'PUT',
            body: new Blob([blob.contents as BlobPart]),
            headers: {
              'Content-Type': 'application/octet-stream',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP upload failed: ${response.status} ${errorText}`);
          }

          const result = await response.json();

          results.push({
            identifier: blob.identifier,
            blobId: result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId,
            blobObjectId: '', // Not applicable for HTTP uploads
            size: blob.contents.length,
          });

          console.log(`[HTTP Upload] ✓ ${blob.identifier}: ${result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId}`);
          lastError = null;
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const errorMessage = lastError.message;

          // Detect insufficient balance errors and provide helpful message
          if (
            errorMessage.includes('InsufficientCoinBalance') ||
            errorMessage.includes('could not automatically determine a budget') ||
            errorMessage.includes('No valid gas coins found')
          ) {
            throw new Error(
              `Insufficient SUI balance to upload ${blob.identifier}. ` +
              `Please add SUI tokens to your wallet for gas fees. ` +
              `Testnet: https://faucet.testnet.sui.io/ | Mainnet: Buy/transfer SUI to your wallet.`
            );
          }

          if (attempt < maxRetries) {
            // Exponential backoff with 30s cap: 2s, 4s, 8s, 16s, 30s, 30s, 30s...
            const delayMs = Math.min(Math.pow(2, attempt) * 1000, 30000);
            console.warn(`[HTTP Upload] ⚠️ Upload failed for ${blob.identifier} (attempt ${attempt}/${maxRetries}): ${errorMessage}`);
            console.warn(`[HTTP Upload] Retrying in ${delayMs / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      if (lastError) {
        console.error(`[HTTP Upload] Failed to upload ${blob.identifier} after ${maxRetries} attempts`);
        throw new Error(`Failed to upload ${blob.identifier}: ${lastError.message}`);
      }
    }

    return results;
  }

  // MAINNET: Use PTB batching for optimal performance
  const suiClient = createSuiClientWithRateLimitHandling();
  const walrusClient = createWalrusClient(network);
  const { Transaction } = await import('@mysten/sui/transactions');

  const BATCH_SIZE = 50;
  const expectedSignatures = Math.ceil(blobs.length / BATCH_SIZE) * 2; // register + certify batches
  console.log(`[Walrus PTB] Optimized upload: ${blobs.length} blobs in ~${expectedSignatures} signatures (batches of ${BATCH_SIZE})`);

  // STEP 1: Encode all blobs in parallel
  console.log('[Walrus PTB] Step 1/4: Encoding all blobs...');
  const encodedBlobs = await Promise.all(
    blobs.map(async (blob) => {
      const encoded = await walrusClient.encodeBlob(blob.contents);
      console.log(`[Walrus PTB] Encoded ${blob.identifier}: ${encoded.blobId}`);
      return {
        identifier: blob.identifier,
        encoded,
        size: blob.contents.length,
      };
    })
  );

  // STEP 2: Create PTBs for registration in batches (avoid wallet transaction size limits)
  console.log('[Walrus PTB] Step 2/4: Creating batch registration PTBs...');

  // Batch size: 50 blobs per PTB (wallets have limits on transaction complexity)
  const REGISTER_BATCH_SIZE = 50;
  const createdBlobObjects: Array<{ objectId: string; digest: string }> = [];

  // Process registrations in batches
  for (let i = 0; i < encodedBlobs.length; i += REGISTER_BATCH_SIZE) {
    const batchBlobs = encodedBlobs.slice(i, Math.min(i + REGISTER_BATCH_SIZE, encodedBlobs.length));
    const batchNum = Math.floor(i / REGISTER_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(encodedBlobs.length / REGISTER_BATCH_SIZE);

    console.log(`[Walrus PTB] Registration batch ${batchNum}/${totalBatches}: ${batchBlobs.length} blobs`);

    // Query WAL coins for this batch
    const walCoins = await suiClient.getCoins({
      owner: ownerAddress,
      coinType: WAL_TOKEN_TYPE,
    });

    if (!walCoins.data || walCoins.data.length === 0) {
      throw new Error('No WAL tokens found in wallet');
    }

    const sortedCoins = walCoins.data.sort((a, b) => Number(b.balance) - Number(a.balance));
    const primaryCoin = sortedCoins[0];
    console.log(`[Walrus PTB] Using coin ${primaryCoin.coinObjectId} (${(Number(primaryCoin.balance) / 1_000_000_000).toFixed(4)} WAL)`);

    // Create PTB for this batch
    const batchRegisterTx = new Transaction();

    // Add register calls for this batch
    for (const blob of batchBlobs) {
      await walrusClient.registerBlobTransaction({
        transaction: batchRegisterTx,
        blobId: blob.encoded.blobId,
        rootHash: blob.encoded.rootHash,
        size: blob.size,
        deletable,
        epochs,
        owner: ownerAddress,
        walCoin: batchRegisterTx.object(primaryCoin.coinObjectId),
      });
    }

    console.log(`[Walrus PTB] ⏳ Signing registration batch ${batchNum}/${totalBatches} (check wallet)...`);
    const registerResult = await signAndExecute({ transaction: batchRegisterTx });
    console.log(`[Walrus PTB] ✓ Registration batch ${batchNum}/${totalBatches} complete: ${registerResult.digest}`);

    // Wait for transaction and extract blob objects
    const registerTxDetails = await suiClient.waitForTransaction({
      digest: registerResult.digest,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    const blobType = await walrusClient.getBlobType();
    const batchCreatedBlobs = registerTxDetails.objectChanges?.filter(
      (obj: any) => obj.type === 'created' && obj.objectType === blobType
    ) as Array<{ objectId: string; digest: string }> | undefined;

    if (!batchCreatedBlobs || batchCreatedBlobs.length !== batchBlobs.length) {
      throw new Error(`Expected ${batchBlobs.length} blob objects in batch ${batchNum}, got ${batchCreatedBlobs?.length || 0}`);
    }

    createdBlobObjects.push(...batchCreatedBlobs);
  }

  console.log(`[Walrus PTB] ✓ Created ${createdBlobObjects.length} blob objects across ${Math.ceil(encodedBlobs.length / REGISTER_BATCH_SIZE)} registration batches`);

  // STEP 3: Upload all blobs to storage nodes in parallel with retry logic
  console.log('[Walrus PTB] Step 3/4: Uploading to storage nodes (parallel with retries)...');

  // Helper function to upload with retries (30 attempts with exponential backoff)
  async function uploadWithRetry(
    blob: typeof encodedBlobs[0],
    blobObjectId: string,
    maxRetries = 30
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Walrus PTB] Uploading ${blob.identifier} to storage nodes (attempt ${attempt}/${maxRetries})...`);

        const confirmations = await walrusClient.writeEncodedBlobToNodes({
          blobId: blob.encoded.blobId,
          metadata: blob.encoded.metadata,
          sliversByNode: blob.encoded.sliversByNode,
          deletable,
          objectId: blobObjectId,
        });

        console.log(`[Walrus PTB] ✓ ${blob.identifier} uploaded to ${Object.keys(confirmations).length} nodes`);
        return { blobId: blob.encoded.blobId, blobObjectId, confirmations };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt === maxRetries) {
          console.error(`[Walrus PTB] ❌ Failed to upload ${blob.identifier} after ${maxRetries} attempts: ${errorMessage}`);
          throw error;
        }

        // Exponential backoff with 30s cap: 2s, 4s, 8s, 16s, 30s, 30s, 30s...
        const delayMs = Math.min(Math.pow(2, attempt) * 1000, 30000);
        console.warn(`[Walrus PTB] ⚠️ Upload failed for ${blob.identifier} (attempt ${attempt}/${maxRetries}): ${errorMessage}`);
        console.warn(`[Walrus PTB] Retrying in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('Upload failed - max retries exceeded');
  }

  const confirmationsArray = await Promise.all(
    encodedBlobs.map((blob, idx) =>
      uploadWithRetry(blob, createdBlobObjects[idx].objectId, 30)
    )
  );

  // STEP 4: Create PTBs for certification in batches (avoid wallet transaction size limits)
  console.log('[Walrus PTB] Step 4/4: Creating batch certification PTBs...');

  // Batch size: 50 blobs per PTB (same as registration)
  const CERTIFY_BATCH_SIZE = 50;

  // Process certifications in batches
  for (let i = 0; i < confirmationsArray.length; i += CERTIFY_BATCH_SIZE) {
    const batchSize = Math.min(CERTIFY_BATCH_SIZE, confirmationsArray.length - i);
    const batchNum = Math.floor(i / CERTIFY_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(confirmationsArray.length / CERTIFY_BATCH_SIZE);

    console.log(`[Walrus PTB] Certification batch ${batchNum}/${totalBatches}: ${batchSize} blobs`);

    const batchCertifyTx = new Transaction();

    for (let j = i; j < i + batchSize; j++) {
      await walrusClient.certifyBlobTransaction({
        transaction: batchCertifyTx,
        blobId: confirmationsArray[j].blobId,
        blobObjectId: confirmationsArray[j].blobObjectId,
        confirmations: confirmationsArray[j].confirmations,
        deletable,
      });
    }

    console.log(`[Walrus PTB] ⏳ Signing certification batch ${batchNum}/${totalBatches} (check wallet)...`);
    const certifyResult = await signAndExecute({ transaction: batchCertifyTx });
    console.log(`[Walrus PTB] ✓ Certification batch ${batchNum}/${totalBatches} complete: ${certifyResult.digest}`);

    const certifyTxDetails = await suiClient.waitForTransaction({
      digest: certifyResult.digest,
      options: { showEffects: true },
    });

    if (certifyTxDetails.effects?.status?.status !== 'success') {
      throw new Error(`Certification batch ${batchNum} transaction failed`);
    }
  }

  console.log(`[Walrus PTB] ✓ Certified all ${confirmationsArray.length} blobs across ${Math.ceil(confirmationsArray.length / CERTIFY_BATCH_SIZE)} certification batches`);

  // Build results
  const results = encodedBlobs.map((blob, idx) => ({
    identifier: blob.identifier,
    blobId: blob.encoded.blobId,
    blobObjectId: confirmationsArray[idx].blobObjectId,
    size: blob.size,
  }));

  const totalSignatures = Math.ceil(blobs.length / BATCH_SIZE) * 2;
  console.log(`[Walrus PTB] ✓ All ${blobs.length} blobs uploaded with ${totalSignatures} signatures!`);
  return results;
}

/**
 * Calculate storage cost without uploading
 */
export async function calculateStorageCost(
  sizeBytes: number,
  options?: {
    network?: 'testnet' | 'mainnet';
    epochs?: number;
  }
): Promise<{
  storageCost: bigint;
  writeCost: bigint;
  totalCost: bigint;
  totalCostWal: string;
  sizeBytes: number;
  epochs: number;
}> {
  const network = options?.network || DEFAULT_NETWORK;
  const epochs = options?.epochs || DEFAULT_EPOCHS;

  const client = createWalrusClient(network);
  const cost = await client.storageCost(sizeBytes, epochs);

  return {
    ...cost,
    totalCostWal: (Number(cost.totalCost) / 1_000_000_000).toFixed(6),
    sizeBytes,
    epochs,
  };
}
