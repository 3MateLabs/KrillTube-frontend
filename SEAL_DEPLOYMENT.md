# SEAL Contract Deployment

## ✅ Deployment Information

**Network**: Sui Mainnet
**Package ID**: `0xdaf4bee4cf52ef466b8046f1b40b20033946354d9a5d60e116807209d980830d`
**Transaction**: `F9aFwJ8ka56z23HfX3YFE6bZWgYp9yky6ycWpL3qMwbC`
**Module**: `creator_channel`
**Deployed By**: `0x9a5b0ad3a18964ab7c0dbf9ab4cdecfd6b3899423b47313ae6e78f4b801022a3`
**Block**: Epoch 953

## 🔑 SEAL Configuration

### Key Server (1-of-1 Threshold)
- **Object ID**: `0xe0eb52eba9261b96e895bbb4deca10dcd64fbc626a1133017adcd5131353fd10`
- **URL**: `https://open.key-server.mainnet.seal.mirai.cloud`
- **Threshold**: 1 (requires 1 key share from 1 server)

### Environment Variables
```bash
# Already configured in .env
NEXT_PUBLIC_SEAL_PACKAGE_ID=0xdaf4bee4cf52ef466b8046f1b40b20033946354d9a5d60e116807209d980830d
SUI_OPERATOR_PRIVATE_KEY=suiprivkey1qztyc6yz7pxsza8jspnwu6n2rd9uhvfnfapvumferdhnu3zu5fu7zggwlh2
```

## 📋 Contract Functions

### Channel Management
- `create_channel_entry` - Create a new subscription channel
- `update_channel_price` - Update subscription price
- `increment_video_count` - Track video uploads

### Subscription Management
- `subscribe_entry` - Subscribe with SUI payment
- `subscribe_with_sui` - Alternative subscription function
- `unsubscribe` - Cancel subscription
- `is_subscribed` - Check subscription status

### Access Control (SEAL Integration)
- `seal_approve` - Verify subscriber access for SEAL decryption
  - Checks if user is in channel's subscriber ACL
  - Validates document ID prefix matches channel
  - Called by SEAL key servers before decryption

## 🧪 Testing the Deployment

### 1. Test Channel Creation

```typescript
// In profile edit page, set a subscription price
// Backend will automatically call create_channel_entry

// Expected behavior:
// ✅ On-chain CreatorChannel object created
// ✅ sealObjectId saved to database
// ✅ Channel price and chain set
```

### 2. Test Subscription

```typescript
// Visit another creator's profile and click "Subscribe"

// Expected behavior:
// ✅ Transaction popup appears
// ✅ Payment processed on-chain
// ✅ User added to subscribers ACL
// ✅ Subscription record saved to database
// ✅ UI updates to "Subscribed"
```

### 3. Test SEAL Encryption Upload

```typescript
// Upload a video with encryptionType: 'subscription-acl'

// Expected behavior:
// ✅ Video transcoded
// ✅ Segments encrypted with SEAL
// ✅ Document IDs generated with channel prefix
// ✅ Encrypted blobs uploaded to Walrus
// ✅ SEAL metadata saved to database
```

## 🔍 Verification Commands

### Check Package on Explorer
```bash
# View on Sui Explorer
https://suiscan.xyz/mainnet/object/0xdaf4bee4cf52ef466b8046f1b40b20033946354d9a5d60e116807209d980830d
```

### Query Channel Data
```bash
sui client call \
  --package 0xdaf4bee4cf52ef466b8046f1b40b20033946354d9a5d60e116807209d980830d \
  --module creator_channel \
  --function get_channel_info \
  --args <CHANNEL_OBJECT_ID>
```

### Check Subscription Status
```bash
sui client call \
  --package 0xdaf4bee4cf52ef466b8046f1b40b20033946354d9a5d60e116807209d980830d \
  --module creator_channel \
  --function is_subscribed \
  --args <CHANNEL_OBJECT_ID> <SUBSCRIBER_ADDRESS>
```

## 📊 Cost Analysis

**Deployment Cost**: 27.09468 SUI
- Storage: 27.5728 SUI
- Computation: 0.5 SUI
- Rebate: -0.97812 SUI

**Per-Channel Creation**: ~0.01-0.03 SUI (estimated)
**Per-Subscription**: ~0.005-0.01 SUI (estimated, plus subscription fee)

## 🚀 Next Steps

1. ✅ **Deploy Contract** - DONE
2. ✅ **Configure Environment** - DONE
3. 🔄 **Test Channel Creation** - Create a profile and set subscription price
4. 🔄 **Test Subscription Flow** - Subscribe to a channel
5. 🔄 **Test SEAL Upload** - Upload video with subscription-acl encryption
6. ⏳ **Implement Playback** - Add SEAL decryption to video player

## 🐛 Troubleshooting

### Error: "SEAL package ID not configured"
- Restart your Next.js dev server: `npm run dev`
- Verify `.env` has `NEXT_PUBLIC_SEAL_PACKAGE_ID`

### Error: "Channel creation failed"
- Check `SUI_OPERATOR_PRIVATE_KEY` is set in `.env`
- Verify operator has sufficient SUI balance
- Check network configuration matches (mainnet)

### Error: "SEAL encryption failed"
- Verify SEAL package ID is correct
- Check key server is accessible
- Ensure creator has `sealObjectId` set

## 📚 Related Documentation

- [SEAL Subscription Flow](./SEAL_SUBSCRIPTION_FLOW.md)
- [Contract Source](./contract/sources/creator_channel.move)
- [SEAL Client SDK](./lib/seal/sealClient.ts)
- [Upload Orchestrator](./lib/upload/sealUploadOrchestrator.ts)

## 🔐 Security Notes

- ✅ Operator private key stored server-side only
- ✅ SEAL uses 1-of-1 threshold encryption
- ✅ Access control verified on-chain before decryption
- ✅ Subscription payments processed on-chain
- ⚠️ Keep `SUI_OPERATOR_PRIVATE_KEY` secret
- ⚠️ Never commit `.env` to version control
