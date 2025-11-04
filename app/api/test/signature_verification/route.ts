/**
 * API Route: /api/test/signature_verification
 * Verify wallet signature using cookies
 *
 * This endpoint verifies that a signature was created by signing
 * the expected message with the wallet that owns the address stored in cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { cookies } from 'next/headers';

/**
 * POST /api/test/signature_verification
 * Verify that the signature in cookies matches the address in cookies
 *
 * All data is read from cookies:
 * - signature: Base64-encoded signature
 * - signature_message: Original message that was signed
 * - signature_address: Address that should match the signature
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const signature = cookieStore.get('signature')?.value;
    const message = cookieStore.get('signature_message')?.value;
    const address = cookieStore.get('signature_address')?.value;

    if (!signature || !message || !address) {
      return NextResponse.json(
        {
          verified: false,
          error: 'Missing authentication cookies',
          details: {
            hasSignature: !!signature,
            hasMessage: !!message,
            hasAddress: !!address,
          },
        },
        { status: 401 }
      );
    }

    console.log(`[SignatureVerification] Verifying signature for address: ${address}`);
    console.log(`[SignatureVerification] Message: "${message}"`);

    try {
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);

      // Verify the signature
      // The verifyPersonalMessageSignature function will:
      // 1. Decode the signature
      // 2. Recover the public key from the signature
      // 3. Derive the address from the public key
      const publicKey = await verifyPersonalMessageSignature(
        messageBytes,
        signature
      );

      // Get the address from the public key
      const recoveredAddress = publicKey.toSuiAddress();

      console.log(`[SignatureVerification] Recovered address: ${recoveredAddress}`);
      console.log(`[SignatureVerification] Cookie address: ${address}`);

      // Check if the recovered address matches the cookie address
      const verified = recoveredAddress.toLowerCase() === address.toLowerCase();

      if (verified) {
        console.log('[SignatureVerification] ✓ Signature verified successfully');
        return NextResponse.json({
          verified: true,
          address: recoveredAddress,
          message: 'Signature verified successfully',
        });
      } else {
        console.log('[SignatureVerification] ✗ Address mismatch');
        return NextResponse.json(
          {
            verified: false,
            error: 'Signature does not match the cookie address',
            recoveredAddress,
            cookieAddress: address,
          },
          { status: 401 }
        );
      }
    } catch (verifyError) {
      console.error('[SignatureVerification] Verification failed:', verifyError);
      return NextResponse.json(
        {
          verified: false,
          error: 'Invalid signature or message',
          details: verifyError instanceof Error ? verifyError.message : String(verifyError),
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[SignatureVerification] Error:', error);
    return NextResponse.json(
      {
        verified: false,
        error: error instanceof Error ? error.message : 'Failed to verify signature',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/signature_verification
 * Get current authentication status from cookies
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const signature = cookieStore.get('signature')?.value;
  const message = cookieStore.get('signature_message')?.value;
  const address = cookieStore.get('signature_address')?.value;

  return NextResponse.json({
    endpoint: '/api/test/signature_verification',
    method: 'POST',
    description: 'Verify wallet signature using cookies',
    currentCookies: {
      hasSignature: !!signature,
      hasMessage: !!message,
      hasAddress: !!address,
      address: address || null,
      message: message || null,
    },
  });
}
