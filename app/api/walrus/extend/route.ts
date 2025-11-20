/**
 * API Route: POST /api/walrus/extend
 * Build unsigned transaction to extend blob storage
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

    if (!body.epochs || typeof body.epochs !== 'number' || body.epochs < 1) {
      return NextResponse.json(
        { error: 'Valid number of epochs is required (minimum 1)' },
        { status: 400 }
      );
    }

    const { blobObjectId, epochs } = body;

    // Build unsigned transaction
    const unsignedTransaction = await walrusSDK.buildExtendBlobTransaction({
      blobObjectId,
      epochs,
    });

    return NextResponse.json({
      success: true,
      blobObjectId,
      epochs,
      unsignedTransaction,
      instructions: {
        steps: [
          '1. Sign the unsigned transaction with your Sui wallet',
          '2. Execute the signed transaction on Sui blockchain',
          '3. Storage will be extended by the specified epochs',
        ],
      },
    });

  } catch (error) {
    console.error('[API Walrus/Extend] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to build extend transaction',
      },
      { status: 500 }
    );
  }
}
