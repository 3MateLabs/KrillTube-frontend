import { useState, useEffect, useCallback } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiClient } from '@mysten/dapp-kit';

const DELEGATOR_STORAGE_KEY = 'krilltube_personal_delegator';
const DELEGATOR_VERSION = 'v1';
const VERSION_KEY = 'krilltube_delegator_version';

export interface PersonalDelegatorState {
  keypair: Ed25519Keypair | null;
  address: string | null;
  balance: bigint;
  isInitialized: boolean;
}

export function usePersonalDelegator() {
  const suiClient = useSuiClient();
  const [delegatorState, setDelegatorState] = useState<PersonalDelegatorState>({
    keypair: null,
    address: null,
    balance: BigInt(0),
    isInitialized: false,
  });

  // Initialize or load delegator keypair
  useEffect(() => {
    const initDelegator = () => {
      try {
        const storedVersion = localStorage.getItem(VERSION_KEY);
        const storedKey = localStorage.getItem(DELEGATOR_STORAGE_KEY);
        let keypair: Ed25519Keypair;

        if (storedKey && storedVersion === DELEGATOR_VERSION) {
          // Restore existing keypair
          try {
            const keyBytes = Buffer.from(storedKey, 'base64');
            // Ed25519Keypair.fromSecretKey expects only the 32-byte private key
            const privateKey = keyBytes.slice(0, 32);
            keypair = Ed25519Keypair.fromSecretKey(privateKey);
            console.log('[Delegator] Restored existing delegator wallet');
          } catch (error) {
            console.error('[Delegator] Failed to restore, generating new one:', error);
            keypair = Ed25519Keypair.generate();
            // Store only the first 32 bytes (private key)
            const privateKey = keypair.getSecretKey().slice(0, 32);
            const secretKey = Buffer.from(privateKey).toString('base64');
            localStorage.setItem(DELEGATOR_STORAGE_KEY, secretKey);
            localStorage.setItem(VERSION_KEY, DELEGATOR_VERSION);
          }
        } else {
          // Generate new delegator
          keypair = Ed25519Keypair.generate();
          // Store only the first 32 bytes (private key)
          const privateKey = keypair.getSecretKey().slice(0, 32);
          const secretKey = Buffer.from(privateKey).toString('base64');
          localStorage.setItem(DELEGATOR_STORAGE_KEY, secretKey);
          localStorage.setItem(VERSION_KEY, DELEGATOR_VERSION);
          console.log('[Delegator] Generated new delegator wallet');
        }

        const address = keypair.getPublicKey().toSuiAddress();

        setDelegatorState({
          keypair,
          address,
          balance: BigInt(0),
          isInitialized: true,
        });

        console.log('[Delegator] Initialized:', address);
      } catch (error) {
        console.error('[Delegator] Failed to initialize:', error);
      }
    };

    initDelegator();
  }, []);

  // Check delegator balance
  const checkBalance = useCallback(async (): Promise<{ sui: number; wal: number } | null> => {
    if (!delegatorState.address) return null;

    try {
      const WAL_TOKEN_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

      const [suiBalance, walBalance] = await Promise.all([
        suiClient.getBalance({
          owner: delegatorState.address,
          coinType: '0x2::sui::SUI',
        }),
        suiClient.getBalance({
          owner: delegatorState.address,
          coinType: WAL_TOKEN_TYPE,
        }),
      ]);

      const suiAmount = BigInt(suiBalance.totalBalance);
      const walAmount = BigInt(walBalance.totalBalance);

      setDelegatorState(prev => ({ ...prev, balance: suiAmount }));

      const result = {
        sui: Number(suiAmount) / 1_000_000_000,
        wal: Number(walAmount) / 1_000_000_000,
      };

      console.log('[Delegator] Balance:', result);
      return result;
    } catch (error) {
      console.error('[Delegator] Failed to check balance:', error);
      return null;
    }
  }, [delegatorState.address, suiClient]);

  // Build PTB funding transaction (user signs ONCE for SUI gas + WAL storage)
  const buildFundingTransaction = useCallback(async (
    userAddress: string,
    suiGasAmount: bigint,
    walStorageAmount: bigint,
  ): Promise<Transaction | null> => {
    if (!delegatorState.address) {
      console.error('[Delegator] Not initialized');
      return null;
    }

    // WAL token type on mainnet
    const WAL_TOKEN_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

    // Query user's WAL coins to find one with sufficient balance
    console.log('[Delegator] Fetching WAL coins...');
    const walCoins = await suiClient.getCoins({
      owner: userAddress,
      coinType: WAL_TOKEN_TYPE,
    });

    if (!walCoins.data || walCoins.data.length === 0) {
      throw new Error('No WAL tokens found in wallet. Please acquire WAL tokens first.');
    }

    // Find a coin with sufficient balance
    const sortedCoins = walCoins.data.sort((a, b) => Number(b.balance) - Number(a.balance));
    const primaryCoin = sortedCoins[0];

    if (BigInt(primaryCoin.balance) < walStorageAmount) {
      throw new Error(`Insufficient WAL balance. Need ${Number(walStorageAmount) / 1_000_000_000} WAL, have ${Number(primaryCoin.balance) / 1_000_000_000} WAL`);
    }

    console.log(`[Delegator] Using WAL coin: ${primaryCoin.coinObjectId} (${(Number(primaryCoin.balance) / 1_000_000_000).toFixed(4)} WAL)`);

    const tx = new Transaction();
    tx.setSender(userAddress);

    // 1. Split SUI for delegator gas fees
    const [suiCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(suiGasAmount.toString())]);
    tx.transferObjects([suiCoin], tx.pure.address(delegatorState.address));

    // 2. Split WAL tokens for storage payment
    const [walCoin] = tx.splitCoins(
      tx.object(primaryCoin.coinObjectId),
      [tx.pure.u64(walStorageAmount.toString())]
    );
    tx.transferObjects([walCoin], tx.pure.address(delegatorState.address));

    console.log('[Delegator] Built PTB funding transaction:', {
      from: userAddress,
      to: delegatorState.address,
      suiGas: Number(suiGasAmount) / 1_000_000_000 + ' SUI',
      walStorage: Number(walStorageAmount) / 1_000_000_000 + ' WAL',
    });

    return tx;
  }, [delegatorState.address, suiClient]);

  // Execute transaction with delegator (no wallet popup!)
  const executeWithDelegator = useCallback(async (
    transaction: Transaction,
  ): Promise<{ digest: string; success: boolean } | null> => {
    if (!delegatorState.keypair || !delegatorState.address) {
      console.error('[Delegator] Not initialized');
      return null;
    }

    try {
      // Check delegator balance before executing
      const balance = await suiClient.getBalance({
        owner: delegatorState.address,
        coinType: '0x2::sui::SUI',
      });
      console.log('[Delegator] Current SUI balance:', {
        address: delegatorState.address,
        balance: Number(balance.totalBalance) / 1_000_000_000,
        balanceMist: balance.totalBalance,
      });

      if (BigInt(balance.totalBalance) === BigInt(0)) {
        throw new Error('Delegator has 0 SUI balance - cannot pay for gas. Please fund the delegator first.');
      }

      transaction.setSender(delegatorState.address);

      const result = await suiClient.signAndExecuteTransaction({
        signer: delegatorState.keypair as any,
        transaction: transaction as any,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log('[Delegator] Executed transaction:', result.digest);
      return {
        digest: result.digest,
        success: result.effects?.status.status === 'success',
      };
    } catch (error) {
      console.error('[Delegator] ❌ Failed to execute transaction:', error);
      throw new Error(
        `Delegator transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }
  }, [delegatorState.keypair, delegatorState.address, suiClient]);

  // Auto-reclaim unused SUI back to user
  const autoReclaimGas = useCallback(async (
    userAddress: string,
  ): Promise<{ digest: string; recovered: bigint } | null> => {
    if (!delegatorState.keypair || !delegatorState.address) {
      console.error('[Delegator] Not initialized');
      return null;
    }

    try {
      // Check current balance
      const balance = await checkBalance();

      if (!balance || balance.sui <= 0) {
        console.log('[Delegator] Wallet is empty, nothing to reclaim');
        return { digest: '', recovered: BigInt(0) };
      }

      console.log('[Delegator] Reclaiming:', balance);

      // Build reclaim transaction
      const tx = new Transaction();
      tx.setSender(delegatorState.address);

      // Transfer all remaining SUI back to user
      // Sui automatically deducts gas fees from the transfer
      tx.transferObjects([tx.gas], tx.pure.address(userAddress));

      // Execute with delegator keypair (no user signature needed!)
      const result = await suiClient.signAndExecuteTransaction({
        signer: delegatorState.keypair as any,
        transaction: tx as any,
        options: {
          showEffects: true,
          showBalanceChanges: true,
        },
      });

      console.log('[Delegator] Auto-reclaimed SUI:', result.digest);
      console.log('[Delegator] Recovered:', Number(balance) / 1_000_000_000, 'SUI');

      // Update local balance
      setDelegatorState(prev => ({ ...prev, balance: BigInt(0) }));

      return {
        digest: result.digest,
        recovered: balance,
      };
    } catch (error: any) {
      console.error('[Delegator] Failed to auto-reclaim:', error);

      // Don't throw - this is a cleanup operation
      if (error.message?.includes('No valid gas coins')) {
        console.log('[Delegator] Insufficient balance for gas fees');
      }

      return null;
    }
  }, [delegatorState.keypair, delegatorState.address, suiClient, checkBalance]);

  // Clear delegator (for logout/reset)
  const clearDelegator = useCallback(() => {
    localStorage.removeItem(DELEGATOR_STORAGE_KEY);
    localStorage.removeItem(VERSION_KEY);
    setDelegatorState({
      keypair: null,
      address: null,
      balance: BigInt(0),
      isInitialized: false,
    });
    console.log('[Delegator] Cleared');
  }, []);

  // Estimate SUI needed for upload operations
  const estimateGasNeeded = useCallback((numberOfSegments: number): bigint => {
    // Each segment requires 2 transactions (register + certify)
    // Each transaction needs ~0.02 SUI gas budget (increased for safety)
    // Add poster, playlists, master playlist (not counted in numberOfSegments)
    const gasPerSegment = BigInt(40_000_000); // 0.04 SUI per segment (2 transactions × 0.02)
    const baseGas = BigInt(200_000_000);       // 0.2 SUI base overhead for poster + playlists
    const total = baseGas + (gasPerSegment * BigInt(numberOfSegments));

    console.log('[Delegator] Gas estimate for', numberOfSegments, 'segments:', {
      base: Number(baseGas) / 1_000_000_000 + ' SUI',
      perSegment: Number(gasPerSegment) / 1_000_000_000 + ' SUI',
      total: Number(total) / 1_000_000_000 + ' SUI',
    });

    return total;
  }, []);

  return {
    // State
    delegator: delegatorState.keypair,
    delegatorAddress: delegatorState.address,
    delegatorBalance: delegatorState.balance,
    isInitialized: delegatorState.isInitialized,

    // Actions
    buildFundingTransaction,
    executeWithDelegator,
    autoReclaimGas,
    checkBalance,
    clearDelegator,
    estimateGasNeeded,
  };
}
