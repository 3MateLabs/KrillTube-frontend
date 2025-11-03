/**
 * Generic BlockVision API client for fetching token prices
 * Docs: https://docs.blockvision.org/reference/retrieve-coin-detail
 */

const SUIVISION_API_KEY = process.env.SUIVISION_API_KEY || '';
const SUIVISION_BASE_URL = 'https://api.blockvision.org/v2/sui';

export interface CoinDetail {
  name: string;
  symbol: string;
  decimals: number;
  logo: string;
  price: number | string; // USD price (can be string or number from API)
  priceChangePercentage24H: number | string;
  totalSupply: string;
  circulatingSupply?: string;
  circulating?: string; // Alternative field name
  holders: number;
  marketCap: number;
  website: string;
  creator: string;
  createdTime: number;
  isVerified?: boolean;
  verified?: boolean; // Alternative field name
  scamFlag: boolean | number;
}

/**
 * Fallback price fetcher for well-known tokens using CoinGecko
 */
async function getCoinGeckoPrice(coinType: string): Promise<number> {
  // Map of coin types to CoinGecko IDs
  const coinGeckoMap: Record<string, string> = {
    '0x2::sui::SUI': 'sui',
    '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': 'usd-coin', // USDC on Sui
  };

  const geckoId = coinGeckoMap[coinType];
  if (!geckoId) {
    return 0;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[CoinGecko] API error: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    const price = data[geckoId]?.usd;

    if (typeof price === 'number' && price > 0) {
      console.log(`[CoinGecko] ${geckoId} price: $${price.toFixed(4)}`);
      return price;
    }

    return 0;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch price:', error);
    return 0;
  }
}

/**
 * Fetch any coin's price from BlockVision API with CoinGecko fallback
 */
export async function getCoinPrice(coinType: string): Promise<number> {
  if (!SUIVISION_API_KEY) {
    console.warn('[BlockVision] API key not configured, trying fallback...');
    return getCoinGeckoPrice(coinType);
  }

  try {
    const url = new URL(`${SUIVISION_BASE_URL}/coin/detail`);
    url.searchParams.append('coinType', coinType);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': SUIVISION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BlockVision] API error (${response.status}):`, errorText);
      return getCoinGeckoPrice(coinType);
    }

    const data = await response.json();

    // API response structure: { result: CoinDetail }
    const coinDetail: CoinDetail = data.result || data;

    // Price can be returned as string or number
    const price = typeof coinDetail.price === 'string'
      ? parseFloat(coinDetail.price)
      : coinDetail.price;

    if (typeof price === 'number' && price > 0 && !isNaN(price)) {
      console.log(`[BlockVision] ${coinDetail.symbol || coinType} price: $${price.toFixed(4)}`);
      return price;
    }

    console.warn('[BlockVision] Invalid price data, trying fallback...');
    return getCoinGeckoPrice(coinType);
  } catch (error) {
    console.error('[BlockVision] Failed to fetch coin price, trying fallback:', error);
    return getCoinGeckoPrice(coinType);
  }
}

/**
 * Fetch full coin details for any coin
 */
export async function getCoinDetail(coinType: string): Promise<CoinDetail | null> {
  if (!SUIVISION_API_KEY) {
    console.warn('[BlockVision] API key not configured');
    return null;
  }

  try {
    const url = new URL(`${SUIVISION_BASE_URL}/coin/detail`);
    url.searchParams.append('coinType', coinType);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': SUIVISION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[BlockVision] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.result || data;
  } catch (error) {
    console.error('[BlockVision] Failed to fetch coin detail:', error);
    return null;
  }
}
