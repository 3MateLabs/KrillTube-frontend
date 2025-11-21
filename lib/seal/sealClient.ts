/**
 * SEAL Client Initialization and Configuration
 *
 * Provides utilities for initializing SEAL encryption/decryption with
 * Sui's threshold encryption key servers.
 */

import { SuiClient } from '@mysten/sui/client';
import { SealClient, SessionKey } from '@mysten/seal';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex, toHex } from '@mysten/sui/utils';

// SEAL Key Server Object IDs and URLs
// Mainnet: Using 1-of-1 threshold with Mirai open key server
const SEAL_KEY_SERVERS = {
  testnet: [
    {
      objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
      url: 'https://open.key-server.testnet.seal.mirai.cloud',
    },
  ],
  mainnet: [
    {
      objectId: '0xe0eb52eba9261b96e895bbb4deca10dcd64fbc626a1133017adcd5131353fd10',
      url: 'https://open.key-server.mainnet.seal.mirai.cloud',
    },
  ],
} as const;

export interface SealConfig {
  network: 'testnet' | 'mainnet';
  packageId: string;
  suiClient?: SuiClient;
  threshold?: number;
  sessionKeyTTL?: number;
}

/**
 * Initialize a SEAL client for encryption/decryption operations
 */
export function initializeSealClient(config: SealConfig): SealClient {
  const suiClient = config.suiClient || new SuiClient({
    url: config.network === 'mainnet'
      ? 'https://fullnode.mainnet.sui.io'
      : 'https://fullnode.testnet.sui.io',
  });

  const keyServers = SEAL_KEY_SERVERS[config.network];

  return new SealClient({
    suiClient,
    serverConfigs: keyServers.map((server) => ({
      objectId: server.objectId,
      url: server.url,
      weight: 1,
    })),
    verifyKeyServers: false,
  });
}

/**
 * Generate a document ID for SEAL encryption
 *
 * Document ID format: [channel_id][video_id][nonce]
 *
 * @param channelId - Creator's channel object ID
 * @param videoId - Unique video identifier (string or bytes)
 * @returns Hex-encoded document ID
 */
export function generateSealDocumentId(
  channelId: string,
  videoId: string
): string {
  const channelBytes = fromHex(channelId.replace('0x', ''));
  const videoBytes = new TextEncoder().encode(videoId);
  const nonce = crypto.getRandomValues(new Uint8Array(16));

  const documentIdBytes = new Uint8Array([
    ...channelBytes,
    ...videoBytes,
    ...nonce,
  ]);

  return toHex(documentIdBytes);
}

/**
 * Create a session key for SEAL decryption
 *
 * Session keys are required for decryption and have a TTL (default 10 minutes)
 */
export async function createSealSessionKey(
  userKeypair: Ed25519Keypair,
  packageId: string,
  suiClient: SuiClient,
  ttlMin: number = 10
): Promise<SessionKey> {
  const userAddress = userKeypair.toSuiAddress();

  const sessionKey = await SessionKey.create({
    address: userAddress,
    packageId,
    ttlMin,
    suiClient,
  });

  // Sign the personal message
  const message = sessionKey.getPersonalMessage();
  const { signature } = await userKeypair.signPersonalMessage(
    Buffer.from(message)
  );
  sessionKey.setPersonalMessageSignature(signature);

  return sessionKey;
}

/**
 * Encrypt data with SEAL
 *
 * @param sealClient - Initialized SEAL client
 * @param packageId - Deployed package ID
 * @param documentId - Document ID (from generateSealDocumentId)
 * @param data - Plaintext data to encrypt
 * @param threshold - Number of key servers required (default 1 for 1-of-1)
 * @returns Encrypted data and backup key
 */
export async function encryptWithSeal(
  sealClient: SealClient,
  packageId: string,
  documentId: string,
  data: Uint8Array,
  threshold: number = 1
): Promise<{
  encryptedData: Uint8Array;
  backupKey: string;
}> {
  const { encryptedObject, key: backupKey } = await sealClient.encrypt({
    threshold,
    packageId,
    id: documentId,
    data,
  });

  return {
    encryptedData: encryptedObject,
    backupKey: toHex(backupKey),
  };
}

/**
 * Decrypt data with SEAL
 *
 * Requires:
 * - Session key (created with user's wallet)
 * - seal_approve transaction bytes (proof of authorization)
 * - Encrypted data
 *
 * @param sealClient - Initialized SEAL client
 * @param encryptedData - SEAL-encrypted data
 * @param sessionKey - Session key with user signature
 * @param approveTransactionBytes - seal_approve transaction bytes
 * @returns Decrypted plaintext data
 */
export async function decryptWithSeal(
  sealClient: SealClient,
  encryptedData: Uint8Array,
  sessionKey: SessionKey,
  approveTransactionBytes: Uint8Array
): Promise<Uint8Array> {
  return await sealClient.decrypt({
    data: encryptedData,
    sessionKey,
    txBytes: approveTransactionBytes,
  });
}

/**
 * Get SEAL key server configurations for a network
 */
export function getSealKeyServers(
  network: 'testnet' | 'mainnet'
): Array<{ objectId: string; url: string }> {
  return SEAL_KEY_SERVERS[network];
}
