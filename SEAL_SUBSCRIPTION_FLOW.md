# SEAL Subscription Flow - Profile as Channel

## Overview

In KrillTube, a **Creator's Profile IS their Channel**. One subscription fee grants access to ALL videos (past and future) from that creator.

---

## Database Schema (Already Exists!)

```prisma
model Creator {
  walletAddress String   @unique
  name          String
  bio           String?
  avatar        String?

  // Channel subscription settings
  channelPrice    String?  // Subscription price (e.g., "10 SUI")
  channelChain    String?  // "sui" or "iota"
  channelCoinType String?  // "0x2::sui::SUI"
  sealObjectId    String?  // On-chain CreatorChannel object ID ← THIS IS THE KEY!

  subscriptions Subscription[]
}

model Subscription {
  subscriberAddress String
  creatorId         String
  chain             String
  txDigest          String   // On-chain subscription transaction
  createdAt         DateTime

  creator           Creator

  @@unique([subscriberAddress, creatorId, chain])
}

model Video {
  creatorId        String
  encryptionType   String  // "per-video" | "subscription-acl" | "both"

  // SEAL fields (for subscription-acl videos)
  sealObjectId     String?  // Same as creator.sealObjectId
  sealDocumentId   String?  // [channel_id][video_id][nonce]
  sealBlobId       String?  // Walrus blob with SEAL-encrypted data
}

model VideoSegment {
  // For "per-video" encryption (existing DEK system)
  dekEnc  Bytes?  // KMS-encrypted DEK
  iv      Bytes?  // Initialization vector

  // For "subscription-acl" encryption (SEAL)
  sealDocumentId  String?  // [channel_id][segment_index][nonce]
  sealBlobId      String?  // Walrus blob ID
}
```

---

## Complete Flow

### 1️⃣ Creator Sets Up Subscription (Profile Edit)

**User Action**: Creator edits profile and sets `channelPrice = "10 SUI"`

**Backend Flow**:
```typescript
// app/api/v1/profile/[address]/route.ts (PUT)
if (channelPrice && !creator.sealObjectId) {
  // Create on-chain CreatorChannel
  const { channelId } = await createChannel(
    SEAL_PACKAGE_ID,
    {
      name: creator.name,
      description: creator.bio || "",
      subscriptionPrice: suiToMist(parseFloat(channelPrice))
    },
    creatorKeypair,
    suiClient
  );

  // Save channel ID to database
  await prisma.creator.update({
    where: { walletAddress: address },
    data: {
      channelPrice,
      channelChain: 'sui',
      channelCoinType: '0x2::sui::SUI',
      sealObjectId: channelId,  // ← On-chain channel ID
    }
  });
}
```

**Result**: Creator now has an on-chain subscription channel!

---

### 2️⃣ User Subscribes to Creator (Profile Page)

**User Action**: Clicks "Subscribe" button on creator's profile

**Frontend Flow**:
```typescript
// app/(app)/profile/[address]/page.tsx
const handleSubscribe = async () => {
  // Pay subscription fee + add user to on-chain ACL
  const txDigest = await subscribeToChannel(
    SEAL_PACKAGE_ID,
    {
      channelId: profile.sealObjectId,  // Creator's channel
      paymentAmount: suiToMist(parseFloat(profile.channelPrice))
    },
    userKeypair,
    suiClient
  );

  // Save subscription record to database
  await fetch('/api/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      creatorAddress: profile.walletAddress,
      txDigest,
    })
  });
};
```

**Smart Contract** (on-chain):
```move
// Executed by subscribeToChannel()
entry fun subscribe_entry(
    channel: &mut CreatorChannel,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
) {
    // Verify payment >= subscription_price
    // Transfer payment to creator
    // Add user to channel.subscribers (ACL)
}
```

**Result**:
- ✅ User paid creator
- ✅ User added to on-chain ACL
- ✅ Database has subscription record

---

### 3️⃣ Creator Uploads Video with Subscription ACL

**User Action**: Creator uploads video, selects "Subscription ACL" encryption

**Upload Flow**:
```typescript
// lib/upload/clientUploadOrchestrator.ts (modified)
async function uploadVideoWithSEAL(
  videoFile: File,
  encryptionType: 'subscription-acl' | 'both',
  creatorData: Creator
) {
  // 1. Transcode video (same as before)
  const segments = await transcodeVideo(videoFile);

  // 2. Get creator's channel ID
  const channelId = creatorData.sealObjectId;
  if (!channelId) {
    throw new Error('Creator must enable subscriptions first');
  }

  // 3. Encrypt each segment with SEAL
  const sealClient = initializeSealClient({
    network: 'mainnet',
    packageId: SEAL_PACKAGE_ID
  });

  for (const [index, segment] of segments.entries()) {
    // Generate document ID: [channel_id][video_id][segment_index][nonce]
    const documentId = generateSealDocumentId(
      channelId,
      `${videoId}_seg_${index}`
    );

    // Encrypt segment
    const { encryptedData } = await encryptWithSeal(
      sealClient,
      SEAL_PACKAGE_ID,
      documentId,
      segment.data,
      1  // 1-of-1 threshold
    );

    // Upload to Walrus
    const blobId = await uploadToWalrus(encryptedData);

    // Store in database
    await prisma.videoSegment.create({
      data: {
        videoId,
        segIdx: index,
        walrusUri: getWalrusUrl(blobId),
        sealDocumentId: documentId,
        sealBlobId: blobId,
        // No dekEnc, no iv - SEAL handles everything!
      }
    });
  }

  // 4. Save video metadata
  await prisma.video.create({
    data: {
      creatorId: creatorData.walletAddress,
      encryptionType: 'subscription-acl',
      sealObjectId: channelId,  // Link to creator's channel
    }
  });
}
```

**Result**: Video encrypted and uploaded, linked to creator's channel

---

### 4️⃣ Subscriber Watches Video (Playback)

**User Action**: Subscriber clicks on a subscription-only video

**Playback Flow**:
```typescript
// lib/player/sealDecryptingLoader.ts (new file)
async function loadSealSegment(
  videoId: string,
  segmentIndex: number,
  userKeypair: Ed25519Keypair
) {
  // 1. Get segment metadata
  const segment = await fetch(`/api/v1/seal/segment?videoId=${videoId}&segIdx=${segmentIndex}`);
  const { sealDocumentId, sealBlobId, channelId } = await segment.json();

  // 2. Download encrypted segment from Walrus
  const encryptedData = await fetch(getWalrusUrl(sealBlobId));

  // 3. Create session key (10 min TTL)
  const sessionKey = await createSealSessionKey(
    userKeypair,
    SEAL_PACKAGE_ID,
    suiClient,
    10
  );

  // 4. Build seal_approve transaction (proves subscription)
  const tx = new Transaction();
  tx.moveCall({
    target: `${SEAL_PACKAGE_ID}::creator_channel::seal_approve`,
    arguments: [
      tx.pure.vector('u8', Array.from(fromHex(sealDocumentId))),
      tx.object(channelId),  // Creator's channel
      tx.object(CLOCK_OBJECT_ID),
    ],
  });

  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

  // 5. Decrypt with SEAL
  const sealClient = initializeSealClient({ network: 'mainnet', packageId: SEAL_PACKAGE_ID });
  const decryptedSegment = await decryptWithSeal(
    sealClient,
    encryptedData,
    sessionKey,
    txBytes
  );

  return decryptedSegment;
}
```

**Smart Contract Verification** (on-chain):
```move
// Called by SEAL key servers before decrypting
entry fun seal_approve(
    document_id: vector<u8>,    // [channel_id][video_id][seg_idx][nonce]
    channel: &CreatorChannel,   // Creator's channel
    clock: &Clock,
    ctx: &TxContext
) {
    let caller = tx_context::sender(ctx);

    // 1. Verify document ID has correct channel prefix
    assert!(is_prefix(namespace(channel), document_id), E_INVALID_PREFIX);

    // 2. Check if caller is subscribed
    assert!(vec_set::contains(&channel.subscribers, &caller), E_NOT_SUBSCRIBED);

    // ✅ User is subscribed - allow decryption!
}
```

**Result**:
- ✅ SEAL verifies user is subscribed (on-chain)
- ✅ Video segment decrypted
- ✅ Playback continues

---

### 5️⃣ Creator Uploads ANOTHER Video (Future Upload)

**Key Point**: Same subscription still works!

```typescript
// When creator uploads a NEW video weeks later:
const newDocumentId = generateSealDocumentId(
  creatorData.sealObjectId,  // ← SAME channel ID!
  `${newVideoId}_seg_${index}`
);

// Encrypt with SEAL using same channel
const { encryptedData } = await encryptWithSeal(
  sealClient,
  SEAL_PACKAGE_ID,
  newDocumentId,  // ← Uses same channel prefix
  segment.data,
  2
);
```

**When subscriber tries to watch**:
```move
// seal_approve is called again
// document_id has same channel prefix
// user is still in channel.subscribers
// ✅ Decryption granted!
```

**Result**:
- ✅ One subscription = access to ALL videos from creator
- ✅ Past videos ✅ Future videos ✅

---

## Document ID Structure (Critical!)

All videos from same creator share the channel prefix:

```
[creator.sealObjectId (32 bytes)][video_id (variable)][nonce (16 bytes)]
```

Examples:
- Video 1, Segment 0: `[channel_123...][video_abc_seg_0][nonce_xyz...]`
- Video 1, Segment 1: `[channel_123...][video_abc_seg_1][nonce_def...]`
- Video 2, Segment 0: `[channel_123...][video_def_seg_0][nonce_ghi...]`

All start with **same channel prefix** → `seal_approve` checks **same ACL**

---

## Handling "both" Encryption Type

For videos with `encryptionType: "both"`:

```typescript
// Upload TWICE with different encryption
async function uploadVideoBothTypes(videoFile: File, creator: Creator) {
  const segments = await transcodeVideo(videoFile);

  // PATH 1: DEK encryption (for pay-per-view)
  for (const segment of segments) {
    const dek = generateDEK();
    const encrypted = await encryptSegment(dek, segment.data);
    const blobId = await uploadToWalrus(encrypted);

    await prisma.videoSegment.create({
      data: {
        walrusUri: getWalrusUrl(blobId),
        dekEnc: await encryptDek(dek),
        iv: segment.iv,
      }
    });
  }

  // PATH 2: SEAL encryption (for subscribers)
  for (const segment of segments) {
    const documentId = generateSealDocumentId(creator.sealObjectId, ...);
    const { encryptedData } = await encryptWithSeal(...);
    const sealBlobId = await uploadToWalrus(encryptedData);

    await prisma.videoSegment.update({
      where: { ... },
      data: {
        sealDocumentId: documentId,
        sealBlobId: sealBlobId,
      }
    });
  }
}
```

**Playback Decision**:
```typescript
// /api/v1/key endpoint (modified)
if (video.encryptionType === 'both') {
  // Check if user is subscribed
  const isSubscribed = await checkSubscription(userAddress, video.creatorId);

  if (isSubscribed) {
    // Use SEAL decryption (free for subscriber)
    return { useSeal: true, sealData: ... };
  } else {
    // Use DEK decryption (pay-per-view)
    return { useSeal: false, dek: ..., iv: ... };
  }
}
```

---

## Benefits

✅ **One subscription = unlimited access**
✅ **Works for all past videos**
✅ **Works for all future videos**
✅ **Fully decentralized** (SEAL key servers verify on-chain ACL)
✅ **No re-uploading** when new subscribers join
✅ **Creator sets price once** in profile settings

---

## Next Implementation Steps

1. Update `/api/v1/profile/[address]/route.ts` (PUT) → Create channel when price is set
2. Create `/api/v1/subscriptions/route.ts` → Handle subscription payments
3. Update upload flow → Support SEAL encryption for subscription-acl
4. Create SEAL decryption loader → Handle playback for subscribers
5. Update `/api/v1/key` → Check subscription status before returning keys
