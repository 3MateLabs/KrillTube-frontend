/**
 * API Route: GET /api/v1/payment/check
 * Check if user has paid for a video
 *
 * Query params:
 * - videoId: Video ID to check
 *
 * Authentication: Uses cookies (signature_address, signature_chain)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId parameter' },
        { status: 400 }
      );
    }

    // Get authentication from cookies
    const cookieStore = await cookies();
    const address = cookieStore.get('signature_address')?.value;
    const chain = cookieStore.get('signature_chain')?.value;

    if (!address || !chain) {
      // Not authenticated - return not paid
      return NextResponse.json({
        hasPaid: false,
        requiresAuth: true,
      });
    }

    console.log('[Payment Check] Checking payment for:', {
      videoId,
      address,
      chain,
    });

    // Check if payment exists
    const paymentInfo = await prisma.videoPaymentInfo.findFirst({
      where: {
        videoId,
        payerAddress: address,
        chain,
      },
      select: {
        id: true,
        paidSegmentIds: true,
        createdAt: true,
      },
    });

    if (paymentInfo) {
      console.log('[Payment Check] ✓ Payment found:', paymentInfo.id);
      return NextResponse.json({
        hasPaid: true,
        requiresAuth: false,
        paymentInfo: {
          id: paymentInfo.id,
          paidSegmentIds: paymentInfo.paidSegmentIds,
          paidAt: paymentInfo.createdAt,
        },
      });
    }

    console.log('[Payment Check] ✗ No payment found');
    return NextResponse.json({
      hasPaid: false,
      requiresAuth: false,
    });

  } catch (error) {
    console.error('[API Payment/Check] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check payment status',
      },
      { status: 500 }
    );
  }
}
