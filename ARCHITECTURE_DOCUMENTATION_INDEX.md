# KrillTube Architecture Documentation Index

## Overview

This directory contains comprehensive documentation of the KrillTube frontend architecture, with special focus on encryption implementation, video processing, and blockchain integration.

---

## Documents Included

### 1. **KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md** (62KB, 2100+ lines)
**The Complete Reference Guide**

This is the most thorough documentation covering:

- **PART 1: Current Encryption Implementation**
  - Encryption methods & algorithms (AES-128-GCM, X25519 ECDH, HKDF-SHA256)
  - Where encryption happens (client-side upload, server-side storage, playback decryption)
  - Key management & storage (Master Key, DEKs, session keys)
  - Complete step-by-step decryption flow with code snippets

- **PART 2: Video Processing Pipeline**
  - 4-phase upload flow (Transcode → Encrypt → Upload → Register)
  - HLS manifest generation
  - Segment handling and rendition management
  - FFmpeg WASM integration
  - Memory management during upload

- **PART 3: Storage Architecture**
  - Walrus integration (single blobs vs QUILTS batch upload)
  - File storage patterns
  - Blob storage & retrieval
  - Session management for encrypted playback
  - Mainnet vs Testnet configuration

- **PART 4: API Routes & Backend**
  - Complete API endpoint documentation
  - Session management endpoints
  - Key retrieval endpoints (single + batch)
  - Video management
  - Payment verification
  - Authentication mechanisms

- **PART 5: Database Schema**
  - Complete Prisma schema with annotations
  - Key relationships
  - Encryption-related fields
  - Payment and creator configs

- **PART 6: Client-Side Video Player**
  - How encrypted videos are loaded
  - HLS.js integration
  - Custom video player implementation
  - useEncryptedVideo hook documentation
  - Memory management and optimization

- **PART 7: Authentication & Wallet**
  - Sui and IOTA wallet integration
  - User authentication flow
  - Signature verification
  - Payment verification

- **PART 8: Key Files & Directories Map**
  - Critical encryption files (primitives, KMS, player)
  - Key management files
  - Player & playback files
  - Storage & upload files
  - API route files
  - Database files
  - Type definitions

- **Security Considerations & Recommendations**
  - Master key management
  - Session key storage
  - DEK encryption best practices
  - Signature verification
  - Transport security
  - Cryptographic agility

### 2. **KRILLTUBE_QUICK_REFERENCE.md** (12KB)
**Quick Lookup Guide for Developers**

A condensed version for quick reference, including:
- At-a-glance summary
- Encryption facts table
- Core files by importance (Tier 1-4)
- 5-stage data flow (Upload → Register → Session → Key → Playback)
- Key storage breakdown
- Payment flow
- Optimization techniques
- API endpoints summary
- Database schema overview
- Critical environment variables
- Testing & deployment checklists
- Common integration points
- Performance metrics
- Security considerations

---

## Quick Start: Where to Look For...

### If you need to understand...

**Encryption (How it works)**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 1 + PART 8

**Video Upload Flow**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 2
→ Key file: `lib/upload/clientUploadOrchestrator.ts`

**Playback & Decryption**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 6
→ Key files: `lib/player/useEncryptedVideo.ts`, `lib/player/decryptingLoader.ts`

**API Design**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 4
→ Key files: `app/api/v1/key/route.ts`, `app/api/v1/session/route.ts`

**Database Schema**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 5
→ Key file: `prisma/schema.prisma`

**Security**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - Security Considerations
→ Key files: `lib/kms/masterKey.ts`, `lib/kms/envelope.ts`

**Wallet Integration**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 7
→ Key files: `lib/hooks/useWalletAuth.ts`, `lib/hooks/useMultiChainAuth.ts`

**Storage (Walrus)**
→ KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md - PART 3
→ Key files: `lib/walrus.ts`, `lib/client-walrus-sdk.ts`

---

## Key Technical Concepts

### Encryption Stack
- **Upload**: AES-128-GCM with unique random keys per segment
- **Playback**: X25519 ECDH + HKDF-SHA256 for KEK derivation
- **Key Storage**: Master Key (KMS) encrypts all DEKs at rest
- **Implementation**: Native Web Crypto API (no external dependencies)

### Video Processing
- **Transcoding**: FFmpeg WASM in browser (no server processing)
- **Formats**: H.264 video + AAC audio, 4-second segments
- **Qualities**: 1080p (5 Mbps) → 720p (2.8 Mbps) → 480p → 360p
- **Streaming**: HLS with adaptive bitrate + custom decryption

### Storage & Blockchain
- **Walrus**: Decentralized storage on Sui blockchain
- **Upload Method**: QUILTS batch upload (multiple files in one request)
- **DEKs**: Encrypted in database (45 bytes: version + IV + ciphertext)
- **Segments**: Immutable encrypted blobs in Walrus

### Payment & Access Control
- **Wallets**: Sui and IOTA supported
- **Verification**: Wallet signature + payment check before key release
- **Access**: Per-segment payment tracking
- **Flow**: User pays → transaction recorded → can access segments

---

## File Structure Overview

```
KrillTube-frontend/
├── lib/
│   ├── crypto/
│   │   ├── primitives.ts           ⭐⭐⭐ (AES-GCM, X25519, HKDF)
│   │   ├── client.ts               ⭐⭐⭐ (Client-side crypto)
│   │   ├── clientEncryption.ts     (Upload encryption)
│   │   ├── keyDerivation.ts        (KEK derivation)
│   │   └── utils.ts                (Encoding utilities)
│   ├── kms/
│   │   ├── masterKey.ts            ⭐⭐⭐ (Master key management)
│   │   └── envelope.ts             ⭐⭐⭐ (DEK encryption/decryption)
│   ├── player/
│   │   ├── useEncryptedVideo.ts    ⭐⭐⭐ (Playback hook)
│   │   ├── sessionManager.ts       ⭐⭐⭐ (Session management)
│   │   ├── decryptingLoader.ts     ⭐⭐⭐ (HLS integration)
│   │   ├── workerPool.ts           (Web Worker pool)
│   │   └── decryptionWorker.ts     (Worker script)
│   ├── upload/
│   │   └── clientUploadOrchestrator.ts ⭐⭐ (Full upload pipeline)
│   ├── walrus.ts                   ⭐⭐ (Storage client)
│   ├── walrus-sdk.ts               (SDK wrapper)
│   ├── client-walrus-sdk.ts        (Client-side SDK)
│   ├── types.ts                    (Type definitions)
│   └── hooks/
│       ├── useWalletAuth.ts        ⭐ (Wallet auth)
│       └── useMultiChainAuth.ts    (Multi-chain support)
├── app/
│   └── api/v1/
│       ├── session/
│       │   ├── route.ts            ⭐⭐⭐ (Session management)
│       │   └── refresh/route.ts    (Session refresh)
│       ├── key/
│       │   ├── route.ts            ⭐⭐⭐ (Key retrieval + payment check)
│       │   └── batch/route.ts      (Batch key retrieval)
│       ├── register-video/route.ts ⭐⭐⭐ (Video registration)
│       ├── videos/[id]/route.ts    ⭐⭐ (Video management)
│       └── payment/               (Payment processing)
├── prisma/
│   └── schema.prisma              ⭐⭐⭐ (Database schema)
├── components/
│   ├── EncryptedVideoPlayer.tsx   (Player component)
│   └── ... (UI components)
└── public/
    └── ... (Static assets)
```

⭐⭐⭐ = Critical for encryption
⭐⭐ = Important for architecture
⭐ = Useful reference

---

## Key Definitions

### Master Key
The 256-bit encryption key stored in `KMS_MASTER_KEY` environment variable. Used to encrypt all segment DEKs at rest in the database. Never exposed in code or logs.

### Data Encryption Key (DEK)
A 128-bit random key generated for each video segment. Used to encrypt the segment with AES-128-GCM. Stored encrypted in database, decrypted on-demand for playback.

### Key Encryption Key (KEK)
A 128-bit key derived per playback session using X25519 ECDH + HKDF. Used to wrap/unwrap segment DEKs (not directly used for segment encryption).

### Ephemeral Keypair
X25519 keypair generated fresh for each playback session. Server's private key stored in memory for 24 hours, then discarded. Enables perfect forward secrecy.

### Playback Session
A database record + in-memory state for a single video playback. Contains both parties' public keys and server nonce. Expires after 24 hours.

### ECDH (Elliptic Curve Diffie-Hellman)
Key exchange algorithm (X25519) enabling two parties to derive a shared secret. Used in playback session to establish KEK without transmitting keys.

### HLS (HTTP Live Streaming)
Streaming protocol that breaks video into 4-second segments in playlists. Client-side player (HLS.js) manages streaming, buffering, adaptive bitrate.

### Walrus
Decentralized storage layer on Sui blockchain. Stores encrypted video segments immutably. Client uploads directly, server retrieves for playback.

### QUILTS
Walrus batch upload mechanism. Uploads multiple files in one request (all segments + playlists), returns per-file patch IDs.

---

## Development Workflow

### Local Testing
```bash
npm run test:crypto           # Test encryption primitives
npm run test:integration     # Test full flows
npm run dev                  # Start dev server
```

### Understanding Encryption
1. Read PART 1 of comprehensive guide
2. Review `lib/crypto/primitives.ts` source code
3. Trace encryption in `lib/kms/envelope.ts`
4. Follow playback flow in `lib/player/sessionManager.ts`

### Understanding Upload
1. Read PART 2 of comprehensive guide
2. Review `lib/upload/clientUploadOrchestrator.ts`
3. Check `app/api/v1/register-video/route.ts`

### Understanding Playback
1. Read PART 6 of comprehensive guide
2. Review `lib/player/useEncryptedVideo.ts`
3. Check `lib/player/decryptingLoader.ts`
4. Understand Web Worker in `lib/player/workerPool.ts`

---

## Important Notes

- **Never commit KMS_MASTER_KEY to git** - use environment variables only
- **Plaintext DEKs are never stored** - always encrypted with master key
- **Client-side encryption during upload** - server never sees plaintext segments
- **Session keys are ephemeral** - deleted after 24 hours
- **Payment is verified before key release** - malicious users can't access without payment
- **All crypto is native Web Crypto API** - no external dependencies = smaller bundle

---

## Support & References

### File Locations
- **Comprehensive Guide**: `KRILLTUBE_ARCHITECTURE_COMPREHENSIVE.md`
- **Quick Reference**: `KRILLTUBE_QUICK_REFERENCE.md`
- **This Index**: `ARCHITECTURE_DOCUMENTATION_INDEX.md`

### Related Documentation
- `PROJECT.md` - Original project overview
- `CLAUDE.md` - UI style guide
- `.taskmaster/` - Task management system

### Key Tests
- `tests/crypto/` - Crypto primitive tests
- `tests/integration/` - End-to-end tests

---

## Questions?

Refer to the appropriate section in the comprehensive guide based on your question type:

| Question Type | Section |
|--------------|---------|
| How does encryption work? | PART 1 |
| How is video uploaded? | PART 2 |
| How are videos stored? | PART 3 |
| What APIs are available? | PART 4 |
| Database structure? | PART 5 |
| How to implement playback? | PART 6 |
| Wallet integration? | PART 7 |
| Where is code X? | PART 8 |
| Security concerns? | Security Considerations |

---

**Generated**: 2024-11-19
**Status**: Complete and Ready for Development
**Version**: 1.0
