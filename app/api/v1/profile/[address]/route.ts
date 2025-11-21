/**
 * API Route: /v1/profile/[address]
 * Get and update creator profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';
import { createChannel, suiToMist } from '@/lib/seal';
import { SEAL_CONFIG, isSealConfigured } from '@/lib/seal/config';

/**
 * GET /api/v1/profile/[address]
 * Retrieve creator profile and their uploaded videos
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Find or create creator profile first (always succeeds)
    let creator = await prisma.creator.upsert({
      where: { walletAddress: address },
      update: {}, // Don't update anything if it exists
      create: {
        walletAddress: address,
        name: `Creator ${address.slice(0, 6)}...${address.slice(-4)}`,
        bio: 'New creator on KrillTube',
      },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    // Get creator's videos (videos are linked by wallet address)
    const videos = await prisma.video.findMany({
      where: { creatorId: address },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        posterWalrusUri: true,
        duration: true,
        createdAt: true,
        encryptionType: true,
        network: true,
      },
    });

    // Check if current user is subscribed (from cookies)
    const cookieStore = await cookies();
    const userAddress = cookieStore.get('signature_address')?.value;
    const userChain = cookieStore.get('signature_chain')?.value;

    let isSubscribed = false;
    if (userAddress && userChain) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          subscriberAddress: userAddress,
          creatorId: creator.id,
          chain: userChain,
        },
      });
      isSubscribed = !!subscription;
    }

    // Format profile response
    const profile = {
      id: creator.id,
      walletAddress: creator.walletAddress,
      name: creator.name,
      bio: creator.bio,
      avatar: creator.avatar,
      createdAt: creator.createdAt.toISOString(),
      videoCount: videos.length,
      subscriberCount: creator._count.subscriptions,
      channelPrice: creator.channelPrice,
      channelChain: creator.channelChain,
      sealObjectId: creator.sealObjectId,
    };

    return NextResponse.json({
      profile,
      videos,
      isSubscribed,
    });
  } catch (error) {
    console.error('[Profile API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch profile',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/profile/[address]
 * Update creator profile information
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const cookieStore = await cookies();
    const userAddress = cookieStore.get('signature_address')?.value;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is updating their own profile
    if (userAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only edit your own profile' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, bio, channelPrice, channelChain, avatar } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate avatar size if provided (base64 can be large)
    if (avatar && avatar.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Avatar image is too large' },
        { status: 400 }
      );
    }

    // Get existing creator to check if channel needs to be created
    const existingCreator = await prisma.creator.findUnique({
      where: { walletAddress: address },
    });

    let sealObjectId = existingCreator?.sealObjectId || null;

    // If creator is setting a subscription price and doesn't have a channel yet
    if (channelPrice?.trim() && !sealObjectId && isSealConfigured()) {
      try {
        console.log('[Profile API] Creating on-chain channel for creator:', address);

        // Initialize Sui client
        const suiClient = new SuiClient({ url: SEAL_CONFIG.RPC_URL });

        // Use operator keypair to create channel on behalf of creator
        // Handle both bech32 (suiprivkey1...) and hex (0x...) formats
        let operatorKeypair: Ed25519Keypair;
        const privateKey = SEAL_CONFIG.OPERATOR_PRIVATE_KEY!;

        if (privateKey.startsWith('suiprivkey')) {
          // Bech32 format - use decodeSuiPrivateKey
          operatorKeypair = Ed25519Keypair.fromSecretKey(privateKey);
        } else {
          // Hex format - use fromHex
          operatorKeypair = Ed25519Keypair.fromSecretKey(fromHex(privateKey));
        }

        // Log operator address for funding (can remove after funding)
        const operatorAddress = operatorKeypair.toSuiAddress();
        console.log('═══════════════════════════════════════════════════════');
        console.log('🔑 OPERATOR WALLET ADDRESS (fund with SUI for gas):');
        console.log('   ', operatorAddress);
        console.log('═══════════════════════════════════════════════════════');

        // Convert SUI price to MIST
        const priceInMist = suiToMist(parseFloat(channelPrice.trim()));

        // Create on-chain channel
        const { channelId, digest } = await createChannel(
          SEAL_CONFIG.PACKAGE_ID,
          {
            name: name.trim(),
            description: bio?.trim() || `${name.trim()}'s Channel`,
            subscriptionPrice: priceInMist,
          },
          operatorKeypair,
          suiClient
        );

        console.log('[Profile API] Channel created:', channelId, 'tx:', digest);
        sealObjectId = channelId;
      } catch (error) {
        console.error('[Profile API] Failed to create channel:', error);
        // Don't fail the entire profile update if channel creation fails
        // User can try again later or admin can fix manually
      }
    }

    // Update or create creator profile
    const updatedCreator = await prisma.creator.upsert({
      where: { walletAddress: address },
      update: {
        name: name.trim(),
        bio: bio?.trim() || null,
        avatar: avatar || null,
        channelPrice: channelPrice?.trim() || null,
        channelChain: channelPrice?.trim() ? 'sui' : null,
        channelCoinType: channelPrice?.trim() ? '0x2::sui::SUI' : null,
        sealObjectId: sealObjectId,
      },
      create: {
        walletAddress: address,
        name: name.trim(),
        bio: bio?.trim() || null,
        avatar: avatar || null,
        channelPrice: channelPrice?.trim() || null,
        channelChain: channelPrice?.trim() ? 'sui' : null,
        channelCoinType: channelPrice?.trim() ? '0x2::sui::SUI' : null,
        sealObjectId: sealObjectId,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        id: updatedCreator.id,
        walletAddress: updatedCreator.walletAddress,
        name: updatedCreator.name,
        bio: updatedCreator.bio,
        avatar: updatedCreator.avatar,
        channelPrice: updatedCreator.channelPrice,
        channelChain: updatedCreator.channelChain,
      },
    });
  } catch (error) {
    console.error('[Profile API] Update error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update profile',
      },
      { status: 500 }
    );
  }
}
