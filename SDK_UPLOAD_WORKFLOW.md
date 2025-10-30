# SDK Upload Workflow

## Overview

WalPlayer now uses the **Walrus SDK** for direct uploads with **user-signed transactions**. Users pay for storage costs directly from their wallet using WAL tokens before uploading.

## Architecture

### Previous Flow (HTTP API):
```
Client → Backend → Walrus Publisher → Walrus Network
         (HTTP API, no payment)
```

### New Flow (SDK with User Signature):
```
Client → Walrus Network (directly, with user signature + WAL payment)
       ↓
       Backend (register metadata only)
```

## Upload Process

### 1. Client-Side: Transcode Video
```typescript
// POST /api/transcode
const transcodeResponse = await fetch('/api/transcode', {
  method: 'POST',
  body: videoFile,
});

const { videoId } = await transcodeResponse.json();
// Transcoded segments are cached on server
```

### 2. Client-Side: Get Cost Estimate
```typescript
// POST /v1/estimate-cost
const costResponse = await fetch('/v1/estimate-cost', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoId }),
});

const { cost } = await costResponse.json();
// cost.totalWal = "0.045123" (WAL tokens)
// cost.sizeBytes = 15728640
// cost.epochs = 200
```

### 3. Client-Side: Show Cost to User
```typescript
// Display payment confirmation UI
alert(`This upload will cost ${cost.totalWal} WAL tokens (~$X.XX USD)`);
const userApproved = confirm('Proceed with upload?');
```

### 4. Client-Side: Upload to Walrus with User Signature
```typescript
import { uploadQuiltWithSigner } from '@/lib/client-walrus-sdk';
import { useWallet } from '@mysten/dapp-kit';

// Get user's wallet signer
const { currentWallet } = useWallet();
const signer = currentWallet.features['standard:signTransactionBlock'];

// Fetch encrypted segments from server
const encryptedData = await fetch(`/api/get-encrypted-segments/${videoId}`).then(r => r.json());

// Prepare segments for upload
const segmentBlobs = encryptedData.renditions.flatMap(rendition => {
  const blobs = [];

  // Add init segment
  if (rendition.initSegment) {
    blobs.push({
      contents: new Uint8Array(rendition.initSegment.data),
      identifier: `${rendition.quality}_init`,
    });
  }

  // Add media segments
  rendition.segments.forEach(segment => {
    blobs.push({
      contents: new Uint8Array(segment.data),
      identifier: `${rendition.quality}_seg_${segment.segIdx}`,
    });
  });

  return blobs;
});

// Upload segments - USER WILL BE PROMPTED TO SIGN TRANSACTION
const segmentQuilt = await uploadQuiltWithSigner(segmentBlobs, signer, {
  network: 'mainnet',
  epochs: 200,
});

console.log(`Paid ${segmentQuilt.cost.totalCostWal} WAL`);
console.log(`Transaction: ${segmentQuilt.blobObject.id.id}`);
```

### 5. Client-Side: Build Playlists
```typescript
// Map segment patch IDs
const segmentPatchIdMap = new Map();
segmentQuilt.index.patches.forEach(patch => {
  segmentPatchIdMap.set(patch.identifier, patch.patchId);
});

// Build HLS playlists
const aggregatorUrl = 'https://aggregator.walrus.space';
const playlistBlobs = encryptedData.renditions.map(rendition => {
  let playlistContent = '#EXTM3U\\n';
  playlistContent += '#EXT-X-VERSION:7\\n';
  playlistContent += '#EXT-X-TARGETDURATION:4\\n';

  // Add init segment URI
  const initPatchId = segmentPatchIdMap.get(`${rendition.quality}_init`);
  playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}"\\n`;

  // Add media segment URIs
  rendition.segments.forEach(segment => {
    const segPatchId = segmentPatchIdMap.get(`${rendition.quality}_seg_${segment.segIdx}`);
    playlistContent += `#EXTINF:4.0,\\n`;
    playlistContent += `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}\\n`;
  });

  playlistContent += '#EXT-X-ENDLIST\\n';

  return {
    contents: new TextEncoder().encode(playlistContent),
    identifier: `${rendition.quality}_playlist`,
  };
});

// Upload playlists - USER SIGNS AGAIN
const playlistQuilt = await uploadQuiltWithSigner(playlistBlobs, signer, {
  network: 'mainnet',
  epochs: 200,
});
```

### 6. Client-Side: Upload Master Playlist
```typescript
// Build master playlist
const playlistPatchIdMap = new Map();
playlistQuilt.index.patches.forEach(patch => {
  playlistPatchIdMap.set(patch.identifier, patch.patchId);
});

let masterContent = '#EXTM3U\\n#EXT-X-VERSION:7\\n\\n';
encryptedData.renditions.forEach(rendition => {
  const playlistPatchId = playlistPatchIdMap.get(`${rendition.quality}_playlist`);
  const playlistUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchId}`;
  const [width, height] = rendition.resolution.split('x');
  masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},RESOLUTION=${width}x${height}\\n`;
  masterContent += `${playlistUri}\\n`;
});

// Upload master playlist - USER SIGNS THIRD TIME
const masterQuilt = await uploadQuiltWithSigner(
  [{
    contents: new TextEncoder().encode(masterContent),
    identifier: 'master_playlist',
  }],
  signer,
  { network: 'mainnet', epochs: 200 }
);

const masterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuilt.index.patches[0].patchId}`;
```

### 7. Client-Side: Register Video Metadata
```typescript
// POST /v1/register-video
const registerResponse = await fetch('/v1/register-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId,
    title: 'My Video',
    creatorId: userAddress,
    walrusMasterUri: masterWalrusUri,
    posterWalrusUri: posterUri,
    rootSecretEnc: encryptedData.rootSecretEnc, // Base64
    duration: encryptedData.duration,
    renditions: encryptedData.renditions.map(rendition => ({
      name: rendition.quality,
      resolution: rendition.resolution,
      bitrate: rendition.bitrate,
      walrusPlaylistUri: `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchIdMap.get(`${rendition.quality}_playlist`)}`,
      segments: rendition.segments.map(segment => ({
        segIdx: segment.segIdx,
        walrusUri: `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segmentPatchIdMap.get(`${rendition.quality}_seg_${segment.segIdx}`)}`,
        iv: segment.iv, // Base64
        duration: 4.0,
        size: segment.encryptedSize,
      })),
    })),
    paymentInfo: {
      paidWal: (
        Number(segmentQuilt.cost.totalCost) +
        Number(playlistQuilt.cost.totalCost) +
        Number(masterQuilt.cost.totalCost)
      ) / 1_000_000_000,
      paidMist: (
        Number(segmentQuilt.cost.totalCost) +
        Number(playlistQuilt.cost.totalCost) +
        Number(masterQuilt.cost.totalCost)
      ).toString(),
      walletAddress: await signer.getAddress(),
      transactionIds: {
        segments: segmentQuilt.blobObject.id.id,
        playlists: playlistQuilt.blobObject.id.id,
        master: masterQuilt.blobObject.id.id,
      },
    },
  }),
});

const { video } = await registerResponse.json();
console.log('Video registered:', video.id);
```

## API Endpoints

### POST /v1/estimate-cost
Calculate storage cost before upload.

**Request:**
```json
{
  "videoId": "video_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "videoId": "video_abc123",
  "cost": {
    "totalWal": "0.045123",
    "storageWal": "0.030000",
    "writeWal": "0.015123",
    "totalMist": "45123000",
    "sizeFormatted": "15.23 MB",
    "sizeBytes": 15728640,
    "epochs": 200,
    "network": "mainnet"
  }
}
```

### POST /v1/register-video
Register video metadata after client-side upload.

**Request:**
```json
{
  "videoId": "video_abc123",
  "title": "My Video",
  "creatorId": "0x...",
  "walrusMasterUri": "https://aggregator.walrus.space/v1/blobs/by-quilt-patch-id/...",
  "posterWalrusUri": "https://aggregator.walrus.space/v1/blobs/by-quilt-patch-id/...",
  "rootSecretEnc": "base64_encoded_secret",
  "duration": 120.5,
  "renditions": [...],
  "paymentInfo": {
    "paidWal": "0.045123",
    "paidMist": "45123000",
    "walletAddress": "0x...",
    "transactionIds": {
      "segments": "0x...",
      "playlists": "0x...",
      "master": "0x..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "video": {
    "id": "video_abc123",
    "title": "My Video",
    "walrusMasterUri": "...",
    "posterWalrusUri": "...",
    "duration": 120.5,
    "createdAt": "2025-10-28T...",
    "renditions": [...]
  },
  "stats": {
    "totalSegments": 42
  },
  "payment": {...}
}
```

## User Requirements

### 1. Sui Wallet
Users must have a Sui-compatible wallet installed:
- Sui Wallet (official)
- Suiet
- Ethos Wallet
- Martian Wallet

### 2. WAL Tokens
Users need WAL tokens to pay for storage:
- **Get SUI**: Purchase from exchange (Binance, OKX, etc.)
- **Swap to WAL**: Use Sui DEX (Cetus, Turbos, etc.)
- **Transfer**: Send WAL to wallet address

### 3. SUI for Gas
Small amount of SUI needed for transaction gas fees (~0.001 SUI per transaction).

## Cost Example

**15 MB video upload (3 renditions, 42 segments):**

| Component | Size | Cost (WAL) |
|-----------|------|------------|
| Segments | 14.5 MB | 0.029000 |
| Playlists | 12 KB | 0.000240 |
| Master | 500 B | 0.000010 |
| **Total** | **14.5 MB** | **0.029250** |

**Plus gas fees:**
- Segment upload tx: 0.001 SUI
- Playlist upload tx: 0.001 SUI
- Master upload tx: 0.001 SUI
- **Total gas**: 0.003 SUI

**Grand total:** 0.029250 WAL + 0.003 SUI

## Frontend Implementation

### Using @mysten/dapp-kit

```typescript
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { uploadQuiltWithSigner } from '@/lib/client-walrus-sdk';

function UploadVideo() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  async function handleUpload() {
    if (!account) {
      alert('Please connect wallet first');
      return;
    }

    // 1. Get cost estimate
    const cost = await fetch('/v1/estimate-cost', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    }).then(r => r.json());

    // 2. Show cost to user
    const proceed = confirm(`Upload will cost ${cost.totalWal} WAL. Continue?`);
    if (!proceed) return;

    // 3. Upload with user signature
    // (see full flow above)
  }

  return (
    <div>
      <ConnectButton />
      {account && <button onClick={handleUpload}>Upload Video</button>}
    </div>
  );
}
```

## Benefits of SDK Approach

### ✅ Fully Decentralized
- No reliance on centralized publishers
- Direct connection to Walrus storage nodes
- Permissionless uploads

### ✅ Transparent Costs
- Exact costs shown upfront
- Users see what they're paying
- On-chain payment verification

### ✅ User-Controlled Payments
- Users pay from their own wallet
- No backend wallet management
- Full payment transparency

### ✅ Verifiable Transactions
- All uploads recorded on Sui blockchain
- Transaction IDs for proof of payment
- Audit trail for storage costs

## Troubleshooting

### Error: "Insufficient WAL balance"
**Solution**: User needs to acquire WAL tokens (see User Requirements above).

### Error: "Transaction rejected"
**Solution**: User canceled the signature prompt. They need to approve the transaction.

### Error: "Insufficient SUI for gas"
**Solution**: User needs small amount of SUI (~0.003 SUI) for gas fees.

### Upload Fails After 2nd Signature
**Solution**: Each upload (segments, playlists, master) requires a separate signature. Users must approve all three transactions.

## Migration from HTTP API

### Old Endpoint (Deprecated):
- `POST /v1/videos` - Backend uploads to Walrus HTTP API

### New Endpoints:
- `POST /v1/estimate-cost` - Get cost estimate
- Client-side upload using SDK
- `POST /v1/register-video` - Register metadata

### Migration Steps:
1. Update frontend to use `@mysten/dapp-kit`
2. Add wallet connection UI
3. Replace upload logic with SDK-based flow
4. Test with testnet first (cheaper)
5. Deploy to mainnet

## Resources

- [Walrus Documentation](https://docs.walrus.space)
- [Walrus SDK](https://github.com/MystenLabs/walrus)
- [@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit)
- [Sui Wallets](https://sui.io/wallets)
- [WAL Token Info](https://docs.walrus.space/tokenomics)

---

**Document Created**: October 28, 2025
**WalPlayer Version**: v3 (SDK-based uploads)
**Payment Method**: WAL tokens via user signature
