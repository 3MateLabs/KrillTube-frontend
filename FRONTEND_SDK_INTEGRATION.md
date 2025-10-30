# Frontend SDK Integration Guide

## Overview

This guide explains how to integrate Walrus SDK into the WalPlayer frontend so users pay for storage with WAL tokens via wallet signature.

## Complete Upload Flow

### 1. Transcode Video (Backend)
```typescript
const formData = new FormData();
formData.append('video', selectedFile);
formData.append('qualities', JSON.stringify(['720p', '480p', '360p']));

const response = await fetch('/api/transcode', {
  method: 'POST',
  body: formData,
});

const { videoId } = await response.json();
```

### 2. Get Cost Estimate (Backend)
```typescript
const costResponse = await fetch('/v1/estimate-cost', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoId }),
});

const { cost } = await costResponse.json();
// cost.totalWal = "0.045123"
// cost.sizeFormatted = "15.23 MB"
```

### 3. Show Cost Approval UI
```tsx
{showCostApproval && (
  <div className="p-6 bg-walrus-mint/10 border-2 border-walrus-mint rounded-lg">
    <h3>Approve Payment</h3>
    <p>Storage Cost: {cost.totalWal} WAL</p>
    <p>File Size: {cost.sizeFormatted}</p>
    <button onClick={handleApproveAndPay}>Sign & Pay</button>
  </div>
)}
```

### 4. Get Encrypted Segments (Backend)
```typescript
const segmentsResponse = await fetch(`/v1/encrypted-segments/${videoId}`);
const segmentsData = await segmentsResponse.json();
// Returns all encrypted segments as byte arrays
```

### 5. Upload to Walrus with SDK (Client-side)
```typescript
import { uploadQuiltWithSigner, createWalrusClient } from '@/lib/client-walrus-sdk';
import { useCurrentAccount } from '@mysten/dapp-kit';

// Get user's wallet/signer
const account = useCurrentAccount();
if (!account) {
  alert('Please connect wallet');
  return;
}

// Prepare segment blobs
const segmentBlobs = segmentsData.segments.map(seg => ({
  contents: new Uint8Array(seg.data),
  identifier: seg.identifier,
}));

// Upload segments - USER WILL BE PROMPTED TO SIGN
const segmentQuilt = await uploadQuiltWithSigner(
  segmentBlobs,
  account.address, // This needs proper signer implementation
  {
    network: 'mainnet',
    epochs: 200,
  }
);

console.log(`Paid ${segmentQuilt.cost.totalCostWal} WAL`);
console.log(`Transaction: ${segmentQuilt.blobObject.id.id}`);
```

### 6. Build and Upload Playlists
```typescript
// Map segment patch IDs
const segmentPatchIdMap = new Map();
segmentQuilt.index.patches.forEach(patch => {
  segmentPatchIdMap.set(patch.identifier, patch.patchId);
});

// Build HLS playlists
const aggregatorUrl = 'https://aggregator.walrus.space';
const playlistBlobs = [];

for (const rendition of segmentsData.renditions) {
  let playlistContent = '#EXTM3U\\n#EXT-X-VERSION:7\\n';

  // Add init segment
  const initPatchId = segmentPatchIdMap.get(`${rendition.quality}_init`);
  playlistContent += `#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${initPatchId}"\\n`;

  // Add media segments
  for (let i = 0; i < rendition.segmentCount - 1; i++) {
    const segPatchId = segmentPatchIdMap.get(`${rendition.quality}_seg_${i}`);
    playlistContent += `#EXTINF:4.0,\\n`;
    playlistContent += `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${segPatchId}\\n`;
  }

  playlistContent += '#EXT-X-ENDLIST\\n';

  playlistBlobs.push({
    contents: new TextEncoder().encode(playlistContent),
    identifier: `${rendition.quality}_playlist`,
  });
}

// Upload playlists - USER SIGNS AGAIN
const playlistQuilt = await uploadQuiltWithSigner(playlistBlobs, account.address, {
  network: 'mainnet',
  epochs: 200,
});
```

### 7. Upload Master Playlist
```typescript
// Build master playlist
const playlistPatchIdMap = new Map();
playlistQuilt.index.patches.forEach(patch => {
  playlistPatchIdMap.set(patch.identifier, patch.patchId);
});

let masterContent = '#EXTM3U\\n#EXT-X-VERSION:7\\n\\n';

for (const rendition of segmentsData.renditions) {
  const playlistPatchId = playlistPatchIdMap.get(`${rendition.quality}_playlist`);
  const playlistUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${playlistPatchId}`;
  const [width, height] = rendition.resolution.split('x');

  masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bitrate},RESOLUTION=${width}x${height}\\n`;
  masterContent += `${playlistUri}\\n`;
}

// Upload master - USER SIGNS THIRD TIME
const masterQuilt = await uploadQuiltWithSigner(
  [{
    contents: new TextEncoder().encode(masterContent),
    identifier: 'master_playlist',
  }],
  account.address,
  { network: 'mainnet', epochs: 200 }
);

const masterWalrusUri = `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${masterQuilt.index.patches[0].patchId}`;
```

### 8. Register Video Metadata (Backend)
```typescript
const registerResponse = await fetch('/v1/register-video', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId,
    title: 'My Video',
    creatorId: account.address,
    walrusMasterUri: masterWalrusUri,
    posterWalrusUri: posterUri,
    rootSecretEnc: segmentsData.rootSecretEnc, // Base64
    duration: segmentsData.duration,
    renditions: /* build from patch IDs */,
    paymentInfo: {
      paidWal: totalPaidWal,
      paidMist: totalPaidMist,
      walletAddress: account.address,
      transactionIds: {
        segments: segmentQuilt.blobObject.id.id,
        playlists: playlistQuilt.blobObject.id.id,
        master: masterQuilt.blobObject.id.id,
      },
    },
  }),
});

const { video } = await registerResponse.json();
router.push(`/watch/${video.id}`);
```

## Key Points

### User Signatures Required
- **3 signatures total**: segments, playlists, master playlist
- Each upload transaction requires user approval
- Users see transaction details in their wallet

### Cost Transparency
- Show exact WAL cost before upload
- Display file size and storage duration
- User approves payment explicitly

### Error Handling
```typescript
try {
  const quilt = await uploadQuiltWithSigner(blobs, signer, options);
} catch (error) {
  if (error.message.includes('Insufficient WAL')) {
    alert('You need more WAL tokens. Please acquire WAL first.');
  } else if (error.message.includes('User rejected')) {
    alert('Transaction canceled. Please approve to continue upload.');
  } else {
    alert(`Upload failed: ${error.message}`);
  }
}
```

### Wallet Integration
```tsx
import { ConnectButton } from '@mysten/dapp-kit';

<ConnectButton />

{account ? (
  <button onClick={handleUpload}>Upload Video</button>
) : (
  <p>Connect wallet to upload</p>
)}
```

## Implementation Checklist

- [ ] Install @mysten/dapp-kit
- [ ] Add wallet connection UI
- [ ] Implement cost estimate step
- [ ] Add cost approval UI
- [ ] Integrate SDK upload with user signatures
- [ ] Handle 3 separate signature prompts
- [ ] Build playlists from patch IDs
- [ ] Register video metadata after upload
- [ ] Add error handling for insufficient WAL
- [ ] Test on testnet first

## Next Steps

1. **Replace current upload page** with SDK version
2. **Test with testnet** (cheaper, faster)
3. **Switch to mainnet** when ready
4. **Update documentation** with real costs

## Resources

- Client SDK: `/lib/client-walrus-sdk.ts`
- Upload page example: `/app/upload/page-sdk.tsx`
- Backend endpoints: `/app/api/v1/estimate-cost/`, `/app/api/v1/register-video/`
- Encrypted segments API: `/app/api/v1/encrypted-segments/[videoId]/`
