# Walrus Upload Relay Integration

## Problem
Browser-based uploads to Walrus storage nodes were failing with errors:
```
PUT .../metadata 400 (Bad Request)
PUT .../slivers/167/primary net::ERR_INSUFFICIENT_RESOURCES
```

**Root Cause**: Browsers have resource limitations (connection limits, memory) that make it difficult to directly upload slivers to 100+ storage nodes across multiple shards simultaneously.

## Solution: Upload Relay

Integrated Mysten Labs' public **Upload Relay** service which acts as a proxy between the browser and storage nodes.

### How Upload Relays Work

1. **Client registers blob on Sui** (blockchain transaction - already working)
2. **Client sends data to upload relay** (single HTTP POST)
3. **Upload relay fans out to storage nodes** (handles 100+ connections server-side)
4. **Upload relay returns certificate** to client
5. **Client certifies blob on Sui** (finalizes storage)

### Benefits

✅ **Reliability**: Server-side handling of node connections
✅ **Performance**: Upload relay has better bandwidth and resources
✅ **Automatic Retries**: Relay retries failed nodes automatically
✅ **Browser Compatibility**: Single connection from browser to relay
✅ **Resource Efficiency**: No browser connection/memory limits hit

## Implementation

### Updated Files

#### `lib/client-walrus-sdk.ts`
```typescript
export function createWalrusClient(network: 'testnet' | 'mainnet' = DEFAULT_NETWORK) {
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

  // Use Mysten Labs' public upload relay
  const uploadRelayHost = network === 'mainnet'
    ? 'https://upload-relay.mainnet.walrus.space'
    : 'https://upload-relay.testnet.walrus.space';

  return new WalrusClient({
    network,
    suiClient,
    uploadRelay: {
      host: uploadRelayHost,
      timeout: 120000, // 2 minutes for large uploads
    },
  });
}
```

### Configuration

The WalrusClient SDK automatically:
- Routes uploads through the relay when configured
- Handles tip payment to relay (if required)
- Collects certificates from relay
- No code changes needed in upload logic

## Public Upload Relays

**Mainnet**: `https://upload-relay.mainnet.walrus.space`
**Testnet**: `https://upload-relay.testnet.walrus.space`

Both are **free to use** (no tip required) and operated by Mysten Labs.

## Testing

Before this fix:
- ❌ Segments upload: SUCCESS (small quilts worked)
- ❌ Playlists upload: FAILED (ERR_INSUFFICIENT_RESOURCES)
- ❌ Master upload: FAILED (400 Bad Request)

After this fix (expected):
- ✅ All uploads routed through relay
- ✅ Server-side fan-out to storage nodes
- ✅ Better error handling and retries
- ✅ Consistent upload success

## Additional Safeguards

We still maintain **3-attempt retry logic** in `app/upload/page.tsx` for:
- Network interruptions
- Temporary relay unavailability
- Transaction failures

## References

- [Walrus Upload Relay Docs](https://mystenlabs.github.io/walrus-docs/operator-guide/upload-relay.html)
- [Upload Relay Source](https://github.com/MystenLabs/walrus/tree/main/crates/walrus-upload-relay)
- Walrus SDK: `@mysten/walrus` v0.8.1

## Next Steps

1. Test upload with new configuration
2. Monitor console for relay-specific logs
3. Verify all three phases complete successfully:
   - Segments quilt → relay → storage nodes ✓
   - Playlists quilt → relay → storage nodes ✓
   - Master playlist → relay → storage nodes ✓

The upload relay should eliminate the storage node resource errors entirely.
