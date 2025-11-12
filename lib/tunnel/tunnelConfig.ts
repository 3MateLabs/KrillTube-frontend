/**
 * Tunnel Creator Config Utilities
 *
 * Handles creation of creator configs for the Tunnel payment system.
 * Supports both testnet (simple tx) and mainnet (PTB) workflows.
 */

import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = process.env.NEXT_PUBLIC_TUNNEL_PACKAGE_ID!;
const PLATFORM_FEE_WALLET = process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET!;
const OPERATOR_PUBLIC_KEY = process.env.NEXT_PUBLIC_SUI_OPERATOR_PUBLIC_KEY!;

// Receiver type constants (from Move module)
export const RECEIVER_TYPE_CREATOR_ADDRESS = 4020;
export const RECEIVER_TYPE_REFERER_ADDRESS = 4022;
export const RECEIVER_TYPE_PLATFORM = 4021;

export interface ReceiverConfig {
  type: number;
  address: string;
  feeBps: number; // Basis points (e.g., 500 = 5%)
}

export interface CreatorConfigParams {
  creatorAddress: string;
  operatorAddress: string; // Who can claim on behalf of creator
  metadata?: string;
  gracePeriodMs?: number; // Default: 60 minutes
  platformFeeBps?: number; // Default: 10% (1000 bps)
  referrerFeeBps?: number; // From upload page, e.g. 30% (3000 bps)
  creatorFeeBps?: number; // Remaining percentage goes to creator
}

/**
 * Get the operator's public key from environment
 * Returns the public key as Uint8Array (32 bytes)
 */
export function getOperatorPublicKey(): Uint8Array {
  if (!OPERATOR_PUBLIC_KEY) {
    throw new Error('NEXT_PUBLIC_SUI_OPERATOR_PUBLIC_KEY not set in environment');
  }

  // Remove 0x prefix if present
  const hex = OPERATOR_PUBLIC_KEY.startsWith('0x')
    ? OPERATOR_PUBLIC_KEY.slice(2)
    : OPERATOR_PUBLIC_KEY;

  // Convert hex to Uint8Array
  const publicKey = new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  if (publicKey.length !== 32) {
    throw new Error(
      `Invalid operator public key length: ${publicKey.length} (expected 32 bytes)`
    );
  }

  console.log('[TunnelConfig] Operator public key:', {
    hex: OPERATOR_PUBLIC_KEY,
    bytes: Array.from(publicKey),
    length: publicKey.length,
  });

  return publicKey;
}

/**
 * Calculate fee distribution based on platform and referrer percentages
 * Total must be < 100% (< 10000 basis points)
 */
function calculateFeeDistribution(
  platformFeeBps: number,
  referrerFeeBps: number
): { creatorFeeBps: number; platformFeeBps: number; referrerFeeBps: number } {
  const totalFeeBps = platformFeeBps + referrerFeeBps;

  if (totalFeeBps >= 10000) {
    throw new Error(
      `Total fees (${totalFeeBps / 100}%) must be less than 100%`
    );
  }

  const creatorFeeBps = 10000 - totalFeeBps;

  return {
    creatorFeeBps,
    platformFeeBps,
    referrerFeeBps,
  };
}

/**
 * Add creator config creation to an existing transaction (for PTB)
 *
 * @param tx - Existing transaction to add creator config to
 * @param params - Creator config parameters
 * @param operatorPublicKey - Operator's Ed25519 public key (32 bytes) for signing claim messages
 */
export function addCreatorConfigToTransaction(
  tx: Transaction,
  params: CreatorConfigParams,
  operatorPublicKey: Uint8Array
): void {
  if (!PACKAGE_ID) {
    throw new Error('NEXT_PUBLIC_TUNNEL_PACKAGE_ID not set in environment');
  }

  if (!PLATFORM_FEE_WALLET) {
    throw new Error('NEXT_PUBLIC_PLATFORM_FEE_WALLET not set in environment');
  }

  // Validate operator public key size
  if (operatorPublicKey.length !== 32) {
    throw new Error(
      `Invalid operator public key size: ${operatorPublicKey.length} (expected 32 bytes)`
    );
  }

  // Default values
  const platformFeeBps = params.platformFeeBps ?? 1000; // 10%
  const referrerFeeBps = params.referrerFeeBps ?? 3000; // 30%
  const metadata = params.metadata ?? 'KrillTube Creator';
  const gracePeriodMs = params.gracePeriodMs ?? 3600000; // 60 minutes

  // Calculate fee distribution
  const fees = calculateFeeDistribution(platformFeeBps, referrerFeeBps);
  console.log({ fees });

  console.log('[TunnelConfig] Fee distribution:', {
    creator: `${fees.creatorFeeBps / 100}%`,
    platform: `${fees.platformFeeBps / 100}%`,
    referrer: `${fees.referrerFeeBps / 100}%`,
  });

  // Create receiver configs
  const creatorConfig = tx.moveCall({
    target: `${PACKAGE_ID}::tunnel::create_receiver_config`,
    arguments: [
      tx.pure.u64(RECEIVER_TYPE_CREATOR_ADDRESS),
      tx.pure.address(params.creatorAddress),
      tx.pure.u64(fees.creatorFeeBps),
    ],
  });

  const platformConfig = tx.moveCall({
    target: `${PACKAGE_ID}::tunnel::create_receiver_config`,
    arguments: [
      tx.pure.u64(RECEIVER_TYPE_PLATFORM),
      tx.pure.address(PLATFORM_FEE_WALLET),
      tx.pure.u64(fees.platformFeeBps),
    ],
  });

  const referrerConfig = tx.moveCall({
    target: `${PACKAGE_ID}::tunnel::create_receiver_config`,
    arguments: [
      tx.pure.u64(RECEIVER_TYPE_REFERER_ADDRESS),
      tx.pure.address('0x0'), // Will be filled when tunnel opens
      tx.pure.u64(fees.referrerFeeBps),
    ],
  });

  // Create vector of receiver configs
  const receiverConfigs = tx.makeMoveVec({
    type: `${PACKAGE_ID}::tunnel::ReceiverConfig`,
    elements: [creatorConfig, platformConfig, referrerConfig],
  });

  // Create creator config with operator_public_key parameter
  const publicKeyArray = Array.from(operatorPublicKey);

  console.log('[TunnelConfig] Creating creator config with:', {
    packageId: PACKAGE_ID,
    operatorAddress: params.operatorAddress,
    publicKeyArray,
    publicKeyLength: publicKeyArray.length,
    metadata,
    gracePeriodMs,
  });

  tx.moveCall({
    target: `${PACKAGE_ID}::tunnel::create_creator_config`,
    arguments: [
      tx.pure.address(params.operatorAddress),
      tx.pure.vector('u8', publicKeyArray), // operator_public_key parameter
      tx.pure.string(metadata),
      receiverConfigs,
      tx.pure.u64(gracePeriodMs),
    ],
  });
}

/**
 * Create a standalone transaction to create a creator config
 *
 * @param params - Creator config parameters
 * @param publicKey - Creator's Ed25519 public key (32 bytes)
 * @returns Transaction ready to be signed
 */
export function createCreatorConfigTransaction(
  params: CreatorConfigParams,
  publicKey: Uint8Array
): Transaction {
  const tx = new Transaction();
  addCreatorConfigToTransaction(tx, params, publicKey);
  return tx;
}


/**
 * Get the creator config ID from transaction result
 */
export function getCreatorConfigId(txResult: any): string | null {
  if (!txResult.objectChanges) return null;

  const createdConfig = txResult.objectChanges.find(
    (change: any) =>
      change.type === 'created' &&
      change.objectType?.includes('CreatorConfig')
  );

  return createdConfig?.objectId || null;
}

/**
 * NOTE: Each video needs its own creator config.
 * Creator configs are NOT cached - they're created fresh for each upload.
 */
