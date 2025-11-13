/**
 * Types for BlockVision API and wallet coin data
 */

export interface WalletCoin {
  coinType: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  value: number;
  iconUrl?: string;
}

export interface BlockVisionResponse {
  coins: WalletCoin[];
  total: number;
}
