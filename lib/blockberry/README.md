# Blockberry API Service

Service for fetching IOTA token prices and metadata from the Blockberry API.

## Overview

Blockberry provides comprehensive blockchain data for IOTA network, including:
- Token prices (calculated from market cap and circulating supply)
- Token metadata (name, symbol, decimals, etc.)
- Supply information (total supply, circulating supply)
- Market data (market cap, volume)
- Social links (website, Twitter, GitHub, Discord, etc.)

## API Documentation

Official Docs: https://docs.blockberry.one/

## Configuration

Add your Blockberry API key to `.env.local`:

```bash
BLOCKBERRY_API_KEY="your-api-key-here"
```

Get your API key at: https://blockberry.one/

## API Endpoints

### Get IOTA Coin Price

**Endpoint:** `GET /api/v1/iota/coin-price/[coinType]`

**Example:**
```bash
curl http://localhost:3000/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA
```

**Response:**
```json
{
  "success": true,
  "coinType": "0x2::iota::IOTA",
  "price": 0.132,
  "currency": "USD",
  "source": "blockberry"
}
```

## Usage in Code

### Fetching IOTA Token Price

```typescript
import { getIotaCoinPrice } from '@/lib/blockberry/iotaPriceApi';

// Get IOTA price
const iotaPrice = await getIotaCoinPrice('0x2::iota::IOTA');
console.log(`IOTA Price: $${iotaPrice}`);

// Get custom token price
const customTokenPrice = await getIotaCoinPrice('0x123::custom::TOKEN');
console.log(`Custom Token Price: $${customTokenPrice}`);
```

### Fetching Full Coin Metadata

```typescript
import { getIotaCoinMetadata } from '@/lib/blockberry/iotaPriceApi';

const metadata = await getIotaCoinMetadata('0x2::iota::IOTA');

if (metadata) {
  console.log('Coin Name:', metadata.coinName);
  console.log('Symbol:', metadata.coinSymbol);
  console.log('Decimals:', metadata.decimals);
  console.log('Total Supply:', metadata.totalSupply);
  console.log('Circulating Supply:', metadata.circulatingSupply);
  console.log('Market Cap:', metadata.marketCap);
  console.log('24h Volume:', metadata.volume);
  console.log('Description:', metadata.description);
  console.log('Website:', metadata.socialWebsite);
  console.log('Twitter:', metadata.socialTwitter);
  console.log('GitHub:', metadata.socialGitHub);
}
```

### Client-Side Usage

```typescript
// In your React component
async function fetchIotaPrice() {
  const response = await fetch('/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA');
  const data = await response.json();

  if (data.success) {
    console.log(`IOTA Price: $${data.price}`);
  }
}
```

## Price Calculation

Blockberry API returns market cap and circulating supply. The price is calculated as:

```
Price = Market Cap / Circulating Supply
```

For example, if IOTA has:
- Market Cap: $546,878,784
- Circulating Supply: 4,142,613,112 IOTA

Then:
```
Price = $546,878,784 / 4,142,613,112 = $0.132 per IOTA
```

## Fallback Strategy

The service implements a fallback to CoinGecko if:
1. Blockberry API key is not configured
2. Blockberry API returns an error
3. Price calculation results in invalid data

For the main IOTA token (`0x2::iota::IOTA`), it will automatically fall back to CoinGecko's IOTA price.

## TypeScript Types

```typescript
interface BlockberryCoinMetadata {
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
```

## Caching

The API route implements Vercel Edge caching:
- Cache duration: 5 minutes
- Stale-while-revalidate: 60 seconds

This means:
- Requests are cached for 5 minutes
- After 5 minutes, stale data can be served for up to 60 seconds while fresh data is fetched in the background

## Error Handling

The service handles errors gracefully:

1. **Missing API Key**: Falls back to CoinGecko
2. **API Error**: Logs error and tries CoinGecko fallback
3. **Invalid Data**: Returns 0 or null depending on the function
4. **Network Error**: Catches and logs, returns 0 or null

## Example: Multi-Chain Price Display

```typescript
import { getCoinPrice } from '@/lib/suivision/genericPriceApi';
import { getIotaCoinPrice } from '@/lib/blockberry/iotaPriceApi';

async function displayPrices() {
  // Get Sui price
  const suiPrice = await getCoinPrice('0x2::sui::SUI');
  console.log(`SUI: $${suiPrice}`);

  // Get IOTA price
  const iotaPrice = await getIotaCoinPrice('0x2::iota::IOTA');
  console.log(`IOTA: $${iotaPrice}`);
}
```

## Debugging

Enable debug logs by checking the console:

```typescript
// The service logs detailed information:
[Blockberry] Fetching coin metadata for: 0x2::iota::IOTA
[Blockberry] IOTA price: $0.1320
[Blockberry] Market Cap: $546,878,784
[Blockberry] Circulating Supply: 4,142,613,112
```

## Testing the API

### Using curl

```bash
# Get IOTA price
curl http://localhost:3000/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA

# Get custom token price
curl http://localhost:3000/api/v1/iota/coin-price/0xABC%3A%3Acustom%3A%3ATOKEN
```

### Using fetch in browser console

```javascript
fetch('/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA')
  .then(r => r.json())
  .then(data => console.log('IOTA Price:', data.price));
```

## Comparison with Sui Price API

| Feature | Sui (BlockVision) | IOTA (Blockberry) |
|---------|------------------|-------------------|
| API Endpoint | `/api/v1/coin-price/[coinType]` | `/api/v1/iota/coin-price/[coinType]` |
| Service | BlockVision | Blockberry |
| Network | Sui Mainnet | IOTA Mainnet |
| Price Source | Direct from API | Calculated (Market Cap / Supply) |
| Fallback | CoinGecko | CoinGecko |
| Cache Duration | 5 minutes | 5 minutes |

## Related Files

- Service Implementation: `/lib/blockberry/iotaPriceApi.ts`
- API Route: `/app/api/v1/iota/coin-price/[coinType]/route.ts`
- Sui Price Service: `/lib/suivision/genericPriceApi.ts`
- Environment Config: `.env.example`

## Troubleshooting

### Price returns 0

**Possible causes:**
1. API key not configured - Check `.env.local`
2. Invalid coin type - Verify the coin type format
3. Circulating supply is 0 - Check coin metadata
4. API rate limit reached - Wait and retry

**Solution:**
- Verify API key is set correctly
- Check Blockberry API status
- Review console logs for detailed error messages

### API returns 401 Unauthorized

**Cause:** Invalid or missing API key

**Solution:**
```bash
# Add to .env.local
BLOCKBERRY_API_KEY="your-actual-api-key"
```

### CoinGecko fallback always used

**Cause:** Blockberry API key not configured or API error

**Solution:**
- Check if `BLOCKBERRY_API_KEY` is set in `.env.local`
- Verify API key is valid
- Check Blockberry API service status
