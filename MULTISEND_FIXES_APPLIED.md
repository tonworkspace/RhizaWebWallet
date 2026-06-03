# Multisend & RZC Pricing Fixes Applied ✅

## Changes Made

### 1. Fixed Decimal Precision Mismatch ✅

**File:** `components/StoreUI.tsx`

**Before:**
```typescript
{ address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(4), comment: 'RhizaCore RZC Purchase' },
{ address: sponsorWallet, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
```

**After:**
```typescript
{ address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
{ address: validatedSponsor, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
```

**Impact:** Both amounts now use 6 decimal precision, preventing rounding errors.

### 2. Added Sponsor Address Validation ✅

**File:** `components/StoreUI.tsx`

**Added:**
```typescript
try {
    // ✅ Validate and normalize sponsor address
    const { Address } = await import('@ton/ton');
    const validatedSponsor = Address.parse(sponsorWallet).toString({
        bounceable: false,
        testOnly: network === 'testnet'
    });
    // ... use validatedSponsor in multisend
} catch (addrErr) {
    console.error('[StoreUI] ❌ Invalid sponsor address, falling back to single transaction:', addrErr);
    // Fallback to single transaction
}
```

**Impact:** 
- Validates sponsor wallet address before multisend
- Normalizes to non-bounceable format with correct network flag
- Falls back to single transaction if address is invalid
- Prevents transaction failures due to malformed addresses

### 3. Added Debug Logging ✅

**File:** `components/StoreUI.tsx`

**Added after sponsor wallet fetch:**
```typescript
console.log('[StoreUI] 🔍 Sponsor wallet lookup complete:', {
    currentTonAddress: currentTonAddress ? currentTonAddress.substring(0, 8) + '...' : 'NONE',
    sponsorWallet: sponsorWallet ? sponsorWallet.substring(0, 8) + '...' : 'NONE',
    willUseMultisend: !!sponsorWallet
});
```

**Added before multisend:**
```typescript
console.log('[StoreUI] 💎 Multisend triggered:', {
    total: costTon.toFixed(6),
    platform: platformAmountTON.toFixed(6),
    referrer: tonCommissionAmount.toFixed(6),
    referrerWallet: validatedSponsor.substring(0, 8) + '...'
});
```

**Impact:** Easy debugging to verify multisend is triggered and amounts are correct.

---

## Database Fix Required

### Fix RZC Commission Calculation ⚠️

**File:** `fix_store_commission_dynamic_price.sql` (already created)

**Issue:** Database function uses hardcoded $0.12 RZC price

**Fix:** Run this SQL to update the function to use dynamic ICO round pricing:

```bash
psql -f fix_store_commission_dynamic_price.sql
```

**Impact:**
- **Before:** $5 purchase → 4.17 RZC commission (wrong!)
- **After:** $5 purchase → 10 RZC commission (correct at $0.05/RZC)

---

## RZC Pricing Verification ✅

### StoreUI Already Uses Live ICO Data

**File:** `components/StoreUI.tsx` (Lines 195-197)

```typescript
// ✅ ALWAYS use database price from active ICO round (ignore localStorage overrides)
// The ICO system is the single source of truth for RZC pricing
const RZC_PRICE_USD  = activeRound.price_usd;  // Direct from DB, no overrides
const NEXT_ROUND_PRICE = activeRound.next_round_price;  // live from DB
const LISTING_PRICE    = 1.00;
```

**Status:** ✅ Already correct - uses `useSaleRound()` hook which queries `ico_rounds` table

---

## Testing Instructions

### 1. Verify Database Fix

```sql
-- Check current active round price
SELECT round_name, price_usd, is_active 
FROM ico_rounds 
WHERE is_active = TRUE;

-- Expected: Seed Round, $0.05, true
```

### 2. Test Multisend Flow

**With Referrer:**
1. Open browser console (F12)
2. Navigate to Store
3. Enter purchase amount
4. Click "Buy RZC Now"
5. Check console logs:

```
[StoreUI] 🔍 Sponsor wallet lookup complete: {
  currentTonAddress: "UQAbc...",
  sponsorWallet: "UQDef...",
  willUseMultisend: true
}

[StoreUI] 💎 Multisend triggered: {
  total: "0.500000",
  platform: "0.450000",
  referrer: "0.050000",
  referrerWallet: "UQDef..."
}
```

6. After transaction, check on TonViewer:
   - Go to: `https://tonviewer.com/transaction/{txHash}`
   - Verify 2 outgoing messages
   - Message 1: 90% to treasury
   - Message 2: 10% to referrer

**Without Referrer:**
```
[StoreUI] 🔍 Sponsor wallet lookup complete: {
  currentTonAddress: "UQAbc...",
  sponsorWallet: "NONE",
  willUseMultisend: false
}
```

### 3. Test RZC Commission

**Setup:**
- User A (buyer) has referrer code pointing to User B
- User A buys $5 of RZC

**Expected Results:**

**Buyer (User A):**
```sql
SELECT amount, transaction_type, description
FROM rzc_transactions
WHERE user_id = 'USER_A_ID'
ORDER BY created_at DESC LIMIT 1;

-- Expected: 100 RZC, 'package_purchase', 'Direct RZC store purchase'
```

**Referrer (User B):**
```sql
SELECT amount, transaction_type, description
FROM rzc_transactions
WHERE user_id = 'USER_B_ID'
  AND transaction_type = 'referral_commission'
ORDER BY created_at DESC LIMIT 1;

-- Expected: 10 RZC, 'referral_commission', '10% commission from Store RZC Purchase'
-- (NOT 4.17 RZC!)
```

**TON Commission Record:**
```sql
SELECT commission_ton, paid
FROM ton_commissions
WHERE buyer_user_id = 'USER_A_ID'
ORDER BY created_at DESC LIMIT 1;

-- Expected: 0.05 TON (10% of 0.5 TON), paid = false
```

---

## Summary

### ✅ Fixed Issues

1. **Decimal Precision:** Both platform and referrer amounts now use 6 decimals
2. **Address Validation:** Sponsor wallet is validated and normalized before multisend
3. **Error Handling:** Falls back to single transaction if sponsor address is invalid
4. **Debug Logging:** Console logs show multisend trigger and amounts
5. **RZC Pricing:** Already using live ICO round data (no changes needed)

### ⚠️ Action Required

1. **Run Database Fix:** `psql -f fix_store_commission_dynamic_price.sql`
2. **Test on Testnet:** Make a test purchase with a referrer
3. **Verify TonViewer:** Check transaction has 2 messages
4. **Check Database:** Verify RZC commission is 10 RZC (not 4.17)

### 🎯 Expected Behavior

**For a $5 RZC purchase with referrer:**

**On-Chain (TON):**
- Message 1: 0.45 TON → Treasury (90%)
- Message 2: 0.05 TON → Referrer (10%)

**Database (RZC):**
- Buyer: +100 RZC (at $0.05/RZC)
- Referrer: +10 RZC (10% commission at $0.05/RZC)

**Database (TON Commission):**
- Record: 0.05 TON pending payout to referrer

---

## Files Modified

1. ✅ `components/StoreUI.tsx` - Fixed precision, added validation, added logging
2. ⚠️ Database - Need to apply `fix_store_commission_dynamic_price.sql`

## Files Created

1. ✅ `MULTISEND_AND_PRICING_AUDIT.md` - Complete audit documentation
2. ✅ `MULTISEND_FIXES_APPLIED.md` - This summary
3. ✅ `fix_store_commission_dynamic_price.sql` - Database fix (already exists)
4. ✅ `check_missing_commissions.sql` - Diagnostic queries (already exists)
5. ✅ `check_user_referrer_for_ton_split.sql` - User referrer check (already exists)

All systems are now ready for testing! 🚀
