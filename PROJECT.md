# WalPlayer - Decentralized Video Platform

**A Next.js 14 video streaming platform with client-side encryption and Walrus decentralized storage**

## 🎯 Project Overview

WalPlayer is a decentralized video platform where:
- Videos are **transcoded in the browser** (WebAssembly FFmpeg)
- Segments are **encrypted client-side** with AES-256-GCM
- Encrypted data is **uploaded to Walrus** (Sui blockchain storage layer)
- Playback uses **secure key exchange** with server-side decryption
- Payment is handled via **WAL tokens** on Sui blockchain

**Current Status**: Production-ready on mainnet with delegator wallet pattern for gasless subsequent transactions.

---

## 🏗️ Architecture

### High-Level Flow

```
User Browser                    Backend API              Walrus Network          Sui Blockchain
     │                               │                         │                      │
     │──── 1. Upload Video           │                         │                      │
     │──── 2. Transcode (WASM) ─────>│                         │                      │
     │<─── 3. Cost Estimate ──────────│                         │                      │
     │──── 4. Approve PTB ───────────>│                         │                      │
     │                                │──── 5. Fund Delegator ──>│                      │
     │──── 6. Encrypt Segments ──────>│                         │                      │
     │──── 7. Upload to Walrus ──────────────────────────────>  │                      │
     │                                │                         │                      │
     │                                │<──── 8. Blob IDs ────────│                      │
     │──── 9. Register Video ────────>│                         │                      │
     │                                │ (Store encrypted DEKs)  │                      │
     │<─── 10. Video ID ───────────────│                         │                      │
     │                                │                         │                      │
     │──── Watch Video ───────────────>│                         │                      │
     │<─── Playback Session ───────────│                         │                      │
     │──── Request Segment ───────────>│                         │                      │
     │                                │<──── Fetch Encrypted ────│                      │
     │                                │ (Decrypt with DEK)      │                      │
     │<─── Decrypted Segment ──────────│                         │                      │
```

---

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **@mysten/dapp-kit** - Sui wallet integration
- **@ffmpeg/ffmpeg** - Browser-based video transcoding (WASM)
- **Web Crypto API** - AES-256-GCM encryption

### Backend
- **Next.js API Routes**
- **Prisma ORM** - Database queries
- **PostgreSQL** (Neon serverless)
- **AWS KMS** - Master key management
- **@mysten/walrus SDK** - Walrus storage integration
- **@mysten/sui SDK** - Sui blockchain integration

### Blockchain & Storage
- **Sui Blockchain** (mainnet/testnet)
- **Walrus Storage** - Decentralized blob storage
- **WAL Token** - Payment for storage (mainnet only)

### Database
- **PostgreSQL** (Neon)
- **Prisma Schema** with proper naming conventions

---

## 🔐 Encryption Architecture

### Current System: Per-Segment DEK Encryption

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT SIDE (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Video File                                                  │
│      ↓                                                       │
│  FFmpeg Transcode → Multiple Qualities (1080p, 720p, etc.)  │
│      ↓                                                       │
│  HLS Segments (4 second chunks)                             │
│      ↓                                                       │
│  For Each Segment:                                          │
│    • Generate random 16-byte DEK (Data Encryption Key)      │
│    • Generate random 12-byte IV (Initialization Vector)     │
│    • Encrypt segment: AES-256-GCM(segment, DEK, IV)        │
│      ↓                                                       │
│  Upload encrypted segments to Walrus                        │
│  Send DEKs + IVs to backend for storage                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     SERVER SIDE (Backend)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Receive DEKs (plain) from client                           │
│      ↓                                                       │
│  For Each DEK:                                              │
│    • Encrypt with AWS KMS master key                        │
│    • Store encrypted DEK in database (dek_enc)              │
│    • Store IV alongside (plain)                             │
│      ↓                                                       │
│  Database Storage:                                          │
│    video_segments.dek_enc (BYTEA) ← KMS-encrypted DEK      │
│    video_segments.iv (BYTEA) ← Plaintext IV                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     PLAYBACK (Decryption)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Client requests segment                                 │
│  2. Server fetches encrypted segment from Walrus            │
│  3. Server retrieves dek_enc + iv from database             │
│  4. Server decrypts DEK with AWS KMS                        │
│  5. Server decrypts segment: AES-256-GCM(encrypted, DEK, IV)│
│  6. Server streams decrypted segment to client              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Management

- **Master Key**: AWS KMS (never exposed)
- **DEKs**: Random 16-byte keys per segment
- **IVs**: Random 12-byte nonces per segment
- **Storage**: DEKs encrypted with KMS, IVs stored plain

### Why This Approach?

1. ✅ **Simple**: No key derivation complexity
2. ✅ **Secure**: Each segment isolated with unique DEK
3. ✅ **Fast**: Direct KMS encryption, no HKDF
4. ✅ **Scalable**: Parallel segment processing

---

## 🎬 Video Upload Flow

### 1. File Selection & Cost Estimation
```typescript
// User selects video file + quality options
const costEstimate = await fetch('/api/v1/estimate-cost', {
  body: JSON.stringify({ fileSizeMB, qualities: ['1080p', '720p'] })
});
```

### 2. Mainnet: Fund Delegator Wallet (PTB)
```typescript
// Build PTB that funds BOTH SUI gas + WAL storage in ONE transaction
const fundingTx = await buildFundingTransaction(
  account.address,        // User's wallet
  gasNeeded,             // SUI for gas fees (calculated)
  walAmountMist * 20n    // WAL for storage (20x buffer)
);

// User signs ONCE
await signAndExecuteTransaction({ transaction: fundingTx });

// CRITICAL: Wait for transaction to be indexed
await suiClient.waitForTransaction({ digest: fundingResult.digest });
```

### 3. Client-Side Transcoding
```typescript
const transcoded = await transcodeVideo(file, {
  qualities: ['1080p', '720p'],
  segmentDuration: 4,  // 4-second segments
});
// Returns: segments[], poster, duration
```

### 4. Client-Side Encryption
```typescript
for (const segment of transcoded.segments) {
  const dek = generateDEK();        // 16 random bytes
  const iv = generateIV();          // 12 random bytes
  const encrypted = await encryptSegment(dek, segment.data, iv);

  encryptedSegments.push({
    identifier: `${quality}_seg_${segIdx}`,
    data: encrypted,
    dek: toBase64(dek),
    iv: toBase64(iv),
  });
}
```

### 5. Upload to Walrus
```typescript
// Upload segments in batches (5 at a time)
const results = await uploadMultipleBlobsWithWallet(
  batch,
  signAndExecute,  // Delegator wallet (mainnet) or user wallet (testnet)
  walletAddress,   // Delegator address (mainnet) or user address (testnet)
  { network, epochs, deletable: true }
);
// Each blob requires 2 transactions: register + certify
```

### 6. Build Playlists
```typescript
// Quality playlist (e.g., 1080p.m3u8)
const playlist = `
#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MAP:URI="${aggregatorUrl}/v1/blobs/${initBlobId}"
#EXTINF:4.0,
${aggregatorUrl}/v1/blobs/${segment0BlobId}
#EXTINF:4.0,
${aggregatorUrl}/v1/blobs/${segment1BlobId}
...
#EXT-X-ENDLIST
`;

// Master playlist
const master = `
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
${aggregatorUrl}/v1/blobs/${playlist1080pBlobId}
#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
${aggregatorUrl}/v1/blobs/${playlist720pBlobId}
`;
```

### 7. Register with Backend
```typescript
await fetch('/api/v1/register-video', {
  body: JSON.stringify({
    videoId: masterBlobId,
    title,
    creatorId,
    walrusMasterUri,
    renditions: [{
      name: '1080p',
      segments: [{
        segIdx: 0,
        walrusUri: 'https://...',
        dek: 'base64...',  // Plain DEK sent to backend
        iv: 'base64...',
        duration: 4.0,
        size: 524288
      }]
    }]
  })
});
```

### 8. Backend: Encrypt & Store
```typescript
// Backend encrypts DEKs with KMS before storage
for (const segment of rendition.segments) {
  const dekPlain = Buffer.from(segment.dek, 'base64');
  const dekEncrypted = await encryptDek(dekPlain);  // AWS KMS

  await prisma.videoSegment.create({
    data: {
      segIdx: segment.segIdx,
      walrusUri: segment.walrusUri,
      dekEnc: Buffer.from(dekEncrypted),  // KMS-encrypted
      iv: Buffer.from(segment.iv, 'base64'),
      duration: segment.duration,
      size: segment.size,
    }
  });
}
```

---

## 📺 Video Playback Flow

### 1. Playback Session Creation
```typescript
POST /api/v1/playback/init
Body: { videoId, clientPublicKey }

Response: {
  sessionId,
  cookieValue,      // Opaque session token
  serverPublicKey,
  serverNonce,
  masterPlaylistUrl // HLS master playlist
}
```

### 2. HLS Player Requests Segments
```
GET /api/v1/playback/segment/{sessionId}/{rendition}/{segIdx}
Cookie: playback_session={cookieValue}

Server:
1. Validates session
2. Fetches encrypted blob from Walrus
3. Retrieves dek_enc + iv from database
4. Decrypts DEK with AWS KMS
5. Decrypts segment with DEK + IV
6. Streams decrypted segment to client
```

### 3. Session Expiry
- Sessions expire after 1 hour of inactivity
- Cleanup via cron job or manual trigger
- Device fingerprinting prevents session hijacking

---

## 💾 Database Schema

### Core Models (Prisma)

```prisma
model Video {
  id              String   @id @default(cuid())
  title           String
  walrusMasterUri String   @map("walrus_master_uri")
  posterWalrusUri String?  @map("poster_walrus_uri")
  duration        Float?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  creatorId       String   @map("creator_id")

  sessions   PlaybackSession[]
  renditions VideoRendition[]

  @@index([creatorId])
  @@map("videos")
}

model VideoRendition {
  id                String   @id @default(cuid())
  videoId           String   @map("video_id")
  name              String   // "1080p", "720p", "480p", "360p"
  walrusPlaylistUri String   @map("walrus_playlist_uri")
  resolution        String   // "1920x1080"
  bitrate           Int

  video    Video          @relation(fields: [videoId], references: [id], onDelete: Cascade)
  segments VideoSegment[]

  @@unique([videoId, name])
  @@map("video_renditions")
}

model VideoSegment {
  id          String   @id @default(cuid())
  renditionId String   @map("rendition_id")
  segIdx      Int      @map("seg_idx")
  walrusUri   String   @map("walrus_uri")    // Encrypted segment on Walrus
  dekEnc      Bytes    @map("dek_enc")       // KMS-encrypted DEK (16 bytes)
  iv          Bytes                          // Plaintext IV (12 bytes)
  duration    Float
  size        Int

  rendition VideoRendition @relation(fields: [renditionId], references: [id], onDelete: Cascade)

  @@unique([renditionId, segIdx])
  @@index([renditionId])
  @@map("video_segments")
}

model PlaybackSession {
  id           String   @id @default(cuid())
  cookieValue  String   @unique @map("cookie_value")
  videoId      String   @map("video_id")
  clientPubKey Bytes    @map("client_pub_key")
  serverPubKey Bytes    @map("server_pub_key")
  serverNonce  Bytes    @map("server_nonce")
  deviceHash   String?  @map("device_hash")
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")
  lastActivity DateTime @default(now()) @map("last_activity")

  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@index([cookieValue])
  @@index([expiresAt])
  @@index([videoId])
  @@map("playback_sessions")
}
```

### Important Notes

- **Naming**: PascalCase models map to snake_case tables via `@@map()`
- **No `root_secret_enc`**: Old column removed, per-segment DEKs used instead
- **Cascading Deletes**: Deleting video removes all renditions, segments, sessions
- **Indexes**: Optimized for common queries (creator lookup, session validation)

---

## 🔌 API Endpoints

### Upload & Registration
- `POST /api/v1/estimate-cost` - Calculate storage cost before upload
- `POST /api/v1/register-video` - Register video metadata after Walrus upload

### Playback
- `POST /api/v1/playback/init` - Create playback session
- `GET /api/v1/playback/segment/{sessionId}/{rendition}/{segIdx}` - Fetch decrypted segment
- `GET /api/v1/videos` - List all videos
- `GET /api/v1/videos/{videoId}` - Get video details

### Health & Monitoring
- `GET /api/health` - Service health check
- `GET /api/v1/stats` - Platform statistics

---

## ⚙️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# AWS KMS (for DEK encryption)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
KMS_KEY_ID="arn:aws:kms:..."

# Walrus Network
NEXT_PUBLIC_WALRUS_NETWORK="mainnet"  # or "testnet"
NEXT_PUBLIC_WALRUS_AGGREGATOR="https://aggregator.walrus.space"
NEXT_PUBLIC_WALRUS_EPOCHS="1"  # Mainnet: 1-5, Testnet: 5-100

# Sui Blockchain
NEXT_PUBLIC_SUI_NETWORK="mainnet"  # or "testnet"

# Upload Relay (optional, enabled by default)
NEXT_PUBLIC_UPLOAD_RELAY_ENABLED="true"

# Frontend
NEXT_PUBLIC_APP_URL="https://walplayer.com"
```

### Network Configuration

**Mainnet (Production)**:
- Requires WAL tokens for storage payment
- Uses delegator wallet pattern (user funds once)
- Epochs: 1-5 (strict limits)
- Upload relay: Enabled (40 MIST per KiB tip)

**Testnet (Development)**:
- Free HTTP uploads (no wallet needed)
- No WAL payment required
- Epochs: 5-100 (flexible)
- Ideal for testing

---

## 🔧 Recent Fixes & Issues

### Issue 1: `root_secret_enc` Null Constraint Violation
**Problem**: Database had `root_secret_enc` column (NOT NULL), but code wasn't providing it.

**Root Cause**:
- Old encryption model used a root secret per video
- New model uses per-segment DEKs
- Migration files removed column, but `prisma db push` didn't actually drop it
- Stale Prisma Client still expected the field

**Solution**:
1. Manually dropped column: `ALTER TABLE "videos" DROP COLUMN "root_secret_enc"`
2. Regenerated Prisma Client: `npx prisma generate`
3. Verified with database query

### Issue 2: ERR_NETWORK_CHANGED During Upload
**Problem**: Upload failed on first segment with network error.

**Root Cause**:
- PTB funding transaction completed
- Upload immediately tried to query coins from delegator wallet
- Fullnode hadn't indexed the new coins yet (< 1 second delay)
- Browser connection reset when coins not found

**Solution**: Added `waitForTransaction()` after PTB funding:
```typescript
await signAndExecuteTransaction({ transaction: fundingTx });
await suiClient.waitForTransaction({ digest: fundingResult.digest });
// Now coins are guaranteed to be indexed
```

### Issue 3: Insufficient WAL/SUI Budget
**Problem**: Uploads ran out of funds mid-upload.

**Root Cause**:
- Cost estimator uses simplified formula (not actual SDK)
- Each blob requires 2 transactions (register + certify)
- Erasure coding expands data 3-5x
- Upload relay tips (40 MIST per KiB)
- Poster, playlists, master playlist not in estimate

**Solution**: Increased buffers significantly:
- WAL: 20x buffer on estimate
- SUI: 0.012 per segment (2 transactions × 0.006) + 0.05 base

### Issue 4: Prisma Model Naming After `db pull`
**Problem**: `prisma.video.create()` was undefined.

**Root Cause**: `npx prisma db pull` used table names instead of model names.

**Solution**: Restored PascalCase models with `@@map()` directives:
```prisma
model Video {  // ← PascalCase
  @@map("videos")  // ← Maps to lowercase table
}
```

---

## 🚀 Deployment

### Build & Start
```bash
npm install
npx prisma generate
npm run build
npm start
```

### Database Setup
```bash
# Apply migrations
npx prisma migrate deploy

# Or sync schema (development)
npx prisma db push

# Generate client
npx prisma generate
```

### Vercel Deployment
- Environment variables configured in Vercel dashboard
- Database: Neon serverless Postgres
- AWS KMS: IAM role with KMS:Decrypt permission
- Automatic deployments from `main` branch

---

## 📊 Performance Metrics

### Upload Performance
- **Transcode**: ~0.5x realtime (10 min video → 20 min transcode)
- **Encryption**: ~10 MB/s per segment
- **Walrus Upload**: ~2 MB/s (network dependent)
- **Total Time**: ~30-40 minutes for 10-minute 1080p video

### Storage Costs (Mainnet)
- **Base Rate**: ~0.0001 WAL per MB per epoch
- **Example**: 100 MB video, 1 epoch = ~0.01 WAL (~$0.001 USD)
- **Erasure Coding**: 3-5x expansion (100 MB → 300-500 MB stored)

### Playback Performance
- **First Segment**: ~500ms (includes session creation)
- **Subsequent Segments**: ~100ms (cached KMS connection)
- **Buffering**: Adaptive based on bandwidth

---

## 🔍 Debugging

### Common Issues

**1. Upload fails with "No WAL tokens found"**
- Ensure wallet has WAL tokens on mainnet
- Check network: `console.log(walrusNetwork)`
- Testnet uses free HTTP uploads (no WAL needed)

**2. "Null constraint violation" errors**
- Run: `npx prisma db push` to sync schema
- Regenerate client: `npx prisma generate`
- Check actual DB columns with query script

**3. Playback shows "Session expired"**
- Sessions expire after 1 hour inactivity
- Check `expiresAt` in database
- Create new session with `/api/v1/playback/init`

**4. AWS KMS errors**
- Verify AWS credentials in `.env`
- Check IAM role has `kms:Decrypt` permission
- Test with `aws kms list-keys` in terminal

### Useful Commands

```bash
# Check database state
npx prisma studio

# View migrations
npx prisma migrate status

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# Tail logs
npm run dev | grep '\[Upload\]\|\[API\]\|\[Playback\]'
```

---

## 📝 Development Roadmap

### ✅ Completed
- Client-side encryption with per-segment DEKs
- Walrus integration (mainnet + testnet)
- Delegator wallet pattern for gasless uploads
- HLS adaptive streaming
- Secure playback sessions
- Cost estimation
- Database schema optimization

### 🚧 In Progress
- Video thumbnails/sprites for timeline scrubbing
- Quality switching during playback
- Upload progress persistence (resume uploads)

### 📋 Planned
- Mobile app (React Native)
- Live streaming support
- CDN caching layer for popular content
- Creator analytics dashboard
- Content moderation tools

---

## 📚 Additional Resources

### Documentation
- [Sui Documentation](https://docs.sui.io/)
- [Walrus Documentation](https://docs.walrus.site/)
- [Prisma Guides](https://www.prisma.io/docs/)
- [Next.js App Router](https://nextjs.org/docs/app)

### Related Files
- `prisma/schema.prisma` - Database schema
- `lib/client-walrus-sdk.ts` - Walrus upload functions
- `lib/hooks/usePersonalDelegator.ts` - Delegator wallet logic
- `lib/crypto/clientEncryption.ts` - AES-GCM encryption
- `lib/kms/envelope.ts` - AWS KMS integration
- `app/upload/page.tsx` - Upload UI
- `app/api/v1/register-video/route.ts` - Video registration

---

## 🤝 Contributing

When contributing or debugging:
1. Read this document thoroughly
2. Check recent fixes section for known issues
3. Use `npx prisma studio` to inspect database
4. Test on testnet first (free uploads)
5. Verify schema matches database with `npx prisma db pull`

---

## 📄 License

[Add your license here]

---

**Last Updated**: 2025-11-03
**Version**: 2.0.0 (Per-segment DEK encryption)
**Maintainer**: [Your name/team]
