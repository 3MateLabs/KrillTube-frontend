/**
 * API Route: GET /v1/image-content
 * Fetch paginated list of all image content
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`[Image Content List API] Fetching images: limit=${limit}, offset=${offset}`);

    // Fetch image content with creator info
    const [contents, total] = await Promise.all([
      prisma.imageContent.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            select: {
              id: true,
              filename: true,
              size: true,
              mimeType: true,
            },
            take: 1, // Just get the first image for thumbnail
            orderBy: { createdAt: 'asc' },
          },
          creatorConfigs: {
            select: {
              pricePerView: true,
              decimals: true,
              coinType: true,
            },
            take: 1,
          },
          _count: {
            select: {
              images: true,
            },
          },
        },
      }),
      prisma.imageContent.count(),
    ]);

    // Get creator info for each content
    const creatorIds = [...new Set(contents.map(c => c.creatorId))];
    const creators = await prisma.creator.findMany({
      where: {
        walletAddress: { in: creatorIds },
      },
      select: {
        walletAddress: true,
        name: true,
        avatar: true,
      },
    });

    const creatorMap = new Map(creators.map(c => [c.walletAddress, c]));

    console.log(`[Image Content List API] ✓ Found ${contents.length} items (total: ${total})`);

    return NextResponse.json({
      success: true,
      contents: contents.map(content => {
        const creator = creatorMap.get(content.creatorId);
        const config = content.creatorConfigs[0];
        const firstImage = content.images[0];

        return {
          id: content.id,
          title: content.title,
          description: content.description,
          creatorId: content.creatorId,
          creatorName: creator?.name || null,
          creatorAvatar: creator?.avatar || null,
          network: content.network,
          createdAt: content.createdAt.toISOString(),
          imageCount: content._count.images,
          thumbnailImageId: firstImage?.id || null,
          price: config ? {
            amount: config.pricePerView,
            decimals: config.decimals,
            coinType: config.coinType,
          } : null,
        };
      }),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Image Content List API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch image content list',
      },
      { status: 500 }
    );
  }
}
