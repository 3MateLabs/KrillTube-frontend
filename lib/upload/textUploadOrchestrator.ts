'use client';

/**
 * Text Upload Orchestrator with Encryption
 * Encrypts text documents and uploads to Walrus
 */

import { generateDEK, generateIV, encryptSegment, toBase64 } from '@/lib/crypto/clientEncryption';

export interface TextUploadOptions {
  network: 'mainnet' | 'testnet';
  epochs?: number;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  stage: 'encrypting' | 'uploading' | 'registering' | 'complete';
  percent: number;
  message: string;
}

export interface TextUploadResult {
  document: {
    filename: string;
    walrusUri: string;
    blobObjectId?: string; // Sui blob object ID (mainnet only)
    dekEnc: string; // Base64-encoded encrypted DEK
    iv: string; // Base64-encoded IV
    size: number;
    mimeType: string;
    charCount: number;
    wordCount: number;
  };
}

/**
 * Upload text document with encryption
 */
export async function uploadTextEncrypted(
  file: File,
  signAndExecute: any,
  uploadAddress: string, // Can be user wallet OR delegator wallet
  options: TextUploadOptions
): Promise<TextUploadResult> {
  const { network = 'mainnet', epochs = 53, onProgress } = options;

  console.log(`[Text Upload] Starting upload for: ${file.name}`);

  // Step 1: Read file as text
  onProgress?.({
    stage: 'encrypting',
    percent: 10,
    message: `Reading ${file.name}...`,
  });

  const text = await file.text();
  const textData = new TextEncoder().encode(text);

  // Calculate text stats
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

  console.log(`[Text Upload] Read ${charCount} characters, ${wordCount} words`);

  // Step 2: Generate encryption keys
  const dek = generateDEK(); // 16-byte AES-128 key
  const iv = generateIV(); // 12-byte IV for AES-GCM

  console.log(`[Text Upload] Generated DEK and IV for ${file.name}`);

  // Step 3: Encrypt text data
  onProgress?.({
    stage: 'encrypting',
    percent: 30,
    message: `Encrypting ${file.name}...`,
  });

  const encryptedData = await encryptSegment(dek, textData, iv);

  console.log(`[Text Upload] Encrypted ${file.name}: ${textData.length} → ${encryptedData.length} bytes`);

  // Step 4: Upload to Walrus
  onProgress?.({
    stage: 'uploading',
    percent: 50,
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

  console.log(`[Text Upload] ✓ Uploaded ${file.name} to Walrus:`, blobId);

  // Step 5: Prepare result
  const dekBase64 = toBase64(dek);
  const ivBase64 = toBase64(iv);

  // Determine aggregator URL based on network
  const aggregatorUrl = network === 'testnet'
    ? 'https://aggregator.walrus-testnet.walrus.space'
    : 'https://aggregator.mainnet.walrus.mirai.cloud';

  onProgress?.({
    stage: 'complete',
    percent: 100,
    message: 'Text document uploaded!',
  });

  console.log(`[Text Upload] ✓ Text document uploaded successfully`);

  return {
    document: {
      filename: file.name,
      walrusUri: `${aggregatorUrl}/v1/blobs/${blobId}`,
      blobObjectId: network === 'mainnet' ? blobObjectId : undefined,
      dekEnc: dekBase64, // Client sends plain DEK, server encrypts with master key
      iv: ivBase64,
      size: file.size,
      mimeType: file.type || 'text/plain',
      charCount,
      wordCount,
    },
  };
}

/**
 * Decrypt text data (for viewing)
 */
export async function decryptText(
  encryptedData: Uint8Array,
  dekBase64: string,
  ivBase64: string
): Promise<string> {
  const { fromBase64 } = await import('@/lib/crypto/clientEncryption');
  const { aesGcmDecrypt } = await import('@/lib/crypto/primitives');

  const dek = fromBase64(dekBase64);
  const iv = fromBase64(ivBase64);

  const decrypted = await aesGcmDecrypt(dek, encryptedData, iv);

  // Convert back to text
  return new TextDecoder().decode(decrypted);
}
