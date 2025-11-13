/**
 * API route to merge coins using gas station sponsored transaction
 * This endpoint merges multiple coin objects in the memez wallet
 * The transaction is sponsored by the gas station (gas paid by sponsor)
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toHex, fromHex } from '@mysten/sui/utils';
import { suiSponsorship, GasStationError } from '@3mate/gas-station-sdk';
import { walletSdk } from '@/lib/memez/sdk';
import { suiClient } from '@/lib/sui-client';

const GAS_STATION_API_KEY = process.env.GAS_STATION_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { coins, coinType, walletAddress } = await req.json();

    if (!coins || !Array.isArray(coins) || coins.length === 0) {
      return NextResponse.json(
        { error: 'Coins array is required' },
        { status: 400 }
      );
    }

    if (!coinType || !walletAddress) {
      return NextResponse.json(
        { error: 'coinType and walletAddress are required' },
        { status: 400 }
      );
    }

    if (!GAS_STATION_API_KEY) {
      return NextResponse.json(
        { error: 'Gas station not configured' },
        { status: 500 }
      );
    }

    // Create ephemeral keypair (temporary wallet for this transaction)
    const tempKeypair = new Ed25519Keypair();
    const tempAddress = tempKeypair.toSuiAddress();

    console.log('[Merge Coins] Creating merge transaction:', {
      walletAddress,
      coinType,
      coinCount: coins.length,
      tempAddress,
    });

    // Create merge transaction using memez wallet SDK
    const { tx } = walletSdk.mergeCoins({
      coinType: coinType,
      coins: coins,
      wallet: walletAddress,
    });

    // Set the sender as the temporary address
    tx.setSender(tempAddress);

    // Build the transaction (only transaction kind, no gas/budget)
    const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
    const txBytesHex = toHex(txBytes);

    console.log('[Merge Coins] Requesting gas station sponsorship...');

    // Get sponsorship from gas station
    let sponsorData;
    try {
      sponsorData = await suiSponsorship({
        apiKey: GAS_STATION_API_KEY,
        rawTxBytesHex: txBytesHex,
        sender: tempAddress,
        network: 'mainnet',
      });
    } catch (error) {
      if (error instanceof GasStationError) {
        console.error('[Merge Coins] Gas station error:', error.message);
        return NextResponse.json(
          { error: `Gas station sponsorship failed: ${error.message}` },
          { status: 500 }
        );
      }
      throw error;
    }

    console.log('[Merge Coins] Sponsorship received, executing transaction...');

    // Sign the sponsored transaction with temporary keypair
    const sponsoredTxBytes = fromHex(sponsorData.txBytesHex);
    const signature = await tempKeypair.signTransaction(sponsoredTxBytes);

    // Execute transaction with both signatures (temp keypair + sponsor)
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: sponsoredTxBytes,
      signature: [signature.signature, sponsorData.sponsorSignature],
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    if (result.effects?.status?.status !== 'success') {
      console.error('[Merge Coins] Transaction failed:', {
        status: result.effects?.status?.status,
        error: result.effects?.status?.error,
      });
      return NextResponse.json(
        {
          error: 'Transaction execution failed',
          status: result.effects?.status?.status,
          errorMessage: result.effects?.status?.error,
        },
        { status: 500 }
      );
    }

    console.log('[Merge Coins] Transaction successful:', result.digest);

    return NextResponse.json({
      success: true,
      transactionDigest: result.digest,
      mergedCount: coins.length,
      gasInfo: {
        computationCost: result.effects?.gasUsed?.computationCost || '0',
        storageCost: result.effects?.gasUsed?.storageCost || '0',
        storageRebate: result.effects?.gasUsed?.storageRebate || '0',
      },
    });
  } catch (error) {
    console.error('[Merge Coins] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to merge coins',
      },
      { status: 500 }
    );
  }
}
