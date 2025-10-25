/**
 * API route for uploading transcoded video to Walrus
 * POST /api/upload-walrus
 */

import { NextRequest, NextResponse } from 'next/server';
import { walrusClient } from '@/lib/walrus';
import type { TranscodeResult } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      assetId,
      transcodeResult,
      title,
      description,
      uploadedBy,
    } = body as {
      assetId?: string;
      transcodeResult: TranscodeResult;
      title: string;
      description?: string;
      uploadedBy: string;
    };

    if (!transcodeResult) {
      return NextResponse.json(
        { error: 'No transcode result provided' },
        { status: 400 }
      );
    }

    if (!title || !uploadedBy) {
      return NextResponse.json(
        { error: 'Title and uploadedBy are required' },
        { status: 400 }
      );
    }

    console.log(`[API] Uploading asset ${transcodeResult.jobId} to Walrus...`);
    console.log(`[API] Title: ${title}`);
    console.log(`[API] Uploader: ${uploadedBy}`);

    // Upload to Walrus
    const manifest = await walrusClient.uploadAsset(transcodeResult, {
      title,
      description,
      uploadedBy,
    });

    console.log(`[API] ✓ Upload complete: ${manifest.assetId}`);

    // If assetId provided, save to database via finalize endpoint
    let playbackUrl = null;
    if (assetId) {
      try {
        // Extract the root Walrus URI (master playlist blob ID)
        const walrusRootUri = manifest.masterPlaylist.blobId;

        // Call finalize endpoint to save to database
        const finalizeUrl = new URL(
          `/api/v1/assets/${assetId}`,
          request.url
        );

        const finalizeResponse = await fetch(finalizeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            manifest,
            walrusRootUri,
          }),
        });

        if (finalizeResponse.ok) {
          const finalizeData = await finalizeResponse.json();
          playbackUrl = finalizeData.playbackUrl;
          console.log(`[API] ✓ Saved to database: ${assetId}`);
        } else {
          console.error('[API] Failed to finalize asset in database');
        }
      } catch (dbError) {
        console.error('[API] Database save error:', dbError);
        // Continue anyway - manifest still available in response
      }
    }

    return NextResponse.json({
      success: true,
      manifest,
      playbackUrl,
      assetId,
    });
  } catch (error) {
    console.error('[API] Walrus upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Walrus upload failed',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large uploads
