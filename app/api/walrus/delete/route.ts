/**
 * API Route: POST /api/walrus/delete
 * Build unsigned transaction to delete blob and reclaim storage rebate
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusSDK } from '@/lib/walrus-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.blobObjectId || typeof body.blobObjectId !== 'string') {
      return NextResponse.json(
        { error: 'Blob object ID is required' },
        { status: 400 }
      );
    }

    if (!body.owner || typeof body.owner !== 'string') {
      return NextResponse.json(
        { error: 'Owner address is required' },
        { status: 400 }
      );
    }

    const { blobObjectId, owner } = body;

    // Fetch blob metadata to verify it's deletable
    const metadata = await walrusSDK.getBlobMetadata(blobObjectId);

    if (!metadata.deletable) {
      return NextResponse.json(
        {
          error: 'Blob is not deletable',
          details: 'Only blobs created with deletable flag can be deleted',
        },
        { status: 400 }
      );
    }

    // Build unsigned transaction
    const unsignedTransaction = await walrusSDK.buildDeleteBlobTransaction({
      blobObjectId,
      owner,
    });

    return NextResponse.json({
      success: true,
      blobObjectId,
      blobId: metadata.blobId,
      endEpoch: metadata.endEpoch,
      size: metadata.size,
      deletable: metadata.deletable,
      unsignedTransaction,
      instructions: {
        steps: [
          '1. Sign the unsigned transaction with your Sui wallet',
          '2. Execute the signed transaction on Sui blockchain',
          '3. Storage rebate will be returned to your wallet',
        ],
        warning: 'DELETION IS PERMANENT. Blobs cannot be recovered after deletion.',
      },
    });

  } catch (error) {
    console.error('[API Walrus/Delete] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to build delete transaction',
      },
      { status: 500 }
    );
  }
}
