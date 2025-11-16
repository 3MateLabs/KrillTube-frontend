# IOTA Tunnel Integration - Creator Config Implementation

## Summary

Implemented on-chain creator configuration for IOTA wallet uploads, enabling monetization through the Tunnel protocol. When users upload videos with IOTA wallets on testnet, the system now creates receiver and creator configs using the IOTA SDK.

## Changes Made

### 1. **IOTA Tunnel Config Service**
**File:** `/lib/tunnel/iotaTunnelConfig.ts`

Core service for creating receiver and creator configs using IOTA SDK functions.

**Key Functions:**
```typescript
// Create a single receiver config
addReceiverConfig(tx: Transaction, config: ReceiverConfigInput)

// Create multiple receiver configs
addReceiverConfigs(tx: Transaction, configs: ReceiverConfigInput[])

// Create a creator config with all receiver configs
addCreatorConfig(tx: Transaction, config: CreatorConfigInput)

// Build complete transaction
buildCreatorConfigTransaction(config: CreatorConfigInput)

// Convert upload page fee configs to receiver configs
convertFeeConfigsToReceiverConfigs(feeConfigs, creatorAddress, platformAddress, platformFeePercentage)
```

**Uses IOTA SDK Functions:**
- `createReceiverConfig(tx, { a0: views, a1: address, a2: percentage })`
- `createCreatorConfig(tx, { a0: creator, a1: operatorPubKey, a2: metadata, a3: receiverConfigs[], a4: platformFee })`

From: `/lib/move/iota/tunnel/tunnel/functions.ts`

### 2. **Tunnel Configuration**
**File:** `/lib/tunnel/config.ts`

Platform-level configuration for tunnel protocol.

**Configuration:**
- Platform fee percentage: 5%
- Platform receiver addresses (testnet and mainnet for both Sui and IOTA)
- Operator public keys for transaction signing

**Helper Functions:**
```typescript
getPlatformReceiverAddress(network: 'sui' | 'iota', walrusNetwork: 'mainnet' | 'testnet')
getOperatorPublicKey(network: 'sui' | 'iota')
```

### 3. **Upload Integration Service**
**File:** `/lib/tunnel/uploadIntegration.ts`

Integrates creator config creation into the upload flow.

**Key Functions:**
```typescript
// Create IOTA transaction
createIotaCreatorConfigTransaction(params: CreateCreatorConfigParams)

// Create Sui transaction (TODO: Not yet implemented)
createSuiCreatorConfigTransaction(params: CreateCreatorConfigParams)

// Auto-detect network and create appropriate transaction
createCreatorConfigTransaction(params: CreateCreatorConfigParams)

// Execute transaction and extract creator config ID
executeCreatorConfigTransaction(transaction, signAndExecute)
```

### 4. **Upload Page Integration**
**File:** `/app/(app)/upload/page.tsx`

Added creator config creation step after video upload completes.

**Flow:**
1. Upload video to Walrus (existing)
2. **NEW:** Create creator config transaction if monetization enabled and IOTA wallet
3. Execute transaction with user's wallet signature
4. Extract creator config object ID from transaction result
5. Register video with server, including creator config ID

**Code Added:**
```typescript
// STEP 3: Create creator config if monetization is enabled (IOTA only for now)
let creatorConfigId: string | null = null;

if (feeConfigs.length > 0 && network === 'iota' && !debugMode) {
  console.log('[Upload V2] Creating IOTA creator config...');
  setProgress({ stage: 'registering', percent: 96, message: 'Creating monetization config...' });

  try {
    const { createCreatorConfigTransaction, executeCreatorConfigTransaction } = await import(
      '@/lib/tunnel/uploadIntegration'
    );

    const creatorConfigTx = createCreatorConfigTransaction({
      network: 'iota',
      walrusNetwork,
      creatorAddress: effectiveAccount.address,
      videoId: result.videoId,
      feeConfigs: feeConfigs,
    });

    creatorConfigId = await executeCreatorConfigTransaction(
      creatorConfigTx,
      signAndExecuteTransaction as any
    );

    if (creatorConfigId) {
      console.log('[Upload V2] ✓ Creator config created:', creatorConfigId);
    }
  } catch (configError) {
    console.error('[Upload V2] Failed to create creator config:', configError);
    // Video can still be uploaded without monetization config
  }
}
```

### 5. **Database Schema Update**
**File:** `prisma/schema.prisma`

Added `creatorConfigId` field to Video model.

**Changes:**
```prisma
model Video {
  // ... existing fields ...
  creatorConfigId      String?           @map("creator_config_id") // Creator config object ID for monetization
  // ... existing fields ...

  @@index([creatorConfigId])
}
```

**Migration Required:**
```bash
npx prisma migrate dev --name add_creator_config_id
npx prisma generate
```

### 6. **API Route Update**
**File:** `/app/api/v1/register-video/route.ts`

Updated to accept and store creator config ID.

**Changes:**
- Added `creatorConfigId?: string | null` to request body type
- Added logging for creator config ID
- Store `creatorConfigId` in database when creating video

### 7. **Environment Variables**
**File:** `.env.example`

Added platform receiver address configuration.

**New Variables:**
```bash
# IOTA Platform Addresses
NEXT_PUBLIC_PLATFORM_RECEIVER_ADDRESS_IOTA_TESTNET="0x0000000000000000000000000000000000000000000000000000000000000000"
NEXT_PUBLIC_PLATFORM_RECEIVER_ADDRESS_IOTA_MAINNET="0x0000000000000000000000000000000000000000000000000000000000000000"

# Sui Platform Addresses
NEXT_PUBLIC_PLATFORM_RECEIVER_ADDRESS_SUI_TESTNET="0x0000000000000000000000000000000000000000000000000000000000000000"
NEXT_PUBLIC_PLATFORM_RECEIVER_ADDRESS_SUI_MAINNET="0x0000000000000000000000000000000000000000000000000000000000000000"
```

**TODO:** Replace placeholder addresses with actual platform addresses.

## How It Works

### Upload Flow with IOTA Wallet

1. **User uploads video with IOTA wallet connected**
2. **Network enforced to testnet** (from previous integration)
3. **Video transcoded and uploaded to Walrus testnet**
4. **If monetization fees configured:**
   - Platform address retrieved from config
   - Operator public key retrieved from config
   - Receiver configs created:
     - Creator receives (100 - platformFee)% = 95%
     - Platform receives platformFee% = 5%
   - Creator config transaction built using IOTA SDK
   - User signs transaction in wallet
   - Transaction executed on IOTA blockchain
   - Creator config object ID extracted
5. **Video registered with server**
   - Video metadata stored
   - Creator config ID stored
   - Encryption keys stored

### Receiver Config Structure

Each receiver config contains:
- `views`: Number of views (e.g., 1000 for per 1000 views)
- `receiverAddress`: Address to receive payments
- `percentageShare`: Percentage of revenue (e.g., 95 for 95%)

### Creator Config Structure

Creator config contains:
- `creatorAddress`: Video creator's wallet address
- `operatorPublicKey`: 32-byte public key for signing operations
- `metadata`: JSON string with video ID and fee configs
- `receiverConfigs`: Array of receiver configs (creator + platform)
- `platformFeePercentage`: Platform fee (5%)

### Metadata Format

```json
{
  "videoId": "abc123",
  "feeConfigs": [
    {
      "tokenType": "0x2::iota::IOTA",
      "amountPer1000Views": "10"
    }
  ],
  "createdAt": "2025-11-15T12:00:00.000Z"
}
```

## Usage Example

### User Flow

1. Connect IOTA wallet
2. Select video file
3. Configure quality settings
4. **Configure monetization fees** (e.g., 10 IOTA per 1000 views)
5. Click "Upload"
6. Approve Walrus upload transactions (automatic on testnet)
7. **Approve creator config transaction** (new step)
8. Video registered with monetization enabled

### Console Output

```
[Upload V2] ✓ Client-side processing complete
[Upload V2] Creating IOTA creator config...
[IOTA Tunnel] Building creator config transaction: {
  creator: "0x...",
  receiverCount: 2,
  platformFee: "5%"
}
[Upload V2] ⏳ Please approve creator config transaction in your wallet...
[Upload Integration] Executing creator config transaction...
[Upload Integration] Creator config transaction signed: abc123...
[Upload Integration] Creator config created: 0xdef456...
[Upload V2] ✓ Creator config created: 0xdef456...
[Upload V2] Registering with server...
[API Register Video] Registering video: xyz789
[API Register Video] Creator config ID: 0xdef456...
[API Register Video] ✓ Video registered: xyz789
```

## Sui Implementation (TODO)

The Sui version is not yet implemented. When ready:

1. Create `/lib/move/sui/tunnel/` with Sui Move SDK functions
2. Implement `createSuiCreatorConfigTransaction()` in `uploadIntegration.ts`
3. Use Sui PTB to manually construct creator/receiver config calls
4. Update upload page to handle Sui wallet signatures

## Testing

### Prerequisites

1. IOTA wallet connected
2. Testnet IOTA tokens for gas
3. Fee configs defined on upload page

### Test Steps

1. Upload a video with IOTA wallet
2. Add monetization fee (e.g., "10" tokens per 1000 views)
3. Click "Upload"
4. Verify creator config transaction appears in wallet
5. Approve transaction
6. Check console logs for creator config ID
7. Verify video registered successfully
8. Check database for `creator_config_id` field

### Expected Results

- Creator config transaction executes successfully
- Creator config ID is non-null (e.g., `0x123...`)
- Video registered with `creatorConfigId` in database
- No errors in console

### Debug Commands

```bash
# Check database for creator config ID
psql -d krilltube -c "SELECT id, title, creator_config_id FROM videos ORDER BY created_at DESC LIMIT 5;"

# Check IOTA object on blockchain
curl https://api.testnet.iota.org/v1/objects/{creator_config_id}
```

## Error Handling

- If creator config creation fails, video upload continues without monetization
- Error logged but doesn't block video registration
- User can retry adding monetization later (TODO: Implement update flow)

## Future Enhancements

1. **Implement Sui creator config creation** using PTB
2. **Support for editing creator configs** after upload
3. **Display creator config status** in video management UI
4. **Analytics dashboard** for revenue tracking
5. **Multi-token support** (currently uses single token type)
6. **Dynamic platform fee** based on creator tier
7. **Referrer fee sharing** (step 3 of upload flow)

## Related Documentation

- [IOTA Testnet Restriction](./IOTA_TESTNET_ONLY.md)
- [IOTA Metadata & Price Integration](./IOTA_METADATA_UPDATE.md)
- [Multi-Chain Wallet Hook](./lib/hooks/README_MULTI_CHAIN_WALLET.md)
- [Tunnel Protocol Package](./lib/move/iota/tunnel/index.ts)

## Migration Guide

### Database Migration

Run this command to apply schema changes:

```bash
npx prisma migrate dev --name add_creator_config_id
npx prisma generate
```

### Environment Setup

Add platform addresses to `.env.local`:

```bash
# TODO: Replace with actual addresses
NEXT_PUBLIC_PLATFORM_RECEIVER_ADDRESS_IOTA_TESTNET="0x..."
NEXT_PUBLIC_PLATFORM_RECEIVER_ADDRESS_IOTA_MAINNET="0x..."
```

### Build and Deploy

```bash
npm run build
# Verify no TypeScript errors
```

---

**Implementation completed successfully!** 🎉

IOTA uploads now create on-chain creator configs for monetization using the IOTA SDK.
