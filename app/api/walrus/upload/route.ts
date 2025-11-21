/**
 * API Route: POST /api/walrus/upload
 * Upload blob to Walrus mainnet with deletable flag
 *
 * Note: Currently uses standard blob upload endpoint (/v1/blobs)
 * The deletable flag is controlled by Walrus SDK configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusClient } from '@/lib/walrus';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const network = formData.get('network') as string || 'mainnet';
    const deletable = formData.get('deletable') === 'true';
    const epochs = parseInt(formData.get('epochs') as string || '5');
    const walletAddress = formData.get('walletAddress') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required to own the blob object' },
        { status: 400 }
      );
    }

    if (network !== 'mainnet') {
      return NextResponse.json(
        { error: 'Only mainnet network is supported for testing' },
        { status: 400 }
      );
    }

    console.log('[Walrus Upload] Starting upload:', {
      filename: file.name,
      size: file.size,
      network,
      deletable,
      epochs,
      walletAddress: walletAddress.substring(0, 10) + '...',
    });

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Walrus using walrusClient
    // CRITICAL: Pass walletAddress as sendObjectTo so YOU own the blob object
    const result = await walrusClient.uploadBlob(buffer, file.name, {
      deletable,
      epochs,
      sendObjectTo: walletAddress,
    });

    console.log('[Walrus Upload] Success:', result);

    return NextResponse.json({
      success: true,
      blobId: result.blobId,
      blobObjectId: result.blobObjectId,
      endEpoch: result.endEpoch,
      walrusUri: `walrus://${result.blobId}`,
      url: result.url,
      metadata: {
        filename: file.name,
        size: file.size,
        network,
        deletable,
        epochs,
      },
    });

  } catch (error) {
    console.error('[API Walrus/Upload] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload blob',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
