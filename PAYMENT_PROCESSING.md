# Payment Processing Architecture

## Overview

Payment processing has been moved from frontend to backend for enhanced security and validation. This ensures all payments are verified on-chain before granting access to video content.

## Flow

### Initial Video Visit

When a user visits a video page:

1. **Frontend** (`components/CustomVideoPlayer.tsx`):
   - Shows "Checking payment status..." overlay
   - Calls `GET /api/v1/payment/check?videoId={id}`

2. **Backend** (`app/api/v1/payment/check/route.ts`):
   - Reads authentication cookies (`signature_address`, `signature_chain`)
   - Queries `VideoPaymentInfo` for matching record
   - Returns `hasPaid: true/false`

3. **Frontend** (based on response):
   - If `hasPaid: true` → Show video player immediately
   - If `hasPaid: false` → Show payment modal
   - If not authenticated → Show wallet connect overlay

### IOTA Payment Flow (Implemented)

1. **Frontend** (`lib/utils/processPayment.ts`):
   - Builds the payment transaction with `process_payment` move call
   - Signs the transaction using wallet
   - Sends transaction bytes + signature to backend

2. **Backend** (`app/api/v1/payment/process-iota/route.ts`):
   - Receives transaction bytes and signature
   - **Dry Run**: Validates transaction will succeed and contains `PaymentProcessed` event
   - **Validates Event Data**:
     - Checks `config_id` exists in `CreatorConfig` table
     - Verifies `config_id` belongs to the specified `videoId`
     - Confirms payment `amount` matches `pricePerView`
     - Validates `coinType` from created objects matches config
   - **Executes Transaction**: Submits to IOTA blockchain
   - **Creates VideoPaymentInfo**: Records payment with all video segments as paid
   - Returns transaction digest to frontend

3. **Frontend** (success):
   - Displays success toast with link to transaction on IOTAScan
   - Waits 2 seconds for backend to process payment
   - **Automatically refreshes the page**
   - Payment check runs again and detects payment
   - Video player loads immediately with full access

### SUI Payment Flow (Not Implemented)

Currently shows "Not implemented" error. SUI still processes payments on frontend.

## API Endpoints

### GET /api/v1/payment/check

Check if user has already paid for a video.

**Query Parameters**:
- `videoId`: Video ID to check

**Authentication**: Reads from cookies (`signature_address`, `signature_chain`)

**Response** (User has paid):
```json
{
  "hasPaid": true,
  "requiresAuth": false,
  "paymentInfo": {
    "id": "payment info ID",
    "paidSegmentIds": [0, 1, 2, 3, 4, 5, 6, 7],
    "paidAt": "2025-01-16T12:00:00.000Z"
  }
}
```

**Response** (User hasn't paid):
```json
{
  "hasPaid": false,
  "requiresAuth": false
}
```

**Response** (User not authenticated):
```json
{
  "hasPaid": false,
  "requiresAuth": true
}
```

**Usage**: Called when user visits a video page to determine whether to show the payment modal or the video player directly.

### POST /api/v1/payment/process-iota

**Request Body**:
```json
{
  "transactionBytes": "base64-encoded transaction bytes",
  "signature": "wallet signature",
  "videoId": "video ID to grant access to"
}
```

**Response** (Success):
```json
{
  "success": true,
  "digest": "transaction digest",
  "paymentInfo": {
    "id": "payment info ID",
    "videoId": "video ID",
    "payerAddress": "wallet address",
    "chain": "iota",
    "paidSegmentIds": [0, 1, 2, 3, 4, 5, 6, 7]
  },
  "event": {
    "amount": "10000000000",
    "config_id": "0x...",
    "payer": "0x...",
    "referrer": "0x0...",
    "timestamp_ms": "1763326916114"
  }
}
```

**Response** (Error):
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Event Validation

The backend looks for the `PaymentProcessed` event emitted by the tunnel contract:

```
Event Type: {TUNNEL_PACKAGE_ID}::tunnel::PaymentProcessed
```

**Event Fields**:
- `amount`: Payment amount in smallest unit
- `config_id`: Creator config object ID
- `payer`: Wallet address that paid
- `referrer`: Referrer address (0x0 if none)
- `timestamp_ms`: Payment timestamp

## Database Records

### VideoPaymentInfo

Created after successful payment:

```typescript
{
  videoId: string,           // Video that was paid for
  payerAddress: string,       // Wallet that paid
  chain: 'iota',              // Blockchain network
  tunnelObjectId: string,     // Creator config object ID
  maxAllowedPayAmount: string, // Payment amount
  currentPayAmount: string,   // Payment amount (same as max)
  authorizeSignature: null,   // Not used for direct payments
  paidSegmentIds: number[]    // All video segment indices [0,1,2,3,...]
}
```

## Security Features

1. **Double Validation**: Dry run before execution prevents failed transactions
2. **Event Verification**: Ensures payment event was actually emitted
3. **Config Matching**: Validates creator config belongs to the video
4. **Amount Checking**: Confirms correct payment amount
5. **Coin Type Validation**: Ensures correct token was used
6. **Backend Execution**: Prevents frontend manipulation

## Explorer Links

After successful payment, toast notification includes link to block explorer:

- **IOTA**: `https://iotascan.com/mainnet/tx/{digest}`
- **SUI**: `https://suiscan.xyz/mainnet/tx/{digest}`

## Video Decryption Key Access Control

After payment is processed, users must prove they've paid to access video decryption keys.

### Key Endpoints

#### GET /api/v1/key

Single segment decryption key retrieval.

**Query Parameters**:
- `videoId`: Video ID
- `rendition`: Rendition name (e.g., "720p")
- `segIdx`: Segment index

**Authentication** (via cookies):
- `signature_address`: User's wallet address
- `signature`: Signed message from wallet
- `signature_message`: Original message that was signed ("I am using Krill.Tube")
- `signature_chain`: Blockchain ("sui" or "iota")

**Verification Flow**:
1. Verify signature from cookies (same as `/api/auth/verify-signature`)
2. Check `VideoPaymentInfo` exists for this user + video + chain
3. Verify `segIdx` is in `paidSegmentIds` array
4. If all checks pass, return decryption key
5. Otherwise, return 401 Unauthorized

**Response** (Success):
```json
{
  "dek": "base64-encoded decryption key",
  "iv": "base64-encoded initialization vector",
  "duration": "15ms"
}
```

**Response** (Unauthorized):
```json
{
  "error": "Payment required. Please pay to access this video."
}
```

#### POST /api/v1/key/batch

Batch segment decryption key retrieval.

**Request Body**:
```json
{
  "videoId": "video ID",
  "rendition": "720p",
  "segIndices": [0, 1, 2, 3, 4]
}
```

**Authentication**: Same as GET endpoint (via cookies)

**Verification Flow**:
1. Verify signature from cookies
2. Check `VideoPaymentInfo` exists for this user + video + chain
3. For each segment, verify `segIdx` is in `paidSegmentIds`
4. Only return keys for paid segments (skip unpaid segments)

**Response** (Success):
```json
{
  "keys": [
    {
      "segIdx": 0,
      "dek": "base64-encoded decryption key",
      "iv": "base64-encoded initialization vector"
    },
    ...
  ],
  "duration": "25ms"
}
```

### Security Flow

```
User Request for Decryption Key
         ↓
[1] Read authentication cookies
    - signature_address
    - signature
    - signature_message
    - signature_chain
         ↓
[2] Verify signature
    - SUI: Use @mysten/sui/verify
    - IOTA: Trust wallet (already verified)
         ↓
[3] Query VideoPaymentInfo
    WHERE videoId = ? AND payerAddress = ? AND chain = ?
         ↓
[4] Check segment access
    IF segIdx IN paidSegmentIds
         ↓
[5] Decrypt DEK from database
    (using KMS master key)
         ↓
[6] Return DEK + IV


    ✗ No payment found → 401
    ✗ Segment not paid → 401
    ✗ Invalid signature → 401
```

## Complete User Journey

### First Visit (Not Paid)

```
1. User visits video page
   ↓
2. Video player loads, shows "Checking payment status..."
   ↓
3. Backend checks VideoPaymentInfo → Not found
   ↓
4. Payment modal appears
   ↓
5. User clicks "Pay with dKRILL" or "Pay with IOTA"
   ↓
6. Wallet prompts for signature
   ↓
7. Transaction sent to backend
   ↓
8. Backend executes transaction & creates VideoPaymentInfo
   ↓
9. Success toast: "Payment successful! Refreshing page..."
   ↓
10. Page refreshes after 2 seconds
   ↓
11. Payment check runs again → hasPaid: true
   ↓
12. Video player loads immediately
   ↓
13. Video automatically starts playing! 🎉
   (No need to click play button)
```

### Return Visit (Already Paid)

```
1. User visits same video (cookies still valid)
   ↓
2. Shows "Checking payment status..."
   ↓
3. Backend checks VideoPaymentInfo → Found!
   ↓
4. Video player loads immediately
   ↓
5. No payment modal
   ↓
6. Video automatically starts playing! 🎉
   (No need to click play button)
```

### Why Page Refresh?

The page refresh after payment ensures:
1. ✅ **Clean State**: All React state is reset
2. ✅ **Payment Verified**: Fresh check confirms payment in database
3. ✅ **Cookies Ready**: Authentication cookies are properly set for key requests
4. ✅ **Smooth Playback**: Video decryption starts with confirmed payment status
5. ✅ **Auto-Play**: Video automatically starts playing after payment
6. ✅ **User Feedback**: Clear indication that payment was successful

## Future Improvements

- [ ] Implement SUI payment backend processing
- [ ] Add support for partial payments (pay for specific segments)
- [ ] Implement payment refunds
- [ ] Add payment history API
- [ ] Support subscription-based payments
- [ ] Add rate limiting to key endpoints
- [ ] Cache payment verification results
- [ ] Optimize page refresh (use state update instead of full reload)
