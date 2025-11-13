/**
 * Memez Wallet SDK
 * Uses the official @interest-protocol/memez-fun-sdk
 * Works on both client and server side
 */

import { MemezWalletSDK } from '@interest-protocol/memez-fun-sdk';
import { Network } from '@interest-protocol/sui-core-sdk';
import { getFullnodeUrl } from '@mysten/sui/client';

let _walletSdk: MemezWalletSDK | null = null;

function getWalletSdk(): MemezWalletSDK {
  if (!_walletSdk) {
    const fullNodeUrl = getFullnodeUrl('mainnet');

    // Get wallet registry ID from environment (works on both client and server)
    const walletRegistryObjectId = typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_MEMEZ_WALLET_REGISTRY_ID
      : process.env.MEMEZ_WALLET_REGISTRY_ID || process.env.NEXT_PUBLIC_MEMEZ_WALLET_REGISTRY_ID;

    console.log({
      fullNodeUrl,
    })
    _walletSdk = new MemezWalletSDK({
      network: "mainnet",
      fullNodeUrl,
      ...(walletRegistryObjectId && { walletRegistryObjectId }),
    } as any);
  }
  return _walletSdk;
}

export const walletSdk = {
  getWalletAddress: (address: string) => getWalletSdk().getWalletAddress(address),
  newWallet: (params: any) => getWalletSdk().newWallet(params),
  receive: (params: any) => getWalletSdk().receive(params),
  mergeCoins: (params: any) => getWalletSdk().mergeCoins(params),
};
