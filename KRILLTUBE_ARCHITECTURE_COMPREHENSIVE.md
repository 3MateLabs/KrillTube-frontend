# KrillTube Frontend - Complete Architecture Report

**Generated**: 2024-11-19
**Project**: KrillTube (Decentralized Video Streaming Platform)
**Status**: Production-ready on mainnet/testnet

---

## EXECUTIVE SUMMARY

KrillTube is a decentralized video streaming platform built on Next.js with client-side encryption (AES-128-GCM) and Walrus blockchain storage integration. Videos are transcoded client-side using WebAssembly FFmpeg, encrypted into HLS segments, uploaded to Walrus, and playback is secured through session-based key management with payment verification.

**Key Technologies:**
- Frontend: Next.js 16, React 19, TypeScript, Web Crypto API
- Backend: Next.js API Routes, Prisma ORM, PostgreSQL
- Storage: Walrus (Sui blockchain), with QUILTS batch upload
- Encryption: AES-128-GCM (client-side upload), X25519 ECDH (playback sessions)
- Payment: Sui & IOTA wallet integration with delegator pattern
- Video Processing: FFmpeg (WASM), HLS.js player

---

## PART 1: CURRENT ENCRYPTION IMPLEMENTATION

### 1.1 Encryption Methods & Algorithms

#### **Upload Flow (Client-Side Encryption)**
```
Algorithm: AES-128-GCM
Key Size: 128 bits (16 bytes)
IV Size: 96 bits (12 bytes)
Authentication Tag: 128 bits (16 bytes)
Implementation: Web Crypto API (SubtleCrypto)
```

**Key Generation:**
- Each segment gets a **unique random DEK** (Data Encryption Key)
- Each segment gets a **unique random IV**
- Generated using `crypto.getRandomValues()`

**Encryption Process:**
```typescript
// From lib/crypto/clientEncryption.ts
1. Generate DEK: Uint8Array(16) random bytes
2. Generate IV: Uint8Array(12) random bytes
3. Encrypt segment data: AES-GCM(plaintext, DEK, IV)
4. Output: ciphertext (includes 16-byte auth tag)
```

#### **Playback Flow (Session-Based Key Management)**
```
Algorithm: X25519 (ECDH) + HKDF-SHA256 + AES-128-GCM
ECDH Key Exchange:
  - Client generates ephemeral X25519 keypair (32-byte keys)
  - Server generates ephemeral X25519 keypair
  - ECDH shared secret derivation

KEK Derivation:
  - Input: ECDH shared secret (32 bytes) + server nonce (12 bytes)
  - Process: HKDF-SHA256(ikm=sharedSecret, salt=nonce, info="session-kek-v1", length=16)
  - Output: 128-bit Key Encryption Key (KEK)

DEK Unwrapping:
  - Each segment's DEK is wrapped with KEK using AES-GCM
  - Format: [version(1)] [iv(12)] [wrapped_dek(32)] = 45 bytes
  - Client unwraps to get plaintext DEK for segment decryption
```

### 1.2 Where Encryption Happens

#### **Upload Phase (Client-Side)**
| Stage | Location | Algorithm | Keys |
|-------|----------|-----------|------|
| Video Transcode | Browser (FFmpeg WASM) | H.264/AAC | N/A |
| Segment Generation | Browser | HLS TS format | N/A |
| Segment Encryption | Browser | AES-128-GCM | Random DEK per segment |
| Upload to Walrus | Browser | TLS 1.3 | DEKs transmitted in JSON |
| DEK Storage | Server | AES-128-GCM | Master Key (KMS-encrypted) |

**Code Path:** `lib/upload/clientUploadOrchestrator.ts` → `lib/crypto/clientEncryption.ts`

#### **Playback Phase (Hybrid)**
| Stage | Location | Algorithm | Keys |
|-------|----------|-----------|------|
| Session Creation | Server | X25519 ECDH | Ephemeral keypairs |
| KEK Derivation | Client | HKDF-SHA256 | Shared secret + nonce |
| Key Retrieval | Server | Signature verification | User wallet signature |
| DEK Decryption | Server | AES-128-GCM | KMS Master Key |
| DEK Delivery | Server→Client | HTTPS | Wrapped with KEK |
| Segment Decryption | Browser (Worker) | AES-128-GCM | Unwrapped DEK |

**Code Path:** `lib/player/sessionManager.ts` → `lib/player/decryptingLoader.ts` → Web Worker

### 1.3 Key Management & Storage

#### **Master Key (KMS)**
```
Type: Environment variable (KMS_MASTER_KEY)
Size: 256 bits (32 bytes)
Format: Base64-encoded
Location: .env (NEVER committed to git)
Caching: In-memory with TTL
Access: lib/kms/masterKey.ts
```

**Master Key Flow:**
```
KMS_MASTER_KEY (env) 
  → getMasterKey() 
  → cached in memory 
  → used to encrypt/decrypt DEKs
```

#### **DEK Storage in Database**
```
Table: video_segments
Column: dek_enc (BYTEA)
Format: [version(1)] [iv(12)] [encrypted_dek(32)] = 45 bytes
Encryption: Master Key → AES-128-GCM
Decryption: Only on key retrieval (/v1/key endpoint)
```

**Code:** `lib/kms/envelope.ts`
```typescript
// Encrypt segment DEK with master key
export async function encryptDek(plainDek: Uint8Array): Promise<Buffer> {
  const masterKey = getMasterKey(); // 32-byte key
  const iv = generateIv(); // 12-byte nonce
  const encryptedDek = await aesGcmEncrypt(masterKey, plainDek, iv);
  
  // Format: [version(1)] [iv(12)] [encryptedDek(32)]
  const version = new Uint8Array([1]);
  const combined = concatBytes(version, iv, encryptedDek);
  return Buffer.from(combined);
}

// Decrypt for key retrieval
export async function decryptDek(encryptedDek: Buffer): Promise<Uint8Array> {
  const version = data[0];
  const iv = data.slice(1, 13);
  const encryptedDekData = data.slice(13);
  
  const masterKey = getMasterKey();
  return await aesGcmDecrypt(masterKey, encryptedDekData, iv);
}
```

#### **Session Private Keys (Ephemeral)**
```
Storage: In-memory Map (Node.js process)
Key: Session ID (string)
Value: {
  privateKeyJwk: JsonWebKey (X25519),
  expiresAt: timestamp
}
TTL: 24 hours (configurable)
Cleanup: Periodic + manual on session termination
```

**Code:** `lib/kms/envelope.ts` (sessionKeyStore)
```typescript
const sessionKeyStore = new Map<string, {
  privateKeyJwk: JsonWebKey;
  expiresAt: number;
}>();
```

#### **Segment DEK Caching (Client)**
```
Storage: In-memory Map (Browser)
Key: "${rendition}:${segIdx}" (e.g., "720p:0")
Value: {
  dek: Uint8Array (16 bytes, plaintext),
  iv: Uint8Array (12 bytes),
  cachedAt: timestamp
}
TTL: Session lifetime
Persistence: None (cleared on page refresh)
```

**Code:** `lib/player/sessionManager.ts` (keyCache)

### 1.4 Decryption Flow (Step-by-Step)

#### **Complete Playback Decryption Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Session Initialization (ServerSide)                     │
├─────────────────────────────────────────────────────────────────┤
│ 1. Client sends X25519 public key to /v1/session                │
│ 2. Server generates ephemeral X25519 keypair + nonce            │
│ 3. Server stores session with client pub key + server nonce     │
│ 4. Server stores ephemeral private key in-memory (24 hr TTL)    │
│ 5. Server returns: serverPubKey (base64) + serverNonce (base64) │
│ 6. Server sets HttpOnly cookie with session token               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: KEK Derivation (ClientSide)                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Client receives serverPubKey + serverNonce                   │
│ 2. Client performs ECDH:                                        │
│    sharedSecret = ECDH(clientPrivKey, serverPubKey)            │
│ 3. Client derives KEK using HKDF:                              │
│    KEK = HKDF-SHA256(                                           │
│      ikm: sharedSecret (32 bytes),                             │
│      salt: serverNonce (12 bytes),                             │
│      info: "session-kek-v1",                                   │
│      length: 16 bytes                                          │
│    )                                                            │
│ 4. KEK stored in memory as CryptoKey                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Segment Key Retrieval (Authentication)                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Client initiates playback                                    │
│ 2. HLS.js requests segment, triggers key fetch                  │
│ 3. Client calls GET /v1/key?videoId=X&rendition=Y&segIdx=Z     │
│ 4. Server verification:                                         │
│    - Extract user address from signature cookie                 │
│    - Verify signature (Sui/IOTA chain-specific)                 │
│    - Check VideoPaymentInfo (user has paid for this segment)    │
│ 5. Server logic:                                                │
│    if (!paymentInfo || !paymentInfo.paidSegmentIds.includes(Z)) │
│      return 401 "Payment required"                              │
│    else                                                         │
│      continue to decryption                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Server-Side DEK Decryption (KMS)                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Server retrieves encrypted segment from Walrus               │
│    URL: ${WALRUS_AGGREGATOR}/v1/blobs/${blobId}                │
│ 2. Server retrieves segment metadata from database:             │
│    - dek_enc: encrypted DEK (45 bytes)                          │
│    - iv: plaintext IV (12 bytes)                                │
│ 3. Server decrypts DEK:                                         │
│    plainDek = decryptDek(dek_enc)                               │
│      a. Extract format: [version(1)] [iv(12)] [encDek(32)]     │
│      b. masterKey = getMasterKey() // from KMS_MASTER_KEY      │
│      c. plainDek = AES-GCM-decrypt(encDek, masterKey, iv)      │
│ 4. Server sends to client:                                      │
│    {                                                            │
│      dek: toBase64(plainDek),  // base64 plaintext DEK          │
│      iv: toBase64(segment.iv)  // base64 IV                     │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: Client-Side Segment Decryption (Web Worker)            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Client receives dek + iv from /v1/key endpoint               │
│ 2. Client caches key: keyCache.set("720p:0", {dek, iv})        │
│ 3. When segment data arrives from Walrus:                       │
│    a. Fetch encrypted segment blob                              │
│    b. Get cached dek + iv                                       │
│    c. Decrypt: plainSegment = AES-GCM-decrypt(                 │
│         encrypted_segment,                                     │
│         dek,                                                    │
│         iv                                                      │
│       )                                                         │
│ 4. Pass decrypted segment to HLS.js                             │
│ 5. HLS.js sends to video element                                │
│ 6. Video.js plays decrypted MPEG-TS segment                     │
└─────────────────────────────────────────────────────────────────┘
```

#### **Code Snippets**

**Client KEK Derivation** (`lib/crypto/client.ts`):
```typescript
export async function deriveClientKek(
  session: ClientSession,
  serverPublicKeyB64: string,
  serverNonceB64: string
): Promise<CryptoKey> {
  const serverPublicKey = fromBase64(serverPublicKeyB64);
  const serverNonce = fromBase64(serverNonceB64);

  // ECDH
  const sharedSecret = await deriveSharedSecret(
    serverPublicKey,
    session.clientPrivateKeyJwk
  );

  // HKDF to derive KEK
  const kek = await hkdfDeriveKey(
    {
      ikm: sharedSecret,
      salt: serverNonce,
      info: 'session-kek-v1',
    },
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );

  session.kek = kek;
  return kek;
}
```

**Server Key Retrieval** (`app/api/v1/key/route.ts`):
```typescript
export async function GET(request: NextRequest) {
  // 1. Verify signature
  const isValid = await verifySuiSignature(messageBytes, signature);
  
  // 2. Check payment
  const paymentInfo = await prisma.videoPaymentInfo.findFirst({
    where: { videoId, payerAddress: address, chain }
  });
  if (!paymentInfo.paidSegmentIds.includes(segIdx)) {
    return NextResponse.json({ error: 'Payment required' }, { status: 401 });
  }
  
  // 3. Decrypt DEK
  const dekBytes = await decryptDek(segment.dekEnc);
  
  // 4. Return unwrapped DEK
  return NextResponse.json({
    dek: toBase64(dekBytes),
    iv: toBase64(segment.iv),
  });
}
```

---

## PART 2: VIDEO PROCESSING PIPELINE

### 2.1 Upload Flow

#### **Phase 1: Transcoding (Browser)**
```
Input: User uploads MP4/WebM video file
↓
Process: FFmpeg (WASM) in browser
  - Detect video properties (duration, resolution)
  - Transcode to multiple qualities:
    * 1080p: 1920×1080 @ 5 Mbps
    * 720p: 1280×720 @ 2.8 Mbps
    * 480p: 854×480 @ 1.4 Mbps
    * 360p: 640×360 @ 800 kbps
  - Segment into 4-second HLS segments (MPEG-TS)
  - Generate init segments (fMP4)
  - Generate rendition playlists (.m3u8)
↓
Output: TranscodeResult {
  jobId: string,
  renditions: [{
    quality: "720p",
    segments: [{
      filepath: string,
      size: number,
      duration: 4.0
    }]
  }],
  masterPlaylist: { content: string },
  duration: number,
  totalSegments: number
}
```

**Code:** `lib/upload/clientUploadOrchestrator.ts`
```typescript
// Step 1: Transcode
const transcoded = await transcodeVideo(file, {
  qualities: ['1080p', '720p', '480p', '360p'],
  segmentDuration: 4,
  onProgress: (progress) => { /* update UI */ }
});
```

#### **Phase 2: Encryption (Browser)**
```
Input: Transcoded segments + Init segments + Playlists
↓
Process: For each segment:
  1. Generate random 16-byte DEK
  2. Generate random 12-byte IV
  3. Encrypt segment: AES-128-GCM(segment_data, DEK, IV)
  4. Store: {
       encrypted_data: Uint8Array,
       dek: base64,
       iv: base64,
       quality: "720p",
       segIdx: 0
     }
  5. Clear original plaintext from memory
↓
Output: EncryptedSegment[] with:
  - Encrypted segment data (to upload)
  - DEK (to send to server)
  - IV (to send to server)
```

**Code:** `lib/upload/clientUploadOrchestrator.ts`
```typescript
// Step 2: Encrypt
for (const segment of transcoded.segments) {
  const dek = generateDEK(); // 16 random bytes
  const iv = generateIV();   // 12 random bytes
  const encrypted = await encryptSegment(dek, segment.data, iv);
  
  encryptedSegments.push({
    data: encrypted,
    dek: toBase64(dek),
    iv: toBase64(iv),
    size: encrypted.length
  });
}
```

#### **Phase 3: Upload to Walrus (Browser + Server)**

**Sub-phase 3a: Cost Estimation**
```
Client → Server: GET /v1/estimate-cost
Parameters:
  - rendition_sizes: { "720p": 123456, "1080p": 234567 }
  
Server:
  1. Calculate total bytes
  2. Query Walrus for blob storage cost
  3. Calculate transaction fee
  4. Return: {
       storageWal: "1.5",
       transactionWal: "0.3",
       totalWal: "1.8",
       usdEquivalent: "15.00"
     }
```

**Sub-phase 3b: Wallet Payment (PTB)**
```
Client → Sui/IOTA Wallet:
  1. Generate PTB (Programmable Transaction Block)
  2. Send funds to delegator wallet
  3. Wallet signs PTB
  4. Submit to blockchain
  
Result: transactionHash
```

**Sub-phase 3c: Batch Upload (QUILTS)**
```
Client creates FormData with all encrypted segments:
  - Format: 
    form["720p_seg_0"] = encrypted_blob
    form["720p_seg_1"] = encrypted_blob
    ...
    form["720p_playlist"] = playlist_content
    form["master_playlist"] = master_playlist_content
    form["poster"] = poster_image
    
Client → Walrus: PUT /v1/quilts
  - Batch upload all files in one request
  - Walrus returns: quiltPatchIds for each file
  
Response: {
  storedQuiltBlobs: [{
    identifier: "720p_seg_0",
    quiltPatchId: "Aezxyz..."
  }]
}
```

**Sub-phase 3d: Walrus URL Generation**
```
For each quiltPatchId:
  URL = ${WALRUS_AGGREGATOR}/v1/blobs/by-quilt-patch-id/${quiltPatchId}
  
Example:
  https://aggregator.walrus.space/v1/blobs/by-quilt-patch-id/Aezxyz...
```

#### **Phase 4: Video Registration (Server)**
```
Client → Server: POST /v1/register-video
Body: {
  videoId: "video_123",
  title: "My Video",
  creatorId: "creator_wallet",
  walrusMasterUri: "https://aggregator.../master.m3u8",
  duration: 120.5,
  renditions: [{
    name: "720p",
    walrusPlaylistUri: "https://...",
    segments: [{
      segIdx: 0,
      walrusUri: "https://...",
      dek: "base64_dek",  ← plaintext DEK from client
      iv: "base64_iv",
      size: 123456
    }]
  }]
}

Server Process:
  1. Validate all required fields
  2. For each segment DEK:
     a. Decode base64 DEK → Uint8Array(16)
     b. Encrypt with KMS master key
     c. Store encrypted DEK in database: video_segments.dek_enc
  3. Store plaintext IV in database: video_segments.iv
  4. Create database records:
     - Video
     - VideoRendition (one per quality)
     - VideoSegment (one per segment)
     - CreatorConfig (payment info)
  5. Return success with video metadata

Response: {
  success: true,
  video: {
    id: "video_123",
    title: "My Video",
    renditions: [
      { id: "rend_1", name: "720p", segmentCount: 30 }
    ]
  }
}
```

**Code:** `app/api/v1/register-video/route.ts`
```typescript
// Encrypt each DEK before storage
renditions: {
  create: await Promise.all(
    renditions.map(async (rendition) => ({
      segments: {
        create: await Promise.all(
          rendition.segments.map(async (segment) => {
            const dekPlain = Buffer.from(segment.dek, 'base64');
            const dekEncrypted = await encryptDek(new Uint8Array(dekPlain));
            
            return {
              dek_enc: Buffer.from(dekEncrypted), // KMS-encrypted
              iv: Buffer.from(segment.iv, 'base64'), // plain
            };
          })
        ),
      },
    }))
  ),
}
```

### 2.2 HLS Manifest Generation

#### **Rendition Playlist (.m3u8)**
```
#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:4
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-MAP:URI="https://aggregator.../init"
#EXTINF:4.0,
https://aggregator.../v1/blobs/by-quilt-patch-id/seg_0
#EXTINF:4.0,
https://aggregator.../v1/blobs/by-quilt-patch-id/seg_1
...
#EXT-X-ENDLIST
```

#### **Master Playlist (.m3u8)**
```
#EXTM3U
#EXT-X-VERSION:7

#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
https://aggregator.../v1/blobs/by-quilt-patch-id/1080p_playlist

#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720
https://aggregator.../v1/blobs/by-quilt-patch-id/720p_playlist

#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=854x480
https://aggregator.../v1/blobs/by-quilt-patch-id/480p_playlist
```

### 2.3 Segment Handling

#### **Segment Storage Format**
| Component | Format | Size |
|-----------|--------|------|
| MPEG-TS Container | Transport Stream | ~200KB-5MB |
| H.264 Video | Codec | 95% of segment |
| AAC Audio | Codec | 5% of segment |
| Encryption | AES-128-GCM | Adds 16 bytes auth tag |

#### **Database Schema**
```prisma
model VideoSegment {
  id           String         @id
  renditionId  String         @map("rendition_id")
  segIdx       Int            @map("seg_idx")
  walrusUri    String         @map("walrus_uri")
  iv           Bytes          // Plaintext IV (12 bytes)
  dekEnc       Bytes          @map("dek_enc") // KMS-encrypted DEK
  duration     Float
  size         Int
}
```

### 2.4 Rendition Management

#### **Quality Levels (RENDITION_CONFIGS)**
```typescript
{
  '1080p': {
    width: 1920, height: 1080,
    bitrate: 5000000,   // 5 Mbps
    audioBitrate: 192000 // 192 kbps
  },
  '720p': {
    width: 1280, height: 720,
    bitrate: 2800000,   // 2.8 Mbps
    audioBitrate: 128000 // 128 kbps
  },
  '480p': {
    width: 854, height: 480,
    bitrate: 1400000,   // 1.4 Mbps
    audioBitrate: 128000 // 128 kbps
  },
  '360p': {
    width: 640, height: 360,
    bitrate: 800000,    // 800 kbps
    audioBitrate: 96000 // 96 kbps
  }
}
```

#### **Adaptive Bitrate (ABR) Switching**
- HLS.js handles ABR automatically
- `startLevel: -1` enables auto-selection
- Player switches based on bandwidth + buffer
- Aggressive key prefetch prevents buffering during switches

---

## PART 3: STORAGE ARCHITECTURE

### 3.1 Walrus Integration

#### **Configuration**
```typescript
// environment
NEXT_PUBLIC_WALRUS_NETWORK=testnet|mainnet
NEXT_PUBLIC_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_EPOCHS=200 (mainnet), 1 (testnet)
```

#### **Upload Methods**

**Method 1: Single Blob Upload** (`/v1/blobs`)
```typescript
// Used for small files
PUT /v1/blobs?epochs=200
Body: binary data
Response: {
  newlyCreated: {
    blobObject: {
      id: { id: "blob_object_id" },
      storage: { end_epoch: 12345 }
    }
  }
}
```

**Method 2: QUILTS Batch Upload** (`/v1/quilts`)
```typescript
// Used for large multi-file uploads (current implementation)
PUT /v1/quilts?epochs=200
Body: FormData with multiple files
Response: {
  storedQuiltBlobs: [{
    identifier: "720p_seg_0",
    quiltPatchId: "patch_id_xyz"
  }]
}

Walrus URL: /v1/blobs/by-quilt-patch-id/{patchId}
```

#### **Blob Lifecycle**

```
1. Upload Phase:
   - Client encrypts segments
   - Client batches upload to Walrus
   - Walrus stores encrypted data
   - Returns blob IDs + patch IDs

2. Metadata Storage:
   - Server stores blob IDs in database
   - For mainnet: stores blobObjectId + endEpoch
   - For testnet: only stores blob IDs

3. Playback Phase:
   - Client requests segment key from server
   - Server fetches encrypted blob from Walrus
   - Server decrypts with KMS
   - Server returns plaintext segment to client

4. Lifecycle Management (Mainnet):
   - Extend: POST /v1/videos/[id]/extend
   - Delete: POST /v1/videos/[id]/delete
   - Uses blob object IDs stored in database
```

### 3.2 File Storage Patterns

#### **Segment Storage**
```
Walrus Blob ID Format:
  Base64url-encoded 32-byte hash
  Example: Aezxyz123...
  
Walrus URL:
  https://aggregator.walrus.space/v1/blobs/{blobId}
  OR (for QUILTS):
  https://aggregator.walrus.space/v1/blobs/by-quilt-patch-id/{patchId}

Blob Content:
  - Encrypted MPEG-TS segment (AES-128-GCM)
  - No metadata (all metadata stored in database)
  - Immutable once uploaded
```

#### **Playlist Storage**
```
Format: HLS .m3u8 (plaintext UTF-8)
Content:
  - Rendition playlist: references segment Walrus URLs
  - Master playlist: references rendition playlists
  
Encryption: None (playlists are public)
Access: Direct HTTP fetch from Walrus

Database Storage:
  - walrusPlaylistUri: string (Walrus URL)
  - playlistBlobObjectId: string | null (mainnet only)
```

### 3.3 Blob Storage & Retrieval

#### **Retrieval Flow**
```
Client Browser
  ↓
HLS.js loads master.m3u8
  ↓
HLS.js parses playlist URLs (Walrus)
  ↓
HLS.js detects quality selection needed
  ↓
DecryptingLoader intercepts segment fetch
  ↓
1. Fetch segment from Walrus URL
2. Request key from /v1/key API
3. Decrypt segment with key
4. Pass plaintext to HLS.js
  ↓
HLS.js feeds to Video.js
  ↓
Browser video decoder plays
```

#### **Wallet Network Configuration**
| Network | Aggregator | Epochs | Usage |
|---------|-----------|--------|-------|
| Testnet | aggregator.walrus-testnet.walrus.space | 1-100 | Development, testing |
| Mainnet | aggregator.walrus.space | 200-1000 | Production |

### 3.4 Session Management for Encrypted Playback

#### **Playback Session Lifecycle**

**Creation:**
```typescript
POST /api/v1/session
{
  videoId: "video_123",
  clientPubKey: "base64_pubkey",
  deviceFingerprint: "hash"
}

Response:
{
  sessionId: "session_xyz",
  serverPubKey: "base64",
  serverNonce: "base64",
  expiresAt: "2024-11-20T10:00:00Z"
}

Database:
INSERT INTO playback_sessions (
  id, cookieValue, videoId,
  clientPubKey, serverPubKey, serverNonce,
  expiresAt
) VALUES (...)

KMS In-Memory:
sessionKeyStore.set(sessionId, {
  privateKeyJwk: serverKeypair.privateKeyJwk,
  expiresAt: Date.now() + 24*60*60*1000
})

Cookies:
Set-Cookie: sessionToken=<uuid>; HttpOnly; Secure; SameSite=Lax
```

**Usage:**
```typescript
GET /api/v1/key?videoId=X&rendition=Y&segIdx=Z

Requires:
- signature_address cookie
- signature cookie
- signature_message cookie
- signature_chain cookie

Server:
1. Verify wallet signature
2. Check payment for user:segment
3. Retrieve encrypted DEK from DB
4. Decrypt DEK with KMS master key
5. Return plaintext DEK to client

Client caches DEK in keyCache
```

**Termination:**
```typescript
DELETE /api/v1/session

Server:
1. Delete from playback_sessions table
2. Delete from sessionKeyStore (in-memory)
3. Clear sessionToken cookie
```

**Expiration:**
```
- Sessions expire after 24 hours
- Auto-refresh every 15 minutes
- On expiration: client gets 401, clears cache
```

---

## PART 4: API ROUTES & BACKEND

### 4.1 Video-Related Endpoints

#### **Session Management**
```
POST /api/v1/session
  Create playback session
  Headers: Content-Type: application/json
  Body: { videoId, clientPubKey, deviceFingerprint? }
  Response: { sessionId, serverPubKey, serverNonce, expiresAt }
  Status: 201 Created, 400 Bad Request, 404 Not Found, 500 Error

GET /api/v1/session
  Get current session info
  Headers: Cookie: sessionToken=...
  Response: { sessionId, videoId, video, expiresAt, ... }
  Status: 200 OK, 401 Unauthorized, 404 Not Found

DELETE /api/v1/session
  Terminate session
  Headers: Cookie: sessionToken=...
  Response: { message: "Session terminated successfully" }
  Status: 200 OK, 401 Unauthorized

POST /api/v1/session/refresh
  Extend session expiration
  Headers: Cookie: sessionToken=...
  Response: { expiresAt }
  Status: 200 OK, 401 Unauthorized, 404 Not Found
```

#### **Key Retrieval (REQUIRES PAYMENT)**
```
GET /api/v1/key
  Retrieve segment DEK
  Query: videoId, rendition, segIdx
  Headers: Cookie: signature_*, sessionToken
  Response: { dek (base64), iv (base64), duration }
  Status: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Error
  
  Payment Verification:
  - Check VideoPaymentInfo.payerAddress == signature_address
  - Check VideoPaymentInfo.paidSegmentIds includes segIdx
  - Return 401 if not paid

POST /api/v1/key/batch
  Retrieve multiple segment DEKs
  Body: { videoId, rendition, segIndices: number[] }
  Headers: Cookie: signature_*, sessionToken
  Response: { keys: [{ segIdx, dek, iv }], duration }
  Status: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Error
  
  Optimization:
  - Batch up to 20 keys in single request
  - Parallel KMS decryption
  - Cache-friendly for progressive download
```

#### **Video Management**
```
GET /api/v1/videos
  List videos (paginated)
  Query: page, limit, creatorId?
  Response: { videos: [...], total, page, limit }

GET /api/v1/videos/[id]
  Get video details
  Response: {
    id, title, duration, creatorId,
    walrusMasterUri, posterWalrusUri,
    renditions: [{
      id, name, resolution, bitrate,
      walrusPlaylistUri, segmentCount
    }],
    creatorConfigs: [{ chain, coinType, pricePerView }]
  }

POST /api/v1/register-video
  Register uploaded video
  Body: { videoId, title, creatorId, walrusMasterUri, renditions, ... }
  Response: { success, video, stats, payment }
  Status: 201 Created, 400 Bad Request, 500 Error
  
  Process:
  - Validate all fields
  - Encrypt all DEKs with KMS
  - Create Video + Renditions + Segments
  - Create CreatorConfigs
  - Return video metadata

POST /api/v1/videos/[id]/delete/finalize
  Delete video from Walrus (mainnet only)
  Body: { blobObjectIds: [...], chain: "sui" }
  Response: { transactionHash }
  Status: 200 OK, 400 Bad Request, 404 Not Found, 500 Error

POST /api/v1/videos/[id]/extend/finalize
  Extend Walrus storage (mainnet only)
  Body: { blobObjectIds: [...], newEndEpoch, chain: "sui" }
  Response: { transactionHash }
  Status: 200 OK, 400 Bad Request, 404 Not Found, 500 Error
```

#### **Assets (Upload State)**
```
GET /api/v1/assets
  List user's uploaded assets

GET /api/v1/assets/[id]
  Get asset metadata

POST /api/v1/assets
  Create asset (reserve upload slot)

POST /api/v1/assets/[id]
  Update asset metadata
```

#### **Payment & Verification**
```
POST /api/v1/payment/process-sui
  Process Sui payment for video access
  Body: { videoId, transactionHash }
  Response: { success, message }

POST /api/v1/payment/process-iota
  Process IOTA payment for video access
  Body: { videoId, transactionHash }
  Response: { success, message }

GET /api/v1/payment/check
  Check payment status for user:video
  Query: videoId
  Headers: Cookie: signature_address, signature_chain
  Response: { isPaid, paidSegments, totalSegments }

GET /api/v1/estimate-cost
  Estimate storage cost for video
  Query: totalBytes, epochs?
  Response: { storageCost, transactionFee, totalCost }
```

#### **Coin Information**
```
GET /api/v1/coin-price/[coinType]
  Get current price of coin (Sui)
  Response: { price, symbol, decimals }

GET /api/v1/iota/coin-price/[coinType]
  Get current price of coin (IOTA)
  Response: { price, symbol, decimals }

GET /api/v1/iota/coin-metadata/[coinType]
  Get coin metadata (IOTA)
  Response: { decimals, symbol, name }
```

### 4.2 Upload API Structure

#### **Transcode Endpoint (Browser-Based)**
No dedicated endpoint - FFmpeg runs in browser using WASM

#### **Upload Endpoint**
No dedicated endpoint - Client uploads directly to Walrus using SDK

#### **Registration Endpoint**
```typescript
POST /api/v1/register-video
├─ Validate input
├─ Encrypt DEKs (KMS)
├─ Create Video record
├─ Create VideoRendition records
├─ Create VideoSegment records (with dek_enc)
├─ Create CreatorConfig records
└─ Return success with video metadata
```

### 4.3 Playback Session API

#### **Session Flow**
```
1. POST /api/v1/session
   ├─ Generate server ephemeral keypair
   ├─ Generate server nonce
   ├─ Store in database + in-memory KMS
   └─ Return to client for KEK derivation

2. GET /api/v1/key (repeat for each segment)
   ├─ Verify wallet signature
   ├─ Check payment
   ├─ Decrypt DEK with KMS
   └─ Return plaintext DEK to client

3. POST /api/v1/session/refresh (every 15 min)
   ├─ Update session expiration in database
   └─ Continue playback

4. DELETE /api/v1/session
   ├─ Delete from database
   ├─ Delete from in-memory KMS
   └─ Clear cookies
```

### 4.4 Authentication Mechanisms

#### **Wallet Signature Verification**

**Sui (via @mysten/sui/verify):**
```typescript
const messageBytes = new TextEncoder().encode(message);
const publicKey = await verifySuiSignature(messageBytes, signature);
const isValid = publicKey.toSuiAddress() === address;
```

**IOTA (via @iota/iota-sdk/verify):**
```typescript
// Currently trusts wallet signature (TBA verification)
const isValid = true; // TODO: implement proper verification
```

#### **Cookie-Based Session**

**Signature Cookies:**
```
Cookie: signature_address=0x123...
Cookie: signature=sig_base64...
Cookie: signature_message=message_text
Cookie: signature_chain=sui|iota
```

**Session Cookie:**
```
Cookie: sessionToken=uuid
```

#### **Payment Verification**

```typescript
// In /api/v1/key endpoint
const paymentInfo = await prisma.videoPaymentInfo.findFirst({
  where: {
    videoId,
    payerAddress: address,
    chain
  }
});

if (!paymentInfo?.paidSegmentIds.includes(segIdx)) {
  return NextResponse.json(
    { error: 'Payment required' },
    { status: 401 }
  );
}
```

---

## PART 5: DATABASE SCHEMA

### 5.1 Core Tables

#### **Video**
```prisma
model Video {
  id                   String
  title                String
  walrusMasterUri      String         // Master playlist URL
  masterBlobObjectId   String?        // Mainnet only
  masterEndEpoch       Int?           // Mainnet only
  posterWalrusUri      String?        // Poster image URL
  posterBlobObjectId   String?        // Mainnet only
  posterEndEpoch       Int?           // Mainnet only
  duration             Float?
  network              String         // "mainnet" | "testnet"
  createdAt            DateTime
  updatedAt            DateTime
  creatorId            String
  
  // Relations
  sessions             PlaybackSession[]
  renditions           VideoRendition[]
  creatorConfigs       CreatorConfig[]
  
  @@index([creatorId])
  @@index([masterBlobObjectId])
}
```

#### **VideoRendition**
```prisma
model VideoRendition {
  id                    String
  videoId               String
  name                  String         // "720p", "1080p", etc.
  walrusPlaylistUri     String         // Playlist URL
  playlistBlobObjectId  String?        // Mainnet only
  playlistEndEpoch      Int?           // Mainnet only
  resolution            String         // "1280x720"
  bitrate               Int            // bits per second
  
  // Relations
  video                 Video
  segments              VideoSegment[]
  
  @@unique([videoId, name])
  @@index([playlistBlobObjectId])
  @@map("video_renditions")
}
```

#### **VideoSegment** (ENCRYPTION KEY STORAGE)
```prisma
model VideoSegment {
  id             String
  renditionId    String
  segIdx         Int              // Segment index (0, 1, 2, ...)
  walrusUri      String           // Walrus blob URL
  blobObjectId   String?          // Mainnet only
  endEpoch       Int?             // Mainnet only
  
  iv             Bytes            // Plaintext IV (12 bytes)
  dekEnc         Bytes            // KMS-encrypted DEK (45 bytes)
  
  duration       Float            // Segment duration in seconds
  size           Int              // Segment size in bytes
  
  // Relations
  rendition      VideoRendition
  
  @@unique([renditionId, segIdx])
  @@index([renditionId])
  @@index([blobObjectId])
  @@map("video_segments")
}

// dekEnc Format:
// [1 byte version] [12 bytes IV] [32 bytes encrypted DEK+tag]
// Total: 45 bytes
```

#### **PlaybackSession** (EPHEMERAL)
```prisma
model PlaybackSession {
  id             String
  cookieValue    String    @unique  // Session token
  videoId        String
  
  clientPubKey   Bytes              // Client's X25519 public key (32 bytes)
  serverPubKey   Bytes              // Server's X25519 public key (32 bytes)
  serverNonce    Bytes              // HKDF salt (12 bytes)
  
  deviceHash     String?            // Device fingerprint hash
  expiresAt      DateTime           // Session expiration
  createdAt      DateTime
  lastActivity   DateTime
  
  // Relations
  video          Video
  
  @@index([cookieValue])
  @@index([expiresAt])
  @@index([videoId])
  @@map("playback_sessions")
}

// In-Memory Storage (NOT in database):
// sessionKeyStore[sessionId] = {
//   privateKeyJwk: X25519 private key (JWK format),
//   expiresAt: timestamp
// }
// TTL: 24 hours
```

#### **CreatorConfig** (PAYMENT)
```prisma
model CreatorConfig {
  id              String
  videoId         String
  objectId        String     // On-chain config object ID
  chain           String     // "sui" | "iota"
  coinType        String     // "0x2::sui::SUI" or IOTA equivalent
  pricePerView    String     // Raw price (in smallest unit)
  decimals        Int        // Coin decimals
  metadata        String?
  createdAt       DateTime
  
  // Relations
  video           Video
  
  @@unique([videoId, coinType])
  @@index([videoId])
  @@index([objectId])
  @@index([chain])
  @@map("creator_configs")
}
```

#### **VideoPaymentInfo** (PAYMENT VERIFICATION)
```prisma
model VideoPaymentInfo {
  id                  String
  videoId             String
  payerAddress        String     // Wallet address that paid
  chain               String     // "sui" | "iota"
  
  tunnelObjectId      String?    // On-chain tunnel object ID
  maxAllowedPayAmount String?    // Raw payment amount allowed
  currentPayAmount    String?    // Current accumulated payment
  authorizeSignature  String?    // Payment authorization
  
  paidSegmentIds      Int[]      // Array of segment indices paid for
  
  createdAt           DateTime
  updatedAt           DateTime
  
  @@index([videoId])
  @@map("video_payment_infos")
}
```

#### **PlaybackLog** (ANALYTICS)
```prisma
model PlaybackLog {
  id        String
  sessionId String
  videoId   String
  segIdx    Int
  rendition String      // Quality played
  timestamp DateTime
  ip        String?
  userAgent String?
  
  @@index([sessionId])
  @@index([timestamp])
  @@index([videoId])
  @@map("playback_logs")
}
```

#### **Asset** (UPLOAD STATE TRACKING)
```prisma
model Asset {
  id        String
  creatorId String
  title     String
  status    String      // "uploading" | "transcoding" | "storing" | "complete"
  createdAt DateTime
  updatedAt DateTime
  
  // Relations
  revisions AssetRevision[]
  
  @@index([createdAt])
  @@index([creatorId])
  @@index([status])
  @@map("assets")
}

model AssetRevision {
  id              String
  assetId         String
  manifestJson    Json            // Upload manifest
  walrusRootUri   String          // Root blob URI
  createdAt       DateTime
  
  // Relations
  asset           Asset
  
  @@index([assetId])
  @@map("asset_revisions")
}
```

### 5.2 Key Relationships

```
Video (1) ──── (∞) VideoRendition
  ├─ Each video has multiple quality renditions
  └─ Enables adaptive bitrate streaming

VideoRendition (1) ──── (∞) VideoSegment
  ├─ Each rendition has multiple segments (4 sec each)
  └─ Each segment encrypted independently

Video (1) ──── (∞) PlaybackSession
  ├─ Multiple concurrent playback sessions per video
  └─ Each session has unique ephemeral keys

Video (1) ──── (∞) CreatorConfig
  ├─ Multiple payment methods per video
  └─ Different coin types (SUI, IOTA, etc.)

Video (1) ──── (∞) VideoPaymentInfo
  ├─ Multiple users can pay for same video
  └─ Tracks payment per user:video:chain
```

---

## PART 6: CLIENT-SIDE VIDEO PLAYER

### 6.1 How Encrypted Videos Are Loaded

#### **Player Initialization**
```typescript
const { videoRef, isLoading, error } = useEncryptedVideo({
  videoId: 'video_123',
  videoUrl: 'https://walrus.../master.m3u8',
  network: 'mainnet',
  autoplay: true
});
```

#### **Step-by-Step Loading Process**

```
1. useEncryptedVideo Hook Initialized
   ├─ Create SessionManager instance
   ├─ Create DecryptionWorkerPool (4 workers)
   ├─ Create HLS.js instance with DecryptingLoader
   └─ Attach to <video> element

2. HLS.js Manifest Parsing
   ├─ Fetch master.m3u8 from Walrus
   ├─ Parse quality levels (1080p, 720p, 480p, 360p)
   ├─ Detect supported bandwidth
   └─ Start level auto-selection

3. Aggressive Key Prefetch (OPTIMIZATION)
   ├─ SessionManager.prefetchKeysAggressive()
   ├─ For each quality level:
   │  ├─ Prefetch segments 0-30 (1-2 minutes)
   │  └─ Batch fetch up to 20 keys per request
   ├─ Cache all keys in client memory
   └─ Eliminate key fetch latency during playback

4. First Segment Request
   ├─ HLS.js selects quality level
   ├─ HLS.js loads rendition playlist
   ├─ DecryptingLoader intercepts segment fetch
   ├─ DecryptingLoader requests key from /v1/key
   ├─ Client receives DEK + IV
   ├─ Web Worker decrypts segment
   └─ HLS.js feeds plaintext to video element

5. Playback Continuation
   ├─ HLS.js monitors buffer
   ├─ On segment request:
   │  ├─ Check keyCache for DEK
   │  ├─ If cached: decrypt immediately
   │  └─ If not cached: fetch + decrypt
   ├─ Adaptive bitrate switching:
   │  ├─ Load playlist for new quality
   │  ├─ Prefetch its keys in parallel
   │  └─ Continue playback smoothly
   └─ Repeat until video ends
```

### 6.2 HLS.js Player Integration

#### **DecryptingLoader Class**
```typescript
// lib/player/decryptingLoader.ts
export class DecryptingLoader {
  load(context: any, config: any, callbacks: any): void
    // Intercepts HLS.js segment requests
    // 1. Fetch encrypted segment from Walrus
    // 2. Request DEK from server
    // 3. Decrypt with Web Worker
    // 4. Pass plaintext to HLS.js via callbacks
}

// Custom HLS config
const hls = new Hls({
  loader: DecryptingLoaderClass,
  
  // Aggressive buffering
  maxBufferLength: 60,        // 60 seconds ahead
  maxMaxBufferLength: 120,    // Maximum 120 seconds
  backBufferLength: 90,       // Keep 90 seconds behind
  
  // Auto quality selection
  startLevel: -1,             // Auto
  autoStartLoad: true         // Load immediately
});
```

#### **Web Worker Decryption**
```typescript
// lib/player/workerPool.ts
class DecryptionWorkerPool {
  private workers: Worker[] = [];  // 4 workers by default
  private taskQueue: Task[] = [];
  
  decrypt(dek: Uint8Array, ciphertext: Uint8Array, iv: Uint8Array) {
    // Queue task
    // Assign to available worker
    // Return promise
    // Worker runs: aesGcmDecrypt(ciphertext, dek, iv)
    // Return decrypted plaintext
  }
}
```

#### **Memory Management**
```typescript
// Worker pool prevents main thread blocking
// Parallel decryption: 4 segments simultaneously
// Main thread handles:
//   - HLS manifest parsing
//   - Video playback
//   - DOM updates

// KeyCache prevents redundant decryption
// Same segment decoded once, reused if re-requested
// Cache size: ~100 keys (typical 2-3 minute buffer)
```

### 6.3 Custom Video Player Implementation

#### **EncryptedVideoPlayer Component**
```typescript
export function EncryptedVideoPlayer({
  videoId,
  videoUrl,
  title,
  autoplay,
  className
}: EncryptedVideoPlayerProps) {
  const {
    videoRef,
    isLoading,
    isPlaying,
    error,
    play,
    pause,
    seek,
    setVolume
  } = useEncryptedVideo({ videoId, videoUrl, autoplay });
  
  return (
    <div className={className}>
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      <video ref={videoRef} controls />
    </div>
  );
}
```

#### **HTML5 Video Element**
```html
<video ref={videoRef} controls>
  <!-- Subtitle tracks -->
  <track kind="subtitles" src="..." />
  
  <!-- Fallback for unsupported browsers -->
  Your browser does not support the video tag.
</video>

<!-- Controls handled by browser video player -->
- Play/Pause
- Volume control
- Seeking (with key prefetch)
- Fullscreen
- Speed control (if enabled)
```

### 6.4 useEncryptedVideo Hook

#### **Hook Features**
```typescript
export function useEncryptedVideo(options: UseEncryptedVideoOptions): UseEncryptedVideoReturn {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  
  // Effects
  useEffect(() => {
    // Initialize SessionManager + HLS.js
    // Setup event handlers
    // Prefetch keys
  }, [videoId]);
  
  // Returns
  return {
    videoRef,
    isLoading,
    isPlaying,
    error,
    session,
    play: async () => { videoRef.current.play() },
    pause: () => { videoRef.current.pause() },
    seek: (time) => { videoRef.current.currentTime = time },
    setVolume: (vol) => { videoRef.current.volume = vol },
    destroy: () => { /* cleanup */ },
    hlsInstance: hlsRef.current
  };
}
```

#### **Lifecycle**
1. Mount: Initialize session + HLS.js
2. Render: Display loading state
3. Manifest Parsed: Start aggressive key prefetch
4. Playing: Decrypt segments on demand from cache
5. Unmount: Cleanup HLS.js + session + workers

---

## PART 7: AUTHENTICATION & WALLET

### 7.1 Wallet Integration (Sui/IOTA)

#### **Sui Wallet (via @mysten/dapp-kit)**
```typescript
// useWalletAuth hook
const { currentAccount, signMessage, executeTransaction } = useWalletKit();

// Sign message for authentication
const signature = await signMessage({ message });

// Execute transaction for payment
const { transactionHash } = await executeTransaction({
  transaction: ptb,
  options: { showObjectChanges: true }
});
```

#### **IOTA Wallet (via @iota/dapp-kit)**
```typescript
// useCurrentWalletMultiChain hook
const { currentAccount, signPersonalMessage } = useCurrentWallet();

// Sign message for authentication
const signature = await signPersonalMessage({ message });

// Execute transaction for payment
const { digest } = await signAndExecuteTransaction({
  transaction: ptb
});
```

#### **Multi-Chain Support**
```typescript
// useMultiChainAuth hook
- Detects connected wallet (Sui or IOTA)
- Routes to chain-specific verification
- Stores chain in signature cookies
- Supports both chains simultaneously
```

### 7.2 User Authentication Flow

#### **Wallet Connection**
```
1. User clicks "Connect Wallet"
2. Frontend detects wallet (Sui Snap, IOTA Wallet)
3. User approves connection in wallet UI
4. Frontend receives wallet address
5. User is "authenticated"
```

#### **Signature Verification (For Payment)**
```
1. User initiates video payment
2. Frontend generates message: "Sign to authorize payment"
3. User signs message in wallet
4. Frontend sends signature to backend:
   POST /api/auth/verify-signature
   {
     address: "0x123...",
     signature: "sig_...",
     message: "Sign to authorize...",
     chain: "sui" | "iota"
   }

5. Backend verifies signature:
   - Sui: Use @mysten/sui/verify.verifySuiSignature
   - IOTA: Trust wallet (TBA proper verification)

6. Backend sets cookies:
   - signature_address
   - signature
   - signature_message
   - signature_chain

7. Cookies sent with all subsequent requests
8. Server checks cookies in /v1/key endpoint
```

### 7.3 Payment Verification

#### **Sui Payment Flow**
```
1. User clicks "Pay for Video"
2. Frontend calculates storage cost (WAL tokens)
3. Frontend creates PTB (Programmable Transaction Block):
   - Transfer WAL to delegator wallet
   - Delegate transaction authority to operator

4. User signs PTB in Sui Wallet
5. Transaction submitted to Sui blockchain
6. Frontend receives transactionHash

7. Frontend calls: POST /api/v1/payment/process-sui
   { videoId, transactionHash }

8. Backend:
   - Queries Sui blockchain for transaction
   - Verifies payment amount ≥ required
   - Creates VideoPaymentInfo record
   - Marks segments as "paid" for user

9. User can now request keys for video segments
```

#### **IOTA Payment Flow**
Similar to Sui, but uses IOTA wallet and blockchain

#### **Payment Verification in Key Retrieval**
```typescript
// In GET /api/v1/key endpoint
const paymentInfo = await prisma.videoPaymentInfo.findFirst({
  where: {
    videoId,
    payerAddress: address,     // From signature cookie
    chain                        // From signature cookie
  }
});

if (!paymentInfo) {
  // User hasn't paid for this video
  return { status: 401, error: 'Payment required' };
}

if (!paymentInfo.paidSegmentIds.includes(segIdx)) {
  // User paid but not for this segment
  return { status: 401, error: 'Segment not paid for' };
}

// User has paid for this segment - return DEK
return { dek: toBase64(dekBytes), iv: toBase64(iv) };
```

---

## PART 8: KEY FILES & DIRECTORIES MAP

### 8.1 Critical Encryption Files

```
lib/crypto/
├── primitives.ts (380 lines) ⭐⭐⭐
│   ├── generateX25519Keypair()          - Generate ephemeral keypairs
│   ├── deriveSharedSecret()             - ECDH key exchange
│   ├── hkdf()                           - HKDF key derivation
│   ├── aesGcmEncrypt()                  - AES-128-GCM encryption
│   ├── aesGcmDecrypt()                  - AES-128-GCM decryption
│   ├── wrapKey() / unwrapKey()          - Key wrapping with KEK
│   ├── randomBytes()                    - Secure random generation
│   └── generateAes128Key()              - Random DEK generation
│
├── client.ts (326 lines) ⭐⭐⭐
│   ├── initializeClientSession()        - Client-side keypair generation
│   ├── deriveClientKek()                - Client KEK derivation
│   ├── unwrapSegmentDek()               - Unwrap segment DEKs
│   ├── decryptSegment()                 - Decrypt segment
│   ├── getDeviceFingerprint()           - Device binding
│   └── KEK caching functions            - In-memory KEK cache
│
├── utils.ts (196 lines) ⭐⭐
│   ├── toBase64() / fromBase64()        - Base64 encoding
│   ├── toHex() / fromHex()              - Hex encoding
│   ├── stringToBytes()                  - String encoding
│   ├── constantTimeEqual()              - Timing-safe comparison
│   └── Encoding/decoding utilities
│
├── clientEncryption.ts (77 lines) ⭐
│   ├── generateDEK()                    - Random DEK for upload
│   ├── generateIV()                     - Random IV for upload
│   ├── encryptSegment()                 - Encrypt segment during upload
│   └── toBase64() / fromBase64()        - Upload-specific encoding
│
└── keyDerivation.ts (101 lines) ⭐⭐
    ├── deriveSessionKek()               - Server-side KEK derivation
    ├── deriveMasterKeyFromPassword()    - PBKDF2 (for testing)
    └── Key derivation utilities
```

### 8.2 Key Management Files

```
lib/kms/
├── masterKey.ts (94 lines) ⭐⭐⭐
│   ├── getMasterKey()                   - Load KMS_MASTER_KEY from env
│   ├── validateMasterKey()              - Startup validation
│   ├── generateMasterKey()              - Generate new master key
│   └── clearMasterKeyCache()            - Clear cached key
│
└── envelope.ts (192 lines) ⭐⭐⭐
    ├── encryptDek()                     - Encrypt DEK with master key
    ├── decryptDek()                     - Decrypt DEK with master key
    ├── storeSessionPrivateKey()         - Store ephemeral private key
    ├── loadSessionPrivateKey()          - Load ephemeral private key
    ├── deleteSessionPrivateKey()        - Delete ephemeral private key
    ├── cleanupExpiredSessionKeys()      - Cleanup expired keys
    └── getSessionKeyStoreStats()        - Monitoring
```

### 8.3 Player & Playback Files

```
lib/player/
├── useEncryptedVideo.ts (364 lines) ⭐⭐⭐
│   ├── useEncryptedVideo()              - Main React hook
│   ├── Session initialization
│   ├── HLS.js setup
│   ├── Aggressive key prefetch
│   └── Error handling
│
├── sessionManager.ts (417 lines) ⭐⭐⭐
│   ├── SessionManager class
│   ├── initialize()                     - Create playback session
│   ├── getSegmentKey()                  - Fetch segment DEK
│   ├── prefetchKeys()                   - Batch key prefetch
│   ├── prefetchKeysAggressive()         - Optimized prefetch
│   ├── refresh()                        - Extend session
│   ├── terminate()                      - End session
│   └── Auto-refresh timer
│
├── decryptingLoader.ts (320+ lines) ⭐⭐⭐
│   ├── DecryptingLoader class
│   ├── load()                           - Intercept segment fetch
│   ├── Decrypt segment with worker
│   ├── Retry logic
│   └── Playlist URL replacement (Walrus)
│
├── workerPool.ts (200 lines) ⭐⭐
│   ├── DecryptionWorkerPool class
│   ├── Worker thread management
│   ├── Task queue
│   ├── Parallel decryption (4 workers)
│   └── Performance stats
│
└── decryptionWorker.ts (50 lines) ⭐⭐
    └── Web Worker script for decryption
```

### 8.4 Storage & Upload Files

```
lib/
├── walrus.ts (424 lines) ⭐⭐⭐
│   ├── WalrusClient class
│   ├── uploadBlob()                     - Single blob upload
│   ├── uploadFile()                     - File from filesystem
│   ├── uploadAsset()                    - Batch QUILTS upload
│   ├── fetchBlob()                      - Download blob
│   └── getBlobUrl()                     - Generate Walrus URL
│
├── walrus-sdk.ts (280+ lines) ⭐⭐
│   ├── Walrus SDK wrapper
│   ├── Blob metadata queries
│   ├── Delete operations
│   ├── Extend operations
│   └── Mainnet support
│
├── client-walrus-sdk.ts (500+ lines) ⭐⭐
│   ├── Client-side Walrus SDK
│   ├── uploadToWalrus()                 - Direct blob upload
│   ├── uploadQuilt()                    - Batch QUILTS
│   └── Retry logic
│
└── upload/
    └── clientUploadOrchestrator.ts (400+ lines) ⭐⭐⭐
        ├── uploadVideoClientSide()
        ├── Phase 1: Transcode
        ├── Phase 2: Encrypt segments
        ├── Phase 3: Upload to Walrus
        └── Memory management
```

### 8.5 API Route Files

```
app/api/v1/
├── session/
│   ├── route.ts (240 lines) ⭐⭐⭐
│   │   ├── POST - Create session
│   │   ├── GET  - Get session info
│   │   └── DELETE - Terminate session
│   │
│   └── refresh/
│       └── route.ts ⭐⭐
│           └── POST - Refresh session
│
├── key/
│   ├── route.ts (391 lines) ⭐⭐⭐
│   │   ├── GET - Retrieve single segment DEK
│   │   └── Payment verification
│   │
│   └── batch/
│       └── route.ts ⭐⭐
│           └── POST - Retrieve multiple DEKs
│
├── register-video/
│   └── route.ts (250 lines) ⭐⭐⭐
│       └── POST - Register uploaded video + encrypt DEKs
│
├── videos/
│   ├── route.ts ⭐⭐
│   │   ├── GET  - List videos
│   │   └── POST - Create video
│   │
│   └── [id]/
│       ├── route.ts ⭐⭐
│       │   ├── GET    - Get video details
│       │   ├── DELETE - Delete video
│       │   └── PATCH  - Update video
│       │
│       ├── extend/ ⭐
│       │   ├── route.ts - Start extend
│       │   └── finalize/route.ts - Finalize extend
│       │
│       └── delete/ ⭐
│           ├── route.ts - Start delete
│           └── finalize/route.ts - Finalize delete
│
├── payment/
│   ├── process-sui/route.ts ⭐⭐
│   ├── process-iota/route.ts ⭐⭐
│   └── check/route.ts ⭐
│
├── estimate-cost/
│   └── route.ts ⭐
│       └── POST - Estimate Walrus storage cost
│
├── upload-blob/
│   └── route.ts ⭐
│       └── PUT - Server-side blob upload
│
├── coin-price/
│   └── [coinType]/route.ts ⭐
│       └── GET - Get coin price (Sui)
│
└── iota/
    ├── coin-price/[coinType]/route.ts ⭐
    └── coin-metadata/[coinType]/route.ts ⭐
```

### 8.6 Database & Prisma

```
prisma/
├── schema.prisma (166 lines) ⭐⭐⭐
│   ├── Video ⭐⭐⭐
│   ├── VideoRendition ⭐⭐⭐
│   ├── VideoSegment (DEK storage) ⭐⭐⭐
│   ├── PlaybackSession (ephemeral) ⭐⭐⭐
│   ├── CreatorConfig (payment) ⭐⭐
│   ├── VideoPaymentInfo ⭐⭐
│   ├── PlaybackLog (analytics)
│   ├── Asset (upload state)
│   └── AssetRevision
│
└── lib/db.ts (15 lines) ⭐
    └── prisma client instantiation
```

### 8.7 Type Definitions

```
lib/types.ts (165 lines) ⭐⭐
├── RenditionQuality type
├── RenditionConfig interface
├── TranscodeOptions interface
├── TranscodedSegment interface
├── TranscodedRendition interface
├── TranscodeResult interface
├── WalrusBlob interface
├── WalrusUploadResult interface
├── AssetManifest interface
└── RENDITION_CONFIGS constants
```

### 8.8 Authentication & Wallet Hooks

```
lib/hooks/
├── useWalletAuth.ts (400+ lines) ⭐⭐
│   ├── useWalletAuth()
│   ├── Sui wallet integration
│   └── Message signing
│
├── useMultiChainAuth.ts (200+ lines) ⭐⭐
│   ├── useMultiChainAuth()
│   ├── Support for Sui + IOTA
│   └── Chain detection
│
├── useCurrentWalletMultiChain.ts (100+ lines) ⭐
│   ├── Wallet state management
│   └── Multi-chain support
│
└── usePersonalDelegator.ts (300+ lines) ⭐⭐
    ├── Delegator wallet pattern
    ├── Gasless transactions
    └── PTB creation
```

### 8.9 Utility Files

```
lib/utils/
├── walPrice.ts - WAL to USD conversion
├── signer.ts - Transaction signing
└── Various utility functions

lib/blockberry/ - Analytics integration
lib/tunnel/ - Payment tunnel integration
lib/seguision/ - Price oracle integration
lib/transcode/ - Video transcoding
```

---

## SUMMARY TABLE: ENCRYPTION DEPENDENCIES

| Library | Version | Purpose | Usage |
|---------|---------|---------|-------|
| Web Crypto API | Native | AES-128-GCM, X25519, HKDF | All encryption/decryption |
| @mysten/sui.js | 0.54.1 | Sui blockchain integration | Wallet + payment verification |
| @mysten/dapp-kit | 0.19.6 | Sui wallet UI | Wallet connection |
| @iota/iota-sdk | 1.7.1 | IOTA blockchain integration | Wallet + payment (secondary) |
| @iota/dapp-kit | 0.7.0 | IOTA wallet UI | Wallet connection |
| @mysten/walrus | 0.8.1 | Walrus storage SDK | Blob management |
| hls.js | 1.6.13 | HLS video player | Video streaming |
| @ffmpeg/ffmpeg | 0.12.15 | WASM FFmpeg | Video transcoding |
| @prisma/client | 6.18.0 | Database ORM | Data persistence |

---

## INTEGRATION POINTS FOR NEW ENCRYPTION FEATURES

### 1. **Additional Encryption Algorithms**
Location: `lib/crypto/primitives.ts`
Add new functions:
- `aes256GcmEncrypt()` / `aes256GcmDecrypt()` - AES-256 (if needed)
- `chaCha20Poly1305Encrypt()` / `chaCha20Poly1305Decrypt()` - ChaCha20-Poly1305
- Integration point: Create wrapper functions, keep API consistent

### 2. **Key Rotation**
Location: `lib/kms/masterKey.ts` + `lib/kms/envelope.ts`
Add functions:
- `rotateMasterKey()` - Schedule key rotation
- `rekeyAllDeks()` - Re-encrypt all DEKs with new master key
- Versioning in envelope format (currently version 1)

### 3. **Hardware Security Module (HSM) Integration**
Location: `lib/kms/masterKey.ts`
Replace:
- `getMasterKey()` → Query AWS CloudHSM or similar
- `encryptDek()` / `decryptDek()` → Use HSM operations
- No code changes in consumer modules (abstraction layer)

### 4. **DRM (Digital Rights Management)**
Location: `lib/player/decryptingLoader.ts`
Add:
- Content ID protection headers
- License acquisition from DRM provider
- Integration with DASH-IF CPIX standard

### 5. **Server-Side Decryption Optimization**
Location: `app/api/v1/key/route.ts`
Optimize:
- Cache decrypted DEKs (with TTL)
- Pre-decrypt batch of segments
- Reduce KMS latency with caching

### 6. **Client-Side Key Derivation (E2EE)**
Location: `lib/crypto/client.ts`
Implement:
- User-controlled master key (not server-stored)
- Key derivation from user password
- Server never sees plaintext keys (only encrypted)

### 7. **Zero-Knowledge Proofs (ZKP) for Payments**
Location: `app/api/v1/key/route.ts`
Add:
- ZKP payment verification instead of explicit balance check
- Privacy-preserving payment verification

### 8. **Watermarking / Fingerprinting**
Location: `lib/player/decryptingLoader.ts` or custom filter
Add:
- Inject imperceptible watermark during decryption
- Track unauthorized distribution
- Frame-level fingerprinting for analytics

---

## SECURITY CONSIDERATIONS & RECOMMENDATIONS

### 1. **Master Key Management**
✅ Currently: Stored in KMS_MASTER_KEY environment variable
⚠️ Recommendation: 
- Migrate to AWS KMS / Azure Key Vault / GCP Cloud HSM
- Implement key rotation policy (annual minimum)
- Enable access logging and auditing

### 2. **Session Key Storage**
✅ Currently: In-memory Map with TTL
⚠️ Recommendation:
- Migrate to Redis with TTL for multi-server deployments
- Implement distributed session management
- Add session key serialization/encryption if persisting

### 3. **DEK Encryption**
✅ Currently: AES-128-GCM with master key
⚠️ Recommendation:
- Consider Key Derivation Function (KDF) per video instead of single master key
- Add HMAC-SHA256 for authentication layer (currently only GCM tag)
- Implement envelope encryption (wrap DEK with intermediate key)

### 4. **Signature Verification**
✅ Currently: Implemented for Sui, trusted for IOTA
⚠️ Recommendation:
- Implement proper signature verification for IOTA
- Add signature timestamp validation (prevent replay attacks)
- Implement nonce-based signature scheme

### 5. **Segment Access Control**
✅ Currently: Payment-based via paidSegmentIds array
⚠️ Recommendation:
- Implement time-based access expiration
- Add geographic restrictions (geo-blocking)
- Implement concurrent stream limits
- Add device binding beyond fingerprinting

### 6. **Transport Security**
✅ Currently: HTTPS + HttpOnly cookies
⚠️ Recommendation:
- Implement HSTS (HTTP Strict Transport Security)
- Add Certificate Pinning for critical API endpoints
- Implement TLS 1.3 minimum requirement
- Add X-Content-Type-Options, X-Frame-Options headers

### 7. **Cryptographic Agility**
⚠️ Current Risk: Hard-coded AES-128-GCM, no versioning
Recommendation:
- Add version byte to encrypted segments (currently in DEK envelope only)
- Implement algorithm negotiation
- Plan for post-quantum cryptography migration

---

END OF REPORT
