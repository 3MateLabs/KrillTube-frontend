/**
 * API Route: POST /v1/register-text
 * Register encrypted text document in database
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
      document,
      creatorConfigs,
    }: {
      contentId: string;
      title: string;
      description?: string;
      creatorId: string;
      network: 'mainnet' | 'testnet';
      document: {
        filename: string;
        walrusUri: string;
        blobObjectId?: string; // Sui blob object ID (mainnet only)
        dekEnc: string; // Base64 plain DEK from client
        iv: string; // Base64 IV
        size: number;
        mimeType: string;
        charCount: number;
        wordCount: number;
      };
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
    if (!contentId || !title || !creatorId || !document) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[Register Text] Creating text content: ${title}`);

    // Process document: encrypt DEK with master key
    const dekBytes = fromBase64(document.dekEnc);
    const encryptedDek = await encryptDek(dekBytes);

    const processedDocument = {
      filename: document.filename,
      walrusUri: document.walrusUri,
      blobObjectId: document.blobObjectId, // Mainnet only - for extend/delete
      dekEnc: Buffer.from(new Uint8Array(encryptedDek)) as any, // Now encrypted with master key
      iv: Buffer.from(new Uint8Array(fromBase64(document.iv))) as any,
      size: document.size,
      mimeType: document.mimeType,
      charCount: document.charCount,
      wordCount: document.wordCount,
    };

    // Create TextContent record
    const textContent = await prisma.textContent.create({
      data: {
        id: contentId,
        title,
        description: description || null,
        creatorId,
        network,
        document: {
          create: processedDocument,
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
        document: true,
        creatorConfigs: true,
      },
    });

    console.log(`[Register Text] ✓ Registered text content: ${textContent.id}`);

    return NextResponse.json({
      success: true,
      content: textContent,
    });
  } catch (error) {
    console.error('[Register Text] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to register text',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
