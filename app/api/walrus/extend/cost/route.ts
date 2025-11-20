/**
 * API Route: POST /api/walrus/extend/cost
 * Calculate cost to extend blob storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusSDK } from '@/lib/walrus-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.size || typeof body.size !== 'number') {
      return NextResponse.json(
        { error: 'Blob size in bytes is required' },
        { status: 400 }
      );
    }

    if (!body.epochs || typeof body.epochs !== 'number' || body.epochs < 1) {
      return NextResponse.json(
        { error: 'Valid number of epochs is required (minimum 1)' },
        { status: 400 }
      );
    }

    const { size, epochs } = body;

    // Calculate cost
    const costMist = await walrusSDK.calculateExtendCost(size, epochs);
    const costWal = Number(costMist) / 1_000_000_000;

    return NextResponse.json({
      success: true,
      size,
      epochs,
      costMist: costMist.toString(),
      costWal: costWal.toFixed(9),
      durationDays: epochs * 14,
    });

  } catch (error) {
    console.error('[API Walrus/Extend/Cost] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to calculate extend cost',
      },
      { status: 500 }
    );
  }
}
