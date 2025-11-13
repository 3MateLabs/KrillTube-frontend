/**
 * useTransaction hook
 * Provides sponsor transaction functionality
 */

import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

export function useTransaction() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  /**
   * Execute a transaction with sponsor (gas fees paid by sponsor)
   * In production, you'd call a backend service to sponsor the transaction
   * For now, this is a simplified version that uses the user's wallet
   */
  const executeTransaction = async (tx: Transaction) => {
    try {
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    } catch (error) {
      console.error('Transaction execution failed:', error);
      throw error;
    }
  };

  return {
    executeTransaction,
  };
}
