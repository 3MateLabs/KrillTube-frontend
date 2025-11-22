/**
 * API Route: /v1/channel/[id]
 * Get on-chain channel data
 */

import { NextRequest, NextResponse } from 'next/server';
import { SuiClient } from '@mysten/sui/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const channelId = params.id;

    const client = new SuiClient({
      url: 'https://fullnode.mainnet.sui.io:443'
    });

    const obj = await client.getObject({
      id: channelId,
      options: { showContent: true }
    });

    if (obj.data?.content?.dataType !== 'moveObject') {
      return NextResponse.json(
        { error: 'Channel not found or invalid object' },
        { status: 404 }
      );
    }

    const fields = obj.data.content.fields as any;

    return NextResponse.json({
      success: true,
      channel: {
        id: channelId,
        creator: fields.creator,
        name: fields.name,
        subscriptionPrice: fields.subscription_price,
        subscriptionPriceInSui: Number(fields.subscription_price) / 1_000_000_000,
        subscribers: fields.subscribers?.fields?.contents?.length || 0,
      }
    });
  } catch (error) {
    console.error('[API Channel] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch channel',
      },
      { status: 500 }
    );
  }
}
