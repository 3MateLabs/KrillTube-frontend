/**
 * Blob Upload Proxy - Server-side upload to Walrus via HTTP Publisher API
 *
 * Purpose: Accept encrypted blobs from client and upload to Walrus
 * Security: Server uploads using HTTP PUT (no wallet signatures needed)
 * Flow: Client → Server → Walrus Publisher (with fallbacks) → Return blob ID
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // 1 minute per blob
export const dynamic = 'force-dynamic';

// Testnet publishers with fallback support (from operators.json)
const TESTNET_PUBLISHERS = [
  'https://publisher.walrus-testnet.walrus.space', // Mysten Labs (default)
  'https://publisher.walrus-testnet.h2o-nodes.com', // H2O Nodes
  'https://sm1-walrus-testnet-publisher.stakesquid.com', // StakeSquid
  'https://sui-walrus-testnet-publisher.bwarelabs.com', // Alchemy Validators
  'https://testnet-publisher.walrus.graphyte.dev', // Graphyte Labs
  'https://walrus-testnet-publisher.stakecraft.com', // StakeCraft
  'https://walrus-testnet-publisher.crouton.digital', // CroutonDigital
  'https://walrus-testnet-publisher.nodeinfra.com', // Nodeinfra
];

// Mainnet publishers (for future use)
const MAINNET_PUBLISHERS = [
  'https://publisher.walrus.space', // Default mainnet publisher
];

/**
 * Try uploading to multiple publishers with fallback logic
 */
async function uploadWithFallback(
  buffer: Buffer,
  network: 'mainnet' | 'testnet',
  epochs: number,
  identifier: string
): Promise<any> {
  const publishers = network === 'testnet' ? TESTNET_PUBLISHERS : MAINNET_PUBLISHERS;
  const errors: string[] = [];

  for (let i = 0; i < publishers.length; i++) {
    const publisherUrl = publishers[i];

    try {
      console.log(`[Blob Upload] Attempt ${i + 1}/${publishers.length}: ${publisherUrl}`);

      const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochs}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(buffer),
        signal: AbortSignal.timeout(30000), // 30 second timeout per publisher
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMsg = `${publisherUrl}: ${response.status} ${errorText}`;
        errors.push(errorMsg);
        console.warn(`[Blob Upload] Failed: ${errorMsg}`);
        continue; // Try next publisher
      }

      const result = await response.json();
      const blobId = result.newlyCreated?.blobObject?.blobId ||
                     result.alreadyCertified?.blobId;

      if (!blobId) {
        errors.push(`${publisherUrl}: No blob ID in response`);
        continue;
      }

      console.log(`[Blob Upload] ✓ Success with ${publisherUrl} → ${blobId}`);
      return { result, publisherUrl };

    } catch (error) {
      const errorMsg = `${publisherUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(errorMsg);
      console.warn(`[Blob Upload] Exception: ${errorMsg}`);
      // Continue to next publisher
    }
  }

  // All publishers failed
  throw new Error(
    `All ${publishers.length} publishers failed for ${identifier}:\n${errors.join('\n')}`
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get blob data from request
    const formData = await request.formData();
    const blob = formData.get('blob') as File;
    const identifier = formData.get('identifier') as string;
    const network = (formData.get('network') as 'mainnet' | 'testnet') || 'testnet';
    const epochs = parseInt(formData.get('epochs') as string) || 1;

    if (!blob || !identifier) {
      return NextResponse.json(
        { error: 'Missing blob or identifier' },
        { status: 400 }
      );
    }

    console.log(`[Blob Upload] Uploading ${identifier} (${blob.size} bytes) to ${network}...`);
    console.log(`[Blob Upload] Network parameter received:`, network, `(type: ${typeof network})`);

    // Convert File to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload with fallback logic
    const { result, publisherUrl } = await uploadWithFallback(
      buffer,
      network,
      epochs,
      identifier
    );

    // Extract blob ID from response
    const blobId = result.newlyCreated?.blobObject?.blobId ||
                   result.alreadyCertified?.blobId;

    const aggregatorUrl = network === 'testnet'
      ? 'https://aggregator.walrus-testnet.walrus.space'
      : 'https://aggregator.walrus.space';

    const blobObjectId = result.newlyCreated?.blobObject?.id ||
                         result.alreadyCertified?.blobId;

    console.log(`[Blob Upload] ✓ Uploaded ${identifier} → ${blobId} (via ${publisherUrl})`);

    return NextResponse.json({
      success: true,
      identifier,
      blobId,
      blobObjectId,
      url: `${aggregatorUrl}/v1/blobs/${blobId}`,
      size: blob.size,
      publisher: publisherUrl, // Return which publisher succeeded
    });
  } catch (error) {
    console.error('[Blob Upload] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Blob upload failed',
      },
      { status: 500 }
    );
  }
}
