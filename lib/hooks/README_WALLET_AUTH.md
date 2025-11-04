# Wallet Authentication System

This system provides signature-based authentication for connected wallets.

## Overview

After a user connects their wallet, they are automatically prompted to sign a message. The signature is stored in cookies for 12 hours and can be verified on the backend.

## Components

### 1. `useWalletAuth` Hook

Location: `lib/hooks/useWalletAuth.ts`

A React hook that manages wallet signature authentication.

**Features:**
- Automatically checks for existing signatures in cookies
- Prompts user to sign message when wallet is connected
- Stores signature and message in cookies (12-hour expiration)
- Provides verification methods

**Usage:**

```tsx
import { useWalletAuth } from '@/lib/hooks/useWalletAuth';

function MyComponent() {
  const {
    isAuthenticated,
    isLoading,
    error,
    address,
    requestSignature,
    verifySignature,
    clearAuth,
  } = useWalletAuth();

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <p>Please sign the message to authenticate</p>
        <button onClick={requestSignature}>Sign Message</button>
      </div>
    );
  }

  return (
    <div>
      <p>Authenticated: {address}</p>
      <button onClick={verifySignature}>Verify Signature</button>
      <button onClick={clearAuth}>Sign Out</button>
    </div>
  );
}
```

**API:**

- `isAuthenticated: boolean` - Whether the user is authenticated
- `isLoading: boolean` - Loading state during signature request
- `error: string | null` - Error message if signature fails
- `address: string | null` - Current wallet address
- `requestSignature(): Promise<boolean>` - Request signature from user
- `verifySignature(): Promise<boolean>` - Verify signature with backend
- `clearAuth(): void` - Clear authentication cookies
- `checkAuthentication(): boolean` - Check if cookies exist

**Auto-authentication:**

The hook automatically requests a signature when:
- A wallet is connected
- No valid signature exists in cookies

### 2. Backend Verification Endpoint

Location: `app/api/test/signature_verification/[address]/route.ts`

**Endpoint:** `POST /api/test/signature_verification/[address]`

Verifies that a signature was created by the wallet that owns the provided address.

**Request:**

```json
{
  "signature": "base64-encoded-signature",
  "message": "I am using Krill.Tube"
}
```

**Response (Success):**

```json
{
  "verified": true,
  "address": "0x1234...",
  "message": "Signature verified successfully"
}
```

**Response (Failure):**

```json
{
  "verified": false,
  "error": "Signature does not match the provided address",
  "recoveredAddress": "0xabcd...",
  "providedAddress": "0x1234..."
}
```

**How it works:**

1. Receives signature and message from client
2. Uses `@mysten/sui/verify` to verify the personal message signature
3. Recovers the public key from the signature
4. Derives the address from the public key
5. Compares recovered address with provided address

## Security Features

1. **HttpOnly Cookies**: Signatures are stored in HTTP-only cookies (when using server-side verification)
2. **12-hour Expiration**: Signatures automatically expire after 12 hours
3. **SameSite Protection**: Cookies use `sameSite: 'lax'` to prevent CSRF
4. **Secure in Production**: Cookies use `secure: true` in production
5. **Address Verification**: Backend verifies signature matches the claimed address

## Cookie Storage

**Client-side cookies (via js-cookie):**
- `signature`: The base64-encoded signature
- `signature_message`: The message that was signed ("I am using Krill.Tube")
- Both expire in 12 hours

## Flow Diagram

```
┌─────────────────┐
│ User connects   │
│ wallet          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check cookies   │
│ for signature   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    │         │
    ▼         │
┌─────────────┴────────┐
│ Request signature    │
│ from wallet          │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────┐
│ User signs message  │
│ "I am using         │
│  Krill.Tube"        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ Store signature in  │
│ cookies (12h TTL)   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ User is             │
│ authenticated       │
└─────────────────────┘
```

## Example: Protecting a Route

```tsx
'use client';

import { useWalletAuth } from '@/lib/hooks/useWalletAuth';
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function ProtectedPage() {
  const currentAccount = useCurrentAccount();
  const { isAuthenticated, isLoading } = useWalletAuth();

  if (!currentAccount) {
    return <div>Please connect your wallet</div>;
  }

  if (isLoading) {
    return <div>Authenticating...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please sign the authentication message</div>;
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <p>You are authenticated!</p>
    </div>
  );
}
```

## Example: Server-Side Verification

You can also verify signatures server-side by reading cookies:

```typescript
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const signature = cookieStore.get('signature')?.value;
  const message = cookieStore.get('signature_message')?.value;

  if (!signature || !message) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Verify with backend endpoint
  // ... verification logic
}
```

## Testing

Test the verification endpoint:

```bash
curl -X POST http://localhost:3000/api/test/signature_verification/0x1234... \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "your-signature-here",
    "message": "I am using Krill.Tube"
  }'
```

## Dependencies

- `@mysten/dapp-kit` - Wallet connection and signing
- `@mysten/sui/verify` - Signature verification
- `js-cookie` - Client-side cookie management
- `next/headers` - Server-side cookie management (Next.js)
