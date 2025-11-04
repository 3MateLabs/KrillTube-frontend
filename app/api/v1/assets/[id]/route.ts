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

    const asset = await prisma.assets.findUnique({
      where: { id },
      include: {
        asset_revisions: {
          orderBy: { created_at: 'desc' },
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

    const latestRevision = asset.asset_revisions[0];

    return NextResponse.json({
      asset: {
        id: asset.id,
        title: asset.title,
        creatorId: asset.creator_id,
        status: asset.status,
        createdAt: asset.created_at,
        updatedAt: asset.updated_at,
      },
      manifest: latestRevision ? latestRevision.manifest_json : null,
      walrusRootUri: latestRevision ? latestRevision.walrus_root_uri : null,
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
    const asset = await prisma.assets.findUnique({
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
    const revision = await prisma.asset_revisions.create({
      data: {
        id: revisionId,
        asset_id: id,
        manifest_json: manifest,
        walrus_root_uri: walrusRootUri,
      },
    });

    // Update asset status to ready
    await prisma.assets.update({
      where: { id },
      data: {
        status: 'ready',
        updated_at: new Date(),
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
        walrusRootUri: revision.walrus_root_uri,
        createdAt: revision.created_at,
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
