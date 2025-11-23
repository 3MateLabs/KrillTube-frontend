/**
 * API Route: POST /v1/register-images
 * Register encrypted images in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { encryptDek } from '@/lib/kms/envelope';
import { fromBase64 } from '@/lib/crypto/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      contentId,
      title,
      description,
      creatorId,
      network,
      images,
      creatorConfigs,
    }: {
      contentId: string;
      title: string;
      description?: string;
      creatorId: string;
      network: 'mainnet' | 'testnet';
      images: Array<{
        filename: string;
        walrusUri: string;
        blobObjectId?: string; // Sui blob object ID (mainnet only)
        dekEnc: string; // Base64 plain DEK from client
        iv: string; // Base64 IV
        size: number;
        mimeType: string;
      }>;
      creatorConfigs?: Array<{
        objectId: string;
        chain: string;
        coinType: string;
        pricePerView: string;
        decimals: number;
        metadata?: string;
      }>;
    } = body;

    // Validate required fields
    if (!contentId || !title || !creatorId || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[Register Images] Creating image content: ${title}`);
    console.log(`[Register Images] Images: ${images.length}`);

    // Process images: encrypt DEKs with master key
    const processedImages = await Promise.all(
      images.map(async (img) => {
        // Decode DEK from base64
        const dekBytes = fromBase64(img.dekEnc);

        // Encrypt DEK with KMS master key
        const encryptedDek = await encryptDek(dekBytes);

        return {
          filename: img.filename,
          walrusUri: img.walrusUri,
          blobObjectId: img.blobObjectId, // Mainnet only - for extend/delete
          dekEnc: encryptedDek, // Now encrypted with master key
          iv: Buffer.from(fromBase64(img.iv)),
          size: img.size,
          mimeType: img.mimeType,
        };
      })
    );

    // Create ImageContent record
    const imageContent = await prisma.imageContent.create({
      data: {
        id: contentId,
        title,
        description: description || null,
        creatorId,
        network,
        images: {
          create: processedImages,
        },
        creatorConfigs: creatorConfigs
          ? {
              create: creatorConfigs.map((config) => ({
                objectId: config.objectId,
                chain: config.chain,
                coinType: config.coinType,
                pricePerView: config.pricePerView,
                decimals: config.decimals,
                metadata: config.metadata,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        creatorConfigs: true,
      },
    });

    console.log(`[Register Images] ✓ Registered image content: ${imageContent.id}`);

    return NextResponse.json({
      success: true,
      content: imageContent,
    });
  } catch (error) {
    console.error('[Register Images] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register images',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
