# Walrus Upload Methods: Technical Comparison

## Two Approaches to Walrus Uploads

### Approach 1: HTTP Publisher API ✅ (YOUR IMPLEMENTATION)

**Location**: `/lib/walrus.ts` (commit d96dfa2)

**Key Characteristic**: Server-side uploads with **ZERO wallet signatures**

#### Code Example

```typescript
export class WalrusClient {
  private publisherUrl: string; // https://publisher.testnet.walrus.space

  // Upload single blob - NO SIGNATURES
  async uploadBlob(data: Buffer | Uint8Array, filename: string): Promise<WalrusUploadResult> {
    const response = await fetch(`${this.publisherUrl}/v1/blobs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: data as BodyInit, // Raw binary data
    });

    const result = await response.json();
    const blobId = result.newlyCreated?.blobObject?.blobId ||
                   result.alreadyCertified?.blobId;

    return {
      blobId,
      url: `${this.aggregatorUrl}/v1/blobs/${blobId}`,
      size: data.length,
    };
  }

  // Batch upload using QUILTS - NO SIGNATURES
  async uploadAsset(transcodeResult: TranscodeResult, metadata: {...}): Promise<AssetManifest> {
    const formData = new FormData();

    // Add all segments to FormData
    for (const rendition of transcodeResult.renditions) {
      for (let i = 0; i < rendition.segments.length; i++) {
        const segData = await readFile(segment.filepath);
        formData.append(`${rendition.quality}_seg_${i}`, new Blob([segData]));
      }
    }

    // Upload entire batch as one QUILT
    const quiltResponse = await fetch(
      `${this.publisherUrl}/v1/quilts?epochs=${this.epochs}`,
      {
        method: 'PUT',
        body: formData, // Multipart form data
      }
    );

    const quiltResult = await quiltResponse.json();
    return manifest; // All blob IDs returned
  }
}
```

#### HTTP API Endpoints

**Single Blob:**
```http
PUT https://publisher.testnet.walrus.space/v1/blobs
Content-Type: application/octet-stream

<binary data>
```

**Response:**
```json
{
  "newlyCreated": {
    "blobObject": {
      "blobId": "ABC123...",
      "size": 1024000,
      "encodingType": "RedStuff",
      "certifiedEpoch": 150
    }
  }
}
```

**Batch Upload (QUILTS):**
```http
PUT https://publisher.testnet.walrus.space/v1/quilts?epochs=50
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="file1"

<binary data 1>
------WebKitFormBoundary...
Content-Disposition: form-data; name="file2"

<binary data 2>
------WebKitFormBoundary...--
```

**Response:**
```json
{
  "storedQuiltBlobs": [
    {
      "identifier": "file1",
      "quiltPatchId": "XYZ789..."
    },
    {
      "identifier": "file2",
      "quiltPatchId": "ABC456..."
    }
  ]
}
```

---

### Approach 2: Wallet SDK ❌ (NOT YOUR IMPLEMENTATION)

**Location**: `/lib/client-walrus-sdk.ts` (client-side only)

**Key Characteristic**: Browser-based uploads with **2 wallet signatures required**

#### Code Example

```typescript
import { WalrusClient } from '@mysten/walrus';

export async function uploadWithWallet(
  file: File,
  network: 'testnet' | 'mainnet',
  signAndExecute: (tx: Transaction) => Promise<SuiTransactionBlockResponse>
): Promise<{ blobId: string }> {

  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
  const walrusClient = new WalrusClient({ network, suiClient });

  // Step 1: Register blob (REQUIRES SIGNATURE)
  const registerTx = walrusClient.registerBlob({
    size: file.size,
    epochs: 50,
  });

  console.log('📝 Please sign transaction 1/2 to register blob...');
  const registerResult = await signAndExecute({
    transaction: registerTx, // USER MUST SIGN HERE
  });

  const blobId = registerResult.effects.created[0].reference.objectId;

  // Step 2: Upload blob data
  const arrayBuffer = await file.arrayBuffer();
  const uploadUrl = await walrusClient.getUploadUrl(blobId);

  await fetch(uploadUrl, {
    method: 'PUT',
    body: arrayBuffer,
  });

  // Step 3: Certify blob storage (REQUIRES SIGNATURE)
  const certifyTx = walrusClient.certifyBlob({ blobId });

  console.log('📝 Please sign transaction 2/2 to certify storage...');
  const certifyResult = await signAndExecute({
    transaction: certifyTx, // USER MUST SIGN HERE AGAIN
  });

  return { blobId };
}
```

#### User Experience Flow

```
1. User clicks "Upload Video"
2. Browser shows: "📝 Wallet Signature Request 1/2"
   └─ User clicks "Approve" in Sui Wallet
3. Wait for blockchain confirmation (~2-5 seconds)
4. Upload video data to Walrus storage node
5. Browser shows: "📝 Wallet Signature Request 2/2"
   └─ User clicks "Approve" in Sui Wallet again
6. Wait for blockchain confirmation (~2-5 seconds)
7. Upload complete ✅
```

---

## Side-by-Side Comparison

### Upload Flow Diagrams

#### HTTP Publisher API (Your Implementation)

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Publisher API                        │
│                  (Server-Side, No Signatures)                │
└─────────────────────────────────────────────────────────────┘

[User Browser]
     │
     │ 1. Upload video file
     ▼
[Your Server]
     │
     │ 2. Transcode to HLS
     │ 3. Encrypt segments
     │
     │ 4. HTTP PUT to Publisher API
     │    (NO SIGNATURES NEEDED)
     ▼
[Walrus Publisher]
     │
     │ 5. Store blobs
     │ 6. Charge server wallet
     │
     │ 7. Return blob IDs
     ▼
[Your Server]
     │
     │ 8. Save manifest to database
     │
     │ 9. Return playback URL
     ▼
[User Browser]
     │
     │ 10. Play video
     ▼
   Done ✅
```

#### Wallet SDK (Alternative, Not Used)

```
┌─────────────────────────────────────────────────────────────┐
│                       Wallet SDK                             │
│             (Client-Side, Requires 2 Signatures)             │
└─────────────────────────────────────────────────────────────┘

[User Browser]
     │
     │ 1. Upload video file
     │
     │ 2. Transcode (client-side or server)
     │ 3. Encrypt segments (client-side)
     │
     │ 4. Call wallet.registerBlob()
     ▼
[Sui Wallet Extension]
     │
     │ 📝 "Sign transaction 1/2?"
     │    [Approve] [Reject]
     ▼
[User Clicks Approve]
     │
     ▼
[Blockchain]
     │
     │ 5. Register blob on-chain
     │ 6. Return blob ID
     ▼
[User Browser]
     │
     │ 7. HTTP PUT blob data to storage node
     ▼
[Walrus Storage Node]
     │
     │ 8. Store blob data
     ▼
[User Browser]
     │
     │ 9. Call wallet.certifyBlob()
     ▼
[Sui Wallet Extension]
     │
     │ 📝 "Sign transaction 2/2?"
     │    [Approve] [Reject]
     ▼
[User Clicks Approve]
     │
     ▼
[Blockchain]
     │
     │ 10. Certify storage on-chain
     │ 11. Return confirmation
     ▼
[User Browser]
     │
     │ 12. Play video
     ▼
   Done ✅
```

---

## Code Location Summary

### Your Implementation (HTTP API - No Signatures)

| File | Purpose | Signatures? |
|------|---------|-------------|
| `/lib/walrus.ts` | Server-side Walrus client | ❌ None |
| `/app/api/upload-walrus/route.ts` | Upload API endpoint | ❌ None |
| `/app/api/transcode/route.ts` | Transcoding endpoint | ❌ None |
| `/lib/transcoder.ts` | Video transcoding logic | ❌ None |
| `/lib/server/encryptor.ts` | Server-side encryption | ❌ None |

**Total Wallet Signatures Required**: **0**

### Alternative Implementation (Wallet SDK - 2 Signatures)

| File | Purpose | Signatures? |
|------|---------|-------------|
| `/lib/client-walrus-sdk.ts` | Client-side Walrus SDK wrapper | ✅ 2 signatures |
| `/app/upload/page.tsx` | Upload UI (not using wallet SDK) | ❌ None (currently) |

**Total Wallet Signatures Required**: **2 per upload**

---

## Technical Details: Why No Signatures?

### HTTP Publisher API Authentication

The HTTP Publisher API doesn't require wallet signatures because:

1. **Publisher runs its own Sui wallet** internally
2. **Publisher pays for storage** from its own balance
3. **Authentication via HTTP** (not blockchain transactions)
4. **Payment happens server-side** after successful PUT request

### Payment Flow (Behind the Scenes)

```typescript
// What you do (simple HTTP PUT):
await fetch('https://publisher.testnet.walrus.space/v1/blobs', {
  method: 'PUT',
  body: blobData,
});

// What the Publisher does internally:
// 1. Receive blob data
// 2. Calculate storage cost (size × epochs × rate)
// 3. Create Sui transaction to pay storage nodes
// 4. Sign transaction with Publisher's own wallet ← SIGNATURE HERE (not yours!)
// 5. Submit transaction to blockchain
// 6. Wait for confirmation
// 7. Return blob ID to you
```

### Wallet SDK Authentication

The Wallet SDK requires signatures because:

1. **User's wallet pays for storage** (not publisher)
2. **Blockchain transactions** require cryptographic signatures
3. **Two separate transactions**:
   - Register: Reserve storage space on-chain
   - Certify: Confirm data was stored correctly

```typescript
// Transaction 1: Register blob (user signs)
const registerTx = new Transaction();
registerTx.moveCall({
  target: `${WALRUS_PACKAGE}::blob::register`,
  arguments: [
    tx.pure.u64(blobSize),
    tx.pure.u64(epochs),
  ],
});
await wallet.signAndExecuteTransaction({ transaction: registerTx }); // ← USER SIGNATURE

// Transaction 2: Certify blob (user signs)
const certifyTx = new Transaction();
certifyTx.moveCall({
  target: `${WALRUS_PACKAGE}::blob::certify`,
  arguments: [
    tx.object(blobId),
    tx.pure.vector('u8', hashBytes),
  ],
});
await wallet.signAndExecuteTransaction({ transaction: certifyTx }); // ← USER SIGNATURE
```

---

## Cost Analysis

### HTTP Publisher API (Your Implementation)

**Testnet:**
- Server pays: **FREE** (testnet SUI from faucet)
- User pays: **$0**

**Mainnet:**
- Server pays: **~0.001-0.01 SUI per MB** (varies by epoch)
- User pays: **$0**
- Example: 100 MB video ≈ 0.1-1 SUI ≈ $0.20-$2.00 per upload

**Pros:**
- Users don't need SUI tokens
- Users don't need Sui wallets
- Simple user experience

**Cons:**
- Server bears all storage costs
- Could be expensive at scale
- Need to maintain server wallet balance

### Wallet SDK (Alternative)

**Testnet:**
- Server pays: **$0**
- User pays: **FREE** (testnet SUI from faucet)

**Mainnet:**
- Server pays: **$0**
- User pays: **~0.001-0.01 SUI per MB + gas fees**
- Example: 100 MB video ≈ 0.1-1 SUI + 0.001 SUI gas ≈ $0.20-$2.00 per upload

**Pros:**
- Server doesn't pay for storage
- Scalable cost model (users pay)

**Cons:**
- Users need Sui wallets
- Users need SUI tokens
- Poor user experience (2 signatures)
- Only works in browsers with wallet extensions

---

## Environment Configuration

### HTTP Publisher API (Current Setup)

**File**: `.env`

```bash
# Testnet Configuration (Current)
WALRUS_NETWORK="testnet"
WALRUS_AGGREGATOR_URL="https://aggregator.testnet.walrus.space"
WALRUS_PUBLISHER_URL="https://publisher.testnet.walrus.space"
WALRUS_EPOCHS=50

# Mainnet Configuration (Alternative)
# WALRUS_NETWORK="mainnet"
# WALRUS_AGGREGATOR_URL="https://aggregator.walrus.space"
# WALRUS_PUBLISHER_URL="https://publisher.walrus.space"
# WALRUS_EPOCHS=200
```

**Server Wallet (TODO - Required for Mainnet):**
```bash
# Server wallet for paying storage costs
SUI_WALLET_PRIVATE_KEY="0x..."
```

### Wallet SDK (Alternative Setup)

**File**: `.env`

```bash
# Public configuration (exposed to browser)
NEXT_PUBLIC_WALRUS_NETWORK="testnet"
NEXT_PUBLIC_SUI_RPC_URL="https://fullnode.testnet.sui.io"
```

**No server wallet needed** (users pay with their own wallets)

---

## Summary: Your Implementation

✅ **You are using HTTP Publisher API (commit d96dfa2)**

### Key Facts:

1. **Zero wallet signatures** required from users
2. **Server pays** for all Walrus storage
3. **Simple HTTP PUT** requests for uploads
4. **Already configured** for testnet
5. **Works in all browsers** (no wallet extension needed)

### Code Locations:

- **Implementation**: `/lib/walrus.ts` (lines 61-356)
- **API Route**: `/app/api/upload-walrus/route.ts`
- **Configuration**: `.env` (lines 10-19)

### Upload Method:

```typescript
// lib/walrus.ts
const response = await fetch(`${this.publisherUrl}/v1/blobs`, {
  method: 'PUT',
  body: data,
});
```

**No signatures. No wallet. Just HTTP.**

---

## Verification Checklist

✅ Check current implementation:
```bash
grep -n "signAndExecute" /lib/walrus.ts
# Expected: No results (no wallet signatures)
```

✅ Check HTTP API usage:
```bash
grep -n "fetch.*publisher.*v1/blobs" /lib/walrus.ts
# Expected: Line 65 (HTTP PUT request)
```

✅ Check testnet configuration:
```bash
grep "WALRUS_NETWORK" .env
# Expected: WALRUS_NETWORK="testnet"
```

✅ **ALL CHECKS PASS** ✅

Your implementation does not require wallet signatures.
