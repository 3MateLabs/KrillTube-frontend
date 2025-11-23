/**
 * Simple Walrus cost estimation without SDK (no WASM issues)
 * Uses approximate pricing based on Walrus network rates
 */

const MIST_PER_WAL = 1_000_000_000;

// Approximate Walrus pricing (these are estimates, actual prices fetched from blockchain)
// Mainnet approximate rates
const STORAGE_PRICE_PER_MB_PER_EPOCH = 0.000075; // ~0.000075 WAL per MB per epoch
const WRITE_PRICE_PER_MB = 0.0001; // ~0.0001 WAL per MB one-time

export interface WalrusCostEstimate {
  storageCost: bigint;
  writeCost: bigint;
  totalCost: bigint;
  totalCostWal: string;
  sizeBytes: number;
  epochs: number;
  network: string;
}

/**
 * Calculate approximate Walrus storage cost
 * @param sizeBytes Size of data in bytes
 * @param epochs Number of epochs to store (default: 200)
 * @returns Cost estimate
 */
export function estimateWalrusCost(
  sizeBytes: number,
  epochs?: number
): WalrusCostEstimate {
  const network = process.env.NEXT_PUBLIC_WALRUS_NETWORK || 'mainnet';
  const defaultEpochs = network === 'mainnet' ? 200 : 1;
  const epochsToUse = epochs || defaultEpochs;

  // Convert bytes to MB
  const sizeMB = sizeBytes / (1024 * 1024);

  // Calculate storage cost (per MB per epoch)
  const storageCostWal = sizeMB * STORAGE_PRICE_PER_MB_PER_EPOCH * epochsToUse;
  const storageCostMist = BigInt(Math.floor(storageCostWal * MIST_PER_WAL));

  // Calculate write cost (one-time per MB)
  const writeCostWal = sizeMB * WRITE_PRICE_PER_MB;
  const writeCostMist = BigInt(Math.floor(writeCostWal * MIST_PER_WAL));

  // Total cost
  const totalCostMist = storageCostMist + writeCostMist;

  // Divide all costs by 8 for budget estimation adjustment
  const adjustedStorageCost = storageCostMist / 8n;
  const adjustedWriteCost = writeCostMist / 8n;
  const adjustedTotalCost = totalCostMist / 8n;
  const totalCostWal = (Number(adjustedTotalCost) / MIST_PER_WAL).toFixed(6);

  return {
    storageCost: adjustedStorageCost,
    writeCost: adjustedWriteCost,
    totalCost: adjustedTotalCost,
    totalCostWal,
    sizeBytes,
    epochs: epochsToUse,
    network,
  };
}

/**
 * Calculate total cost for a video with multiple renditions
 */
export function estimateVideoCost(
  totalSize: number,
  epochs?: number
): WalrusCostEstimate {
  return estimateWalrusCost(totalSize, epochs);
}

/**
 * Format cost for display
 */
export function formatCost(cost: WalrusCostEstimate): string {
  return `${cost.totalCostWal} WAL (${cost.sizeBytes.toLocaleString()} bytes for ${cost.epochs} epochs on ${cost.network})`;
}

/**
 * Get cost breakdown for display
 */
export function getCostBreakdown(cost: WalrusCostEstimate) {
  return {
    storage: (Number(cost.storageCost) / MIST_PER_WAL).toFixed(6),
    write: (Number(cost.writeCost) / MIST_PER_WAL).toFixed(6),
    total: cost.totalCostWal,
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
