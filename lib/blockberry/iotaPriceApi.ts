/**
 * Blockberry API client for fetching IOTA token prices and metadata
 * API Docs: https://docs.blockberry.one/
 */

const BLOCKBERRY_API_KEY = process.env.BLOCKBERRY_API_KEY || '';
const BLOCKBERRY_BASE_URL = 'https://api.blockberry.one/iota-mainnet/v1';

export interface BlockberryCoinMetadata {
  coinType: string;
  coinName: string;
  coinSymbol: string;
  decimals: number;
  imgUrl: string | null;
  description: string | null;
  totalSupply: number;
  circulatingSupply: number;
  marketCap: number;
  volume: number;
  socialWebsite: string | null;
  socialDiscord: string | null;
  socialEmail: string | null;
  socialGitHub: string | null;
  socialTelegram: string | null;
  socialTwitter: string | null;
  securityMessage: string | null;
}

/**
 * Calculate price from market cap and circulating supply
 * Price = Market Cap / Circulating Supply
 */
function calculatePrice(marketCap: number, circulatingSupply: number): number {
  if (circulatingSupply === 0) {
    console.warn('[Blockberry] Circulating supply is 0, cannot calculate price');
    return 0;
  }

  const price = marketCap / circulatingSupply;
  return price;
}

/**
 * Fallback price fetcher for IOTA using CoinGecko
 */
async function getCoinGeckoIotaPrice(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=iota&vs_currencies=usd',
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
    const price = data.iota?.usd;

    if (typeof price === 'number' && price > 0) {
      console.log(`[CoinGecko] IOTA price: $${price.toFixed(4)}`);
      return price;
    }

    return 0;
  } catch (error) {
    console.error('[CoinGecko] Failed to fetch IOTA price:', error);
    return 0;
  }
}

/**
 * Fetch IOTA coin price from Blockberry API with CoinGecko fallback
 */
export async function getIotaCoinPrice(coinType: string): Promise<number> {
  if (!BLOCKBERRY_API_KEY) {
    console.warn('[Blockberry] API key not configured, trying CoinGecko fallback...');
    return getCoinGeckoIotaPrice();
  }

  try {
    // URL encode the coin type
    const encodedCoinType = encodeURIComponent(coinType);
    const url = `${BLOCKBERRY_BASE_URL}/coins/metadata/${encodedCoinType}`;

    console.log(`[Blockberry] Fetching coin metadata for: ${coinType}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'x-api-key': BLOCKBERRY_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Blockberry] API error (${response.status}):`, errorText);

      // Try CoinGecko fallback for IOTA token
      if (coinType === '0x2::iota::IOTA') {
        console.log('[Blockberry] Trying CoinGecko fallback for IOTA...');
        return getCoinGeckoIotaPrice();
      }

      return 0;
    }

    const coinMetadata: BlockberryCoinMetadata = await response.json();

    // Calculate price from market cap and circulating supply
    const price = calculatePrice(coinMetadata.marketCap, coinMetadata.circulatingSupply);

    if (typeof price === 'number' && price > 0 && !isNaN(price)) {
      console.log(`[Blockberry] ${coinMetadata.coinSymbol} price: $${price.toFixed(4)}`);
      console.log(`[Blockberry] Market Cap: $${coinMetadata.marketCap.toLocaleString()}`);
      console.log(`[Blockberry] Circulating Supply: ${coinMetadata.circulatingSupply.toLocaleString()}`);
      return price;
    }

    console.warn('[Blockberry] Invalid price data, trying CoinGecko fallback...');
    if (coinType === '0x2::iota::IOTA') {
      return getCoinGeckoIotaPrice();
    }

    return 0;
  } catch (error) {
    console.error('[Blockberry] Failed to fetch coin price:', error);

    // Try CoinGecko fallback for IOTA token
    if (coinType === '0x2::iota::IOTA') {
      console.log('[Blockberry] Trying CoinGecko fallback after error...');
      return getCoinGeckoIotaPrice();
    }

    return 0;
  }
}

/**
 * Fetch full coin metadata from Blockberry API
 */
export async function getIotaCoinMetadata(coinType: string): Promise<BlockberryCoinMetadata | null> {
  if (!BLOCKBERRY_API_KEY) {
    console.warn('[Blockberry] API key not configured');
    return null;
  }

  try {
    // URL encode the coin type
    const encodedCoinType = encodeURIComponent(coinType);
    const url = `${BLOCKBERRY_BASE_URL}/coins/metadata/${encodedCoinType}`;

    console.log(`[Blockberry] Fetching full metadata for: ${coinType}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'x-api-key': BLOCKBERRY_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`[Blockberry] API error: ${response.status}`);
      return null;
    }

    const coinMetadata: BlockberryCoinMetadata = await response.json();

    console.log(`[Blockberry] Successfully fetched metadata for ${coinMetadata.coinSymbol}`);

    return coinMetadata;
  } catch (error) {
    console.error('[Blockberry] Failed to fetch coin metadata:', error);
    return null;
  }
}
