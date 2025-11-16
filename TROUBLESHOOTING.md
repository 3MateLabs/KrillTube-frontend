# Video Playback Troubleshooting Guide

## Quick Diagnostic Checklist

### 1. Check Browser Console (F12)
Look for these specific errors:

**HLS Errors:**
```
[useEncryptedVideo] HLS error: ...
Fatal network error
Fatal media error
```

**Session Errors:**
```
Session expired
Failed to fetch keys
```

**CORS Errors:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

### 2. Network Mismatch
**Symptom:** Videos load but won't play, or show 404 errors for segments

**Cause:** Video was uploaded to testnet but you're accessing with mainnet aggregator (or vice versa)

**Fix:**
- Check `.env` file: `NEXT_PUBLIC_WALRUS_NETWORK=testnet` or `mainnet`
- Check video's `network` field in database
- Ensure they match!

**SQL Query to check:**
```sql
SELECT id, title, network, walrus_master_uri FROM videos;
```

### 3. DEMO MODE Issues
**Symptom:** Loading spinner never stops, no video plays

**Current Code:** Line 115 in `useEncryptedVideo.ts` shows:
```typescript
console.log('[useEncryptedVideo] ✓ DEMO MODE: Skipping session initialization');
```

**What this means:**
- Session API calls are skipped
- Keys must be fetched directly from `/api/v1/key/batch` endpoint
- If that endpoint is broken, videos won't decrypt

**Fix:** Check `/api/v1/key/batch` endpoint

### 4. HLS.js Not Supported
**Symptom:** Error "HLS not supported in this browser"

**Fix:** Use a modern browser (Chrome, Firefox, Edge, Safari)

### 5. Walrus Aggregator Issues
**Symptom:** Network errors, 404s on segments

**Check:**
- Is Walrus aggregator online? Try: `https://aggregator.walrus-testnet.walrus.space/v1/health`
- Are blob IDs valid?
- Check Walruscan: `https://walruscan.com/testnet/blob/{BLOB_ID}`

### 6. Database Connection Issues
**Symptom:** Videos don't load at all, API errors

**Check:**
```bash
# Test database connection
npx prisma studio

# Or run a query
psql $DATABASE_URL -c "SELECT COUNT(*) FROM videos;"
```

### 7. WASM Loading Error (FIXED)
**Old Error:**
```
ENOENT: no such file or directory, open '.next/dev/server/vendor-chunks/walrus_wasm_bg.wasm'
```

**Status:** ✅ FIXED - We made walrusSDK import lazy in `/api/v1/videos/[id]/route.ts`

## Step-by-Step Debug Process

### Step 1: Check Video Exists
```bash
curl http://localhost:3000/api/v1/videos/YOUR_VIDEO_ID
```

Expected response:
```json
{
  "video": {
    "id": "...",
    "network": "testnet",
    "walrusMasterUri": "...",
    ...
  }
}
```

### Step 2: Check Network Configuration
In browser console:
```javascript
console.log('Network:', process.env.NEXT_PUBLIC_WALRUS_NETWORK);
console.log('Aggregator:', process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR);
```

### Step 3: Test Walrus Aggregator
```bash
# Test if aggregator is accessible
curl -I https://aggregator.walrus-testnet.walrus.space/v1/blobs/YOUR_BLOB_ID
```

Should return `200 OK` or `302 Redirect`

### Step 4: Check Key Fetching
In browser console, watch for:
```
[useEncryptedVideo] Starting aggressive key prefetch...
[useEncryptedVideo] ✓ Aggressive prefetch completed
```

If you see errors here, keys aren't being fetched

### Step 5: Check HLS Manifest Loading
In browser console:
```
[useEncryptedVideo] ✓ Media attached
[useEncryptedVideo] ✓ Manifest parsed
```

If manifest doesn't parse, the m3u8 file is invalid or unreachable

## Common Solutions

### Solution 1: Network Mismatch
Update `.env`:
```bash
NEXT_PUBLIC_WALRUS_NETWORK=testnet
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
```

Restart dev server:
```bash
npm run dev
```

### Solution 2: Clear Browser Cache
Sometimes old master playlists are cached:
```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
// Then hard refresh: Ctrl+Shift+R
```

### Solution 3: Database Migration
If schema is out of sync:
```bash
npx prisma migrate deploy
npx prisma generate
```

### Solution 4: Check Video URLs
Make sure Walrus URIs are correct:
```sql
SELECT
  id,
  network,
  SUBSTRING(walrus_master_uri, 1, 50) as master_uri_preview
FROM videos;
```

Testnet URIs should contain: `walrus-testnet.walrus.space`
Mainnet URIs should contain: `walrus.space` (no testnet)

## Still Not Working?

1. **Check browser console** - Copy all errors
2. **Check Network tab** - Look for failed requests (F12 → Network)
3. **Check video in database** - Verify it exists and has correct network
4. **Try a different video** - See if issue is per-video or global
5. **Try a different browser** - Rule out browser-specific issues

## Contact Info
If you need help, provide:
- Browser console errors (full log)
- Video ID that won't play
- Network configuration (`.env` values)
- Database query result for the video
