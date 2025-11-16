# Wallet Components - Multi-Chain Support

This directory contains wallet components that support both Sui and IOTA chains using the abstracted `useCurrentWalletMultiChain` hook.

## Components Overview

### ChainSelector

The main wallet connection component that handles:
- Displaying wallet connection status
- Showing connected wallet name and chain
- Copying wallet address
- Disconnecting wallets
- Connecting to either Sui or IOTA wallets

**Location:** `components/wallet/ChainSelector.tsx`

**Usage:**
```tsx
import { ChainSelector } from '@/components/wallet/ChainSelector';

function Header() {
  return (
    <header>
      <ChainSelector />
    </header>
  );
}
```

### ConnectWallet

A simple wrapper component around ChainSelector.

**Location:** `components/ConnectWallet.tsx`

**Usage:**
```tsx
import { ConnectWallet } from '@/components/ConnectWallet';

function MyComponent() {
  return <ConnectWallet />;
}
```

## Multi-Chain Architecture

All wallet components use the following hooks for consistent multi-chain support:

### 1. `useCurrentWalletMultiChain`

Provides access to wallet objects for both chains:

```typescript
const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();

// network: 'sui' | 'iota' | null
// suiWallet: Wallet object when Sui is connected
// iotaWallet: Wallet object when IOTA is connected
```

### 2. `useWalletContext`

Provides wallet state information:

```typescript
const { chain, address, isConnected } = useWalletContext();

// chain: 'sui' | 'iota' | null
// address: string | null
// isConnected: boolean
```

## ChainSelector Features

### Connected State

When a wallet is connected, the ChainSelector displays:
- Chain icon (Sui or IOTA)
- Shortened wallet address
- Dropdown with:
  - **Connected Wallet**: Shows wallet name and chain icon
  - **Address**: Clickable to copy to clipboard
  - **Disconnect Button**: Disconnects the current wallet

### Disconnected State

When no wallet is connected:
- Shows "Connect Wallet" button
- Opens modal with:
  - **Sui Wallets** section
  - **IOTA Wallets** section
  - Each section uses the respective `ConnectButton` from dapp-kits

### Styling

The component follows the KrillTube design system:
- White button with black outline
- 3px shadow
- Rounded corners (`rounded-[32px]`)
- Hover effects with translate and shadow changes
- Neomorphic design pattern

### Debug Logging

The component logs wallet state changes to help with debugging:

```typescript
console.log('[ChainSelector] Wallet state:', {
  network,
  chain,
  address,
  isConnected,
  suiWallet: suiWallet?.name,
  iotaWallet: iotaWallet?.name,
  currentWallet: walletName,
});
```

## Integration Example

Here's how the ChainSelector is integrated in the Header:

```tsx
// components/Header.tsx
import { ConnectWallet } from './ConnectWallet';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-4">
        {/* Other header content */}
        <ConnectWallet />
      </div>
    </header>
  );
}
```

## Network Detection Flow

1. User connects a Sui or IOTA wallet
2. `WalletContext` detects the connection and sets the active chain
3. `useCurrentWalletMultiChain` returns the appropriate wallet object
4. ChainSelector displays the wallet info with proper chain icon
5. Components can check `network` to determine which chain is active

## Wallet Disconnection Flow

1. User clicks "Disconnect" button
2. ChainSelector logs the disconnection
3. Appropriate disconnect function is called (Sui or IOTA)
4. Wallet state is cleared
5. UI updates to show "Connect Wallet" button

## Example: Using Wallet Info in Your Component

```tsx
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';
import { useWalletContext } from '@/lib/context/WalletContext';

function MyComponent() {
  const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();
  const { address, isConnected } = useWalletContext();

  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }

  const walletName = network === 'sui'
    ? suiWallet?.name
    : iotaWallet?.name;

  return (
    <div>
      <p>Connected to: {walletName}</p>
      <p>Network: {network}</p>
      <p>Address: {address}</p>
    </div>
  );
}
```

## Best Practices

1. **Always use the abstracted hooks** - Don't use `useCurrentWallet` from dapp-kits directly
2. **Check network before operations** - Verify which chain is active before executing transactions
3. **Log wallet state** - Use console.log for debugging wallet connections
4. **Handle both chains** - Ensure your component works with both Sui and IOTA
5. **Graceful fallbacks** - Handle cases where no wallet is connected

## Troubleshooting

### Wallet not detected
- Check that the wallet extension is installed
- Verify the wallet is on the correct network (mainnet)
- Check browser console for errors

### Wrong chain detected
- Disconnect and reconnect the wallet
- Check `WalletContext` active chain setting
- Verify both dapp-kit providers are properly configured

### Address not showing
- Ensure `useWalletContext` is called within `WalletContextProvider`
- Check that account is properly connected
- Verify address exists in wallet state

## Migration Guide

If you have components using the old pattern:

**Before:**
```tsx
const { currentWallet } = useCurrentWallet();
const walletName = currentWallet?.name;
```

**After:**
```tsx
const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();
const currentWallet = network === 'sui' ? suiWallet : iotaWallet;
const walletName = currentWallet?.name;
```

## Related Documentation

- [Multi-Chain Wallet Hook](/lib/hooks/README_MULTI_CHAIN_WALLET.md)
- [Wallet Context](/lib/context/WalletContext.tsx)
- [Upload Page Example](/app/(app)/upload/page.tsx)
