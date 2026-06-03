# Multisend TON Commission & RZC Pricing Audit

## Executive Summary

This document audits the TON multisend commission system and RZC pricing to ensure:
1. ✅ TON is properly split 90/10 between platform and referrer on-chain
2. ✅ RZC pricing uses live ICO round data (not hardcoded values)
3. ✅ Commission calculations use correct dynamic RZC prices

---

## Part 1: TON Multisend Flow Audit

### Current Implementation Status: ✅ CORRECT

Both `tonWalletService` and `tetherWdkService` have proper multisend implementations.

#### tonWalletService.sendMultiTransaction (Lines 675-795)

```typescript
async sendMultiTransaction(
  recipients: { address: string; amount: string; comment?: string }[]
): Promise<{ success: boolean; txHash?: string; seqno?: number; error?: string }>
```

**✅ Validates:**
- 1-4 recipients (TON V4 wallet limit)
- All addresses are valid
- All amounts are positive numbers
- Total balance covers amount + gas (0.015 TON)

**✅ Security:**
- Sanitizes comments to prevent XSS
- Adds network tag `[mainnet]` or `[testnet]` to prevent replay attacks
- Uses non-bounceable addresses

**✅ Broadcasting:**
- Creates signed transfer with all messages
- Wraps in External Message Envelope
- Computes normalized hash (TEP-467) for TonViewer lookup
- Broadcasts via TonCenter V3 `/message` endpoint (not deprecated V2 sendBoc)
- Waits for seqno confirmation (up to 30 seconds)

#### tetherWdkService.sendTonMultiTransaction (Lines 809-905)

```typescript
async sendTonMultiTransaction(
  recipients: Array<{ address: string; amount: string; comment?: string }>
): Promise<{ success: boolean; txHash?: string; fee?: string; error?: string }>
```

**✅ Validates:**
- Up to 255 recipients (W5R1 wallet supports more than V4)
- Extracts signing keys from WDK memory
- Uses WDK's internal V5R1 wallet contract

**✅ Security:**
- Same sanitization and network tagging as tonWalletService
- Uses device-encrypted key storage

**✅ Broadcasting:**
- Same External Message wrapping
- Same normalized hash computation
- Same V3 `/message` endpoint
- Same confirmation logic

### StoreUI Multisend Logic (Lines 340-365)

```typescript
if (paymentMethod === 'TON') {
    let paymentResult;

    // ── Multi-send: split 10% to sponsor on-chain if referrer exists ──
    const tonCommissionAmount = sponsorWallet
        ? parseFloat((costTon * 0.10).toFixed(6))
        : 0;
    const platformAmountTON = sponsorWallet
        ? parseFloat((costTon - tonCommissionAmount).toFixed(6))
        : costTon;

    if (sponsorWallet && tonCommissionAmount > 0) {
        const msgs = [
            { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(4), comment: 'RhizaCore RZC Purchase' },
            { address: sponsorWallet,              amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
        ];
        paymentResult = useWdk
            ? await tetherWdkService.sendTonMultiTransaction(msgs)
            : await tonWalletService.sendMultiTransaction(msgs);
    } else {
        // Single transaction if no referrer
        paymentResult = useWdk
            ? await tetherWdkService.sendTonTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase')
            : await tonWalletService.sendTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase');
    }
}
```

**✅ Logic is correct:**
- Calculates 10% commission: `costTon * 0.10`
- Calculates 90% platform: `costTon - tonCommissionAmount`
- Uses `.toFixed(6)` for commission (high precision)
- Uses `.toFixed(4)` for platform amount

**⚠️ ISSUE FOUND: Precision Mismatch**

The platform amount uses `.toFixed(4)` but commission uses `.toFixed(6)`. This could cause rounding errors.

**Example:**
- User pays: 0.123456 TON
- Commission: 0.012346 TON (6 decimals)
- Platform: 0.1111 TON (4 decimals) ❌ Should be 0.111110

**Fix:** Use consistent 6 decimals for both.

---

## Part 2: RZC Pricing Audit

### Current Implementation Status: ✅ CORRECT

StoreUI uses live ICO round data from the database.

#### StoreUI RZC Price Source (Lines 195-197)

```typescript
// ✅ ALWAYS use database price from active ICO round (ignore localStorage overrides)
// The ICO system is the single source of truth for RZC pricing
const RZC_PRICE_USD  = activeRound.price_usd;  // Direct from DB, no overrides
const NEXT_ROUND_PRICE = activeRound.next_round_price;  // live from DB
const LISTING_PRICE    = 1.00;
```

**✅ Correct:**
- Uses `activeRound.price_usd` from `useSaleRound()` hook
- No localStorage overrides
- No hardcoded fallbacks

#### useSaleRound Hook (hooks/useSaleRound.ts)

```typescript
const { data: roundData, error, isLoading } = useQuery({
  queryKey: ['saleRound', network],
  queryFn: async () => {
    const client = supabaseService.getClient();
    if (!client) throw new Error('Supabase not initialized');

    const { data, error } = await client
      .from('ico_rounds')
      .select('*')
      .eq('is_active', true)
      .order('round_number', { ascending: true })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  },
  staleTime: 30_000, // 30 seconds
  refetchInterval: 60_000, // 1 minute
});
```

**✅ Correct:**
- Queries `ico_rounds` table for active round
- Filters by `is_active = true`
- Orders by `round_number` ascending (gets earliest active round)
- Refetches every 60 seconds to stay current

### Database Commission Pricing (award_package_purchase_commission)

**❌ CRITICAL ISSUE: Hardcoded $0.12 RZC Price**

The database function `award_package_purchase_commission` uses a hardcoded price:

```sql
v_rzc_price NUMERIC := 0.12; -- ❌ HARDCODED - WRONG!
```

**Impact:**
- For $5 purchase: Commission = $0.50 ÷ $0.12 = **4.17 RZC** (wrong!)
- Should be: Commission = $0.50 ÷ $0.05 = **10 RZC** (correct!)

**Fix:** Already created in `fix_store_commission_dynamic_price.sql`

---

## Part 3: Issues Found & Fixes

### Issue 1: Precision Mismatch in Multisend Amounts

**Location:** StoreUI.tsx lines 351-352

**Problem:**
```typescript
{ address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(4), comment: 'RhizaCore RZC Purchase' },
{ address: sponsorWallet,              amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
```

Platform uses 4 decimals, commission uses 6 decimals.

**Fix:**
```typescript
{ address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
{ address: sponsorWallet,              amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
```

### Issue 2: Database Commission Uses Hardcoded RZC Price

**Location:** `award_package_purchase_commission` function

**Problem:** Uses $0.12 instead of current ICO round price

**Fix:** Apply `fix_store_commission_dynamic_price.sql`

### Issue 3: Missing Debug Logging

**Location:** StoreUI.tsx multisend flow

**Problem:** No console logs to verify multisend is being triggered

**Fix:** Add debug logging (see below)

---

## Part 4: Recommended Fixes

### Fix 1: Consistent Decimal Precision

```typescript
// StoreUI.tsx line 351-352
if (sponsorWallet && tonCommissionAmount > 0) {
    const msgs = [
        { 
            address: RHIZACORE_TREASURY_ADDRESS, 
            amount: platformAmountTON.toFixed(6), // ✅ Changed from .toFixed(4)
            comment: 'RhizaCore RZC Purchase' 
        },
        { 
            address: sponsorWallet, 
            amount: tonCommissionAmount.toFixed(6), 
            comment: 'RhizaCore 10% Referral Commission' 
        },
    ];
    
    console.log('[StoreUI] 💎 Multisend triggered:', {
        total: costTon,
        platform: platformAmountTON,
        referrer: tonCommissionAmount,
        referrerWallet: sponsorWallet.substring(0, 8) + '...'
    });
    
    paymentResult = useWdk
        ? await tetherWdkService.sendTonMultiTransaction(msgs)
        : await tonWalletService.sendMultiTransaction(msgs);
}
```

### Fix 2: Apply Database Commission Fix

```bash
# Run the SQL fix
psql -f fix_store_commission_dynamic_price.sql
```

### Fix 3: Add Sponsor Wallet Debug Logging

```typescript
// StoreUI.tsx after line 165 (end of fetchSponsor useEffect)
} finally {
    setIsLoadingSponsor(false);
}

console.log('[StoreUI] 🔍 Sponsor wallet lookup:', {
    currentTonAddress: currentTonAddress?.substring(0, 8) + '...',
    sponsorWallet: sponsorWallet ? sponsorWallet.substring(0, 8) + '...' : 'NONE',
    willUseMultisend: !!sponsorWallet
});
```

### Fix 4: Validate Sponsor Wallet Address Format

```typescript
// StoreUI.tsx line 340 - before multisend
if (sponsorWallet && tonCommissionAmount > 0) {
    try {
        // ✅ Validate and normalize sponsor address
        const { Address } = await import('@ton/ton');
        const validatedSponsor = Address.parse(sponsorWallet).toString({
            bounceable: false,
            testOnly: network === 'testnet'
        });
        
        const msgs = [
            { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
            { address: validatedSponsor, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
        ];
        
        console.log('[StoreUI] 💎 Multisend validated:', {
            platform: platformAmountTON.toFixed(6),
            referrer: tonCommissionAmount.toFixed(6),
            referrerAddress: validatedSponsor.substring(0, 8) + '...'
        });
        
        paymentResult = useWdk
            ? await tetherWdkService.sendTonMultiTransaction(msgs)
            : await tonWalletService.sendMultiTransaction(msgs);
    } catch (addrErr) {
        console.error('[StoreUI] ❌ Invalid sponsor address:', addrErr);
        // Fallback to single transaction
        paymentResult = useWdk
            ? await tetherWdkService.sendTonTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase')
            : await tonWalletService.sendTransaction(RHIZACORE_TREASURY_ADDRESS, costTon.toFixed(4), 'RhizaCore RZC Purchase');
    }
}
```

---

## Part 5: Testing Checklist

### Pre-Test Setup

1. ✅ Apply database fix: `fix_store_commission_dynamic_price.sql`
2. ✅ Apply StoreUI precision fix (6 decimals for both amounts)
3. ✅ Add debug logging
4. ✅ Verify active ICO round in database:

```sql
SELECT round_name, price_usd, is_active 
FROM ico_rounds 
WHERE is_active = TRUE;
```

### Test Case 1: User WITH Referrer

**Setup:**
- User has `referrer_code` in database
- Referrer has valid `wallet_address`

**Expected Console Logs:**
```
[StoreUI] 🔍 Sponsor wallet lookup: {
  currentTonAddress: "UQAbc...",
  sponsorWallet: "UQDef...",
  willUseMultisend: true
}

[StoreUI] 💎 Multisend triggered: {
  total: 0.5,
  platform: 0.45,
  referrer: 0.05,
  referrerWallet: "UQDef..."
}

[StoreUI] 💎 Multisend validated: {
  platform: "0.450000",
  referrer: "0.050000",
  referrerAddress: "UQDef..."
}
```

**Expected On-Chain:**
- Transaction has 2 messages
- Message 1: 0.45 TON to treasury
- Message 2: 0.05 TON to referrer
- Check on TonViewer: `https://tonviewer.com/transaction/{txHash}`

**Expected Database:**
```sql
-- Check TON commission record
SELECT * FROM ton_commissions 
WHERE buyer_user_id = 'USER_ID' 
ORDER BY created_at DESC LIMIT 1;

-- Should show:
-- commission_ton: 0.05
-- paid: false (pending manual payout)
```

### Test Case 2: User WITHOUT Referrer

**Setup:**
- User has no `referrer_code` or referrer has no wallet

**Expected Console Logs:**
```
[StoreUI] 🔍 Sponsor wallet lookup: {
  currentTonAddress: "UQAbc...",
  sponsorWallet: "NONE",
  willUseMultisend: false
}

[StoreUI] Using single transaction (no referrer)
```

**Expected On-Chain:**
- Transaction has 1 message
- Message 1: 0.5 TON to treasury (100%)

### Test Case 3: RZC Pricing

**Setup:**
- Active ICO round: Seed Round at $0.05/RZC

**Test:**
1. Buy 1000 RZC
2. Check console for price used
3. Verify commission calculation

**Expected:**
```
Purchase: $50 (1000 RZC × $0.05)
RZC Commission: $5 ÷ $0.05 = 100 RZC (not 41.67 RZC!)
```

**Verify in Database:**
```sql
SELECT 
  rt.amount as rzc_awarded,
  rt.metadata->>'package_price_usd' as purchase_usd,
  (rt.metadata->>'package_price_usd')::NUMERIC * 0.10 as commission_usd,
  ((rt.metadata->>'package_price_usd')::NUMERIC * 0.10) / 0.05 as expected_commission_rzc
FROM rzc_transactions rt
WHERE rt.user_id = 'REFERRER_USER_ID'
  AND rt.transaction_type = 'referral_commission'
ORDER BY rt.created_at DESC
LIMIT 1;
```

---

## Part 6: Summary

### ✅ What's Working

1. **Multisend Implementation:** Both wallet services have correct multisend logic
2. **RZC Pricing:** StoreUI uses live ICO round data from database
3. **Security:** Comments are sanitized, network tags prevent replay attacks
4. **Broadcasting:** Uses correct TonCenter V3 `/message` endpoint

### ⚠️ Issues Found

1. **Precision Mismatch:** Platform amount uses 4 decimals, commission uses 6
2. **Database Commission:** Uses hardcoded $0.12 instead of dynamic price
3. **Missing Validation:** Sponsor wallet address not validated before multisend
4. **No Debug Logging:** Hard to diagnose if multisend is triggered

### 🔧 Fixes Required

1. ✅ Change `platformAmountTON.toFixed(4)` to `.toFixed(6)`
2. ✅ Apply `fix_store_commission_dynamic_price.sql`
3. ✅ Add sponsor address validation
4. ✅ Add debug console logs

### 📊 Expected Results After Fixes

- **TON Multisend:** 90/10 split with 6-decimal precision
- **RZC Commission:** Calculated at current ICO price ($0.05 for seed)
- **Database Records:** Accurate TON and RZC commission tracking
- **User Experience:** Referrers receive both on-chain TON and database RZC rewards

---

## Next Steps

1. Apply the precision fix to StoreUI.tsx
2. Run the database commission fix SQL
3. Test with a real purchase (testnet first!)
4. Monitor console logs to verify multisend triggers
5. Check TonViewer to confirm 2 messages sent
6. Verify database records for both TON and RZC commissions
