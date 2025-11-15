/**
 * API Route: /api/auth/verify-signature
 * Verifies wallet signatures for both Sui and IOTA chains
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPersonalMessageSignature as verifySuiSignature } from '@mysten/sui/verify';
import { verifyPersonalMessageSignature as verifyIotaSignature } from '@iota/iota-sdk/verify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature, address, chain } = body;

    if (!message || !signature || !address || !chain) {
      return NextResponse.json(
        { valid: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[Verify Signature] Verifying ${chain} signature for address:`, address);

    let isValid = false;

    try {
      if (chain === 'sui') {
        // Verify Sui signature
        const messageBytes = new TextEncoder().encode(message);
        const publicKey = await verifySuiSignature(messageBytes, signature);

        // Check if the recovered address matches
        isValid = publicKey.toSuiAddress() === address;

        console.log('[Verify Signature] Sui verification:', {
          recoveredAddress: publicKey.toSuiAddress(),
          expectedAddress: address,
          valid: isValid,
        });
      } else if (chain === 'iota') {
        // Verify IOTA signature
        const messageBytes = new TextEncoder().encode(message);
        const publicKey = await verifyIotaSignature(messageBytes, signature);

        // Check if the recovered address matches
        isValid = publicKey.toSuiAddress() === address; // IOTA uses same address format as Sui

        console.log('[Verify Signature] IOTA verification:', {
          recoveredAddress: publicKey.toSuiAddress(),
          expectedAddress: address,
          valid: isValid,
        });
      } else {
        return NextResponse.json(
          { valid: false, error: `Unsupported chain: ${chain}` },
          { status: 400 }
        );
      }
    } catch (verifyError) {
      console.error(`[Verify Signature] ${chain} signature verification error:`, verifyError);
      return NextResponse.json(
        { valid: false, error: 'Signature verification failed' },
        { status: 400 }
      );
    }

    if (!isValid) {
      console.log('[Verify Signature] ✗ Signature invalid');
      return NextResponse.json({ valid: false, error: 'Invalid signature' });
    }

    console.log('[Verify Signature] ✓ Signature valid');

    return NextResponse.json({
      valid: true,
      address,
      chain,
    });
  } catch (error) {
    console.error('[Verify Signature] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
