'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatNumberWithSuffix } from '@/utils/format';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import type { CoinStruct } from '@mysten/sui/client';
import type { WalletCoin } from '@/types/blockvision';
import { useTransaction } from '@/hooks/sui/use-transaction';
import { walletSdk } from '@/lib/memez/sdk';
import { suiClient } from '@/lib/sui-client';

export default function RewardPage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [walletCoins, setWalletCoins] = useState<WalletCoin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [claimingCoinType, setClaimingCoinType] = useState<string | null>(null);
  const [memezWalletAddress, setMemezWalletAddress] = useState<string | null>(null);
  const [hasMemezWallet, setHasMemezWallet] = useState<boolean>(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState<boolean>(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState<boolean>(false);
  const { executeTransaction } = useTransaction();

  /**
   * Merge coins in the memez wallet (backend sponsored)
   * Returns the merged coin object ID
   */
  const mergeCoinsInWallet = async (coin: WalletCoin): Promise<string> => {
    // Fetch all coins of this type from the memez wallet
    const allCoins: CoinStruct[] = [];
    let cursor: string | null | undefined = undefined;
    let hasNextPage = true;

    while (hasNextPage) {
      let retries = 0;
      const maxRetries = 3;
      let response = null;

      while (retries < maxRetries) {
        try {
          response = await suiClient.getCoins({
            owner: memezWalletAddress!,
            coinType: coin.coinType,
            cursor,
          });
          break;
        } catch (error: any) {
          if (error?.status === 429 || error?.message?.includes('429')) {
            retries++;
            if (retries >= maxRetries) {
              throw new Error(`Rate limited after ${maxRetries} retries`);
            }
            const waitTime = Math.pow(2, retries - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('Failed to fetch coins after retries');
      }

      allCoins.push(...response.data);
      hasNextPage = response.hasNextPage;
      cursor = response.nextCursor;
    }

    if (allCoins.length === 0) {
      throw new Error('No coins found');
    }

    // If only one coin, return it directly
    if (allCoins.length === 1) {
      return allCoins[0].coinObjectId;
    }

    // Multiple coins - need to merge them via backend (sponsor transaction)
    const BATCH_SIZE = 500;
    let remainingCoins = [...allCoins];

    while (remainingCoins.length > 1) {
      const batches: typeof allCoins[] = [];
      for (let i = 0; i < remainingCoins.length; i += BATCH_SIZE) {
        batches.push(
          remainingCoins.slice(i, Math.min(i + BATCH_SIZE, remainingCoins.length))
        );
      }

      // Merge batches in parallel
      const mergePromises = batches.map(async (batch) => {
        console.log({batch, memezWalletAddress})
        const mergeResponse = await fetch('/api/wallet/merge-coins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coins: batch.map((c) => ({
              objectId: c.coinObjectId,
              version: c.version,
              digest: c.digest,
            })),
            coinType: coin.coinType,
            walletAddress: memezWalletAddress,
          }),
        });

        if (!mergeResponse.ok) {
          const errorData = await mergeResponse.json();
          throw new Error(errorData.error || 'Failed to merge coins');
        }

        const mergeData = await mergeResponse.json();
        if (!mergeData.success) {
          throw new Error(mergeData.error || 'Merge failed');
        }

        return mergeData;
      });

      await Promise.all(mergePromises);

      // Wait for blockchain to update
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Fetch updated coins
      const updatedCoins: CoinStruct[] = [];
      cursor = undefined;
      hasNextPage = true;

      while (hasNextPage) {
        const response = await suiClient.getCoins({
          owner: memezWalletAddress!,
          coinType: coin.coinType,
          cursor,
        });
        updatedCoins.push(...response.data);
        hasNextPage = response.hasNextPage;
        cursor = response.nextCursor;
      }

      remainingCoins = updatedCoins;

      if (remainingCoins.length === 1) {
        return remainingCoins[0].coinObjectId;
      }
    }

    throw new Error('Failed to merge coins to single object');
  };

  // Fetch wallet coins from BlockVision via proxy
  const fetchWalletCoins = useCallback(async () => {
    if (!memezWalletAddress) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/wallet/coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: memezWalletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet coins');
      }

      const data = await response.json();
      const coins = data.coins || [];

      setWalletCoins(coins);
    } catch (error) {
      console.error('Error fetching wallet coins:', error);
      toast.error('Failed to load wallet funds');
      setWalletCoins([]);
    } finally {
      setIsLoading(false);
    }
  }, [memezWalletAddress]);

  // Handle claim button click
  const handleClaim = useCallback(
    async (coin: WalletCoin) => {
      if (!account || !memezWalletAddress) return;

      setClaimingCoinType(coin.coinType);
      let loadingToastId = toast.loading('Merging coins...');

      try {
        // Step 1: Merge all coins in the memez wallet (backend sponsored)
        const mergedCoinId = await mergeCoinsInWallet(coin);
        console.log('[Claim] Merged coin ID:', mergedCoinId);

        // Update toast
        toast.dismiss(loadingToastId);
        loadingToastId = toast.loading('Preparing claim transaction...');

        // Step 2: Create transaction to receive and transfer the coin
        const tx = new Transaction();

        // Receive the coin from the memez wallet
        const { object } = walletSdk.receive({
          tx,
          type: `0x2::coin::Coin<${coin.coinType}>`,
          objectId: mergedCoinId,
          wallet: memezWalletAddress,
        });

        // Transfer the coin to user's main wallet
        tx.transferObjects([object], account.address);

        // Set gas budget
        tx.setGasBudget(10000000);

        // Dismiss loading toast
        toast.dismiss(loadingToastId);

        // Step 3: User signs and executes the transaction
        await executeTransaction(tx);

        toast.success(`${coin.symbol} claimed successfully!`);

        // Refresh wallet coins after claim
        setTimeout(() => {
          fetchWalletCoins();
        }, 2000);
      } catch (error) {
        console.error('❌ CLAIM FAILED:', error);
        toast.dismiss(loadingToastId);
        toast.error(
          `Failed to claim ${coin.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setClaimingCoinType(null);
      }
    },
    [account, memezWalletAddress, fetchWalletCoins, executeTransaction]
  );

  // Handle claim all button - sequential processing with progress updates
  const handleClaimAll = useCallback(async () => {
    if (walletCoins.length === 0 || !account || !memezWalletAddress) return;

    // Limit to 10 coins maximum
    const MAX_COINS = 10;
    const coinsToProcess = walletCoins.slice(0, MAX_COINS);

    setClaimingCoinType('all');
    let progressToastId: string | undefined;

    try {
      // Create a single transaction for all coins
      const tx = new Transaction();

      // Process each coin sequentially
      let successCount = 0;
      const failedCoins: string[] = [];

      for (let i = 0; i < coinsToProcess.length; i++) {
        const coin = coinsToProcess[i];

        // Update progress toast
        if (progressToastId) {
          toast.dismiss(progressToastId);
        }
        progressToastId = toast.loading(
          `Merging ${coin.symbol} (${i + 1}/${coinsToProcess.length})...`
        );

        try {
          // Merge coins in the memez wallet (backend sponsored)
          const mergedCoinId = await mergeCoinsInWallet(coin);

          // Receive and add to transaction
          const { object } = walletSdk.receive({
            tx,
            type: `0x2::coin::Coin<${coin.coinType}>`,
            objectId: mergedCoinId,
            wallet: memezWalletAddress,
          });

          // Transfer the coin to user's main wallet
          tx.transferObjects([object], account.address);

          successCount++;
        } catch (error) {
          console.error(`Failed to process ${coin.symbol}:`, error);
          failedCoins.push(coin.symbol);
        }
      }

      // Dismiss progress toast
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }

      if (successCount === 0) {
        throw new Error('No coins could be prepared for claiming');
      }

      // Show warning if some coins failed
      if (failedCoins.length > 0) {
        toast.error(`Could not claim: ${failedCoins.join(', ')}`);
      }

      // Show warning if we hit the limit
      if (walletCoins.length > MAX_COINS) {
        toast(
          `Processing first ${MAX_COINS} coins. Run claim all again for remaining coins.`
        );
      }

      // Set gas budget
      tx.setGasBudget(10000000);

      // User signs the transaction
      await executeTransaction(tx);

      toast.success(`Successfully claimed ${successCount} reward(s)!`);

      // Refresh wallet coins after claim
      setTimeout(() => {
        fetchWalletCoins();
      }, 2000);
    } catch (error) {
      console.error('❌ CLAIM ALL FAILED:', error);
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }
      toast.error(
        `Failed to claim rewards: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setClaimingCoinType(null);
    }
  }, [account, walletCoins, memezWalletAddress, fetchWalletCoins, executeTransaction]);

  // Check if memez wallet exists
  const checkMemezWallet = useCallback(async () => {
    if (!account || !account.address) return;

    setIsCheckingWallet(true);
    try {
      const memezAddr = await walletSdk.getWalletAddress(account.address);
      console.log('Memez wallet address:', memezAddr);

      if (memezAddr) {
        setMemezWalletAddress(memezAddr);
        setHasMemezWallet(true);
      } else {
        // Wallet doesn't exist yet
        setHasMemezWallet(false);
      }
    } catch (error) {
      console.error('Failed to get memez wallet address:', error);
      setHasMemezWallet(false);
    } finally {
      setIsCheckingWallet(false);
    }
  }, [account]);

  // Create memez wallet
  const handleCreateWallet = useCallback(async () => {
    if (!account || !account.address) return;

    setIsCreatingWallet(true);
    const loadingToastId = toast.loading('Creating your memez wallet...');

    try {
      // Create transaction
      const tx = new Transaction();

      // Call the SDK method to create wallet
      const { tx: walletTx } = await walletSdk.newWallet({
        owner: account.address,
        tx,
      });

      // Set gas budget
      walletTx.setGasBudget(10000000);

      // Execute transaction
      await executeTransaction(walletTx);

      toast.dismiss(loadingToastId);
      toast.success('Memez wallet created successfully!');

      // Recheck wallet existence
      setTimeout(() => {
        checkMemezWallet();
      }, 2000);
    } catch (error) {
      console.error('Failed to create memez wallet:', error);
      toast.dismiss(loadingToastId);
      toast.error(
        `Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsCreatingWallet(false);
    }
  }, [account, executeTransaction, checkMemezWallet]);

  // Get Memez wallet address when user connects
  useEffect(() => {
    if (account && account.address) {
      checkMemezWallet();
    }
  }, [account, checkMemezWallet]);

  // Fetch coins when memez wallet address is available and exists
  useEffect(() => {
    if (memezWalletAddress && hasMemezWallet) {
      fetchWalletCoins();
    }
  }, [memezWalletAddress, hasMemezWallet, fetchWalletCoins]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Referral Rewards</h1>
          <p className="text-text-muted">
            Claim your referral rewards from the memez wallet
          </p>
          {memezWalletAddress && (
            <div className="mt-4 p-4 bg-background-elevated border border-border rounded-lg">
              <p className="text-sm font-mono text-text-muted">
                Your memez wallet:{' '}
                <span className="text-walrus-mint font-medium">
                  {memezWalletAddress}
                </span>
              </p>
            </div>
          )}
          {!memezWalletAddress && !isCheckingWallet && account && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm font-mono text-yellow-500">
                No memez wallet detected. Create one below to start receiving rewards.
              </p>
            </div>
          )}
        </div>

        {!account ? (
          <div className="flex flex-col items-center justify-center py-16 bg-background-elevated border border-border rounded-lg">
            <p className="text-sm font-mono text-text-muted uppercase">
              Please connect your wallet to view rewards
            </p>
          </div>
        ) : isCheckingWallet ? (
          <div className="flex flex-col items-center justify-center py-16 bg-background-elevated border border-border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
            <p className="mt-3 text-sm font-mono text-text-muted">
              Checking memez wallet...
            </p>
          </div>
        ) : !hasMemezWallet ? (
          <div className="flex flex-col items-center justify-center py-16 bg-background-elevated border border-border rounded-lg">
            <div className="text-center max-w-md">
              <svg
                className="w-16 h-16 text-text-muted/40 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Memez Wallet Yet
              </h3>
              <p className="text-text-muted mb-6 text-sm">
                You need to create a memez wallet to receive and claim rewards
              </p>
              <Button
                onClick={handleCreateWallet}
                disabled={isCreatingWallet}
                size="lg"
                className="font-mono uppercase"
              >
                {isCreatingWallet ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create One'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {walletCoins.length > 0 && (
              <div className="flex justify-end mb-4">
                <Button
                  onClick={handleClaimAll}
                  disabled={claimingCoinType === 'all'}
                  className="font-mono uppercase"
                >
                  {claimingCoinType === 'all' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Claiming...
                    </>
                  ) : (
                    'Claim Many (max 10 at a time)'
                  )}
                </Button>
              </div>
            )}

            {/* Coins Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
                  <p className="mt-3 text-sm font-mono text-text-muted">
                    Loading wallet rewards...
                  </p>
                </div>
              ) : walletCoins.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-4 font-mono text-sm font-medium uppercase text-text-muted">
                          Token
                        </th>
                        <th className="text-right p-4 font-mono text-sm font-medium uppercase text-text-muted">
                          Balance
                        </th>
                        <th className="text-right p-4 font-mono text-sm font-medium uppercase text-text-muted">
                          Value
                        </th>
                        <th className="text-center p-4 font-mono text-sm font-medium uppercase text-text-muted">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {walletCoins.map((coin) => (
                        <tr
                          key={coin.coinType}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {coin.iconUrl ? (
                                <img
                                  src={coin.iconUrl}
                                  alt={coin.symbol}
                                  className="h-8 w-8 rounded-full"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs font-mono uppercase">
                                    {coin.symbol?.slice(0, 2)}
                                  </span>
                                </div>
                              )}
                              <div>
                                <div className="font-mono text-sm font-medium">
                                  {coin.symbol}
                                </div>
                                <div className="text-xs text-text-muted">{coin.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-mono text-sm">
                              {formatNumberWithSuffix(
                                parseFloat(coin.balance) / Math.pow(10, coin.decimals)
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-mono text-sm">
                              {coin.value && coin.value > 0
                                ? `$${formatNumberWithSuffix(coin.value)}`
                                : '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              size="sm"
                              onClick={() => handleClaim(coin)}
                              disabled={claimingCoinType === coin.coinType}
                              className="font-mono uppercase"
                            >
                              {claimingCoinType === coin.coinType ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Claim'
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm font-mono text-text-muted uppercase">
                    No rewards available
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
