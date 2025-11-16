# Multi-Chain Wallet Hook

## `useCurrentWalletMultiChain`

An abstracted hook that provides wallet information for both Sui and IOTA chains.

### Usage

```typescript
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';

function MyComponent() {
  const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();

  // Check which network is active
  if (network === 'sui' && suiWallet) {
    console.log('Connected to Sui wallet:', suiWallet.name);
    // Use Sui-specific logic
  } else if (network === 'iota' && iotaWallet) {
    console.log('Connected to IOTA wallet:', iotaWallet.name);
    // Use IOTA-specific logic
  }

  return (
    <div>
      <p>Network: {network || 'Not connected'}</p>
      {network === 'sui' && <p>Sui Wallet: {suiWallet?.name}</p>}
      {network === 'iota' && <p>IOTA Wallet: {iotaWallet?.name}</p>}
    </div>
  );
}
```

### Return Value

```typescript
{
  network: 'sui' | 'iota' | null;  // Currently active network
  suiWallet: Wallet | null;         // Sui wallet object (only when network is 'sui')
  iotaWallet: Wallet | null;        // IOTA wallet object (only when network is 'iota')
}
```

### Example: Token Type Selection

```typescript
function getTokenType() {
  const { network } = useCurrentWalletMultiChain();

  if (network === 'iota') {
    return '0x2::iota::IOTA';
  }

  return '0x2::sui::SUI';
}
```

### Example: Conditional Wallet Operations

```typescript
function handleTransaction() {
  const { network, suiWallet, iotaWallet } = useCurrentWalletMultiChain();

  if (network === 'sui' && suiWallet) {
    // Execute Sui transaction
    await executeSuiTransaction();
  } else if (network === 'iota' && iotaWallet) {
    // Execute IOTA transaction
    await executeIotaTransaction();
  }
}
```

## Integration with WalletContext

This hook uses the `WalletContext` to determine the active chain and automatically provides the correct wallet object:

- When a Sui wallet is connected, `network` will be `'sui'` and `suiWallet` will contain the wallet object
- When an IOTA wallet is connected, `network` will be `'iota'` and `iotaWallet` will contain the wallet object
- When no wallet is connected, `network` will be `null` and both wallet objects will be `null`

## Related Hooks

- `useWalletContext()` - Access the wallet context directly
- `useMultiChainAuth()` - Multi-chain authentication
- `useCurrentAccount()` from `@mysten/dapp-kit` - Sui account info
- `useCurrentAccount()` from `@iota/dapp-kit` - IOTA account info
