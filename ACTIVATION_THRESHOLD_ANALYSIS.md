# Activation Threshold Analysis

## Summary
The minimum purchase amount for automatic wallet activation is **$18 USD**.

---

## Configuration Sources

### 1. **Payment Configuration** (`config/paymentConfig.ts`)
```typescript
export const PAYMENT_CONFIG: PaymentConfig = {
  mainnet: {
    activationFeeUSD: 18  // ✅ Mainnet activation fee
  },
  testnet: {
    activationFeeUSD: 15  // ⚠️ Testnet uses $15 (different!)
  }
};
```

**Key Functions:**
- `getActivationFeeUSD(network)` - Returns the activation fee for the current network
- `calculateActivationFeeTON(network, tonPriceUSD)` - Converts USD fee to TON amount

---

### 2. **Sales Packages** (`hooks/useSalesPackages.ts`)

All packages include an `activationFee` field:

| Package | Price Point | Activation Fee | Total Cost |
|---------|-------------|----------------|------------|
| **Wallet Activation** | $0 | $18 | **$18** |
| Bronze Package | $100 | $18 (if not activated) | $118 |
| Bronze+ Package | $200 | $18 (if not activated) | $218 |
| Silver Package | $300 | $18 (if not activated) | $318 |
| ... | ... | ... | ... |
| Ultimate Package | $10,000 | $18 (if not activated) | $10,018 |

**Logic:**
```typescript
activationFee: isActivated ? 0 : 18
```
- If wallet is already activated → no activation fee
- If wallet is NOT activated → add $18 activation fee

---

## Auto-Activation Logic

### **StoreUI.tsx** (Custom RZC Purchase)

The auto-activation check appears in **4 locations**:

#### 1. **Line 325** - Activation Trigger
```typescript
// Auto-activate wallet if purchase is $18+ and not yet activated
if (!walletActivated && costUsd >= 18) {
    const activated = await supabaseService.activateWallet(activationAddress, {
        activation_fee_usd: costUsd,
        activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
        ton_price: tonPrice,
        transaction_hash: txResult.boc
    });
    // ... notification logic
}
```

#### 2. **Line 381** - Metadata Flag
```typescript
auto_activated: !walletActivated && costUsd >= 18
```
Used in reward allocation metadata to track if this purchase triggered activation.

#### 3. **Line 431** - Success Message Variable
```typescript
const wasAutoActivated = !walletActivated && costUsd >= 18;
showSnackbar?.({ 
    message: 'Purchase Complete', 
    description: wasAutoActivated 
        ? `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens and activated your wallet!`
        : `Successfully purchased ${totalRZC.toLocaleString()} RZC tokens`, 
    type: 'success' 
});
```

#### 4. **Line 1142** - Button Text
```typescript
{!walletActivated && costUsd >= 18 ? 'Buy RZC + Activate Wallet' : 'Buy RZC Now'}
```

#### 5. **Line 1153** - Auto-Activation Notice
```typescript
{!walletActivated && costUsd >= 18 && (
    <div className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            ✨ This purchase will automatically activate your wallet!
        </span>
    </div>
)}
```

---

### **GlobalPurchaseModal.tsx** (Package Purchase)

Uses the `activationFee` from the package definition:

```typescript
const totalCost = pkg.pricePoint + pkg.activationFee;

// For activation-only package:
if (pkg.id === 'activation-only') {
    totalCostTON = pkg.activationFee / tonPrice;  // $18 / TON price
}

// Activation logic (always activates for packages):
const activated = await supabaseService.activateWallet(activationAddress, {
    activation_fee_usd: pkg.pricePoint > 0 ? totalCost : pkg.activationFee * validTonPrice,
    activation_fee_ton: totalCostTON,
    ton_price: validTonPrice,
    transaction_hash: txHash
});
```

**Key Difference:**
- **StoreUI**: Auto-activates only if `costUsd >= 18` (custom RZC purchase)
- **GlobalPurchaseModal**: Always activates when purchasing any package (includes activation fee in total)

---

## Current Issues & Recommendations

### ⚠️ **Issue 1: Hardcoded Threshold in StoreUI**
**Problem:**
```typescript
if (!walletActivated && costUsd >= 18) {  // ❌ Hardcoded
```

**Should be:**
```typescript
import { getActivationFeeUSD } from '../config/paymentConfig';

const activationThreshold = getActivationFeeUSD(network);
if (!walletActivated && costUsd >= activationThreshold) {  // ✅ Dynamic
```

**Why:** 
- Testnet uses $15, mainnet uses $18
- Single source of truth prevents inconsistencies
- Easier to update pricing in the future

---

### ⚠️ **Issue 2: Inconsistent Activation Fee Calculation**

**StoreUI** passes the full purchase amount as activation fee:
```typescript
activation_fee_usd: costUsd,  // ❌ Could be $50, $100, etc.
```

**GlobalPurchaseModal** passes the actual activation fee:
```typescript
activation_fee_usd: pkg.activationFee,  // ✅ Always $18
```

**Recommendation:**
```typescript
activation_fee_usd: getActivationFeeUSD(network),  // ✅ Consistent
purchase_amount_usd: costUsd,  // Track full purchase separately
```

---

### ⚠️ **Issue 3: Missing Validation**

**Current:** No check if user is trying to buy less than activation threshold
**Should add:**
```typescript
if (!walletActivated && costUsd < getActivationFeeUSD(network)) {
    showSnackbar?.({
        message: 'Minimum Purchase Required',
        description: `To activate your wallet, minimum purchase is $${getActivationFeeUSD(network)}`,
        type: 'warning'
    });
    return;
}
```

---

### ✅ **Issue 4: Database Function Not Used**

**Current:** StoreUI still uses old activation method:
```typescript
await supabaseService.activateWallet(activationAddress, {...})
```

**Should use:** Atomic activation function from `add_atomic_wallet_activation.sql`:
```typescript
const { data, error } = await supabaseClient.rpc('activate_wallet_atomic', {
    p_wallet_address: activationAddress,
    p_activation_fee_usd: getActivationFeeUSD(network),
    p_activation_fee_ton: costTon,
    p_ton_price: tonPrice,
    p_transaction_hash: txResult.boc,
    p_payment_method: paymentMethod
});
```

**Benefits:**
- Atomic transaction (all-or-nothing)
- Prevents duplicate activations
- Better error handling
- Consistent with audit recommendations

---

## Verification Checklist

- [x] **Mainnet activation fee:** $18 USD
- [x] **Testnet activation fee:** $15 USD (different!)
- [x] **Activation package price:** $18 (matches mainnet)
- [x] **Auto-activation threshold:** `costUsd >= 18` (hardcoded)
- [x] **Package activation fee:** $18 (if not activated)
- [ ] **StoreUI uses config constant:** ❌ No (hardcoded)
- [ ] **StoreUI uses atomic function:** ❌ No (old method)
- [ ] **Consistent activation fee tracking:** ❌ No (passes full amount)

---

## Recommended Changes

### **Priority 1: Use Configuration Constant**

**File:** `components/StoreUI.tsx`

**Replace all instances of `18` with:**
```typescript
import { getActivationFeeUSD } from '../config/paymentConfig';

// At component level:
const activationThreshold = getActivationFeeUSD(network);

// Then use:
if (!walletActivated && costUsd >= activationThreshold) { ... }
```

**Locations to update:**
- Line 325: Activation trigger condition
- Line 381: Metadata flag
- Line 431: Success message variable
- Line 1142: Button text conditional
- Line 1153: Auto-activation notice display

---

### **Priority 2: Use Atomic Activation Function**

**File:** `components/StoreUI.tsx` (Line 325)

**Replace:**
```typescript
const activated = await supabaseService.activateWallet(activationAddress, {
    activation_fee_usd: costUsd,
    activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
    ton_price: tonPrice,
    transaction_hash: txResult.boc
});
```

**With:**
```typescript
const client = supabaseService.getClient();
const { data, error } = await client.rpc('activate_wallet_atomic', {
    p_wallet_address: activationAddress,
    p_activation_fee_usd: activationThreshold,
    p_activation_fee_ton: paymentMethod === 'TON' ? costTon : 0,
    p_ton_price: tonPrice,
    p_transaction_hash: txResult.boc,
    p_payment_method: paymentMethod
});

if (error) throw error;
const activated = data?.success || false;
```

---

### **Priority 3: Add Minimum Purchase Validation**

**File:** `components/StoreUI.tsx` (Line ~213, in `handlePurchase`)

**Add after wallet connection check:**
```typescript
// Validate minimum purchase for activation
if (!walletActivated && costUsd < activationThreshold) {
    showSnackbar?.({
        message: 'Minimum Purchase Required',
        description: `To activate your wallet, minimum purchase is $${activationThreshold}. Current: $${costUsd.toFixed(2)}`,
        type: 'warning'
    });
    return;
}
```

---

## Testing Scenarios

### **Scenario 1: Below Threshold (Not Activated)**
- **Purchase:** $10 RZC
- **Expected:** Warning message, no activation
- **Current:** Allows purchase, no activation (correct)

### **Scenario 2: At Threshold (Not Activated)**
- **Purchase:** $18 RZC
- **Expected:** Auto-activation + RZC purchase
- **Current:** ✅ Works correctly

### **Scenario 3: Above Threshold (Not Activated)**
- **Purchase:** $50 RZC
- **Expected:** Auto-activation + RZC purchase
- **Current:** ✅ Works correctly

### **Scenario 4: Any Amount (Already Activated)**
- **Purchase:** Any amount
- **Expected:** RZC purchase only, no activation
- **Current:** ✅ Works correctly

### **Scenario 5: Testnet vs Mainnet**
- **Testnet:** Should use $15 threshold
- **Mainnet:** Should use $18 threshold
- **Current:** ❌ Always uses $18 (hardcoded)

---

## Summary

**Current State:**
- ✅ Activation threshold is $18 USD (mainnet)
- ✅ Auto-activation works for purchases >= $18
- ❌ Threshold is hardcoded (should use config)
- ❌ Testnet difference not respected ($15 vs $18)
- ❌ Not using atomic activation function
- ❌ Activation fee tracking inconsistent

**Next Steps:**
1. Replace hardcoded `18` with `getActivationFeeUSD(network)`
2. Switch to `activate_wallet_atomic()` RPC function
3. Add minimum purchase validation
4. Test on both mainnet and testnet
5. Verify activation fee is tracked correctly in database

**Estimated Time:** 20-30 minutes
**Risk Level:** Low (backward compatible changes)
**Testing Required:** Yes (both networks, multiple purchase amounts)
