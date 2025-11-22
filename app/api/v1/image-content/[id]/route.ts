/**
 * API Route: GET /v1/image-content/[id]
 * Fetch image content metadata (without decryption)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;

    console.log(`[Image Content API] Fetching content: ${contentId}`);

    // Fetch image content with all related data
    const content = await prisma.imageContent.findUnique({
      where: { id: contentId },
      include: {
        images: {
          select: {
            id: true,
            filename: true,
            size: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc', // Show images in upload order
          },
        },
        creatorConfigs: {
          select: {
            id: true,
            objectId: true,
            chain: true,
            coinType: true,
            pricePerView: true,
            decimals: true,
            metadata: true,
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Image content not found' },
        { status: 404 }
      );
    }

    console.log(`[Image Content API] ✓ Found content: ${content.title} (${content.images.length} images)`);

    // Return content metadata (no decryption keys)
    return NextResponse.json({
      success: true,
      content: {
        id: content.id,
        title: content.title,
        description: content.description,
        creatorId: content.creatorId,
        network: content.network,
        createdAt: content.createdAt.toISOString(),
        images: content.images.map(img => ({
          id: img.id,
          filename: img.filename,
          size: img.size,
          mimeType: img.mimeType,
          createdAt: img.createdAt.toISOString(),
        })),
        creatorConfigs: content.creatorConfigs,
      },
    });
  } catch (error) {
    console.error('[Image Content API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch image content',
      },
      { status: 500 }
    );
  }
}
