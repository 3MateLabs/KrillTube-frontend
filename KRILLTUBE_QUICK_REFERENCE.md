# KrillTube Architecture - Quick Reference Guide

## At a Glance

**KrillTube** is a decentralized video streaming platform with:
- Client-side AES-128-GCM encryption for video segments
- X25519 ECDH key exchange + HKDF for playback sessions
- Walrus blockchain storage integration
- Payment-gated access via Sui/IOTA wallets
- Multi-quality HLS streaming with adaptive bitrate

---

## Encryption Quick Facts

| Aspect | Technology | Details |
|--------|-----------|---------|
| **Upload Encryption** | AES-128-GCM | Each segment: unique random DEK + IV |
| **Playback Key Exchange** | X25519 ECDH | Ephemeral keypairs per session |
| **KEK Derivation** | HKDF-SHA256 | From ECDH shared secret + server nonce |
| **Master Key** | KMS_MASTER_KEY env | 256-bit key encrypts all DEKs at rest |
| **DEK Storage** | Database | Encrypted with master key (45 bytes: version+iv+ciphertext) |
| **Implementation** | Web Crypto API | Native browser crypto, no external libraries |

---

## Core Files (By Importance)

### Tier 1: Critical Encryption
```
lib/crypto/primitives.ts       - AES-GCM, X25519, HKDF, key wrapping
lib/kms/envelope.ts            - DEK encryption/decryption with master key
lib/kms/masterKey.ts           - Master key management
lib/player/sessionManager.ts    - Client playback session + KEK derivation
```

### Tier 2: Playback Integration
```
lib/player/useEncryptedVideo.ts    - React hook for encrypted playback
lib/player/decryptingLoader.ts     - HLS.js integration + decryption
lib/player/workerPool.ts           - Web Worker pool for parallel decryption
app/api/v1/key/route.ts            - Segment DEK retrieval API (with payment check)
```

### Tier 3: Upload & Storage
```
lib/upload/clientUploadOrchestrator.ts  - Full upload pipeline
lib/walrus.ts                           - Walrus storage client
app/api/v1/register-video/route.ts      - Video registration + DEK encryption
```

### Tier 4: Database & Auth
```
prisma/schema.prisma           - Data model (Video, VideoSegment, PlaybackSession)
app/api/v1/session/route.ts    - Playback session creation/management
lib/hooks/useWalletAuth.ts     - Wallet signature verification
```

---

## Data Flow: 5 Stages

### STAGE 1: Upload (Client-Side)
```
Video File
  ↓ (FFmpeg WASM Transcode)
HLS Segments (encrypted)
  ↓ (Encrypt each: AES-128-GCM)
Encrypted Segments + DEKs
  ↓ (Upload to Walrus via QUILTS)
Walrus Blob IDs + Patch IDs
  ↓ (POST /api/v1/register-video)
Database: Video + VideoSegment (encrypted DEKs)
```

**Key File:** `lib/upload/clientUploadOrchestrator.ts`
**Encryption:** `lib/crypto/clientEncryption.ts` (generateDEK, generateIV, encryptSegment)

### STAGE 2: Registration (Server-Side)
```
Client sends: { videoId, title, renditions: [segments with dek, iv] }
  ↓
Server:
  1. Decode base64 DEKs
  2. Encrypt with KMS master key (AES-128-GCM)
  3. Store in database: video_segments.dek_enc
  4. Create Video + VideoRendition + VideoSegment records
```

**Key File:** `app/api/v1/register-video/route.ts`
**Encryption:** `lib/kms/envelope.ts` (encryptDek)

### STAGE 3: Session Creation (Server → Client)
```
Client: POST /api/v1/session { videoId, clientPubKey }
  ↓
Server:
  1. Generate ephemeral X25519 keypair
  2. Generate 12-byte nonce
  3. Store session in DB + ephemeral private key in memory
  4. Return: serverPubKey (base64) + serverNonce (base64)
  ↓
Client:
  1. Receive serverPubKey + serverNonce
  2. ECDH: sharedSecret = X25519(clientPriv, serverPub)
  3. HKDF: KEK = HKDF-SHA256(sharedSecret, nonce, "session-kek-v1", 16 bytes)
  4. Cache KEK in memory
```

**Key Files:** 
- Server: `app/api/v1/session/route.ts`
- Client: `lib/player/sessionManager.ts` (deriveClientKek)
- Crypto: `lib/crypto/client.ts`

### STAGE 4: Key Retrieval (Server → Client)
```
Client: GET /api/v1/key?videoId=X&rendition=Y&segIdx=Z
  ↓
Server:
  1. Verify wallet signature from cookies
  2. Check VideoPaymentInfo (user paid for this segment)
  3. If not paid: return 401
  4. Fetch encrypted DEK from database (dek_enc)
  5. Decrypt DEK with KMS master key
  6. Return: { dek: base64, iv: base64 }
  ↓
Client:
  1. Receive plaintext DEK + IV
  2. Cache in keyCache map
  3. When segment arrives from Walrus:
     - Decrypt with AES-128-GCM(encrypted_segment, dek, iv)
     - Pass plaintext to HLS.js
```

**Key Files:**
- Server: `app/api/v1/key/route.ts`
- Client: `lib/player/decryptingLoader.ts` (DecryptingLoader.load)
- Decryption: `lib/player/workerPool.ts` (parallel in Web Workers)

### STAGE 5: Playback (Browser)
```
HLS.js requests segment from Walrus
  ↓ (DecryptingLoader intercepts)
Fetch encrypted segment
Fetch DEK from /api/v1/key
  ↓ (Web Worker)
Decrypt segment (AES-128-GCM)
  ↓
HLS.js feeds plaintext to <video>
  ↓
Browser video decoder plays
```

**Key File:** `lib/player/useEncryptedVideo.ts` (useEncryptedVideo hook)

---

## Key Storage Breakdown

### Master Key (KMS_MASTER_KEY)
```
Source: Environment variable
Size: 256 bits (32 bytes)
Format: Base64-encoded
Location: .env file
Usage: Encrypts/decrypts all segment DEKs
Caching: In-memory, cleared on startup
```

### Segment DEK (Encrypted)
```
Location: database.video_segments.dek_enc
Format: [version(1)] [iv(12)] [encrypted_dek(32)] = 45 bytes
Encryption: Master Key → AES-128-GCM
Decryption: Only when needed (/api/v1/key endpoint)
Plaintext DEK: Never stored, only encrypted
```

### Session Private Key (Ephemeral)
```
Location: In-memory sessionKeyStore (Node.js server)
Storage: Map<sessionId, { privateKeyJwk, expiresAt }>
TTL: 24 hours (configurable)
Purpose: Server-side ECDH key exchange (not used for encryption)
Cleanup: Auto-expire + manual on session delete
```

### Segment DEK Cache (Client)
```
Location: In-memory keyCache (browser)
Storage: Map<"720p:0", { dek: Uint8Array, iv: Uint8Array }>
TTL: Session lifetime (until page refresh)
Persistence: None (RAM only)
Purpose: Avoid re-fetching same DEK during playback
```

---

## Payment Flow Integration

```
User initiates playback
  ↓
Client creates playback session
  ↓
Client requests segment key
  ↓
Server verifies wallet signature from cookies
  ↓
Server checks VideoPaymentInfo table:
  - payerAddress == wallet address from cookie
  - paidSegmentIds includes requested segment
  ↓
If paid: Return DEK
If not paid: Return 401 "Payment required"
  ↓
Client pays via Sui/IOTA wallet
  ↓
Payment transaction recorded in VideoPaymentInfo
  ↓
User can now request keys for paid segments
```

**Key API:** `GET /api/v1/key` (includes payment verification)

---

## Optimization Techniques

### 1. Aggressive Key Prefetch
```
On manifest parsed:
- Prefetch keys for current quality + next 30 segments
- Prefetch keys for other qualities + next 15 segments
- Batch fetch up to 20 keys per request
Result: Zero key latency during playback
```

**Implementation:** `lib/player/sessionManager.ts` (prefetchKeysAggressive)

### 2. Web Worker Pool
```
4 parallel Web Workers for decryption
- Main thread: HLS parsing, video control
- Workers: Decrypt segments in parallel
- Task queue: Assign segments to available worker
Result: CPU-intensive decryption doesn't block playback
```

**Implementation:** `lib/player/workerPool.ts`

### 3. Batch Key Retrieval
```
POST /api/v1/key/batch instead of GET /api/v1/key
- Fetch up to 20 keys in single request
- Parallel KMS decryption on server
- Reduce HTTP roundtrips
```

**Implementation:** `app/api/v1/key/batch/route.ts`

---

## API Endpoints Summary

### Encryption-Related

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/v1/session` | POST | Create playback session | None |
| `/v1/session` | GET | Get session info | Cookie: sessionToken |
| `/v1/session` | DELETE | Terminate session | Cookie: sessionToken |
| `/v1/key` | GET | Fetch segment DEK | Cookie: signature_*, Payment |
| `/v1/key/batch` | POST | Fetch multiple DEKs | Cookie: signature_*, Payment |
| `/v1/register-video` | POST | Register video (encrypt DEKs) | None (server-only) |

---

## Database Schema (Critical Tables)

```prisma
// Encryption at rest
model VideoSegment {
  iv: Bytes          // Plaintext IV (12 bytes)
  dekEnc: Bytes      // KMS-encrypted DEK (45 bytes)
}

// Session management
model PlaybackSession {
  clientPubKey: Bytes    // Client's X25519 public key (32 bytes)
  serverPubKey: Bytes    // Server's X25519 public key (32 bytes)
  serverNonce: Bytes     // HKDF salt (12 bytes)
}

// Payment verification
model VideoPaymentInfo {
  payerAddress: String   // User's wallet address
  chain: String          // "sui" | "iota"
  paidSegmentIds: Int[]  // Array of segment indices paid for
}
```

---

## Environment Variables (Critical)

```bash
# ENCRYPTION (REQUIRED - NEVER COMMIT)
KMS_MASTER_KEY="base64_32_bytes_here"

# WALRUS STORAGE
NEXT_PUBLIC_WALRUS_NETWORK=testnet|mainnet
NEXT_PUBLIC_WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_EPOCHS=1|200

# DATABASE
DATABASE_URL=postgresql://...

# WALLET INTEGRATION
NEXT_PUBLIC_SUI_NETWORK=testnet|mainnet
NEXT_PUBLIC_IOTA_NETWORK=mainnet|testnet
```

---

## Testing Encryption Locally

```bash
# Test crypto primitives
npm run test:crypto

# Test full integration
npm run test:integration

# Development server
npm run dev

# Build
npm run build
```

---

## Deployment Checklist

- [ ] Generate new KMS_MASTER_KEY: `openssl rand -base64 32`
- [ ] Store KMS_MASTER_KEY in secure environment (not git)
- [ ] Verify DATABASE_URL points to correct PostgreSQL
- [ ] Set NEXT_PUBLIC_WALRUS_NETWORK to "mainnet"
- [ ] Configure NEXT_PUBLIC_WALRUS_EPOCHS (200 recommended)
- [ ] Enable HSTS + TLS 1.3
- [ ] Set up Redis for sessionKeyStore (optional, for multi-server)
- [ ] Configure logging/monitoring
- [ ] Test payment verification
- [ ] Load test decryption (Web Workers)

---

## Common Integration Points

### Add New Encryption Algorithm
1. Add function to `lib/crypto/primitives.ts`
2. Update `lib/kms/envelope.ts` version byte
3. Update `lib/crypto/client.ts` for playback
4. Update DEK storage format (add version check)

### Add Hardware Security Module (HSM)
1. Replace `getMasterKey()` in `lib/kms/masterKey.ts`
2. Update `encryptDek()` / `decryptDek()` in `lib/kms/envelope.ts`
3. No changes needed in consuming code (abstraction layer)

### Add DRM Support
1. Extend `lib/player/decryptingLoader.ts`
2. Add license acquisition before key retrieval
3. Integrate with DRM provider SDK

### Add Zero-Knowledge Proofs
1. Replace payment verification in `/api/v1/key`
2. Implement ZKP validation instead of explicit balance check
3. Maintain privacy of payment history

---

## Performance Metrics

| Operation | Duration | Location |
|-----------|----------|----------|
| ECDH Key Exchange | ~5ms | Client + Server |
| HKDF Key Derivation | ~2ms | Client |
| AES-128-GCM Encrypt | ~10-50ms | Client (FFmpeg segments) |
| AES-128-GCM Decrypt (4sec segment) | ~30-100ms | Web Worker |
| KMS Decrypt (DEK) | ~50-200ms | Server |
| Key Prefetch (30 segments) | ~500-1000ms | Client |

---

## Security Considerations

✅ **Implemented:**
- HTTPS + TLS 1.3 only
- HttpOnly secure cookies
- AES-128-GCM authenticated encryption
- ECDH ephemeral keypairs
- Payment verification before key release
- Master key in secure environment

⚠️ **To Improve:**
- Migrate master key to AWS KMS / Azure Key Vault
- Implement proper IOTA signature verification
- Add HMAC for additional auth layer
- Implement key rotation policy
- Add device binding (currently fingerprinting only)
- Geographic restrictions / concurrent stream limits

---

**Full Documentation:** See `KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md` (2100+ lines)
**Generated:** 2024-11-19
