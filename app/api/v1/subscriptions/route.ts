/**
 * API Route: /v1/subscriptions
 * Handle creator subscription payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * POST /api/v1/subscriptions
 * Save subscription record after on-chain payment
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const userAddress = cookieStore.get('signature_address')?.value;
    const userChain = cookieStore.get('signature_chain')?.value;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { creatorAddress, txDigest } = body;

    // Validate required fields
    if (!creatorAddress || !txDigest) {
      return NextResponse.json(
        { error: 'Creator address and transaction digest are required' },
        { status: 400 }
      );
    }

    // Verify creator exists
    const creator = await prisma.creator.findUnique({
      where: { walletAddress: creatorAddress },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Verify creator has subscription enabled
    if (!creator.channelPrice || !creator.sealObjectId) {
      return NextResponse.json(
        { error: 'Creator does not have subscriptions enabled' },
        { status: 400 }
      );
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        subscriberAddress: userAddress,
        creatorId: creator.id,
        chain: userChain || 'sui',
      },
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'Already subscribed to this creator' },
        { status: 400 }
      );
    }

    // Create subscription record
    const subscription = await prisma.subscription.create({
      data: {
        subscriberAddress: userAddress,
        creatorId: creator.id,
        chain: userChain || 'sui',
        txDigest,
      },
      include: {
        creator: {
          select: {
            walletAddress: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    console.log('[Subscription API] Created subscription:', {
      subscriber: userAddress,
      creator: creatorAddress,
      txDigest,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        creator: subscription.creator,
        subscribedAt: subscription.createdAt.toISOString(),
        txDigest: subscription.txDigest,
      },
    });
  } catch (error) {
    console.error('[Subscription API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/subscriptions
 * Get current user's subscriptions
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const cookieStore = await cookies();
    const userAddress = cookieStore.get('signature_address')?.value;
    const userChain = cookieStore.get('signature_chain')?.value;

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        subscriberAddress: userAddress,
        chain: userChain || 'sui',
      },
      include: {
        creator: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
            bio: true,
            avatar: true,
            channelPrice: true,
            channelChain: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        creator: {
          id: sub.creator.id,
          walletAddress: sub.creator.walletAddress,
          name: sub.creator.name,
          bio: sub.creator.bio,
          avatar: sub.creator.avatar,
          channelPrice: sub.creator.channelPrice,
          channelChain: sub.creator.channelChain,
          videoCount: 0, // TODO: Add videos relation to Creator model
        },
        subscribedAt: sub.createdAt.toISOString(),
        txDigest: sub.txDigest,
      })),
    });
  } catch (error) {
    console.error('[Subscription API] Error fetching subscriptions:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch subscriptions',
      },
      { status: 500 }
    );
  }
}
