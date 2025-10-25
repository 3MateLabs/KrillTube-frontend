/**
 * API Route: /v1/assets
 * Create new asset placeholder and list assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        title,
        creatorId,
        status: 'uploading',
      },
    });

    console.log(`[API] Created asset placeholder: ${asset.id}`);

    return NextResponse.json({
      asset: {
        id: asset.id,
        title: asset.title,
        status: asset.status,
        createdAt: asset.createdAt,
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
    if (creatorId) where.creatorId = creatorId;
    if (status) where.status = status;

    // Query assets
    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          revisions: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Only latest revision
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      assets: assets.map((asset) => {
        const latestRevision = asset.revisions[0];
        let posterUrl = null;

        // Extract poster URL from manifest if available
        if (latestRevision && latestRevision.manifestJson) {
          const manifest = latestRevision.manifestJson as any;
          posterUrl = manifest.poster?.url || null;
        }

        return {
          id: asset.id,
          title: asset.title,
          creatorId: asset.creatorId,
          status: asset.status,
          createdAt: asset.createdAt,
          updatedAt: asset.updatedAt,
          posterUrl,
          latestRevision: latestRevision
            ? {
                walrusRootUri: latestRevision.walrusRootUri,
                createdAt: latestRevision.createdAt,
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
