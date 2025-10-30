/**
 * WalletSigner - Bridges browser wallet with Sui Signer interface
 *
 * This allows the Walrus SDK to work with browser-based wallets
 * that don't have direct private key access.
 */

'use client';

import { Signer, type SignatureWithBytes } from '@mysten/sui/cryptography';
import { type PublicKey } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import type { SignatureScheme } from '@mysten/sui/cryptography';

interface WalletSignerConfig {
  address: string;
  signAndExecuteTransaction: (args: { transaction: Transaction }) => Promise<any>;
  publicKey?: Uint8Array;
}

/**
 * Signer implementation that uses browser wallet for signing
 */
export class WalletSigner extends Signer {
  private address: string;
  private signAndExecuteFn: (args: { transaction: Transaction }) => Promise<any>;
  private publicKeyBytes?: Uint8Array;

  constructor(config: WalletSignerConfig) {
    super();
    this.address = config.address;
    this.signAndExecuteFn = config.signAndExecuteTransaction;
    this.publicKeyBytes = config.publicKey;
  }

  // @ts-expect-error - TypeScript issue with Uint8Array buffer types (ArrayBufferLike vs ArrayBuffer)
  async sign(bytes: Uint8Array): Promise<Uint8Array> {
    throw new Error('WalletSigner: Direct signing not supported. Use signAndExecuteTransaction.');
  }

  async signTransaction(bytes: Uint8Array): Promise<SignatureWithBytes> {
    throw new Error('WalletSigner: Use signAndExecuteTransaction instead.');
  }

  async signAndExecuteTransaction({
    transaction,
    client,
  }: {
    transaction: Transaction;
    client: SuiClient;
  }): Promise<any> {
    console.log('[WalletSigner] ========== SIGN AND EXECUTE TRANSACTION ==========');
    console.log('[WalletSigner] Requesting wallet signature...');
    console.log('[WalletSigner] signAndExecuteFn exists:', !!this.signAndExecuteFn);
    console.log('[WalletSigner] signAndExecuteFn type:', typeof this.signAndExecuteFn);

    // Log transaction details for debugging
    try {
      const txData = transaction.getData();
      console.log('[WalletSigner] Transaction has', txData.commands?.length || 0, 'commands');
      console.log('[WalletSigner] Transaction sender:', txData.sender);
      console.log('[WalletSigner] Transaction gas config:', txData.gasData);
    } catch (e) {
      console.log('[WalletSigner] Could not log transaction details:', e);
    }

    // Call the wallet's signAndExecuteTransaction
    console.log('[WalletSigner] ==========================================');
    console.log('[WalletSigner] NOW CALLING WALLET FUNCTION...');
    console.log('[WalletSigner] This should trigger wallet popup...');

    let result;
    try {
      // THIS is where wallet popup should appear
      console.log('[WalletSigner] Calling this.signAndExecuteFn with transaction...');
      result = await this.signAndExecuteFn({ transaction });
      console.log('[WalletSigner] ✓ Wallet function returned successfully!');
      console.log('[WalletSigner] Result:', result);
    } catch (error) {
      console.error('[WalletSigner] ✗ ERROR calling signAndExecuteFn:');
      console.error('[WalletSigner] Error type:', error?.constructor?.name);
      console.error('[WalletSigner] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[WalletSigner] Full error:', error);
      throw error;
    }

    console.log('[WalletSigner] Transaction signed and executed:', result.digest);

    // Wait for transaction to finalize and get full details
    if (result.digest) {
      console.log('[WalletSigner] Waiting for transaction finalization...');
      const txResult = await client.waitForTransaction({
        digest: result.digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
          showBalanceChanges: true,
        },
      });

      console.log('[WalletSigner] Transaction finalized. Effects:', {
        status: txResult.effects?.status,
        objectChanges: txResult.objectChanges?.length,
        hasEffects: !!txResult.effects,
      });

      // The Walrus SDK expects effects.changedObjects
      // Convert objectChanges to changedObjects format if needed
      if (txResult.effects && !(txResult.effects as any).changedObjects && txResult.objectChanges) {
        console.log('[WalletSigner] Converting objectChanges to changedObjects format');
        // Map objectChanges to the format the SDK expects
        (txResult.effects as any).changedObjects = txResult.objectChanges.map((change: any) => ({
          id: change.objectId,
          idOperation: change.type === 'created' ? 'Created' :
                       change.type === 'mutated' ? 'Mutated' :
                       change.type === 'deleted' ? 'Deleted' : 'None',
        }));
      }

      return txResult;
    }

    return result;
  }

  toSuiAddress(): string {
    return this.address;
  }

  getKeyScheme(): SignatureScheme {
    return 'ED25519'; // Default, actual scheme from wallet
  }

  getPublicKey(): PublicKey {
    // Return a minimal PublicKey implementation
    const self = this;
    return {
      toSuiAddress(): string {
        return self.address;
      },
      toBase64(): string {
        if (!self.publicKeyBytes) {
          throw new Error('Public key not available');
        }
        return Buffer.from(self.publicKeyBytes).toString('base64');
      },
      toRawBytes(): Uint8Array {
        if (!self.publicKeyBytes) {
          throw new Error('Public key not available');
        }
        return self.publicKeyBytes;
      },
      flag(): number {
        return 0; // ED25519
      },
      verify(_data: Uint8Array, _signature: Uint8Array): Promise<boolean> {
        throw new Error('Verify not implemented for WalletSigner');
      },
      verifyWithIntent(_data: Uint8Array, _signature: Uint8Array, _intent: any): Promise<boolean> {
        throw new Error('VerifyWithIntent not implemented for WalletSigner');
      },
      verifyTransaction(_transaction: Uint8Array, _signature: Uint8Array): Promise<boolean> {
        throw new Error('VerifyTransaction not implemented for WalletSigner');
      },
      verifyPersonalMessage(_message: Uint8Array, _signature: Uint8Array): Promise<boolean> {
        throw new Error('VerifyPersonalMessage not implemented for WalletSigner');
      },
    } as PublicKey;
  }
}
