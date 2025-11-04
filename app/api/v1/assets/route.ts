/**
 * API Route: /v1/assets
 * Create new asset placeholder and list assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, ensureDbConnected } from '@/lib/db';
import { generateAssetId } from '@/lib/types';

/**
 * POST /v1/assets
 * Create a placeholder asset before upload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, creatorId } = body;

    if (!title || !creatorId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, creatorId' },
        { status: 400 }
      );
    }

    // Create asset placeholder with custom ID
    const assetId = generateAssetId();

    const asset = await prisma.assets.create({
      data: {
        id: assetId,
        title,
        creator_id: creatorId,
        status: 'uploading',
        updated_at: new Date(),
      },
    });

    console.log(`[API] Created asset placeholder: ${asset.id}`);

    return NextResponse.json({
      asset: {
        id: asset.id,
        title: asset.title,
        status: asset.status,
        createdAt: asset.created_at,
      },
      uploadConfig: {
        // Configuration for upload process
        maxFileSize: 1073741824, // 1 GB
        allowedFormats: ['video/*'],
      },
    });
  } catch (error) {
    console.error('[API] Error creating asset:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}

/**
 * GET /v1/assets
 * List all assets with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creator_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (creatorId) where.creator_id = creatorId;
    if (status) where.status = status;

    // Query assets
    const [assets, total] = await Promise.all([
      prisma.assets.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
        include: {
          asset_revisions: {
            orderBy: { created_at: 'desc' },
            take: 1, // Only latest revision
          },
        },
      }),
      prisma.assets.count({ where }),
    ]);

    return NextResponse.json({
      assets: assets.map((asset) => {
        const latestRevision = asset.asset_revisions[0];
        let posterUrl = null;

        // Extract poster URL from manifest if available
        if (latestRevision && latestRevision.manifest_json) {
          const manifest = latestRevision.manifest_json as any;
          posterUrl = manifest.poster?.url || null;
        }

        return {
          id: asset.id,
          title: asset.title,
          creatorId: asset.creator_id,
          status: asset.status,
          createdAt: asset.created_at,
          updatedAt: asset.updated_at,
          posterUrl,
          latestRevision: latestRevision
            ? {
                walrusRootUri: latestRevision.walrus_root_uri,
                createdAt: latestRevision.created_at,
              }
            : null,
        };
      }),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + assets.length < total,
      },
    });
  } catch (error) {
    console.error('[API] Error listing assets:', error);
    return NextResponse.json(
      { error: 'Failed to list assets' },
      { status: 500 }
    );
  }
}
