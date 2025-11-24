'use client';

/**
 * Image Upload Orchestrator with Encryption
 * Encrypts images and uploads to Walrus
 */

import { generateDEK, generateIV, encryptSegment, toBase64 } from '@/lib/crypto/clientEncryption';

export interface ImageUploadOptions {
  network: 'mainnet' | 'testnet';
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  stage: 'encrypting' | 'uploading' | 'registering' | 'complete';
  percent: number;
  message: string;
}

export interface ImageUploadResult {
  images: Array<{
    filename: string;
    walrusUri: string;
    blobObjectId?: string; // Sui blob object ID (mainnet only)
    dekEnc: string; // Base64-encoded encrypted DEK
    iv: string; // Base64-encoded IV
    size: number;
    mimeType: string;
  }>;
}

/**
 * Upload multiple images with encryption
 */
export async function uploadImagesEncrypted(
  files: File[],
  signAndExecute: any,
  uploadAddress: string, // Can be user wallet OR delegator wallet
  options: ImageUploadOptions
): Promise<imgUploadResult> {
  const { network = 'mainnet', epochs = 53, onProgress } = options;

  console.log(`[Image Upload] Starting upload for ${files.length} images`);

  const images: ImageUploadResult['images'] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePercent = (i / files.length) * 100;

    console.log(`[Image Upload] Processing ${i + 1}/${files.length}: ${file.name}`);

    // Step 1: Read file as Uint8Array
    onProgress?.({
      stage: 'encrypting',
      percent: filePercent,
      message: `Reading ${file.name}...`,
    });

    const arrayBuffer = await file.arrayBuffer();
    const imageData = new Uint8Array(arrayBuffer);

    // Step 2: Generate encryption keys
    const dek = generateDEK(); // 16-byte AES-128 key
    const iv = generateIV(); // 12-byte IV for AES-GCM

    console.log(`[Image Upload] Generated DEK and IV for ${file.name}`);

    // Step 3: Encrypt image data
    onProgress?.({
      stage: 'encrypting',
      percent: filePercent + 10,
      message: `Encrypting ${file.name}...`,
    });

    const encryptedData = await encryptSegment(dek, imageData, iv);

    console.log(`[Image Upload] Encrypted ${file.name}: ${imageData.length} → ${encryptedData.length} bytes`);

    // Step 4: Upload to Walrus
    onProgress?.({
      stage: 'uploading',
      percent: filePercent + 30,
      message: `Uploading ${file.name} to Walrus...`,
    });

    // Import Walrus upload function
    const { uploadMultipleBlobsWithWallet } = await import('@/lib/client-walrus-sdk');

    const uploadResults = await uploadMultipleBlobsWithWallet(
      [{ contents: encryptedData, identifier: file.name }],
      signAndExecute,
      uploadAddress, // Use delegator address on mainnet, user address on testnet
      {
        network,
        epochs: epochs || 53,
        deletable: true,
      }
    );

    const blobId = uploadResults[0].blobId;
    const blobObjectId = uploadResults[0].blobObjectId;

    console.log(`[Image Upload] ✓ Uploaded ${file.name} to Walrus:`, blobId);

    // Step 5: Encrypt DEK with master key (server-side will handle this)
    // For now, we'll store the DEK in base64 and encrypt it server-side
    const dekBase64 = toBase64(dek);
    const ivBase64 = toBase64(iv);

    // Determine aggregator URL based on network
    const aggregatorUrl = network === 'testnet'
      ? 'https://aggregator.walrus-testnet.walrus.space'
      : 'https://aggregator.mainnet.walrus.mirai.cloud';

    images.push({
      filename: file.name,
      walrusUri: `${aggregatorUrl}/v1/blobs/${blobId}`,
      blobObjectId: network === 'mainnet' ? blobObjectId : undefined,
      dekEnc: dekBase64, // Client sends plain DEK, server encrypts with master key
      iv: ivBase64,
      size: file.size,
      mimeType: file.type,
    });
  }

  onProgress?.({
    stage: 'complete',
    percent: 100,
    message: 'All images uploaded!',
  });

  console.log(`[Image Upload] ✓ All ${files.length} images uploaded`);

  return { images };
}

/**
 * Decrypt image data (for viewing)
 */
export async function decryptImage(
  encryptedData: Uint8Array,
  dekBase64: string,
  ivBase64: string
): Promise<Uint8Array> {
  const { fromBase64 } = await import('@/lib/crypto/clientEncryption');
  const { aesGcmDecrypt } = await import('@/lib/crypto/primitives');

  const dek = fromBase64(dekBase64);
  const iv = fromBase64(ivBase64);

  const decrypted = await aesGcmDecrypt(dek, encryptedData, iv);

  return decrypted;
}
