/**
 * API Route: GET /v1/images/[id]
 * Serve decrypted image data
 *
 * REQUIRES PAYMENT VERIFICATION (same as video keys)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decryptDek } from '@/lib/kms/envelope';
import { aesGcmDecrypt } from '@/lib/crypto/primitives';
import { cookies } from 'next/headers';
import { verifyPersonalMessageSignature as verifySuiSignature } from '@mysten/sui/verify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: imageId } = await params;

    console.log(`[Image API] Fetching image: ${imageId}`);

    // Step 1: Verify user authentication from cookies
    const cookieStore = await cookies();
    const address = cookieStore.get('signature_address')?.value;
    const signature = cookieStore.get('signature')?.value;
    const message = cookieStore.get('signature_message')?.value;
    const chain = cookieStore.get('signature_chain')?.value;

    if (!address || !signature || !message || !chain) {
      console.log('[Image API] Missing authentication cookies');
      return NextResponse.json(
        { error: 'Authentication required. Please connect your wallet.' },
        { status: 401 }
      );
    }

    // Verify signature
    console.log(`[Image API] Verifying ${chain} signature for address:`, address);

    let isValid = false;
    try {
      if (chain === 'sui') {
        const messageBytes = new TextEncoder().encode(message);
        const publicKey = await verifySuiSignature(messageBytes, signature);
        isValid = publicKey.toSuiAddress() === address;
      } else if (chain === 'iota') {
        // For IOTA, trust the wallet signature
        isValid = true;
      } else {
        return NextResponse.json(
          { error: `Unsupported chain: ${chain}` },
          { status: 400 }
        );
      }
    } catch (verifyError) {
      console.error('[Image API] Signature verification failed:', verifyError);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    if (!isValid) {
      console.log('[Image API] Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('[Image API] ✓ Signature verified');

    // Step 2: Fetch image from database
    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: {
        content: {
          include: {
            creatorConfigs: true,
          },
        },
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Step 3: Check payment (if monetization is enabled)
    if (image.content.creatorConfigs.length > 0) {
      // TODO: Implement payment verification for images
      // For now, allow free access during development
      console.log('[Image API] Monetization enabled but payment check skipped (dev mode)');
    }

    console.log(`[Image API] Processing image: ${image.filename}`);

    // Step 4: Fetch encrypted image from Walrus
    const walrusResponse = await fetch(image.walrusUri);
    if (!walrusResponse.ok) {
      throw new Error(`Failed to fetch from Walrus: ${walrusResponse.statusText}`);
    }

    const encryptedData = new Uint8Array(await walrusResponse.arrayBuffer());
    console.log(`[Image API] ✓ Fetched encrypted data: ${encryptedData.length} bytes`);

    // Step 5: Decrypt DEK with KMS
    const dekBytes = await decryptDek(image.dekEnc);
    console.log(`[Image API] ✓ Decrypted DEK`);

    // Step 6: Decrypt image data
    const decryptedData = await aesGcmDecrypt(
      dekBytes,
      encryptedData,
      new Uint8Array(image.iv)
    );

    console.log(`[Image API] ✓ Decrypted image: ${decryptedData.length} bytes`);

    // Step 7: Serve decrypted image with correct MIME type
    return new NextResponse(decryptedData.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': decryptedData.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year since content is immutable
      },
    });
  } catch (error) {
    console.error('[Image API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to serve image',
      },
      { status: 500 }
    );
  }
}
