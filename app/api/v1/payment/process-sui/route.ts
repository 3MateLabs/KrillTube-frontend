/**
 * API Route: POST /api/v1/payment/process-sui
 * Process SUI payment on the backend
 *
 * NOT IMPLEMENTED YET - Placeholder for future SUI support
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'SUI payment processing not implemented yet' },
    { status: 501 }
  );
}
