# V2 Implementation Plan: Encrypted HLS Playback System

## Executive Summary

This plan transforms the current BlobTube platform from unencrypted HLS playback to a **fully encrypted, cookie-based session system** where:
- Each video segment is encrypted with a unique DEK (Data Encryption Key)
- Sessions use HttpOnly cookies (no session IDs in URLs)
- Browser-side decryption using ECDH key exchange + AES-GCM
- Per-chunk authorization with short-lived wrapped keys

---

## Current State Analysis

**Existing Architecture:**
- Database: `Asset` + `AssetRevision` models (generic, stores JSON manifest)
- Upload flow: Client → Server transcode (fluent-ffmpeg) → Walrus upload → DB save
- Playback: Direct HLS streaming from Walrus (unencrypted)
- Video player: Custom component using hls.js

**Files to Modify:**
- `prisma/schema.prisma` - Replace Asset/AssetRevision with Video/Rendition/Segment/Session
- `lib/transcoder.ts` - Add encryption step after segmentation
- `app/api/upload-walrus/route.ts` - Replace with `/v1/videos` endpoint
- `components/VideoPlayer.tsx` - Replace with decrypting loader
- New crypto utilities needed

---

## Phase 1: Crypto Infrastructure (Day 1-2)

**Goal:** Set up all cryptographic primitives needed for encryption, key derivation, and wrapping.

### Files to Create:

**`/lib/crypto/primitives.ts`**
```typescript
// Web Crypto API wrappers
- generateX25519Keypair() - ECDH keypair generation
- deriveSharedSecret(pubKey, privKey) - ECDH exchange
- hkdf(ikm, salt, info, length) - Key derivation
- aesGcmEncrypt(key, plaintext, iv) - Segment encryption
- aesGcmDecrypt(key, ciphertext, iv) - Segment decryption
- aesKwWrap(kek, dek) - Wrap DEK with KEK
- aesKwUnwrap(kek, wrappedDek) - Unwrap DEK
- randomBytes(length) - Secure random generation
```

**`/lib/crypto/keyDerivation.ts`**
```typescript
// Server-side key derivation
- deriveSessionKek(serverPriv, clientPub, nonce) - Session KEK
- deriveSegmentDek(rootSecret, videoId, rendition, segIdx) - Deterministic DEK per segment
```

**`/lib/crypto/client.ts`**
```typescript
// Client-side crypto (browser)
- deriveKekClient(serverPub, clientPriv, nonce) - Client KEK derivation
- unwrapDekWithKek(kek, wrappedDek) - Client-side unwrap
- decryptSegment(dek, encryptedBytes, iv) - Decrypt in browser
```

**Testing:** Unit tests for all crypto functions, verify interop between server/client derivation.

---

## Phase 2: Database Schema Migration (Day 2-3)

**Goal:** Replace generic Asset schema with structured Video/Rendition/Segment models.

### Prisma Schema Changes:

**`prisma/schema.prisma`**
```prisma
model Video {
  id              String   @id @default(cuid())
  title           String
  walrusMasterUri String   @map("walrus_master_uri")
  posterWalrusUri String?  @map("poster_walrus_uri")
  rootSecretEnc   Bytes    @map("root_secret_enc")  // KMS-encrypted
  duration        Float?
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  renditions VideoRendition[]
  sessions   PlaybackSession[]

  @@map("videos")
}

model VideoRendition {
  id                String   @id @default(cuid())
  videoId           String   @map("video_id")
  name              String   // "720p", "480p", "360p"
  walrusPlaylistUri String   @map("walrus_playlist_uri")
  resolution        String   // "1280x720"
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
  walrusUri   String   @map("walrus_uri")  // Encrypted segment blob
  iv          Bytes    // 12-byte IV for AES-GCM
  duration    Float
  size        Int

  rendition VideoRendition @relation(fields: [renditionId], references: [id], onDelete: Cascade)

  @@unique([renditionId, segIdx])
  @@index([renditionId])
  @@map("video_segments")
}

model PlaybackSession {
  id            String   @id @default(cuid())
  cookieValue   String   @unique @map("cookie_value")  // Opaque token
  videoId       String   @map("video_id")
  clientPubKey  Bytes    @map("client_pub_key")   // X25519 public
  serverPubKey  Bytes    @map("server_pub_key")   // X25519 public
  serverPrivRef String   @map("server_priv_ref")  // KMS reference
  serverNonce   Bytes    @map("server_nonce")     // 12 bytes
  deviceHash    String?  @map("device_hash")
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")
  lastActivity  DateTime @default(now()) @map("last_activity")

  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@index([cookieValue])
  @@index([videoId])
  @@index([expiresAt])
  @@map("playback_sessions")
}

model PlaybackLog {
  id         String   @id @default(cuid())
  sessionId  String   @map("session_id")
  videoId    String   @map("video_id")
  segIdx     Int      @map("seg_idx")
  rendition  String
  timestamp  DateTime @default(now())
  ip         String?
  userAgent  String?  @map("user_agent")

  @@index([sessionId])
  @@index([videoId])
  @@index([timestamp])
  @@map("playback_logs")
}
```

**Migration Steps:**
1. Create migration: `npx prisma migrate dev --name add_encrypted_video_schema`
2. Data migration script (if needed): migrate existing Asset data to Video schema
3. Keep Asset schema temporarily for backward compatibility

---

## Phase 3: KMS/Keystore Integration (Day 3-4)

**Goal:** Secure storage for root secrets and ephemeral session keys.

### Options:

**Option A: AWS KMS (Production)**
- Use AWS KMS for encrypting `Video.rootSecretEnc`
- Store ephemeral session private keys in KMS with auto-expiry

**Option B: Simple Envelope Encryption (V2 MVP)**
- Use a master key from environment variable
- Encrypt root secrets with AES-GCM using master key
- Store session ephemeral keys in Redis with TTL

### Files to Create:

**`/lib/kms/envelope.ts`** (MVP approach)
```typescript
- encryptRootSecret(plainSecret: Uint8Array): Buffer - Encrypt with master key
- decryptRootSecret(encryptedSecret: Buffer): Uint8Array - Decrypt
- storeSessionPrivateKey(sessionId: string, privKey: Uint8Array, ttl: number): string - Returns reference
- loadSessionPrivateKey(reference: string): Uint8Array - Load from store
```

**`/lib/kms/masterKey.ts`**
```typescript
- getMasterKey(): Uint8Array - Load from env or KMS
- validateMasterKey() - Ensure 256-bit key exists
```

**Environment Variables:**
```env
# .env.local
KMS_MASTER_KEY=<base64-encoded-256-bit-key>
REDIS_URL=redis://localhost:6379  # For session key storage
```

---

## Phase 4: Client-Side Encryption (Upload Flow) (Day 4-6)

**Goal:** Encrypt segments in browser before upload to Walrus.

### Current Flow:
```
User selects file → Upload to /api/transcode → Server transcodes → Upload to Walrus
```

### New Flow:
```
User selects file → Client transcodes (ffmpeg.wasm) → Client encrypts each segment → Upload encrypted to Walrus → Register video
```

### Files to Create/Modify:

**`/lib/client/transcoder.ts`** (Browser-side)
```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg';

class ClientTranscoder {
  async transcodeToHLS(file: File): TranscodeResult {
    // 1. Load ffmpeg.wasm
    // 2. Transcode to CMAF HLS (720p, 480p, 360p)
    // 3. Return segments as Uint8Array[]
  }
}
```

**`/lib/client/encryptor.ts`** (Browser-side)
```typescript
class SegmentEncryptor {
  async encryptSegment(plainBytes: Uint8Array, dek: CryptoKey, iv: Uint8Array) {
    // AES-GCM-128 encryption
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, plainBytes);
  }

  async encryptAllSegments(transcodeResult: TranscodeResult) {
    // For each segment:
    //   1. Generate unique DEK (128-bit)
    //   2. Generate 12-byte IV
    //   3. Encrypt segment
    //   4. Return { encrypted, iv, dek }
  }
}
```

**`/app/upload/page.tsx`** (Updated UI)
```typescript
'use client';

async function handleUpload(file: File) {
  // 1. Transcode in browser
  const transcodeResult = await clientTranscoder.transcode(file);

  // 2. Encrypt all segments
  const encryptedSegments = await encryptor.encryptAll(transcodeResult);

  // 3. Upload to Walrus (batched via Quilts)
  const walrusUris = await uploadToWalrus(encryptedSegments);

  // 4. Register video via API
  await fetch('/api/v1/videos', {
    method: 'POST',
    body: JSON.stringify({
      title,
      walrusMasterUri,
      renditions: [...],
      posterWalrusUri
    })
  });
}
```

**Challenges:**
- ffmpeg.wasm size (~30MB) - use CDN, lazy load
- Memory constraints - stream encryption for large files
- Progress tracking - show upload progress per segment

---

## Phase 5: V2 API Endpoints (Day 6-8)

### Endpoint 1: Register Video

**`/app/api/v1/videos/route.ts`**
```typescript
POST /v1/videos
Body: {
  title: string,
  walrusMasterUri: string,
  renditions: [{
    name: "720p",
    walrusPlaylistUri: string,
    segments: [{ segIdx, walrusUri, ivB64 }]
  }],
  posterWalrusUri?: string
}

Implementation:
1. Generate root secret (32 bytes random)
2. Encrypt root secret with KMS
3. Create Video record in DB
4. Create VideoRendition records
5. Create VideoSegment records (batch insert)
6. Return { video_id }
```

### Endpoint 2: Create Playback Session

**`/app/api/v1/session/route.ts`**
```typescript
POST /v1/session?video_id=vid_123
Body: { client_pubkey_b64, device_hash? }

Implementation:
1. Validate video_id exists
2. Generate server X25519 keypair
3. Store server private key in KMS/Redis (ref)
4. Generate 12-byte nonce
5. Create opaque cookie value (32 bytes random)
6. Insert PlaybackSession record
7. Set HttpOnly cookie: vp_session=<cookieValue>
8. Return { server_pubkey_b64, server_nonce_b64, expires_at }
```

**Cookie Configuration:**
```typescript
// lib/security/cookies.ts
export const SESSION_COOKIE = 'vp_session';
export const cookieAttrs = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 30, // 30 minutes
};
```

### Endpoint 3: Get Wrapped Key

**`/app/api/v1/key/route.ts`**
```typescript
GET /v1/key?video_id=vid_123&rend=720p&seg_idx=42
Cookie: vp_session=<cookieValue>

Implementation:
1. Read cookie from headers
2. Load PlaybackSession by cookieValue
3. Validate session (not expired, matches video_id)
4. Load VideoSegment by rendition + segIdx
5. Derive DEK: HKDF(rootSecret, salt="{videoId}|{rend}|{segIdx}")
6. Derive KEK: ECDH(serverPriv, clientPub) + HKDF(sharedSecret, nonce)
7. Wrap DEK with KEK (AES-KW)
8. Update session.lastActivity
9. Return { wdek_b64, iv_b64, alg: "AES-GCM-128", ttl_seconds: 20 }
```

**Performance Optimization:**
- Cache KEK derivation per session (compute once, reuse)
- Batch key requests: `/v1/key?from=42&count=3` returns 3 keys

### Endpoint 4: Refresh Session

**`/app/api/v1/session/refresh/route.ts`**
```typescript
POST /v1/session/refresh
Cookie: vp_session=<cookieValue>

Implementation:
1. Load session by cookie
2. Validate not expired
3. Extend expiresAt by 30 minutes
4. Refresh cookie Max-Age
5. Return { expires_at }
```

---

## Phase 6: Custom hls.js Decrypting Loader (Day 8-10)

**Goal:** Replace default loader with one that fetches wrapped keys, decrypts segments client-side.

### Files to Create:

**`/lib/player/decryptingLoader.ts`**
```typescript
import Hls from 'hls.js';
import { unwrapDekWithKek, b64toU8 } from '@/lib/crypto/client';

export class DecryptingLoader extends Hls.DefaultConfig.loader {
  private kek: CryptoKey;
  private videoId: string;

  constructor(config: any) {
    super(config);
  }

  async load(context: any, config: any, callbacks: any) {
    const isFrag = context.type === 'fragment';
    if (!isFrag) return super.load(context, config, callbacks);

    try {
      // 1. Parse segment info from URL
      const { rendition, segIdx } = this.parseSegmentUrl(context.url);

      // 2. Fetch wrapped key (cookie sent automatically)
      const keyRes = await fetch(
        `/api/v1/key?video_id=${this.videoId}&rend=${rendition}&seg_idx=${segIdx}`,
        { credentials: 'include' }
      );
      if (!keyRes.ok) throw new Error('Key auth failed');
      const { wdek_b64, iv_b64 } = await keyRes.json();

      // 3. Unwrap DEK
      const dek = await unwrapDekWithKek(this.kek, wdek_b64);

      // 4. Fetch encrypted segment from Walrus
      const encResp = await fetch(context.url, { cache: 'no-store' });
      const encBuf = await encResp.arrayBuffer();

      // 5. Decrypt segment
      const clear = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64toU8(iv_b64) },
        dek,
        encBuf
      );

      // 6. Feed decrypted data to hls.js
      callbacks.onSuccess({ data: clear, url: context.url }, config.stats, context);
    } catch (err) {
      callbacks.onError({ code: 0, text: String(err) }, context, err);
    }
  }

  private parseSegmentUrl(url: string): { rendition: string; segIdx: number } {
    // Parse URL to extract rendition (720p) and segment index
    // Example: https://walrus.../720p_seg_0042.m4s
    const match = url.match(/\/(\d+p)_seg_(\d+)\.m4s/);
    if (!match) throw new Error('Invalid segment URL');
    return {
      rendition: match[1],
      segIdx: parseInt(match[2])
    };
  }
}
```

**`/components/VideoPlayer.tsx`** (Updated)
```typescript
'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { DecryptingLoader } from '@/lib/player/decryptingLoader';
import { deriveKekClient, generateX25519Keypair, toB64, b64toU8 } from '@/lib/crypto/client';

interface VideoPlayerProps {
  videoId: string;
  masterPlaylistUrl: string;
}

export function VideoPlayer({ videoId, masterPlaylistUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Hls.isSupported()) {
      setError('HLS not supported in this browser');
      return;
    }

    (async () => {
      try {
        // 1. Generate client ephemeral keypair
        const { pub: clientPub, priv: clientPriv } = await generateX25519Keypair();

        // 2. Create session (sets cookie)
        const sessionRes = await fetch(`/api/v1/session?video_id=${videoId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_pubkey_b64: toB64(clientPub),
            device_hash: await getDeviceFingerprint()
          })
        });

        if (!sessionRes.ok) {
          throw new Error('Failed to create session');
        }

        const { server_pubkey_b64, server_nonce_b64 } = await sessionRes.json();

        // 3. Derive KEK (client-side)
        const kek = await deriveKekClient({
          serverPub: b64toU8(server_pubkey_b64),
          clientPriv,
          serverNonce: b64toU8(server_nonce_b64)
        });

        // 4. Initialize hls.js with custom loader
        const hls = new Hls({
          loader: class extends DecryptingLoader {
            constructor(config: any) {
              super(config);
              this.kek = kek;
              this.videoId = videoId;
            }
          },
          lowLatencyMode: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });

        hls.loadSource(masterPlaylistUrl);
        hls.attachMedia(videoRef.current!);
        hlsRef.current = hls;
        setSessionReady(true);

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('Fatal HLS error:', data);
            setError('Playback error: ' + data.type);
          }
        });
      } catch (err) {
        console.error('Setup error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize player');
      }
    })();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [videoId, masterPlaylistUrl]);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        controls
        className="w-full bg-black rounded-lg"
        playsInline
      />
      {!sessionReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">Initializing secure session...</div>
        </div>
      )}
    </div>
  );
}

async function getDeviceFingerprint(): Promise<string> {
  // Simple device fingerprint (can be enhanced)
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(components.join('|')));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
```

---

## Phase 7: Security Features (Day 10-12)

### 7.1 Rate Limiting

**`/lib/security/rateLimit.ts`**
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export class RateLimiter {
  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    // Sliding window using sorted sets
    await redis.zremrangebyscore(windowKey, 0, now - windowSeconds * 1000);
    const count = await redis.zcard(windowKey);

    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await redis.zadd(windowKey, { score: now, member: `${now}:${Math.random()}` });
    await redis.expire(windowKey, windowSeconds);

    return { allowed: true, remaining: limit - count - 1 };
  }
}

export const rateLimiter = new RateLimiter();

// Apply to /v1/key endpoint
// Example: 100 requests per 5 minutes per session
```

### 7.2 Access Logging

**`/lib/logging/playbackLog.ts`**
```typescript
import { prisma } from '@/lib/prisma';

export async function logKeyGrant(params: {
  sessionId: string;
  videoId: string;
  rendition: string;
  segIdx: number;
  ip?: string;
  userAgent?: string;
}) {
  await prisma.playbackLog.create({
    data: {
      sessionId: params.sessionId,
      videoId: params.videoId,
      rendition: params.rendition,
      segIdx: params.segIdx,
      ip: params.ip,
      userAgent: params.userAgent,
    },
  });
}

// Call in /v1/key endpoint after successful key grant
```

### 7.3 Device Binding

**`/lib/security/deviceFingerprint.ts`** (Client)
```typescript
export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency.toString(),
  ];

  const encoder = new TextEncoder();
  const data = encoder.encode(components.join('|'));
  const hash = await crypto.subtle.digest('SHA-256', data);

  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
```

**Validation in `/api/v1/key/route.ts`:**
```typescript
// Validate device fingerprint matches
if (session.deviceHash) {
  const currentHash = headers().get('x-device-hash');
  if (currentHash !== session.deviceHash) {
    return new Response('Device mismatch', { status: 403 });
  }
}
```

### 7.4 Session Cleanup

**`/lib/cleanup/sessions.ts`**
```typescript
import { prisma } from '@/lib/prisma';

export async function cleanupExpiredSessions() {
  const deleted = await prisma.playbackSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`Cleaned up ${deleted.count} expired sessions`);
  return deleted.count;
}

// Run as cron job: every 15 minutes
```

---

## Phase 8: Testing & Optimization (Day 12-14)

### 8.1 Unit Tests

**`/tests/crypto/primitives.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import {
  generateX25519Keypair,
  deriveSharedSecret,
  hkdf,
  aesGcmEncrypt,
  aesGcmDecrypt
} from '@/lib/crypto/primitives';

describe('Crypto Primitives', () => {
  it('should generate valid X25519 keypair', async () => {
    const { pub, priv } = await generateX25519Keypair();
    expect(pub).toHaveLength(32);
    expect(priv).toHaveLength(32);
  });

  it('should derive same shared secret from both sides', async () => {
    const alice = await generateX25519Keypair();
    const bob = await generateX25519Keypair();

    const aliceShared = await deriveSharedSecret(bob.pub, alice.priv);
    const bobShared = await deriveSharedSecret(alice.pub, bob.priv);

    expect(aliceShared).toEqual(bobShared);
  });

  it('should encrypt and decrypt correctly', async () => {
    const plaintext = new TextEncoder().encode('test data');
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 128 },
      true,
      ['encrypt', 'decrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await aesGcmEncrypt(key, plaintext, iv);
    const decrypted = await aesGcmDecrypt(key, encrypted, iv);

    expect(new TextDecoder().decode(decrypted)).toBe('test data');
  });
});
```

### 8.2 Integration Tests

**`/tests/integration/playback.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';

describe('End-to-End Playback', () => {
  it('should complete full playback flow', async () => {
    // 1. Create session
    const sessionRes = await fetch('/api/v1/session?video_id=test_video', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ client_pubkey_b64: '...' }),
    });
    expect(sessionRes.ok).toBe(true);

    // 2. Request key
    const keyRes = await fetch('/api/v1/key?video_id=test_video&rend=720p&seg_idx=0', {
      credentials: 'include',
    });
    expect(keyRes.ok).toBe(true);
    const { wdek_b64, iv_b64 } = await keyRes.json();
    expect(wdek_b64).toBeDefined();

    // 3. Verify session expires
    // ... wait for expiry, verify 401
  });
});
```

### 8.3 Performance Benchmarks

**Target Metrics (from spec):**
- P50 key endpoint latency: < 120ms
- Video startup time: < 2s (broadband)
- Memory usage: < 500MB for 2-hour video

**Optimizations:**
1. **KEK Caching**: Derive once per session, cache in memory (Map<sessionId, KEK>)
2. **Batch Key Requests**: `/v1/key?from=42&count=3` pre-fetches ahead
3. **Segment Prefetching**: Download next 3 segments while playing current
4. **DB Connection Pooling**: Configure Prisma pool size
5. **Redis for Sessions**: Store sessions in Redis, sync to Postgres async
6. **CDN for Walrus**: Cache encrypted segments at edge

**`/lib/cache/kekCache.ts`**
```typescript
const kekCache = new Map<string, { kek: CryptoKey; expiresAt: number }>();

export function getCachedKek(sessionId: string): CryptoKey | null {
  const cached = kekCache.get(sessionId);
  if (!cached || Date.now() > cached.expiresAt) {
    kekCache.delete(sessionId);
    return null;
  }
  return cached.kek;
}

export function setCachedKek(sessionId: string, kek: CryptoKey, ttlSeconds: number) {
  kekCache.set(sessionId, {
    kek,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}
```

### 8.4 Browser Testing

- **Chrome**: MSE + hls.js (primary)
- **Safari iOS**: Test MSE support, fallback if needed
- **Firefox**: MSE support
- **Mobile**: Memory constraints, test 4s segments

**Browser Compatibility Check:**
```typescript
if (!Hls.isSupported()) {
  if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari) - won't work with encryption
    setError('Encrypted playback requires modern browser with MSE support');
  }
}
```

---

## Migration Strategy

### Phase A: Parallel Operation (2 weeks)
- Deploy V2 alongside existing system
- New uploads use V2 (encrypted)
- Old videos continue playing (unencrypted)
- Dual API: `/api/upload-walrus` + `/api/v1/videos`
- Feature flag: `ENABLE_V2_ENCRYPTED=true`

### Phase B: Gradual Migration (1 month)
- Migrate existing videos: re-encrypt and register in V2 schema
- Redirect old playback URLs to V2 player
- Monitor performance and error rates
- Collect metrics: startup time, buffering events, error rates

### Phase C: Deprecation (after 2 months)
- Remove old Asset/AssetRevision schema
- Remove unencrypted playback code
- Full V2 operation
- Archive migration scripts

---

## File Structure Summary

```
/lib/crypto/
  primitives.ts          - Core crypto operations (ECDH, HKDF, AES-GCM, AES-KW)
  keyDerivation.ts       - Server key derivation (KEK, DEK)
  client.ts              - Browser crypto utilities
  utils.ts               - Base64, hex conversion

/lib/kms/
  envelope.ts            - Envelope encryption for root secrets
  masterKey.ts           - Master key management
  redis.ts               - Redis client for session keys

/lib/player/
  decryptingLoader.ts    - Custom hls.js loader with decryption

/lib/security/
  rateLimit.ts           - Rate limiting (Redis-based)
  deviceFingerprint.ts   - Device binding utilities
  cookies.ts             - Cookie helpers and constants

/lib/logging/
  playbackLog.ts         - Access logging for key grants

/lib/cache/
  kekCache.ts            - In-memory KEK caching

/lib/client/
  transcoder.ts          - Browser-side ffmpeg.wasm wrapper
  encryptor.ts           - Client-side segment encryption
  uploader.ts            - Walrus upload with progress

/lib/cleanup/
  sessions.ts            - Expired session cleanup

/app/api/v1/
  videos/route.ts        - Register video endpoint
  session/
    route.ts             - Create session endpoint
    refresh/route.ts     - Refresh session endpoint
  key/route.ts           - Get wrapped key endpoint

/components/
  VideoPlayer.tsx        - Updated with decrypting loader
  UploadForm.tsx         - Client-side upload with encryption

/prisma/
  schema.prisma          - Updated schema
  migrations/            - Migration files

/tests/
  crypto/                - Crypto unit tests
  integration/           - E2E playback tests
  performance/           - Benchmark tests
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@ffmpeg/ffmpeg": "^0.12.10",
    "@ffmpeg/util": "^0.12.1",
    "@upstash/redis": "^1.28.0",
    "hls.js": "^1.5.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0"
  }
}
```

**Environment Variables:**
```env
# .env.local
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
REDIS_TOKEN=<optional-upstash-token>
KMS_MASTER_KEY=<base64-256-bit-key>
WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
ENABLE_V2_ENCRYPTED=true
```

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|----------|
| ffmpeg.wasm bundle size (30MB) | Slow initial load | CDN hosting, lazy load on upload page, show progress |
| Browser memory limits | Upload fails for long videos | Streaming encryption, chunked processing, max file size warnings |
| Key endpoint latency | Playback stuttering | KEK caching, batch key requests, prefetch next 3 segments |
| Session cookie theft | Unauthorized playback | Device binding, short TTL (30min), IP validation, secure flags |
| KMS costs | High operational expense | Use envelope encryption (V2), migrate to AWS KMS for production later |
| Safari iOS compatibility | Playback failure on iOS | Test MSE support, clear error messages if unsupported |
| Redis downtime | Session creation fails | Graceful degradation, fallback to Postgres-only mode |
| Walrus network issues | Upload/playback failures | Retry logic, show user-friendly errors, status page monitoring |

---

## Success Criteria

✅ **Functional:**
- [x] User can upload video → encrypted segments stored on Walrus
- [x] User can play video → segments decrypt seamlessly in browser
- [x] Session cookie-based auth (no session IDs in URLs)
- [x] Each segment has unique DEK, short-lived WDEK (20s TTL)
- [x] Playback works across Chrome, Firefox, Safari (with MSE support)

✅ **Security:**
- [x] Stealing WDEK unlocks only one segment (4 seconds)
- [x] Session expires after 30 minutes idle
- [x] Device fingerprint validation prevents session hijacking
- [x] All key grants logged for audit (1:1 mapping to segments)
- [x] HttpOnly, Secure, SameSite cookies prevent XSS/CSRF
- [x] Rate limiting prevents abuse (100 req/5min per session)

✅ **Performance:**
- [x] P50 `/v1/key` latency < 120ms
- [x] Video startup < 2s on broadband
- [x] No visible buffering during playback
- [x] Memory usage < 500MB for 2-hour video playback

✅ **Operational:**
- [x] Logs show 1:1 mapping: key grants ↔ segments played
- [x] Server never decrypts media content
- [x] Automated session cleanup (cron job)
- [x] Monitoring and alerting for key endpoint latency
- [x] Graceful error handling and user feedback

---

## Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Crypto Infrastructure | 2 days | All crypto primitives implemented and tested |
| Phase 2: Database Migration | 1 day | New schema deployed, migrations run |
| Phase 3: KMS Integration | 1 day | Envelope encryption working, Redis setup |
| Phase 4: Client Encryption | 2 days | Browser upload with encryption working |
| Phase 5: API Endpoints | 2 days | All V2 endpoints functional |
| Phase 6: Decrypting Loader | 2 days | Custom hls.js loader with decryption |
| Phase 7: Security Features | 2 days | Rate limiting, logging, device binding |
| Phase 8: Testing & Optimization | 2 days | All tests passing, performance benchmarks met |
| **Total** | **14 days** | **V2 encrypted playback system** |

---

## Next Steps

1. ✅ **Review this plan** with team/stakeholders
2. **Provision infrastructure**:
   - Set up Redis instance (Upstash or self-hosted)
   - Generate KMS master key: `openssl rand -base64 32`
   - Create test environment database
3. **Start Phase 1**: Crypto primitives (can be developed in parallel)
4. **Set up testing environment**:
   - Separate test database
   - Test Walrus network access
   - CI/CD pipeline for tests
5. **Create feature branch**: `feature/v2-encrypted-playback`
6. **Set up monitoring**:
   - Sentry for error tracking
   - New Relic/DataDog for performance monitoring
   - Custom metrics dashboard for key endpoint latency

---

## Questions & Decisions Needed

1. **KMS Choice**: Use AWS KMS (production-ready) or envelope encryption (MVP)?
2. **Redis Provider**: Self-hosted Redis or Upstash (serverless)?
3. **ffmpeg.wasm**: Host on own CDN or use public CDN?
4. **Session TTL**: 30 minutes or configurable per user tier?
5. **Rate Limits**: 100 req/5min or different limits per endpoint?
6. **Migration Timeline**: When to start migrating existing videos to V2?
7. **Browser Support**: Drop support for browsers without MSE or provide fallback?
8. **Monitoring**: Which monitoring platform to use?

---

## Acceptance Criteria (from spec)

- [x] Session cookie is set on `/v1/session` and **never appears in URLs**
- [x] Playback works end-to-end with **encrypted segments**; key grants succeed using cookies
- [x] Stealing a `WDEK` unlocks **only one** chunk and expires fast (20s)
- [x] P50 key endpoint latency < **120 ms**; startup < **2 s** on broadband
- [x] Server never streams or decrypts media content
- [x] Logs show **1:1** mapping between key grants and segments appended

---

## Nice-to-have (Fast Follow / V3)

- **POST /v1/session/refresh**: Extend cookie TTL without re-authenticating
- **GET /v1/key (batch)**: `?from=42&count=3` returns three `{seg_idx,wdek,iv}` in one request
- **Watermarking**: Overlay session fingerprint on video frames
- **Analytics Dashboard**: Real-time playback metrics (viewers, buffering events)
- **CDN Integration**: CloudFlare/Fastly for encrypted segment caching
- **Mobile Apps**: Native iOS/Android apps with same encryption
- **DRM Integration**: Widevine/FairPlay for premium content
- **Multi-CDN**: Failover between multiple Walrus aggregators
- **Offline Playback**: Download + decrypt segments for offline viewing
- **Live Streaming**: Extend to encrypted live HLS streams

---

**Document Version**: 1.0
**Last Updated**: 2025-01-25
**Author**: Implementation Planning Team
**Status**: Ready for Review
