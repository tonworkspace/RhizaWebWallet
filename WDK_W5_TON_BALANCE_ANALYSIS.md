# WDK W5 TON Balance Display Issue - Root Cause Analysis

## Executive Summary

The TON balance is not displaying for WDK W5 wallets due to **multiple initialization failures** in the wallet chain. While TON initialization appears successful, the actual balance fetching and display logic has several failure points.

---

## Wallet Initialization Status

### ✅ Working Wallets
1. **Primary TON Wallet (V4)** - `tonWalletService.ts`
   - Uses `@ton/ton` WalletContractV4
   - Direct TonCenter V3 API integration
   - Balance caching with deposit detection
   - **Status**: Fully functional

### ❌ Partially Working Wallets

2. **WDK TON Wallet (V5R1)** - `tetherWdkService.ts`
   - Uses `@tetherto/wdk-wallet-ton` WalletContractV5R1
   - Hybrid V2/V3 TonCenter approach
   - **Status**: Initializes but balance display fails

### ❌ Not Initializing Wallets

3. **WDK EVM Wallet** - `tetherWdkService.ts`
   - Uses `@tetherto/wdk-wallet-evm`
   - RPC failover system
   - **Status**: May fail silently due to RPC timeouts

4. **WDK BTC Wallet** - `tetherWdkService.ts`
   - Uses `@tetherto/wdk-wallet-btc`
   - Electrum WebSocket connection
   - **Status**: Fails when Electrum is unavailable

5. **WDK Solana Wallet** - `tetherWdkService.ts`
   - Uses `@tetherto/wdk-wallet-solana`
   - **Status**: May fail due to RPC issues

6. **WDK Tron Wallet** - `tetherWdkService.ts`
   - Uses `@tetherto/wdk-wallet-tron`
   - **Status**: May fail due to API issues

---

## Root Cause: WDK TON Balance Not Showing

### Issue Location
**File**: `context/WalletContext.tsx`
**Function**: `refreshData()` (lines 200-350)

### The Problem Chain

#### 1. **Balance Fetch Logic** (Lines 200-230)
```typescript
const balancePromise = useWdk
  ? (async () => {
      const { tetherWdkService } = await import('../services/tetherWdkService');
      if (!tetherWdkService.isTonReady()) return; // ❌ EXITS EARLY
      // WDK path: sync via balanceSyncService for DB persistence
      const addresses = await tetherWdkService.getAddresses();
      if (addresses?.tonAddress) {
        addr = addresses.tonAddress;
        const result = await balanceSyncService.syncBalance(
          addresses.tonAddress,
          network as 'mainnet' | 'testnet',
          userProfile?.id,
          forceRefresh
        );
        setBalance(result.balance); // ✅ Should set balance here
      }
    })()
```

**Issue**: The `isTonReady()` check may return `false` even when TON is initialized, causing an early exit.

#### 2. **WDK Initialization Check** (Lines 232-280)
```typescript
const wdkPromise = (async () => {
  try {
    const { tetherWdkService } = await import('../services/tetherWdkService');

    if (!tetherWdkService.isInitialized() && 
        tetherWdkService.hasStoredWallet() && 
        !tetherWdkService.isEncrypted()) {
      const savedPhrase = await tetherWdkService.getStoredWallet('');
      if (savedPhrase) await tetherWdkService.initializeManagers(savedPhrase);
    }
```

**Issue**: The `isInitialized()` method requires **ALL** chains (EVM, TON, BTC) to be ready:

```typescript
// services/tetherWdkService.ts line 380
isInitialized(): boolean {
  return !!(this.evmAccount && this.tonAccount && this.btcAccount);
}
```

This means if EVM or BTC fails, the entire wallet is considered "not initialized" even though TON is working.

#### 3. **Balance Sync Service** (Lines 250-280)
```typescript
if (tetherWdkService.isTonReady()) {
  // Snapshot which chains are actually usable
  setWdkHealth(tetherWdkService.getWalletHealth());

  const addresses = await tetherWdkService.getAddresses();
  if (!addresses) return; // ❌ EXITS if addresses fail

  // ... balance sync logic
  const synced = await balanceSyncService.syncMultiChainBalances(
    {
      ton:  addresses.tonAddress  || undefined,
      evm:  addresses.evmAddress  || undefined,
      btc:  addresses.btcAddress  || undefined,
      sol:  addresses.solAddress  || undefined,
      tron: addresses.tronAddress || undefined,
    },
    network as 'mainnet' | 'testnet',
    userProfile?.id,
    usdtRaw,
    activeChain,
    forceRefresh
  );

  setMultiChainBalances({
    evm:  synced.evm,
    btc:  synced.btc,
    ton:  synced.ton, // ✅ TON balance is here
    usdt: synced.usdt,
    sol:  synced.sol,
    tron: synced.tron,
  });

  // For WDK-only users, also update the primary balance state
  if (useWdk && synced.ton && parseFloat(synced.ton) > 0) {
    setBalance(synced.ton); // ✅ Should update balance
    if (addresses.tonAddress) addr = addresses.tonAddress;
  }
}
```

**Issue**: The balance is set in `multiChainBalances.ton` but may not propagate to the main `balance` state used by `useBalance` hook.

#### 4. **useBalance Hook** (hooks/useBalance.ts)
```typescript
export const useBalance = () => {
  const { balance: tonBalanceStr, network, rzcPrice: contextRzcPrice } = useWallet();
  
  const tonBalance = parseFloat(tonBalanceStr) || 0; // ❌ Reads from WalletContext.balance
```

**Issue**: The `useBalance` hook reads from `WalletContext.balance`, not from `multiChainBalances.ton`. If the WDK balance update logic fails, the hook shows 0.

---

## Why WDK TON Balance Fails

### Failure Scenario 1: EVM/BTC Init Failure Blocks TON
1. User logs in with WDK wallet (secondary)
2. `tetherWdkService.initializeManagers()` is called
3. EVM initialization fails (RPC timeout)
4. BTC initialization fails (Electrum unavailable)
5. `isInitialized()` returns `false` (requires all 3 chains)
6. `isTonReady()` returns `true` (TON is actually working)
7. Balance fetch logic checks `isTonReady()` but the early exit in `wdkPromise` prevents proper initialization
8. Balance remains at 0

### Failure Scenario 2: Balance State Not Updated
1. WDK TON initializes successfully
2. `balanceSyncService.syncMultiChainBalances()` fetches TON balance
3. Balance is stored in `multiChainBalances.ton`
4. The conditional update `if (useWdk && synced.ton && parseFloat(synced.ton) > 0)` may not execute
5. `WalletContext.balance` remains "0.00"
6. `useBalance` hook reads "0.00"

### Failure Scenario 3: Race Condition
1. `balancePromise` and `wdkPromise` run in parallel
2. `balancePromise` checks `isTonReady()` before `wdkPromise` completes initialization
3. Early exit occurs
4. Balance is never fetched

---

## Evidence from Code

### 1. WDK Health Check (tetherWdkService.ts:1380)
```typescript
getWalletHealth(): {
  evm: boolean;
  ton: boolean;
  btc: boolean;
  sol: boolean;
  tron: boolean;
} {
  return {
    evm: !!this.evmAccount && !!this.evmManager,
    ton: !!this.tonAccount && !!this.tonManager && !!this.nativeTonContract,
    btc: !!this.btcAccount && !!this.btcManager,
    sol: !!this.solAccount && !!this.solManager,
    tron: !!this.tronAccount && !!this.tronManager
  };
}
```

This shows TON can be healthy even when other chains fail.

### 2. Balance Fetch Race (WalletContext.tsx:200-280)
```typescript
// Run both in parallel — don't wait for WDK to get the primary TON balance
await Promise.all([balancePromise, wdkPromise]);
```

The parallel execution can cause timing issues.

### 3. Conditional Balance Update (WalletContext.tsx:275)
```typescript
// For WDK-only users, also update the primary balance state so
// useBalance hook (which reads WalletContext.balance) shows the correct value.
if (useWdk && synced.ton && parseFloat(synced.ton) > 0) {
  setBalance(synced.ton);
  if (addresses.tonAddress) addr = addresses.tonAddress;
}
```

This conditional may not execute if:
- `useWdk` is false (but it should be true for WDK wallets)
- `synced.ton` is "0.0000" (balance fetch failed)
- `parseFloat(synced.ton)` is 0 (no balance)

---

## Recommended Fixes

### Fix 1: Decouple TON from Other Chains
**File**: `services/tetherWdkService.ts`

Change `isInitialized()` to not require all chains:
```typescript
isInitialized(): boolean {
  // At minimum, TON must be ready for Rhiza to function
  return !!this.tonAccount;
}
```

### Fix 2: Always Update Balance for WDK
**File**: `context/WalletContext.tsx`

Remove the `parseFloat(synced.ton) > 0` condition:
```typescript
// For WDK-only users, also update the primary balance state
if (useWdk && synced.ton) {
  setBalance(synced.ton); // Update even if 0
  if (addresses.tonAddress) addr = addresses.tonAddress;
}
```

### Fix 3: Add Fallback Balance Fetch
**File**: `context/WalletContext.tsx`

Add a direct WDK balance fetch if `balanceSyncService` fails:
```typescript
if (useWdk && addresses?.tonAddress) {
  try {
    const result = await balanceSyncService.syncBalance(
      addresses.tonAddress,
      network as 'mainnet' | 'testnet',
      userProfile?.id,
      forceRefresh
    );
    setBalance(result.balance);
  } catch (err) {
    // Fallback: direct WDK balance fetch
    console.warn('⚠️ balanceSyncService failed, using direct WDK fetch');
    const balances = await tetherWdkService.getBalances();
    if (balances?.tonBalance) {
      setBalance(balances.tonBalance);
    }
  }
}
```

### Fix 4: Improve Error Logging
Add detailed logging to identify which step fails:
```typescript
console.log('[WDK/TON] Balance fetch started');
console.log('[WDK/TON] isTonReady:', tetherWdkService.isTonReady());
console.log('[WDK/TON] isInitialized:', tetherWdkService.isInitialized());
console.log('[WDK/TON] Wallet health:', tetherWdkService.getWalletHealth());
```

---

## Testing Checklist

- [ ] Log in with WDK wallet (secondary)
- [ ] Check console for `[WDK/TON]` initialization logs
- [ ] Verify `getWalletHealth()` shows `ton: true`
- [ ] Check if `multiChainBalances.ton` has a value
- [ ] Check if `WalletContext.balance` is updated
- [ ] Verify `useBalance` hook returns correct TON balance
- [ ] Test with EVM/BTC initialization failures
- [ ] Test with fresh wallet (0 balance)
- [ ] Test with funded wallet (>0 balance)

---

## Summary

**Which wallets are not initializing?**
- EVM, BTC, Solana, Tron may fail silently due to RPC/API issues
- TON initializes successfully but balance display fails

**Root cause of TON balance not showing:**
1. `isInitialized()` requires all chains, blocking TON-only operation
2. Balance state update conditional may not execute
3. Race condition between `balancePromise` and `wdkPromise`
4. `useBalance` hook reads from wrong state variable

**Recommended priority:**
1. Fix `isInitialized()` to only require TON (HIGH)
2. Remove balance > 0 condition (HIGH)
3. Add fallback balance fetch (MEDIUM)
4. Improve error logging (LOW)
