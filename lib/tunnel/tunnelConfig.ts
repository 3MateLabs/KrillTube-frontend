/**
 * Tunnel Creator Config Utilities
 *
 * Handles creation of creator configs for the Tunnel payment system.
 * Supports both IOTA and Sui networks using normal transaction building.
 */

import { Transaction as SuiTransaction } from '@mysten/sui/transactions';
import { Transaction as IotaTransaction } from '@iota/iota-sdk/transactions';

// Receiver type constants (from Move module)
export const RECEIVER_TYPE_CREATOR_ADDRESS = 4020;
export const RECEIVER_TYPE_REFERER_ADDRESS = 4022;
export const RECEIVER_TYPE_PLATFORM = 4021;

export interface CreatorConfigParams {
  creatorAddress: string;
  operatorAddress: string; // Who can claim on behalf of creator
  metadata?: string;
  gracePeriodMs?: number; // Default: 60 minutes
  platformFeeBps?: number; // Default: 10% (1000 bps)
  referrerFeeBps?: number; // From upload page, e.g. 30% (3000 bps)
}

/**
 * Get operator's public key as Uint8Array
 */
function getOperatorPublicKey(network: 'sui' | 'iota'): Uint8Array {
  const publicKeyHex = network === 'iota'
    ? process.env.NEXT_PUBLIC_IOTA_OPERATOR_PUBLIC_KEY
    : process.env.NEXT_PUBLIC_SUI_OPERATOR_PUBLIC_KEY;

  if (!publicKeyHex) {
    throw new Error(`NEXT_PUBLIC_${network.toUpperCase()}_OPERATOR_PUBLIC_KEY not set in environment`);
  }

  // Remove 0x prefix if present
  const hex = publicKeyHex.startsWith('0x') ? publicKeyHex.slice(2) : publicKeyHex;

  // Convert hex to Uint8Array
  const publicKey = new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  if (publicKey.length !== 32) {
    throw new Error(`Invalid operator public key length: ${publicKey.length} (expected 32 bytes)`);
  }

  return publicKey;
}

/**
 * Calculate fee distribution
 */
function calculateFeeDistribution(
  platformFeeBps: number,
  referrerFeeBps: number
): { creatorFeeBps: number; platformFeeBps: number; referrerFeeBps: number } {
  const totalFeeBps = platformFeeBps + referrerFeeBps;

  if (totalFeeBps >= 10000) {
    throw new Error(`Total fees (${totalFeeBps / 100}%) must be less than 100%`);
  }

  const creatorFeeBps = 10000 - totalFeeBps;

  return {
    creatorFeeBps,
    platformFeeBps,
    referrerFeeBps,
  };
}

/**
 * Create creator config transaction for IOTA
 */
export function createIotaCreatorConfigTransaction(
  params: CreatorConfigParams
): IotaTransaction {
  const PACKAGE_ID = process.env.NEXT_PUBLIC_IOTA_TUNNEL_PACKAGE_ID;
  const PLATFORM_FEE_WALLET = process.env.NEXT_PUBLIC_IOTA_FEE_WALLET;

  if (!PACKAGE_ID) {
    throw new Error('NEXT_PUBLIC_IOTA_TUNNEL_PACKAGE_ID not set in environment');
  }

  if (!PLATFORM_FEE_WALLET) {
    throw new Error('NEXT_PUBLIC_IOTA_FEE_WALLET not set in environment');
  }

  const operatorPublicKey = getOperatorPublicKey('iota');

  // Default values
  const platformFeeBps = params.platformFeeBps ?? 1000; // 10%
  const referrerFeeBps = params.referrerFeeBps ?? 3000; // 30%
  const metadata = params.metadata ?? 'KrillTube Creator';
  const gracePeriodMs = params.gracePeriodMs ?? 3600000; // 60 minutes

  // Calculate fee distribution
  const fees = calculateFeeDistribution(platformFeeBps, referrerFeeBps);

  console.log('[TunnelConfig] IOTA Fee distribution:', {
    creator: `${fees.creatorFeeBps / 100}%`,
    platform: `${fees.platformFeeBps / 100}%`,
    referrer: `${fees.referrerFeeBps / 100}%`,
  });

  const tx = new IotaTransaction();

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

  // Create creator config
  const publicKeyArray = Array.from(operatorPublicKey);

  tx.moveCall({
    target: `${PACKAGE_ID}::tunnel::create_creator_config`,
    arguments: [
      tx.pure.address(params.operatorAddress),
      tx.pure.vector('u8', publicKeyArray),
      tx.pure.string(metadata),
      receiverConfigs,
      tx.pure.u64(gracePeriodMs),
    ],
  });

  return tx;
}

/**
 * Create creator config transaction for Sui
 */
export function createSuiCreatorConfigTransaction(
  params: CreatorConfigParams
): SuiTransaction {
  const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_TUNNEL_PACKAGE_ID;
  const PLATFORM_FEE_WALLET = process.env.NEXT_PUBLIC_SUI_FEE_WALLET;

  if (!PACKAGE_ID) {
    throw new Error('NEXT_PUBLIC_SUI_TUNNEL_PACKAGE_ID not set in environment');
  }

  if (!PLATFORM_FEE_WALLET) {
    throw new Error('NEXT_PUBLIC_SUI_FEE_WALLET not set in environment');
  }

  const operatorPublicKey = getOperatorPublicKey('sui');

  // Default values
  const platformFeeBps = params.platformFeeBps ?? 1000; // 10%
  const referrerFeeBps = params.referrerFeeBps ?? 3000; // 30%
  const metadata = params.metadata ?? 'KrillTube Creator';
  const gracePeriodMs = params.gracePeriodMs ?? 3600000; // 60 minutes

  // Calculate fee distribution
  const fees = calculateFeeDistribution(platformFeeBps, referrerFeeBps);

  console.log('[TunnelConfig] Sui Fee distribution:', {
    creator: `${fees.creatorFeeBps / 100}%`,
    platform: `${fees.platformFeeBps / 100}%`,
    referrer: `${fees.referrerFeeBps / 100}%`,
  });

  const tx = new SuiTransaction();

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

  // Create creator config
  const publicKeyArray = Array.from(operatorPublicKey);

  tx.moveCall({
    target: `${PACKAGE_ID}::tunnel::create_creator_config`,
    arguments: [
      tx.pure.address(params.operatorAddress),
      tx.pure.vector('u8', publicKeyArray),
      tx.pure.string(metadata),
      receiverConfigs,
      tx.pure.u64(gracePeriodMs),
    ],
  });

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
