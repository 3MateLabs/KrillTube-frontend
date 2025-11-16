# IOTA Wallet - Testnet Only Restriction

## Summary

Updated the Storage Network selector to automatically force testnet when an IOTA wallet is connected, preventing users from selecting mainnet which is not yet supported for IOTA wallets.

## Changes Made

### Updated Component: `UploadNetworkSwitcher`
**File:** `/components/UploadNetworkSwitcher.tsx`

#### 1. **Added Multi-Chain Wallet Detection**

```typescript
import { useCurrentWalletMultiChain } from '@/lib/hooks/useCurrentWalletMultiChain';

const { network } = useCurrentWalletMultiChain();
const isIotaWallet = network === 'iota';
```

#### 2. **Auto-Force Testnet for IOTA Wallets**

```typescript
useEffect(() => {
  if (isIotaWallet && walrusNetwork !== 'testnet') {
    console.log('[UploadNetworkSwitcher] IOTA wallet detected, forcing testnet');
    setWalrusNetwork('testnet');
  }
}, [isIotaWallet, walrusNetwork, setWalrusNetwork]);
```

**Behavior:**
- When IOTA wallet connects → Automatically switches to testnet
- Logs the change for debugging

#### 3. **Disabled Network Selector for IOTA**

```typescript
const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  // Prevent changing network if IOTA wallet is connected
  if (isIotaWallet) {
    return;
  }
  setWalrusNetwork(e.target.value as 'mainnet' | 'testnet');
};
```

**Updated Select Element:**
- Added `disabled={isIotaWallet}` attribute
- Conditional styling for disabled state
- Hides mainnet option when IOTA wallet connected
- Removes dropdown arrow when disabled

```typescript
<select
  disabled={isIotaWallet}
  className={`... ${isIotaWallet
    ? 'opacity-70 cursor-not-allowed'
    : 'cursor-pointer hover:...'
  }`}
>
  {!isIotaWallet && <option value="mainnet">Mainnet</option>}
  <option value="testnet">Testnet</option>
</select>
```

#### 4. **Visual Indicator for IOTA**

Added a badge when IOTA wallet is connected:

```typescript
{isIotaWallet && (
  <div className="absolute -right-2 -top-2 px-2 py-0.5 bg-[#1AAACE] rounded-full
    shadow-[2px_2px_0px_0px_rgba(0,0,0,1.00)]
    outline outline-1 outline-offset-[-1px] outline-black">
    <span className="text-white text-xs font-bold font-['Outfit']">IOTA</span>
  </div>
)}
```

**Visual:** Shows a cyan "IOTA" badge on the selector

#### 5. **Updated Info Modal**

Enhanced the info modal to explain IOTA limitations:

```typescript
{/* IOTA Notice */}
{isIotaWallet && (
  <div className="p-4 bg-[#1AAACE]/10 rounded-2xl ...">
    <h4 className="font-bold text-black mb-2 text-base flex items-center gap-2">
      <span className="px-2 py-0.5 bg-[#1AAACE] rounded-full text-white text-xs">IOTA</span>
      Testnet Only
    </h4>
    <p className="text-black/70">
      IOTA wallets currently only support Walrus testnet. Mainnet support coming soon!
    </p>
  </div>
)}
```

**Mainnet section updated:**
```typescript
{isIotaWallet && <li className="text-[#1AAACE] font-semibold">
  • Not available for IOTA wallets yet
</li>}
```

**Testnet section updated:**
```typescript
{isIotaWallet && <li className="text-[#1AAACE] font-semibold">
  • Available for IOTA wallets ✓
</li>}
```

## User Experience Flow

### When Sui Wallet is Connected
1. User sees normal network selector
2. Can choose between Mainnet and Testnet
3. Dropdown arrow visible
4. Full functionality

### When IOTA Wallet is Connected
1. Network automatically switches to Testnet
2. Network selector becomes disabled (grayed out)
3. "IOTA" badge appears on selector
4. Only "Testnet" option visible in dropdown
5. No dropdown arrow (disabled state)
6. Info modal shows IOTA-specific notices

## Visual Changes

### Network Selector - Sui Wallet
```
┌──────────────────────────────────┐
│ Storage Network                  │
│  ┌──────────────────┐            │
│  │ Testnet ▼        │            │
│  └──────────────────┘            │
│  (Click to toggle)               │
└──────────────────────────────────┘
```

### Network Selector - IOTA Wallet
```
┌──────────────────────────────────┐
│ Storage Network      ┌─────┐     │
│  ┌──────────────────┐│IOTA │     │
│  │ Testnet          │└─────┘     │
│  └──────────────────┘            │
│  (Disabled, grayed out)          │
└──────────────────────────────────┘
```

## Info Modal Changes

### IOTA Wallet Connected

```
┌─────────────────────────────────────────┐
│  Storage Networks                    ✕  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ [IOTA] Testnet Only             │   │
│  │ IOTA wallets currently only     │   │
│  │ support Walrus testnet.         │   │
│  │ Mainnet support coming soon!    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Mainnet (User Paid)             │   │
│  │ • Permanent storage on Walrus   │   │
│  │ • Production-ready reliability  │   │
│  │ • User pays with WAL            │   │
│  │ • Not available for IOTA yet    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Testnet (Free)                  │   │
│  │ • Completely free to use        │   │
│  │ • Perfect for testing uploads   │   │
│  │ • Files may be wiped (~100d)    │   │
│  │ • Available for IOTA wallets ✓  │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [ Got it ]                      │
└─────────────────────────────────────────┘
```

## Console Logging

For debugging, the component logs when it forces testnet:

```
[UploadNetworkSwitcher] IOTA wallet detected, forcing testnet
```

## Technical Implementation

### Detection Logic
```typescript
const isIotaWallet = network === 'iota';
```

Uses the `useCurrentWalletMultiChain` hook which automatically detects:
- `network === 'sui'` → Sui wallet
- `network === 'iota'` → IOTA wallet
- `network === null` → No wallet connected

### Automatic Network Switch
The `useEffect` runs whenever:
- IOTA wallet connection changes
- Network selection changes
- Component mounts

It ensures testnet is always selected when IOTA wallet is active.

### Disabled State Styling
```typescript
className={`... ${isIotaWallet
  ? 'opacity-70 cursor-not-allowed'  // Disabled style
  : 'cursor-pointer hover:...'       // Active style
}`}
```

## Integration Points

This component is used in:
- **CostEstimateSection** - Displays the network selector above cost estimates
- **Upload Page** - Shows during video upload flow (steps 2-3)

## Why This Restriction?

**Current Limitation:** IOTA integration with Walrus mainnet is not yet complete.

**Solution:** Force testnet for IOTA wallets until mainnet support is ready.

**Benefits:**
- ✅ Prevents user confusion
- ✅ Clear communication about limitations
- ✅ Smooth UX (automatic switch)
- ✅ Visual feedback (badge + disabled state)
- ✅ Informative modal explaining restrictions

## Future Enhancement

When IOTA mainnet support is ready:
1. Remove the `isIotaWallet` check from the component
2. Remove the auto-force testnet logic
3. Allow IOTA users to select mainnet
4. Update info modal to remove IOTA restrictions

**Code to Remove:**
```typescript
// Remove these when IOTA mainnet is supported
useEffect(() => {
  if (isIotaWallet && walrusNetwork !== 'testnet') {
    setWalrusNetwork('testnet');
  }
}, [isIotaWallet, walrusNetwork, setWalrusNetwork]);

const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  if (isIotaWallet) {  // ← Remove this check
    return;
  }
  setWalrusNetwork(e.target.value as 'mainnet' | 'testnet');
};
```

## Testing

### Test Cases

1. **Connect Sui Wallet**
   - ✓ Can select mainnet/testnet
   - ✓ Dropdown works normally
   - ✓ No IOTA badge shown

2. **Connect IOTA Wallet**
   - ✓ Auto-switches to testnet
   - ✓ Selector becomes disabled
   - ✓ "IOTA" badge appears
   - ✓ Only testnet option shown
   - ✓ Info modal shows IOTA notices

3. **Switch from Sui to IOTA**
   - ✓ Network changes from mainnet → testnet
   - ✓ Console logs the change
   - ✓ UI updates immediately

4. **Switch from IOTA to Sui**
   - ✓ Selector becomes enabled
   - ✓ Badge disappears
   - ✓ Both options available again

## Build Status

✅ **Build passes successfully**
```
✓ Compiled successfully
```

## Related Files

- **Component:** `/components/UploadNetworkSwitcher.tsx`
- **Usage:** `/components/upload/CostEstimateSection.tsx`
- **Hook:** `/lib/hooks/useCurrentWalletMultiChain.ts`
- **Context:** `/lib/context/WalletContext.tsx`

---

**Implementation completed successfully!** 🎉

IOTA wallets are now restricted to testnet only, with clear visual feedback and automatic network switching.
