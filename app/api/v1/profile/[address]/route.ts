/**
 * API Route: /v1/profile/[address]
 * Get and update creator profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

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
      },
      create: {
        walletAddress: address,
        name: name.trim(),
        bio: bio?.trim() || null,
        avatar: avatar || null,
        channelPrice: channelPrice?.trim() || null,
        channelChain: channelPrice?.trim() ? 'sui' : null,
        channelCoinType: channelPrice?.trim() ? '0x2::sui::SUI' : null,
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
