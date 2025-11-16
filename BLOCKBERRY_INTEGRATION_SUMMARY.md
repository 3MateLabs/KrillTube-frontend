# Blockberry IOTA Price API Integration

## Summary

Successfully integrated Blockberry API for fetching IOTA token prices and metadata. The system now supports both Sui (via BlockVision) and IOTA (via Blockberry) token price feeds.

## Files Created

### 1. **Blockberry Service** (`/lib/blockberry/iotaPriceApi.ts`)

Core service for interacting with Blockberry API:

- `getIotaCoinPrice(coinType)` - Fetch token price with CoinGecko fallback
- `getIotaCoinMetadata(coinType)` - Fetch complete token metadata
- TypeScript types for `BlockberryCoinMetadata`
- Automatic price calculation from market cap / circulating supply
- Error handling and fallback strategies

**Key Features:**
- ✅ Type-safe API client
- ✅ CoinGecko fallback for IOTA token
- ✅ Price calculation from market data
- ✅ Comprehensive error handling
- ✅ Detailed logging

### 2. **API Route** (`/app/api/v1/iota/coin-price/[coinType]/route.ts`)

RESTful endpoint for IOTA token prices:

**Endpoint:** `GET /api/v1/iota/coin-price/[coinType]`

**Example Request:**
```bash
curl http://localhost:3000/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA
```

**Example Response:**
```json
{
  "success": true,
  "coinType": "0x2::iota::IOTA",
  "price": 0.132,
  "currency": "USD",
  "source": "blockberry"
}
```

**Features:**
- ✅ URL-encoded coin type support
- ✅ 5-minute Vercel Edge caching
- ✅ Error handling with detailed messages
- ✅ Standardized response format

### 3. **Documentation** (`/lib/blockberry/README.md`)

Comprehensive documentation including:
- API usage examples
- Configuration instructions
- Price calculation explanation
- Error handling guide
- Troubleshooting tips
- Client-side usage examples

### 4. **Example Code** (`/lib/blockberry/example.ts`)

Executable examples demonstrating:
- Fetching IOTA price
- Fetching full metadata
- Comparing prices
- Client-side API usage
- Error handling patterns

### 5. **Environment Configuration** (`.env.example`)

Added API key configuration:
```bash
# Blockberry API for IOTA token prices
BLOCKBERRY_API_KEY="your-blockberry-api-key-here"
```

## Integration with Upload Page

Updated `/app/(app)/upload/page.tsx` to automatically route price requests:

- **IOTA tokens** → Blockberry API (`/api/v1/iota/coin-price/[coinType]`)
- **Sui tokens** → BlockVision API (`/api/v1/coin-price/[coinType]`)

**Detection Logic:**
```typescript
const isIotaToken = tokenType.includes('::iota::') || tokenType.startsWith('0x2::iota::');
const apiEndpoint = isIotaToken
  ? `/api/v1/iota/coin-price/${encodeURIComponent(tokenType)}`
  : `/api/v1/coin-price/${encodeURIComponent(tokenType)}`;
```

## API Comparison

| Feature | Sui (BlockVision) | IOTA (Blockberry) |
|---------|------------------|-------------------|
| **API Endpoint** | `/api/v1/coin-price/[coinType]` | `/api/v1/iota/coin-price/[coinType]` |
| **Service** | BlockVision | Blockberry |
| **Network** | Sui Mainnet | IOTA Mainnet |
| **Price Source** | Direct from API | Calculated (Market Cap / Supply) |
| **Fallback** | CoinGecko | CoinGecko (IOTA only) |
| **Cache Duration** | 5 minutes | 5 minutes |
| **Environment Variable** | `SUIVISION_API_KEY` | `BLOCKBERRY_API_KEY` |

## Blockberry API Response

Example response from Blockberry API:

```json
{
  "coinType": "0x2::iota::IOTA",
  "coinName": "IOTA",
  "coinSymbol": "IOTA",
  "decimals": 9,
  "imgUrl": "https://iota.org/logo.png",
  "description": "The main (gas)token of the IOTA Network.",
  "totalSupply": 4748763252.432596,
  "circulatingSupply": 4142613112,
  "marketCap": 546878784.7544559,
  "volume": 6820196,
  "socialWebsite": null,
  "socialDiscord": "https://discord.iota.org/",
  "socialEmail": null,
  "socialGitHub": "https://github.com/iotaledger",
  "socialTelegram": null,
  "socialTwitter": "https://x.com/iota",
  "securityMessage": null
}
```

## Price Calculation Method

Blockberry doesn't provide direct price data. Price is calculated from market data:

```
Price = Market Cap / Circulating Supply
```

**Example:**
```
Market Cap: $546,878,784
Circulating Supply: 4,142,613,112 IOTA

Price = $546,878,784 / 4,142,613,112 = $0.132
```

## Usage Examples

### Server-Side (Node.js API)

```typescript
import { getIotaCoinPrice } from '@/lib/blockberry/iotaPriceApi';

const price = await getIotaCoinPrice('0x2::iota::IOTA');
console.log(`IOTA Price: $${price}`);
```

### Client-Side (React Component)

```typescript
const response = await fetch('/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA');
const data = await response.json();

if (data.success) {
  console.log(`IOTA: $${data.price}`);
}
```

### Auto-Detection (Upload Page Pattern)

```typescript
const isIotaToken = tokenType.includes('::iota::');
const apiEndpoint = isIotaToken
  ? `/api/v1/iota/coin-price/${encodeURIComponent(tokenType)}`
  : `/api/v1/coin-price/${encodeURIComponent(tokenType)}`;

const response = await fetch(apiEndpoint);
```

## Fallback Strategy

The service implements intelligent fallbacks:

1. **Primary:** Blockberry API
2. **Fallback 1:** CoinGecko (for IOTA token only)
3. **Fallback 2:** Return 0 (for custom tokens)

## Error Handling

Comprehensive error handling at multiple levels:

1. **Missing API Key:** Automatically falls back to CoinGecko
2. **API Error (4xx/5xx):** Logs error and tries fallback
3. **Invalid Response:** Validates data and falls back if needed
4. **Network Error:** Catches and logs, returns 0

## Testing

### Local Testing

1. Add API key to `.env.local`:
   ```bash
   BLOCKBERRY_API_KEY="your-api-key"
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Test endpoint:
   ```bash
   curl http://localhost:3000/api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA
   ```

### Production Testing

The endpoint is automatically deployed with your Next.js app and includes:
- ✅ Vercel Edge caching (5 minutes)
- ✅ Stale-while-revalidate (60 seconds)
- ✅ Error responses with status codes
- ✅ CORS headers (if needed)

## Build Status

✅ **Build passes successfully**
- No TypeScript errors
- All routes compiled
- Type safety maintained

## Next Steps

### Optional Enhancements

1. **Add more IOTA tokens** to the price fetching system
2. **Create a price aggregator** that combines Sui and IOTA prices
3. **Add price charts** using historical Blockberry data
4. **Implement WebSocket** for real-time price updates
5. **Add price alerts** for token price changes

### Monitoring

Monitor the following:
- API response times
- Cache hit rates
- Fallback usage frequency
- Error rates

## Resources

- **Blockberry API Docs:** https://docs.blockberry.one/
- **Get API Key:** https://blockberry.one/
- **CoinGecko API:** https://www.coingecko.com/api
- **IOTA Network:** https://iota.org/

## Support

For issues or questions:
1. Check the comprehensive README at `/lib/blockberry/README.md`
2. Review example code at `/lib/blockberry/example.ts`
3. Check console logs for detailed error messages
4. Verify API key configuration

---

**Integration completed successfully!** 🎉

The system now supports multi-chain price feeds for both Sui and IOTA tokens with automatic routing, fallback strategies, and comprehensive error handling.
