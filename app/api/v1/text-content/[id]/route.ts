/**
 * API Route: GET /v1/text-content/[id]
 * Fetch text content metadata (without decryption keys)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;

    console.log(`[Text Content API] Fetching content: ${contentId}`);

    // Fetch text content with all related data
    const content = await prisma.textContent.findUnique({
      where: { id: contentId },
      include: {
        document: {
          select: {
            id: true,
            filename: true,
            size: true,
            mimeType: true,
            charCount: true,
            wordCount: true,
            createdAt: true,
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
        { error: 'Text content not found' },
        { status: 404 }
      );
    }

    console.log(`[Text Content API] ✓ Found content: ${content.title}`);

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
        document: content.document ? {
          id: content.document.id,
          filename: content.document.filename,
          size: content.document.size,
          mimeType: content.document.mimeType,
          charCount: content.document.charCount,
          wordCount: content.document.wordCount,
          createdAt: content.document.createdAt.toISOString(),
        } : null,
        creatorConfigs: content.creatorConfigs,
      },
    });
  } catch (error) {
    console.error('[Text Content API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch text content',
      },
      { status: 500 }
    );
  }
}
