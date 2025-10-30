# Walrus Payment Methods

## Overview

Walrus storage has **two payment models**: HTTP API (publisher-based) and SDK Direct (WAL token-based). WalPlayer currently uses the HTTP API approach.

## Current WalPlayer Implementation

### HTTP API (Publisher/Aggregator)

WalPlayer uses Walrus HTTP endpoints for uploads:

```typescript
// Current implementation
const response = await fetch(`${publisherUrl}/v1/quilts?epochs=200`, {
  method: 'PUT',
  body: formData,
});
```

**Payment Model:**
- 🆓 **Testnet**: Free (subsidized)
- 💳 **Mainnet**: Varies by publisher
  - Some publishers offer free tier
  - Some charge via traditional methods (credit card, etc.)
  - Some require WAL tokens
  - **Publisher-specific** - Check with your chosen publisher

**Our Cost Estimates:**
- Calculated using `walrusClient.storageCost()` from SDK
- Shows what it **would cost** in WAL if paying directly
- **Informational only** - Actual publisher charges may differ
- Useful for capacity planning and budgeting

**Pros:**
- ✅ Simple HTTP API
- ✅ No wallet required
- ✅ Fast upload process
- ✅ Works without blockchain interaction

**Cons:**
- ⚠️ Centralized dependency on publisher
- ⚠️ Payment method varies by publisher
- ⚠️ No on-chain payment verification

---

## Alternative: Direct WAL Payment

### SDK with Signer (Direct to Storage Nodes)

For fully decentralized uploads with on-chain payment:

```typescript
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// 1. Setup client with wallet
const keypair = Ed25519Keypair.deriveKeypair(mnemonic);
const suiClient = new SuiClient({
  url: getFullnodeUrl('mainnet'),
}).extend(walrus({ network: 'mainnet' }));

// 2. Upload blob with WAL payment
const result = await suiClient.writeBlob({
  blob: myData,
  deletable: true,
  epochs: 200,
  signer: keypair,
  // Optional: specify which WAL coins to use
  // walCoin: walCoinObject
});

console.log('Paid in WAL:', result.blobObject);
```

**Payment Model:**
- 💰 **Pays in WAL tokens** directly from your wallet
- 📊 **Exact cost** matches SDK calculation
- 🔗 **On-chain transaction** - Verifiable on Sui blockchain

**Requirements:**
1. WAL tokens in your Sui wallet
2. Additional gas fees in SUI (for transaction)
3. Wallet/signer access

**Pros:**
- ✅ Fully decentralized
- ✅ On-chain payment proof
- ✅ Exact cost known upfront
- ✅ No publisher dependency

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Requires WAL tokens
- ⚠️ Slower (blockchain transactions)
- ⚠️ Higher latency per upload

---

## Payment Tokens

### WAL Token

**What is WAL?**
- Native utility token for Walrus network
- Used to pay for decentralized storage
- Traded on Sui DEXes

**How to Get WAL:**

#### Testnet WAL (Free):
```bash
# Get testnet SUI first
curl -X POST https://faucet.testnet.sui.io/gas \
  -H 'Content-Type: application/json' \
  -d '{"FixedAmountRequest":{"recipient":"YOUR_ADDRESS"}}'

# Swap SUI → WAL on testnet DEX or faucet
# (Testnet WAL is free for testing)
```

#### Mainnet WAL (Purchase):
1. **Get SUI** - Buy from exchange (Binance, OKX, etc.)
2. **Swap to WAL** - Use Sui DEX (Cetus, Turbos, etc.)
   ```
   SUI → WAL exchange rate varies
   ```

### SUI Token (Gas Fees)

When using SDK direct payment, you also need SUI for:
- Transaction gas fees (~0.001 SUI per transaction)
- Network operations

**Total Cost:**
```
Total = WAL cost + SUI gas fee

Example:
- Storage: 0.030 WAL
- Gas: 0.001 SUI
```

---

## Cost Comparison

### HTTP API (Current)

| Item | Testnet | Mainnet |
|------|---------|---------|
| Upload Cost | Free | Varies by publisher |
| Payment Method | None | Publisher-specific |
| Blockchain Gas | None | None |
| Total Cost | $0 | Unknown (check publisher) |

### SDK Direct

| Item | Testnet | Mainnet |
|------|---------|---------|
| Storage Cost | WAL tokens (free) | WAL tokens (market rate) |
| Payment Method | WAL from wallet | WAL from wallet |
| Blockchain Gas | SUI (~0.001) | SUI (~0.001) |
| Total Cost | ~0 SUI | WAL + 0.001 SUI |

**Example Mainnet Costs (SDK Direct):**

15 MB video upload:
- **Storage**: 0.030 WAL (~$0.30 if WAL=$10)
- **Gas**: 0.001 SUI (~$0.003 if SUI=$3)
- **Total**: ~$0.303

---

## Recommendation

### For WalPlayer (Current):

**Keep HTTP API for now** because:
1. ✅ Simpler implementation
2. ✅ Faster uploads
3. ✅ No wallet management
4. ✅ Testnet is free
5. ✅ Mainnet publishers may offer free tier

**Our cost estimates** serve as:
- Capacity planning tool
- Budget forecasting
- Publisher comparison benchmark

### When to Use SDK Direct:

Consider switching to SDK direct payment when:
- ❌ No suitable publisher available
- ❌ Need full decentralization
- ❌ Want on-chain payment verification
- ❌ Building trustless application
- ❌ Publisher charges too high

---

## Implementation Comparison

### Current HTTP API

```typescript
// lib/walrus.ts - Current implementation
const quiltResponse = await fetch(
  `${publisherUrl}/v1/quilts?epochs=200`,
  {
    method: 'PUT',
    body: formData,
  }
);

// No payment - Publisher handles it
// Cost estimate is informational only
const costEstimate = await estimateVideoCost(totalSize);
console.log(`Estimated: ${costEstimate.totalCostSui} SUI worth of WAL`);
```

### SDK Direct with WAL

```typescript
// Alternative implementation (not used)
import { walrus } from '@mysten/walrus';

const suiClient = new SuiClient({
  url: getFullnodeUrl('mainnet'),
}).extend(walrus({ network: 'mainnet' }));

// Calculate exact cost
const cost = await suiClient.storageCost(totalSize, 200);
console.log(`Will pay: ${cost.totalCost} MIST in WAL`);

// Upload and pay with WAL
const result = await suiClient.writeQuilt({
  blobs: quiltBlobs,
  deletable: true,
  epochs: 200,
  signer: walletSigner, // Pays from this wallet's WAL balance
});

console.log('Transaction:', result.blobObject);
console.log('Paid:', cost.totalCost, 'MIST in WAL');
```

---

## Future Enhancements

Potential additions to WalPlayer:

### 1. Hybrid Approach
- Try HTTP API first (free/cheap)
- Fallback to SDK direct if HTTP fails
- User chooses payment method

### 2. WAL Payment Option
```typescript
// User can choose payment method
const uploadMethod = userPreference; // 'http' or 'wal'

if (uploadMethod === 'wal') {
  // Use SDK direct with WAL payment
  const result = await suiClient.writeQuilt({...});
} else {
  // Use HTTP API (current)
  const result = await fetch(...);
}
```

### 3. Multi-Publisher Support
- Try multiple publishers
- Compare pricing
- Automatic fallback
- Cost optimization

### 4. WAL Balance Checker
```typescript
// Check user's WAL balance before upload
const walBalance = await getWalBalance(userAddress);
const uploadCost = await estimateVideoCost(size);

if (walBalance < uploadCost.totalCost) {
  throw new Error('Insufficient WAL tokens');
}
```

---

## FAQs

### Q: Do I need WAL tokens to use WalPlayer?

**No.** WalPlayer uses HTTP API (publisher/aggregator), not direct WAL payment.

### Q: What do the cost estimates mean?

The estimates show what it **would cost** in WAL if paying directly via SDK. Actual publisher charges may differ.

### Q: Is mainnet free?

**Depends on publisher.** Some offer free tier, some charge. Check with your chosen publisher.

### Q: How do I get WAL tokens?

1. Get SUI from exchange
2. Swap SUI → WAL on Sui DEX (Cetus, Turbos, etc.)
3. Send WAL to your wallet

### Q: Can I switch to WAL payment?

Yes, but requires:
- Implementing SDK `writeBlob()`/`writeQuilt()`
- Managing wallet/signer
- Having WAL tokens in wallet
- Handling blockchain transactions

### Q: Which publishers accept WAL?

Check Walrus documentation for publisher list. Some accept:
- Credit card
- PayPal
- Cryptocurrency
- WAL tokens
- Free tier

---

## Resources

- **Walrus Documentation**: https://docs.walrus.space
- **Sui DEX (Cetus)**: https://app.cetus.zone
- **Sui DEX (Turbos)**: https://turbos.finance
- **Walrus Tokenomics**: https://docs.walrus.space/tokenomics
- **Publisher List**: https://docs.walrus.space/publishers

---

**Document Updated**: October 28, 2025
**WalPlayer Version**: v2 (HTTP API)
**Payment Method**: Publisher-based (no direct WAL)
