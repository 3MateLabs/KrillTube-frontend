# Walrus Cost Estimation

## Overview

WalPlayer now includes real-time cost estimation using the official `@mysten/walrus` SDK. The system calculates exact storage costs before uploading videos to Walrus.

## How It Works

### 1. Cost Calculation

The system uses the Walrus SDK's `storageCost()` method to fetch live pricing from the blockchain:

```typescript
import { estimateVideoCost } from '@/lib/walrus-cost';

// Calculate cost for video upload
const cost = await estimateVideoCost(totalSizeBytes, epochs);

console.log(`Total cost: ${cost.totalCostSui} SUI`);
console.log(`Storage: ${cost.storageCost} MIST`);
console.log(`Write: ${cost.writeCost} MIST`);
```

### 2. Cost Components

**Storage Cost**: Fee for storing data for specified epochs
- Calculated as: `sizeBytes × storage_price_per_unit_size × epochs`
- Example: 15 MB × 0.002 SUI/MB × 200 epochs = 0.030 SUI

**Write Cost**: One-time fee for writing data to network
- Calculated as: `sizeBytes × write_price_per_unit_size`
- Example: 15 MB × 0.001 SUI/MB = 0.015 SUI

**Total Cost**: `Storage Cost + Write Cost`
- Example: 0.030 + 0.015 = 0.045 SUI

### 3. Pricing Source

Costs are fetched from the Walrus system state on the Sui blockchain:

```typescript
const systemState = await walrusClient.systemState();

// Live pricing from blockchain
const storagePricePerUnit = systemState.storage_price_per_unit_size;
const writePricePerUnit = systemState.write_price_per_unit_size;
```

This ensures:
- ✅ Always accurate pricing
- ✅ No hardcoded estimates
- ✅ Reflects current network conditions

## API Integration

### Upload Endpoint Response

When uploading a video, the API returns cost information:

```json
{
  "success": true,
  "video": {
    "id": "video_abc123",
    "title": "My Video",
    ...
  },
  "stats": {
    "totalSize": 15728640,
    "totalSegments": 42
  },
  "cost": {
    "totalSui": "0.045123",
    "storageSui": "0.030000",
    "writeSui": "0.015123",
    "sizeFormatted": "15.23 MB",
    "epochs": 200,
    "network": "mainnet"
  }
}
```

### Console Logs

During upload, cost information is logged:

```
[API Videos] Calculating storage cost...
[API Videos] Estimated cost: 0.045123 SUI (15234567 bytes for 200 epochs on mainnet)
[API Videos] Cost breakdown - Storage: 0.030000 SUI, Write: 0.015123 SUI
[API Videos] Uploading 42 encrypted files to Walrus...
```

## Usage Examples

### Basic Cost Estimation

```typescript
import { estimateWalrusCost } from '@/lib/walrus-cost';

// Estimate cost for 10 MB stored for 200 epochs
const cost = await estimateWalrusCost(10 * 1024 * 1024, 200);

console.log(`Total: ${cost.totalCostSui} SUI`);
// Output: Total: 0.030000 SUI
```

### Video Cost Estimation

```typescript
import { estimateVideoCost } from '@/lib/walrus-cost';

// Calculate cost for entire video (all renditions + segments)
const totalSize = 15728640; // 15 MB
const cost = await estimateVideoCost(totalSize);

console.log(`Network: ${cost.network}`);
console.log(`Storage: ${cost.epochs} epochs (~${cost.epochs * 2} days)`);
console.log(`Cost: ${cost.totalCostSui} SUI`);
```

### Formatted Display

```typescript
import { formatCost, getCostBreakdown } from '@/lib/walrus-cost';

const cost = await estimateVideoCost(totalSize);

// Simple format
console.log(formatCost(cost));
// Output: 0.045123 SUI (15234567 bytes for 200 epochs on mainnet)

// Detailed breakdown
const breakdown = getCostBreakdown(cost);
console.log(`Storage: ${breakdown.storage} SUI`);
console.log(`Write: ${breakdown.write} SUI`);
console.log(`Total: ${breakdown.total} SUI`);
console.log(`Size: ${breakdown.sizeFormatted}`);
```

## Cost Examples

### Typical Video Costs (Mainnet, 200 epochs)

| Video Size | Renditions | Segments | Storage Cost | Write Cost | Total Cost |
|-----------|-----------|----------|--------------|------------|-----------|
| 5 MB | 1 (720p) | 14 | ~0.010 SUI | ~0.005 SUI | ~0.015 SUI |
| 15 MB | 3 (720p, 480p, 360p) | 42 | ~0.030 SUI | ~0.015 SUI | ~0.045 SUI |
| 30 MB | 3 (1080p, 720p, 480p) | 84 | ~0.060 SUI | ~0.030 SUI | ~0.090 SUI |
| 60 MB | 4 (1080p, 720p, 480p, 360p) | 168 | ~0.120 SUI | ~0.060 SUI | ~0.180 SUI |

### Storage Duration

| Epochs | Days | Typical Use Case | Cost Multiplier |
|--------|------|------------------|-----------------|
| 1 | ~2 | Testing (testnet) | 0.005x |
| 10 | ~20 | Short-term | 0.05x |
| 50 | ~100 | Medium-term | 0.25x |
| 100 | ~200 | Long-term | 0.5x |
| 200 | ~400 | Production (default) | 1x |
| 500 | ~1000 | Archival | 2.5x |

## Configuration

### Change Storage Duration

Edit `.env` to adjust epochs:

```env
# Short-term (20 days)
WALRUS_EPOCHS=10

# Medium-term (100 days)
WALRUS_EPOCHS=50

# Long-term (400 days) - DEFAULT
WALRUS_EPOCHS=200

# Archival (1000 days)
WALRUS_EPOCHS=500
```

### Switch Networks

```env
# Mainnet (production)
WALRUS_NETWORK="mainnet"
WALRUS_EPOCHS=200

# Testnet (development)
WALRUS_NETWORK="testnet"
WALRUS_EPOCHS=1
```

## Client-Side Integration

### Display Cost Before Upload

You can fetch cost estimates before uploading:

```typescript
// In your frontend component
async function showCostEstimate(fileSize: number) {
  const response = await fetch('/api/estimate-cost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size: fileSize }),
  });

  const { cost } = await response.json();

  // Show to user
  alert(`Upload will cost: ${cost.totalSui} SUI`);
}
```

### Create Cost Estimate Endpoint

```typescript
// app/api/estimate-cost/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { estimateWalrusCost } from '@/lib/walrus-cost';

export async function POST(request: NextRequest) {
  const { size } = await request.json();
  const cost = await estimateWalrusCost(size);

  return NextResponse.json({
    cost: {
      totalSui: cost.totalCostSui,
      sizeFormatted: formatBytes(size),
      epochs: cost.epochs,
    },
  });
}
```

## Troubleshooting

### Error: "Failed to estimate Walrus cost"

**Cause**: Cannot connect to Sui RPC or Walrus system state

**Solutions**:
1. Check network configuration in `.env`
2. Verify Sui RPC is accessible
3. Check Walrus system state is available
4. Try switching networks (mainnet ↔ testnet)

### Unexpected Cost Values

**Cause**: Network pricing has changed

**Solution**: Costs are dynamic and fetched from blockchain. This is expected behavior. The SDK always uses current network prices.

### Cost Calculation Timeout

**Cause**: Slow RPC response

**Solutions**:
1. Use a faster RPC endpoint
2. Implement caching for system state
3. Add retry logic with exponential backoff

## Best Practices

### 1. Cache Cost Estimates

Cache system state for performance:

```typescript
let cachedSystemState: any = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

async function getCachedSystemState() {
  if (cachedSystemState && Date.now() - cacheTime < CACHE_TTL) {
    return cachedSystemState;
  }

  cachedSystemState = await walrusClient.systemState();
  cacheTime = Date.now();
  return cachedSystemState;
}
```

### 2. Show Cost to Users

Always display estimated costs before upload:

```typescript
// Show cost breakdown
console.log('Upload Cost Estimate:');
console.log(`- Storage: ${breakdown.storage} SUI`);
console.log(`- Write: ${breakdown.write} SUI`);
console.log(`- Total: ${breakdown.total} SUI`);
console.log(`- Duration: ${breakdown.epochs} epochs (~${breakdown.epochs * 2} days)`);
```

### 3. Handle Errors Gracefully

```typescript
try {
  const cost = await estimateVideoCost(size);
  console.log(`Estimated cost: ${cost.totalCostSui} SUI`);
} catch (error) {
  console.error('Cost estimation failed:', error);
  console.log('Proceeding with upload (cost unknown)');
}
```

## Future Enhancements

Potential improvements:
- [ ] Pre-upload cost confirmation UI
- [ ] Cost history tracking
- [ ] Budget alerts and limits
- [ ] Batch cost estimation for multiple videos
- [ ] Cost optimization suggestions
- [ ] Alternative storage tier pricing

## Resources

- [Walrus Documentation](https://docs.walrus.space)
- [Walrus SDK](https://github.com/MystenLabs/walrus)
- [Sui Pricing](https://docs.sui.io/concepts/tokenomics)
- [WalPlayer Documentation](./README.md)

---

**Feature Added**: October 28, 2025
**SDK Version**: @mysten/walrus@0.8.1
