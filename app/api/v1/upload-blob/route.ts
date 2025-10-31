/**
 * Blob Upload Proxy - Upload to Walrus via HTTP Publisher API
 *
 * Purpose: Accept encrypted blobs from client and upload to Walrus
 * Security: Server uploads using HTTP PUT (no wallet signatures)
 * Flow: Client → Server → Walrus Publisher → Return blob ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusClient } from '@/lib/walrus';

export const maxDuration = 60; // 1 minute per blob
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get blob data from request
    const formData = await request.formData();
    const blob = formData.get('blob') as File;
    const identifier = formData.get('identifier') as string;

    if (!blob || !identifier) {
      return NextResponse.json(
        { error: 'Missing blob or identifier' },
        { status: 400 }
      );
    }

    console.log(`[Blob Upload] Uploading ${identifier} (${blob.size} bytes)...`);

    // Convert File to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Walrus via HTTP Publisher API (no signatures)
    const result = await walrusClient.uploadBlob(buffer, identifier);

    console.log(`[Blob Upload] ✓ Uploaded ${identifier} → ${result.blobId}`);

    return NextResponse.json({
      success: true,
      blobId: result.blobId,
      url: result.url,
      size: result.size,
      identifier,
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
