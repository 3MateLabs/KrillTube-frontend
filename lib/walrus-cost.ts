/**
 * Walrus cost estimation utility using @mysten/walrus SDK
 */

import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';

const MIST_PER_SUI = 1_000_000_000;

// Get network from environment
const network = (process.env.WALRUS_NETWORK || 'mainnet') as 'testnet' | 'mainnet';

// Create Sui client with Walrus extension
const suiClient = (new SuiClient({
  url: getFullnodeUrl(network),
}) as any).extend(walrus({ network }));

export interface WalrusCostEstimate {
  storageCost: bigint;
  writeCost: bigint;
  totalCost: bigint;
  totalCostSui: string;
  sizeBytes: number;
  epochs: number;
  network: string;
}

/**
 * Calculate the cost of storing data on Walrus
 * @param sizeBytes Size of data in bytes
 * @param epochs Number of epochs to store (default: 200 for mainnet, 1 for testnet)
 * @returns Cost breakdown in MIST and SUI
 */
export async function estimateWalrusCost(
  sizeBytes: number,
  epochs?: number
): Promise<WalrusCostEstimate> {
  // Default epochs based on network
  const defaultEpochs = network === 'mainnet' ? 200 : 1;
  const epochsToUse = epochs || defaultEpochs;

  try {
    // Use Walrus SDK to calculate cost
    const cost = await suiClient.storageCost(sizeBytes, epochsToUse);

    // Convert to SUI for display
    const totalCostSui = (Number(cost.totalCost) / MIST_PER_SUI).toFixed(6);

    return {
      storageCost: cost.storageCost,
      writeCost: cost.writeCost,
      totalCost: cost.totalCost,
      totalCostSui,
      sizeBytes,
      epochs: epochsToUse,
      network,
    };
  } catch (error) {
    console.error('[WalrusCost] Error calculating cost:', error);
    throw new Error(`Failed to estimate Walrus cost: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate total cost for a video with multiple renditions
 * @param totalSize Total size of all video files (segments + playlists + poster)
 * @param epochs Number of epochs to store
 * @returns Cost estimate
 */
export async function estimateVideoCost(
  totalSize: number,
  epochs?: number
): Promise<WalrusCostEstimate> {
  return estimateWalrusCost(totalSize, epochs);
}

/**
 * Format cost for display
 * @param cost Cost estimate
 * @returns Formatted string
 */
export function formatCost(cost: WalrusCostEstimate): string {
  return `${cost.totalCostSui} SUI (${cost.sizeBytes.toLocaleString()} bytes for ${cost.epochs} epochs on ${cost.network})`;
}

/**
 * Get cost breakdown for display
 * @param cost Cost estimate
 * @returns Breakdown object
 */
export function getCostBreakdown(cost: WalrusCostEstimate) {
  return {
    storage: (Number(cost.storageCost) / MIST_PER_SUI).toFixed(6),
    write: (Number(cost.writeCost) / MIST_PER_SUI).toFixed(6),
    total: cost.totalCostSui,
    sizeFormatted: formatBytes(cost.sizeBytes),
    epochs: cost.epochs,
    network: cost.network,
  };
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
