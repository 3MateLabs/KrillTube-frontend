# WalPlayer Mainnet Migration Guide

## Overview

WalPlayer has been migrated from Walrus **testnet** to **mainnet** for production use. This document explains the changes and how to configure the system.

## What Changed

### 1. Walrus Network Configuration

**Before (Testnet)**:
- Network: `testnet`
- Aggregator: `https://aggregator.walrus-testnet.walrus.space`
- Publisher: `https://publisher.walrus-testnet.walrus.space`
- Epochs: 1 (short-term storage)

**After (Mainnet)**:
- Network: `mainnet`
- Aggregator: `https://aggregator.walrus.space`
- Publisher: `https://publisher.walrus.space`
- Epochs: 200 (long-term storage)

### 2. Code Changes

#### `lib/walrus.ts`
Updated the WalrusClient singleton to use environment variables:

```typescript
// Old
export const walrusClient = new WalrusClient({ network: 'testnet' });

// New
const network = (process.env.WALRUS_NETWORK as 'testnet' | 'mainnet') || 'mainnet';
const aggregatorUrl = process.env.WALRUS_AGGREGATOR_URL;
const publisherUrl = process.env.WALRUS_PUBLISHER_URL;
const epochs = process.env.WALRUS_EPOCHS ? parseInt(process.env.WALRUS_EPOCHS, 10) : 200;

export const walrusClient = new WalrusClient({
  network,
  aggregatorUrl,
  publisherUrl,
  epochs,
});
```

#### `.env` File
Added new environment variables:

```env
# Walrus Configuration
WALRUS_NETWORK="mainnet"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus.space"
WALRUS_PUBLISHER_URL="https://publisher.walrus.space"
WALRUS_EPOCHS=200
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WALRUS_NETWORK` | No | `mainnet` | Network to use (`mainnet` or `testnet`) |
| `WALRUS_AGGREGATOR_URL` | No | Auto-detected | Walrus aggregator URL for fetching blobs |
| `WALRUS_PUBLISHER_URL` | No | Auto-detected | Walrus publisher URL for uploading blobs |
| `WALRUS_EPOCHS` | No | 200 (mainnet)<br>1 (testnet) | Number of epochs to store data |

### Mainnet Configuration (Default)

```env
WALRUS_NETWORK="mainnet"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus.space"
WALRUS_PUBLISHER_URL="https://publisher.walrus.space"
WALRUS_EPOCHS=200
```

### Testnet Configuration (Development)

If you need to use testnet for development:

```env
WALRUS_NETWORK="testnet"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus-testnet.walrus.space"
WALRUS_PUBLISHER_URL="https://publisher.walrus-testnet.walrus.space"
WALRUS_EPOCHS=1
```

## Storage Duration

### Mainnet (200 epochs)
- **Duration**: ~400 days (200 epochs × 2 days per epoch)
- **Purpose**: Production videos with long-term availability
- **Cost**: Higher (mainnet SUI tokens required)

### Testnet (1 epoch)
- **Duration**: ~2 days (1 epoch × 2 days per epoch)
- **Purpose**: Development and testing only
- **Cost**: Free (testnet tokens from faucet)

## Migration Steps

### For Existing Installations

1. **Update `.env` file**:
   ```bash
   cd /Users/cyber/Downloads/walplayer/walplayer-video/walplayer-v1

   # Add to .env:
   echo 'WALRUS_NETWORK="mainnet"' >> .env
   echo 'WALRUS_AGGREGATOR_URL="https://aggregator.walrus.space"' >> .env
   echo 'WALRUS_PUBLISHER_URL="https://publisher.walrus.space"' >> .env
   echo 'WALRUS_EPOCHS=200' >> .env
   ```

2. **Restart the development server**:
   ```bash
   npm run dev
   ```

3. **Verify mainnet connection**:
   - Check logs for: `[Walrus] Initialized with mainnet`
   - Upload a test video
   - Verify blob IDs work on mainnet Walrus Scan

### For New Installations

The `.env.example` file includes all necessary configuration. Simply:

1. Copy `.env.example` to `.env`
2. Update database and KMS keys
3. Mainnet is configured by default

## Cost Considerations

### Mainnet Costs

Uploading to mainnet requires **real SUI tokens**. Costs depend on:
- File size
- Number of epochs (200 for long-term storage)
- Current Walrus network pricing

**Example**: A typical video upload might cost:
- Master playlist: ~0.01 SUI
- Rendition playlists (3x): ~0.03 SUI
- Video segments (30x): ~0.3 SUI
- Total: **~0.34 SUI per video** (varies by size)

### Testnet Costs

- **Free**: Use testnet SUI from faucet
- **Limited duration**: 1 epoch (~2 days)
- **For development only**

## Backward Compatibility

### Existing Testnet Videos

Videos uploaded to testnet will continue to work as long as:
1. The testnet blobs haven't expired (1 epoch = 2 days)
2. You keep both mainnet and testnet URLs in `next.config.ts` (already configured)

### Blob URL Format

Both testnet and mainnet use the same URL format:
```
https://aggregator.walrus.space/v1/blobs/{blobId}
https://aggregator.walrus.testnet.walrus.space/v1/blobs/{blobId}
```

The frontend automatically uses the correct URL based on the stored blob URL in the database.

## Verification

### Check Configuration
```bash
# Start dev server and check logs
npm run dev

# You should see:
# [Walrus] Initialized with mainnet
# [Walrus] Aggregator: https://aggregator.walrus.space
# [Walrus] Publisher: https://publisher.walrus.space
```

### Test Upload
1. Go to `/upload`
2. Upload a test video
3. Check console logs for mainnet URLs
4. Verify video plays correctly
5. Check blob IDs on [Walrus Scan](https://walrus.space)

### Get Blob IDs
```bash
npm run get-blob-ids
```

This will show all uploaded videos with their mainnet blob IDs.

## Troubleshooting

### "Insufficient balance" error
- You need real SUI tokens on mainnet
- Check wallet balance: `sui client gas`
- Get SUI from exchanges or testnet faucet (for testnet only)

### "Network connection failed"
- Check if mainnet URLs are correct
- Verify environment variables are loaded: `echo $WALRUS_NETWORK`
- Restart dev server after changing `.env`

### Videos not loading
- Verify blob IDs are from mainnet
- Check browser console for CORS errors
- Ensure `next.config.ts` includes mainnet aggregator URL

### Switching back to testnet
Simply update `.env`:
```env
WALRUS_NETWORK="testnet"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus-testnet.walrus.space"
WALRUS_PUBLISHER_URL="https://publisher.walrus-testnet.walrus.space"
WALRUS_EPOCHS=1
```

## Next Steps

After migration:
1. ✅ Configure mainnet in `.env`
2. ✅ Fund wallet with SUI tokens
3. ✅ Test video upload
4. ✅ Verify playback
5. ✅ Monitor storage costs
6. ✅ Clear old testnet videos (optional)

## Support

For issues related to:
- **Walrus Network**: [Walrus Documentation](https://docs.walrus.space)
- **WalPlayer**: Check project documentation in this repository
- **SUI Blockchain**: [Sui Documentation](https://docs.sui.io)

---

**Migration Date**: October 28, 2025
**Version**: WalPlayer v2 (Encrypted Video Platform)
