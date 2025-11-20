/**
 * API Route: POST /api/v1/payment/process-sui
 * Process SUI payment on the backend
 *
 * Flow:
 * 1. Client executes transaction on-chain (already done)
 * 2. Client sends transaction digest to this endpoint
 * 3. Server fetches transaction details from blockchain
 * 4. Server validates PaymentProcessed event
 * 5. Server validates event data (config ID, amount, coin type)
 * 6. Server creates VideoPaymentInfo record
 */

import { NextRequest, NextResponse } from 'next/server';
import { SuiClient } from '@mysten/sui/client';
import { prisma } from '@/lib/db';

interface PaymentProcessedEvent {
  amount: string;
  config_id: string;
  payer: string;
  referrer: string;
  timestamp_ms: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.digest || typeof body.digest !== 'string') {
      return NextResponse.json(
        { error: 'Transaction digest is required' },
        { status: 400 }
      );
    }

    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const { digest, videoId } = body;

    // Initialize SUI client
    const rpcUrl = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.mainnet.sui.io:443';
    const client = new SuiClient({ url: rpcUrl });
    const tunnelPackageId = process.env.NEXT_PUBLIC_SUI_TUNNEL_PACKAGE_ID!;

    console.log('[Process Payment SUI] Starting payment verification', {
      videoId,
      digest,
      tunnelPackageId,
      rpcUrl,
    });

    // Step 1: Fetch transaction details from blockchain
    console.log('[Process Payment SUI] Fetching transaction...');
    let transaction;
    try {
      transaction = await client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    } catch (error) {
      console.error('[Process Payment SUI] Failed to fetch transaction:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transaction from blockchain', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }

    console.log('[Process Payment SUI] Transaction fetched:', digest);

    // Check transaction status
    if (transaction.effects?.status?.status !== 'success') {
      console.error('[Process Payment SUI] Transaction failed on-chain:', transaction.effects?.status);
      return NextResponse.json(
        {
          error: 'Transaction failed on-chain',
          details: transaction.effects?.status?.error || 'Unknown error'
        },
        { status: 400 }
      );
    }

    // Step 2: Find PaymentProcessed event
    const paymentProcessedEventType = `${tunnelPackageId}::tunnel::PaymentProcessed`;
    const paymentEvent = transaction.events?.find(
      (event: any) => event.type === paymentProcessedEventType
    );

    if (!paymentEvent) {
      console.error('[Process Payment SUI] PaymentProcessed event not found');
      return NextResponse.json(
        { error: 'PaymentProcessed event not found in transaction' },
        { status: 400 }
      );
    }

    console.log('[Process Payment SUI] Found PaymentProcessed event:', paymentEvent);

    const eventData = paymentEvent.parsedJson as PaymentProcessedEvent;
    const { amount, config_id, payer } = eventData;

    // Step 3: Validate creator config exists and belongs to this video
    const creatorConfig = await prisma.creatorConfig.findFirst({
      where: {
        objectId: config_id,
        videoId: videoId,
        chain: 'sui',
      },
    });

    if (!creatorConfig) {
      console.error('[Process Payment SUI] Creator config not found or does not belong to this video', {
        config_id,
        videoId,
      });
      return NextResponse.json(
        { error: 'Invalid creator config for this video' },
        { status: 400 }
      );
    }

    console.log('[Process Payment SUI] Creator config validated:', creatorConfig);

    // Step 4: Validate amount matches
    if (amount !== creatorConfig.pricePerView) {
      console.error('[Process Payment SUI] Payment amount does not match price per view', {
        amount,
        pricePerView: creatorConfig.pricePerView,
      });
      return NextResponse.json(
        { error: 'Payment amount does not match required price' },
        { status: 400 }
      );
    }

    // Step 5: Get all video segments to determine paidSegmentIds
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        renditions: {
          include: {
            segments: {
              orderBy: { segIdx: 'asc' },
            },
          },
        },
      },
    });

    if (!video) {
      console.error('[Process Payment SUI] Video not found:', videoId);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Get all unique segment indices across all renditions
    const segmentIndices = new Set<number>();
    video.renditions.forEach(rendition => {
      rendition.segments.forEach(segment => {
        segmentIndices.add(segment.segIdx);
      });
    });
    const paidSegmentIds = Array.from(segmentIndices).sort((a, b) => a - b);

    console.log('[Process Payment SUI] Video has segments:', paidSegmentIds);

    // Step 6: Check if payment already recorded (prevent double-recording)
    const existingPayment = await prisma.videoPaymentInfo.findFirst({
      where: {
        videoId,
        payerAddress: payer,
        chain: 'sui',
      },
    });

    if (existingPayment) {
      console.log('[Process Payment SUI] Payment already recorded:', existingPayment.id);
      return NextResponse.json({
        success: true,
        digest,
        paymentInfo: {
          id: existingPayment.id,
          videoId: existingPayment.videoId,
          payerAddress: existingPayment.payerAddress,
          chain: existingPayment.chain,
          paidSegmentIds: existingPayment.paidSegmentIds,
        },
        event: eventData,
      });
    }

    // Step 7: Create VideoPaymentInfo record
    const videoPaymentInfo = await prisma.videoPaymentInfo.create({
      data: {
        videoId,
        payerAddress: payer,
        chain: 'sui',
        tunnelObjectId: config_id, // Store the creator config object ID
        maxAllowedPayAmount: amount,
        currentPayAmount: amount,
        authorizeSignature: null, // Not used for direct payments
        paidSegmentIds,
      },
    });

    console.log('[Process Payment SUI] Created VideoPaymentInfo:', videoPaymentInfo.id);

    return NextResponse.json({
      success: true,
      digest,
      paymentInfo: {
        id: videoPaymentInfo.id,
        videoId: videoPaymentInfo.videoId,
        payerAddress: videoPaymentInfo.payerAddress,
        chain: videoPaymentInfo.chain,
        paidSegmentIds: videoPaymentInfo.paidSegmentIds,
      },
      event: eventData,
    });

  } catch (error) {
    console.error('[API Payment/Process-SUI] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process payment',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
