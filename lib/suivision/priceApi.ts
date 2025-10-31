/**
 * SuiVision API client for fetching token prices
 * Docs: https://docs.blockvision.org/reference/retrieve-coin-detail
 */

const SUIVISION_API_KEY = process.env.SUIVISION_API_KEY || '';
const SUIVISION_BASE_URL = 'https://api.blockvision.org/v2/sui';

// WAL token type from Walrus SDK
const WAL_TOKEN_TYPE = '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL';

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
 * Fetch WAL token details including current USD price
 */
export async function getWalPrice(): Promise<number> {
  if (!SUIVISION_API_KEY) {
    console.warn('[SuiVision] API key not configured, price fetch disabled');
    return 0;
  }

  try {
    const url = new URL(`${SUIVISION_BASE_URL}/coin/detail`);
    url.searchParams.append('coinType', WAL_TOKEN_TYPE);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': SUIVISION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SuiVision] API error (${response.status}):`, errorText);
      return 0;
    }

    const data = await response.json();

    // API response structure: { result: CoinDetail }
    const coinDetail: CoinDetail = data.result || data;

    // Price can be returned as string or number
    const price = typeof coinDetail.price === 'string'
      ? parseFloat(coinDetail.price)
      : coinDetail.price;

    if (typeof price === 'number' && price > 0 && !isNaN(price)) {
      console.log(`[SuiVision] WAL price: $${price.toFixed(4)}`);
      return price;
    }

    console.warn('[SuiVision] Invalid price data:', coinDetail);
    return 0;
  } catch (error) {
    console.error('[SuiVision] Failed to fetch WAL price:', error);
    return 0;
  }
}

/**
 * Fetch full coin details for WAL token
 */
export async function getWalCoinDetail(): Promise<CoinDetail | null> {
  if (!SUIVISION_API_KEY) {
    console.warn('[SuiVision] API key not configured');
    return null;
  }

  try {
    const url = new URL(`${SUIVISION_BASE_URL}/coin/detail`);
    url.searchParams.append('coinType', WAL_TOKEN_TYPE);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-KEY': SUIVISION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[SuiVision] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.result || data;
  } catch (error) {
    console.error('[SuiVision] Failed to fetch coin detail:', error);
    return null;
  }
}
