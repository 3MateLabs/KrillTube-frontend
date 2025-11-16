# IOTA Metadata & Price Integration for Upload Page

## Summary

Updated the upload page to automatically fetch IOTA token metadata and prices from Blockberry API when connected to an IOTA wallet. The system now seamlessly handles both Sui and IOTA tokens with automatic detection.

## Changes Made

### 1. **New API Route: IOTA Coin Metadata**
**File:** `/app/api/v1/iota/coin-metadata/[coinType]/route.ts`

Provides IOTA token metadata (decimals, symbol, name, icon, etc.) from Blockberry API.

**Endpoint:**
```
GET /api/v1/iota/coin-metadata/[coinType]
```

**Example Request:**
```bash
curl http://localhost:3000/api/v1/iota/coin-metadata/0x2%3A%3Aiota%3A%3AIOTA
```

**Example Response:**
```json
{
  "success": true,
  "metadata": {
    "decimals": 9,
    "name": "IOTA",
    "symbol": "IOTA",
    "description": "The main (gas)token of the IOTA Network.",
    "iconUrl": "https://iota.org/logo.png"
  },
  "fullMetadata": {
    "coinType": "0x2::iota::IOTA",
    "coinName": "IOTA",
    "coinSymbol": "IOTA",
    "decimals": 9,
    "totalSupply": 4748763252.432596,
    "circulatingSupply": 4142613112,
    "marketCap": 546878784.7544559,
    "volume": 6820196,
    "socialTwitter": "https://x.com/iota",
    "socialGitHub": "https://github.com/iotaledger"
  }
}
```

**Features:**
- ✅ Returns metadata in Sui-compatible format
- ✅ Includes full Blockberry metadata for advanced use
- ✅ 1-hour cache (metadata rarely changes)
- ✅ Fallback IOTA icon URL
- ✅ Error handling with detailed messages

### 2. **Updated Upload Page: Metadata Fetching**
**File:** `/app/(app)/upload/page.tsx`

Updated `fetchCoinMetadata()` function to auto-detect token type and use appropriate API.

**Before:**
```typescript
const fetchCoinMetadata = async (tokenType: string) => {
  // Only used Sui client
  const metadata = await suiClient.getCoinMetadata({ coinType: tokenType });
  // ...
};
```

**After:**
```typescript
const fetchCoinMetadata = async (tokenType: string) => {
  const isIotaToken = tokenType.includes('::iota::') || tokenType.startsWith('0x2::iota::');

  if (isIotaToken) {
    // Use IOTA metadata API
    const response = await fetch(`/api/v1/iota/coin-metadata/${encodeURIComponent(tokenType)}`);
    // ...
  } else {
    // Use Sui client
    const metadata = await suiClient.getCoinMetadata({ coinType: tokenType });
    // ...
  }
};
```

**Features:**
- ✅ Automatic token type detection
- ✅ Routes to correct API based on token type
- ✅ Maintains same caching strategy
- ✅ Detailed console logging
- ✅ Fallback icons for both networks

### 3. **Already Updated: Price Fetching**
**File:** `/app/(app)/upload/page.tsx`

The `fetchCoinPrice()` function was already updated in the previous integration to handle both networks.

```typescript
const fetchCoinPrice = async (tokenType: string) => {
  const isIotaToken = tokenType.includes('::iota::') || tokenType.startsWith('0x2::iota::');
  const apiEndpoint = isIotaToken
    ? `/api/v1/iota/coin-price/${encodeURIComponent(tokenType)}`
    : `/api/v1/coin-price/${encodeURIComponent(tokenType)}`;
  // ...
};
```

## Complete API Routes

| Route | Purpose | Network |
|-------|---------|---------|
| `/api/v1/coin-price/[coinType]` | Sui token prices | Sui |
| `/api/v1/iota/coin-price/[coinType]` | IOTA token prices | IOTA |
| `/api/v1/iota/coin-metadata/[coinType]` | IOTA token metadata | IOTA |

**Note:** Sui metadata uses the Sui client directly (not an API route).

## How It Works on Upload Page

### 1. **Network Detection**
When user connects wallet:
```typescript
const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();
// network: 'sui' | 'iota' | null
```

### 2. **Token Type Selection**
Default token type is set based on network:
```typescript
const getDefaultTokenType = () => {
  if (network === 'iota') {
    return '0x2::iota::IOTA';
  }
  return '0x2::sui::SUI';
};
```

### 3. **Automatic Metadata & Price Fetching**
When fee configs change, the page automatically fetches:
- Token metadata (decimals, symbol, icon)
- Token price (USD)

```typescript
useEffect(() => {
  feeConfigs.forEach((config) => {
    if (config.tokenType) {
      if (!coinMetadataCache[config.tokenType]) {
        fetchCoinMetadata(config.tokenType); // Auto-detects IOTA vs Sui
      }
      if (!coinPriceCache[config.tokenType]) {
        fetchCoinPrice(config.tokenType); // Auto-detects IOTA vs Sui
      }
    }
  });
}, [feeConfigs]);
```

### 4. **Display**
The metadata and price are used to display:
- Token symbol (e.g., "IOTA", "SUI")
- Token icon
- Price in USD
- Calculated fee amounts

## User Experience Flow

### Connected to Sui Wallet
1. User connects Sui wallet
2. Default token: `0x2::sui::SUI`
3. Metadata fetched from Sui client
4. Price fetched from BlockVision API
5. Displays: "SUI" icon and price

### Connected to IOTA Wallet
1. User connects IOTA wallet
2. Default token: `0x2::iota::IOTA`
3. Metadata fetched from Blockberry API
4. Price fetched from Blockberry API
5. Displays: "IOTA" icon and price

## Token Detection Logic

The system uses this logic to determine token type:

```typescript
const isIotaToken =
  tokenType.includes('::iota::') ||
  tokenType.startsWith('0x2::iota::');
```

**Examples:**
- ✅ `0x2::iota::IOTA` → IOTA
- ✅ `0xABC::iota::TOKEN` → IOTA
- ✅ `0x2::sui::SUI` → Sui
- ✅ `0xDEF::custom::TOKEN` → Sui (default)

## Caching Strategy

### Metadata Cache
- **Duration:** Indefinite (until page refresh)
- **Storage:** React state (`coinMetadataCache`)
- **Reason:** Metadata rarely changes

### Price Cache
- **Duration:** 5 minutes
- **Storage:** React state with timestamp (`coinPriceCache`)
- **Reason:** Prices change frequently

## Console Logging

The system provides detailed logging for debugging:

```
[Coin Metadata] Fetching IOTA metadata for: 0x2::iota::IOTA
[Coin Metadata] IOTA metadata cached: { decimals: 9, name: "IOTA", ... }
[Coin Price] Fetching price for 0x2::iota::IOTA using IOTA API
[Coin Price] 0x2::iota::IOTA: $0.132
```

## Error Handling

Both functions handle errors gracefully:

1. **Network Errors:** Caught and logged
2. **API Errors:** Logged with status code
3. **Invalid Data:** Returns null/0
4. **Cache Hits:** No API calls made

## Example Usage Scenarios

### Scenario 1: User with IOTA Wallet
```
1. User connects IOTA wallet
2. Upload page loads with IOTA token selected
3. Page fetches:
   - Metadata from: /api/v1/iota/coin-metadata/0x2%3A%3Aiota%3A%3AIOTA
   - Price from: /api/v1/iota/coin-price/0x2%3A%3Aiota%3A%3AIOTA
4. Displays: "IOTA" with logo and current price ($0.132)
5. User can set monetization fees in IOTA
```

### Scenario 2: User with Sui Wallet
```
1. User connects Sui wallet
2. Upload page loads with SUI token selected
3. Page fetches:
   - Metadata from: Sui client (getCoinMetadata)
   - Price from: /api/v1/coin-price/0x2%3A%3Asui%3A%3ASUI
4. Displays: "SUI" with logo and current price
5. User can set monetization fees in SUI
```

### Scenario 3: Custom IOTA Token
```
1. User selects custom IOTA token (e.g., 0xABC::iota::CUSTOM)
2. Page detects IOTA token via ::iota:: pattern
3. Fetches from Blockberry API
4. If found: Displays metadata and price
5. If not found: Shows token type string
```

## Testing

### Test IOTA Metadata Endpoint

```bash
# Local testing
curl http://localhost:3000/api/v1/iota/coin-metadata/0x2%3A%3Aiota%3A%3AIOTA

# Should return metadata with decimals, name, symbol, etc.
```

### Test on Upload Page

1. Start dev server: `npm run dev`
2. Go to `http://localhost:3000/upload`
3. Connect IOTA wallet
4. Check console logs for:
   - "Fetching IOTA metadata"
   - "Fetching price using IOTA API"
   - Cached metadata output
5. Verify IOTA icon and price display correctly

## Build Status

✅ **All builds passing**
```
✓ Compiled successfully
├ ƒ /api/v1/coin-price/[coinType]
├ ƒ /api/v1/iota/coin-metadata/[coinType]
├ ƒ /api/v1/iota/coin-price/[coinType]
```

## Environment Setup

Ensure you have the Blockberry API key configured:

```bash
# .env.local
BLOCKBERRY_API_KEY="your-blockberry-api-key"
```

Get your key at: https://blockberry.one/

## Related Documentation

- [Blockberry Integration Summary](./BLOCKBERRY_INTEGRATION_SUMMARY.md)
- [Blockberry API Documentation](./lib/blockberry/README.md)
- [Multi-Chain Wallet Hook](./lib/hooks/README_MULTI_CHAIN_WALLET.md)

## Future Enhancements

Potential improvements:

1. **Add more IOTA tokens** to metadata/price system
2. **Display market cap & volume** from Blockberry full metadata
3. **Show social links** (Twitter, GitHub) in token selector
4. **Add token verification** badge from Blockberry
5. **Cache metadata in localStorage** for persistence across sessions

---

**Integration completed successfully!** 🎉

The upload page now fully supports both Sui and IOTA tokens with automatic metadata and price fetching from the appropriate APIs.
