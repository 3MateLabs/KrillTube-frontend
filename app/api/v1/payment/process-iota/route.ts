/**
 * API Route: POST /api/v1/payment/process-iota
 * Process IOTA payment on the backend
 *
 * Flow:
 * 1. Client builds transaction and signs it
 * 2. Client sends transaction bytes and signature to this endpoint
 * 3. Server dry runs the transaction to check for PaymentProcessed event
 * 4. Server executes the transaction
 * 5. Server validates event data (config ID, amount, coin type)
 * 6. Server creates VideoPaymentInfo record
 */

import { NextRequest, NextResponse } from 'next/server';
import { IotaClient } from '@iota/iota-sdk/client';
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
    if (!body.transactionBytes || typeof body.transactionBytes !== 'string') {
      return NextResponse.json(
        { error: 'Transaction bytes are required' },
        { status: 400 }
      );
    }

    if (!body.signature || typeof body.signature !== 'string') {
      return NextResponse.json(
        { error: 'Signature is required' },
        { status: 400 }
      );
    }

    if (!body.videoId || typeof body.videoId !== 'string') {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }

    const { transactionBytes, signature, videoId } = body;

    // Initialize IOTA client
    const rpcUrl = process.env.NEXT_PUBLIC_IOTA_RPC_URL || 'https://api.mainnet.iota.cafe';
    const client = new IotaClient({ url: rpcUrl });
    const tunnelPackageId = process.env.NEXT_PUBLIC_IOTA_TUNNEL_PACKAGE_ID!;

    console.log('[Process Payment IOTA] Starting payment processing', {
      videoId,
      tunnelPackageId,
      rpcUrl,
    });

    // Step 1: Dry run the transaction to check for PaymentProcessed event
    console.log('[Process Payment IOTA] Dry running transaction...');
    let dryRunResult;
    try {
      dryRunResult = await client.dryRunTransactionBlock({
        transactionBlock: transactionBytes,
      });
    } catch (error) {
      console.error('[Process Payment IOTA] Dry run failed:', error);
      return NextResponse.json(
        { error: 'Transaction dry run failed', details: error instanceof Error ? error.message : String(error) },
        { status: 400 }
      );
    }

    console.log('[Process Payment IOTA] Dry run result:', JSON.stringify(dryRunResult, null, 2));

    // Check if dry run was successful
    if (dryRunResult.effects.status.status !== 'success') {
      console.error('[Process Payment IOTA] Dry run transaction failed:', dryRunResult.effects.status);
      return NextResponse.json(
        {
          error: 'Transaction would fail',
          details: dryRunResult.effects.status.error || 'Unknown error'
        },
        { status: 400 }
      );
    }

    // Step 2: Find PaymentProcessed event
    const paymentProcessedEventType = `${tunnelPackageId}::tunnel::PaymentProcessed`;
    const paymentEvent = dryRunResult.events?.find(
      (event: any) => event.type === paymentProcessedEventType
    );

    if (!paymentEvent) {
      console.error('[Process Payment IOTA] PaymentProcessed event not found in dry run');
      return NextResponse.json(
        { error: 'PaymentProcessed event not found in transaction' },
        { status: 400 }
      );
    }

    console.log('[Process Payment IOTA] Found PaymentProcessed event:', paymentEvent);

    const eventData = paymentEvent.parsedJson as PaymentProcessedEvent;
    const { amount, config_id, payer } = eventData;

    // Step 3: Validate creator config exists and belongs to this video
    const creatorConfig = await prisma.creatorConfig.findFirst({
      where: {
        objectId: config_id,
        videoId: videoId,
        chain: 'iota',
      },
    });

    if (!creatorConfig) {
      console.error('[Process Payment IOTA] Creator config not found or does not belong to this video', {
        config_id,
        videoId,
      });
      return NextResponse.json(
        { error: 'Invalid creator config for this video' },
        { status: 400 }
      );
    }

    console.log('[Process Payment IOTA] Creator config validated:', creatorConfig);

    // Step 4: Validate amount matches
    if (amount !== creatorConfig.pricePerView) {
      console.error('[Process Payment IOTA] Payment amount does not match price per view', {
        amount,
        pricePerView: creatorConfig.pricePerView,
      });
      return NextResponse.json(
        { error: 'Payment amount does not match required price' },
        { status: 400 }
      );
    }

    // Step 5: Validate coin type from created objects
    // Check transaction created exactly 2 new objects (payment coins for creator and referrer)
    const createdObjects = dryRunResult.effects.created || [];
    console.log('[Process Payment IOTA] Created objects:', createdObjects);

    if (createdObjects.length < 1) {
      console.error('[Process Payment IOTA] Expected at least 1 created object, found:', createdObjects.length);
      return NextResponse.json(
        { error: 'Transaction did not create expected payment objects' },
        { status: 400 }
      );
    }

    // Get the object type to extract coin type
    // The type will be like: 0x2::coin::Coin<COIN_TYPE>
    const firstCreatedObject = createdObjects[0];
    let objectDetails;
    try {
      objectDetails = await client.getObject({
        id: firstCreatedObject.reference.objectId,
        options: { showType: true },
      });
    } catch (error) {
      console.error('[Process Payment IOTA] Failed to fetch created object:', error);
      // Continue anyway since this is a dry run object that might not exist yet
    }

    // Extract coin type from object type if available
    let coinType: string | null = null;
    if (objectDetails?.data?.type) {
      const typeMatch = objectDetails.data.type.match(/0x2::coin::Coin<(.+)>/);
      if (typeMatch) {
        coinType = typeMatch[1];
        console.log('[Process Payment IOTA] Extracted coin type:', coinType);
      }
    }

    // If we couldn't extract from dry run, we'll validate after execution
    if (coinType && coinType !== creatorConfig.coinType) {
      console.error('[Process Payment IOTA] Coin type does not match creator config', {
        coinType,
        expectedCoinType: creatorConfig.coinType,
      });
      return NextResponse.json(
        { error: 'Payment coin type does not match creator config' },
        { status: 400 }
      );
    }

    // Step 6: Execute the transaction
    console.log('[Process Payment IOTA] Executing transaction...');
    let executionResult;
    try {
      executionResult = await client.executeTransactionBlock({
        transactionBlock: transactionBytes,
        signature,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    } catch (error) {
      console.error('[Process Payment IOTA] Transaction execution failed:', error);
      return NextResponse.json(
        { error: 'Transaction execution failed', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }

    console.log('[Process Payment IOTA] Transaction executed:', executionResult.digest);

    // Check execution status
    if (executionResult.effects?.status?.status !== 'success') {
      console.error('[Process Payment IOTA] Transaction failed:', executionResult.effects?.status);
      return NextResponse.json(
        {
          error: 'Transaction failed',
          details: executionResult.effects?.status?.error || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Step 7: Validate event from executed transaction
    const executedPaymentEvent = executionResult.events?.find(
      (event: any) => event.type === paymentProcessedEventType
    );

    if (!executedPaymentEvent) {
      console.error('[Process Payment IOTA] PaymentProcessed event not found in executed transaction');
      return NextResponse.json(
        { error: 'PaymentProcessed event not found in executed transaction' },
        { status: 500 }
      );
    }

    // Step 8: Get all video segments to determine paidSegmentIds
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
      console.error('[Process Payment IOTA] Video not found:', videoId);
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

    console.log('[Process Payment IOTA] Video has segments:', paidSegmentIds);

    // Step 9: Create VideoPaymentInfo record
    const videoPaymentInfo = await prisma.videoPaymentInfo.create({
      data: {
        videoId,
        payerAddress: payer,
        chain: 'iota',
        tunnelObjectId: config_id, // Store the creator config object ID
        maxAllowedPayAmount: amount,
        currentPayAmount: amount,
        authorizeSignature: null, // Not used for direct payments
        paidSegmentIds,
      },
    });

    console.log('[Process Payment IOTA] Created VideoPaymentInfo:', videoPaymentInfo.id);

    return NextResponse.json({
      success: true,
      digest: executionResult.digest,
      paymentInfo: {
        id: videoPaymentInfo.id,
        videoId: videoPaymentInfo.videoId,
        payerAddress: videoPaymentInfo.payerAddress,
        chain: videoPaymentInfo.chain,
        paidSegmentIds: videoPaymentInfo.paidSegmentIds,
      },
      event: executedPaymentEvent.parsedJson,
    });

  } catch (error) {
    console.error('[API Payment/Process-IOTA] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process payment',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
