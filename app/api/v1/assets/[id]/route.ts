/**
 * API Route: /v1/assets/[id]
 * Get and update individual assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDbConnected } from '@/lib/db';
import { generateRevisionId } from '@/lib/types';

/**
 * GET /v1/assets/:id
 * Get asset details with latest revision
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    const latestRevision = asset.revisions[0];

    return NextResponse.json({
      asset: {
        id: asset.id,
        title: asset.title,
        creatorId: asset.creatorId,
        status: asset.status,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      },
      manifest: latestRevision ? latestRevision.manifestJson : null,
      walrusRootUri: latestRevision ? latestRevision.walrusRootUri : null,
    });
  } catch (error) {
    console.error('[API] Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

/**
 * POST /v1/assets/:id
 * Save manifest and Walrus URIs after upload completes (finalize upload)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { manifest, walrusRootUri } = body;

    if (!manifest || !walrusRootUri) {
      return NextResponse.json(
        { error: 'Missing required fields: manifest, walrusRootUri' },
        { status: 400 }
      );
    }

    // Verify asset exists
    const asset = await prisma.asset.findUnique({
      where: { id },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Create asset revision with manifest
    const revisionId = generateRevisionId();
    const revision = await prisma.assetRevision.create({
      data: {
        id: revisionId,
        assetId: id,
        manifestJson: manifest,
        walrusRootUri: walrusRootUri,
      },
    });

    // Update asset status to ready
    await prisma.asset.update({
      where: { id },
      data: {
        status: 'ready',
        updatedAt: new Date(),
      },
    });

    console.log(`[API] Finalized asset ${id} with revision ${revision.id}`);

    // Return playback URL
    const playbackUrl = `/watch/${id}`;

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        title: asset.title,
        status: 'ready',
      },
      revision: {
        id: revision.id,
        walrusRootUri: revision.walrusRootUri,
        createdAt: revision.createdAt,
      },
      playbackUrl,
    });
  } catch (error) {
    console.error('[API] Error finalizing asset:', error);
    return NextResponse.json(
      { error: 'Failed to finalize asset' },
      { status: 500 }
    );
  }
}
