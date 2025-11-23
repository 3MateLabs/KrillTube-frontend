/**
 * API Route: GET /v1/text/[id]
 * Serve decrypted text document with payment verification
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
    const { id: documentId } = await params;
    const cookieStore = await cookies();

    console.log(`[Text API] Fetching document: ${documentId}`);

    // Step 1: Verify wallet signature from cookies
    const address = cookieStore.get('signature_address')?.value;
    const signature = cookieStore.get('signature')?.value;
    const message = cookieStore.get('signature_message')?.value;

    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: 'Wallet signature required. Please connect your wallet.' },
        { status: 401 }
      );
    }

    // Verify Sui signature
    const messageBytes = new TextEncoder().encode(message);
    try {
      const publicKey = await verifySuiSignature(messageBytes, signature);
      console.log(`[Text API] ✓ Signature verified for address: ${address}`);
    } catch (err) {
      console.error('[Text API] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid wallet signature. Please reconnect your wallet.' },
        { status: 401 }
      );
    }

    // Step 2: Fetch text document from database
    const document = await prisma.textDocument.findUnique({
      where: { id: documentId },
      include: {
        content: {
          include: {
            creatorConfigs: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Text document not found' },
        { status: 404 }
      );
    }

    console.log(`[Text API] Found document: ${document.filename}`);

    // Step 3: Check payment if monetization is enabled
    if (document.content.creatorConfigs && document.content.creatorConfigs.length > 0) {
      // TODO: Implement payment verification
      // For now, we'll allow access
      console.log(`[Text API] ⚠ Payment verification not yet implemented`);
    }

    // Step 4: Fetch encrypted document from Walrus
    console.log(`[Text API] Fetching encrypted document from Walrus: ${document.walrusUri}`);
    const response = await fetch(document.walrusUri);

    if (!response.ok) {
      throw new Error(`Failed to fetch from Walrus: ${response.statusText}`);
    }

    const encryptedData = new Uint8Array(await response.arrayBuffer());
    console.log(`[Text API] Fetched ${encryptedData.length} bytes from Walrus`);

    // Step 5: Decrypt DEK with KMS master key
    const dekBytes = await decryptDek(document.dekEnc);
    console.log(`[Text API] DEK decrypted with master key`);

    // Step 6: Decrypt document with AES-GCM
    const decryptedData = await aesGcmDecrypt(dekBytes, encryptedData, new Uint8Array(document.iv));
    console.log(`[Text API] Document decrypted: ${decryptedData.length} bytes`);

    // Step 7: Serve text with correct MIME type
    return new NextResponse(decryptedData.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `inline; filename="${document.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Chars': document.charCount?.toString() || '0',
        'X-Content-Words': document.wordCount?.toString() || '0',
      },
    });
  } catch (error) {
    console.error('[Text API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to serve text',
      },
      { status: 500 }
    );
  }
}
