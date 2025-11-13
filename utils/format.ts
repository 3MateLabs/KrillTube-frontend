/**
 * Utility functions for formatting numbers and strings
 */

/**
 * Format a number with K, M, B suffixes
 * @param num - The number to format
 * @returns Formatted string with suffix
 */
export function formatNumberWithSuffix(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}
