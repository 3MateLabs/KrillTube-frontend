/**
 * API route to fetch wallet coins from BlockVision
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WalletCoin } from '@/types/blockvision';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Get API key from environment (try both BlockVision and SuiVision)
    const apiKey = process.env.BLOCKVISION_API_KEY || process.env.SUIVISION_API_KEY;
    if (!apiKey) {
      console.warn('BLOCKVISION_API_KEY or SUIVISION_API_KEY not set, returning empty coins');
      return NextResponse.json({ coins: [] });
    }

    // Fetch wallet coins from BlockVision/SuiVision API
    const response = await fetch(
      `https://api.blockvision.org/v2/sui/account/coins?account=${address}`,
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('BlockVision API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`BlockVision API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Transform the data to match our WalletCoin interface
    const coins: WalletCoin[] = (data.result?.coins || []).map((coin: any) => ({
      coinType: coin.coinType,
      symbol: coin.symbol || 'Unknown',
      name: coin.name || 'Unknown Token',
      decimals: coin.decimals || 9,
      balance: coin.balance || '0',
      value: parseFloat(coin.usdValue || coin.value || '0'),
      iconUrl: coin.logo || coin.iconUrl || coin.icon_url,
    }));

    // Filter out coins with zero balance
    const nonZeroCoins = coins.filter(coin => parseFloat(coin.balance) > 0);

    return NextResponse.json({ coins: nonZeroCoins });
  } catch (error) {
    console.error('Error fetching wallet coins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet coins' },
      { status: 500 }
    );
  }
}
