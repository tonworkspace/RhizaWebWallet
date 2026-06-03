# TON Multisend Flow Analysis - StoreUI

## Overview

When a user buys RZC with TON payment and has a referrer, the system should:
1. Send 90% of TON to RhizaCore treasury
2. Send 10% of TON directly to the referrer's wallet (on-chain commission)

## Flow Breakdown

### 1. Sponsor Wallet Lookup (Lines 140-165)

```typescript
useEffect(() => {
    const fetchSponsor = async () => {
        const profileResult = await supabaseService.getProfile(currentTonAddress);
        if (profileResult.success && profileResult.data?.referrer_code) {
            const referrerData = await supabaseService.getUserByReferralCode(profileResult.data.referrer_code);
            if (referrerData.success && referrerData.data?.user_id) {
                const referrerProfile = await supabaseService.getProfileById(referrerData.data.user_id);
                if (referrerProfile.success && referrerProfile.data?.wallet_address) {
                    setSponsorWallet(referrerProfile.data.wallet_address); // ✅ Sets referrer's wallet
                }
            }
        }
    };
    fetchSponsor();
}, [currentTonAddress]);
```

**Status:** ✅ Correctly fetches referrer's wallet address from database

### 2. Payment Calculation (Lines 340-348)

```typescript
if (paymentMethod === 'TON') {
    // ── Multi-send: split 10% to sponsor on-chain if referrer exists ──
    const tonCommissionAmount = sponsorWallet
        ? parseFloat((costTon * 0.10).toFixed(6))  // 10% to referrer
        : 0;
    const platformAmountTON = sponsorWallet
        ? parseFloat((costTon - tonCommissionAmount).toFixed(6))  // 90% to platform
        : costTon;
```

**Example:** If user pays 1 TON:
- `tonCommissionAmount` = 0.1 TON (10%)
- `platformAmountTON` = 0.9 TON (90%)

**Status:** ✅ Correctly calculates split

### 3. Multisend Execution (Lines 350-360)

```typescript
if (sponsorWallet && tonCommissionAmount > 0) {
    const msgs = [
        { 
            address: RHIZACORE_TREASURY_ADDRESS, 
            amount: platformAmountTON.toFixed(4),  // 90% to treasury
            comment: 'RhizaCore RZC Purchase' 
        },
        { 
            address: sponsorWallet,  // 10% to referrer
            amount: tonCommissionAmount.toFixed(6), 
            comment: 'RhizaCore 10% Referral Commission' 
        },
    ];
    paymentResult = useWdk
        ? await tetherWdkService.sendTonMultiTransaction(msgs)
        : await tonWalletService.sendMultiTransaction(msgs);
}
```

**Status:** ✅ Correctly creates 2-message batch transaction

### 4. Database Commission Recording (Lines 505-530)

```typescript
// TON commission DB record (mirrors GlobalPurchaseModal) - Non-blocking
if (paymentMethod === 'TON') {
    Promise.resolve(client.rpc('record_ton_commission', {
        p_buyer_user_id: actualUserId,
        p_ton_amount: costTon,
        p_package_name: 'Store RZC Purchase',
        p_transaction_hash: txResult.boc
    })).then(async (tonRes: any) => {
        if (!tonRes.error && tonRes.data?.length > 0 && tonRes.data[0].success) {
            const tc = tonRes.data[0];
            console.log(`✅ TON commission recorded: ${tc.commission_ton} TON`);
            // ... notification to referrer
        }
    })
}
```

**Status:** ✅ Records TON commission in database for tracking

## Potential Issues

### Issue 1: Sponsor Wallet Not Found

**Symptom:** Single transaction sent instead of multisend

**Causes:**
1. User has no referrer (`referrer_code` is NULL in database)
2. Referrer's profile doesn't have `wallet_address` set
3. Database lookup fails silently

**Debug:**
```sql
-- Check if user has referrer
SELECT 
    wallet_address,
    referrer_code,
    (SELECT wallet_address FROM wallet_users WHERE referral_code = wu.referrer_code) as referrer_wallet
FROM wallet_users wu
WHERE wallet_address = 'USER_ADDRESS_HERE';
```

### Issue 2: Amount Precision Mismatch

**Symptom:** Transaction fails with "insufficient balance"

**Cause:** Rounding errors in split calculation

**Current Code:**
```typescript
platformAmountTON.toFixed(4)  // 4 decimals
tonCommissionAmount.toFixed(6)  // 6 decimals
```

**Potential Fix:** Use consistent precision (6 decimals for both)

### Issue 3: Multisend Function Failure

**Symptom:** Transaction reverts or fails silently

**Debug Steps:**
1. Check browser console for `[StoreUI] Payment path:` log
2. Check for error in `paymentResult.error`
3. Verify both wallet services support multisend (they do ✅)

### Issue 4: Network Mismatch

**Symptom:** Referrer wallet address is for wrong network

**Cause:** Referrer's wallet address stored without network tag

**Current Code:** Uses raw wallet address from database
**Potential Issue:** If referrer's address is bounceable or wrong testOnly flag

## Testing Checklist

### Test Case 1: User WITH Referrer
- [ ] User has `referrer_code` in database
- [ ] Referrer has `wallet_address` in profile
- [ ] Console shows: `[StoreUI] Payment path: Primary TON wallet`
- [ ] Transaction creates 2 messages (check TonViewer)
- [ ] 90% goes to treasury
- [ ] 10% goes to referrer wallet
- [ ] Database records TON commission

### Test Case 2: User WITHOUT Referrer
- [ ] User has no `referrer_code`
- [ ] Single transaction sent to treasury (100%)
- [ ] No commission recorded

### Test Case 3: WDK Wallet Path
- [ ] Primary wallet not initialized
- [ ] WDK wallet initialized
- [ ] Console shows: `[StoreUI] Payment path: WDK multi-chain wallet`
- [ ] Multisend still works via `tetherWdkService.sendTonMultiTransaction`

## Recommended Fixes

### Fix 1: Add Debug Logging

```typescript
console.log('[StoreUI] Sponsor wallet:', sponsorWallet);
console.log('[StoreUI] Commission split:', {
    total: costTon,
    platform: platformAmountTON,
    referrer: tonCommissionAmount
});
```

### Fix 2: Validate Sponsor Wallet Address

```typescript
if (sponsorWallet && tonCommissionAmount > 0) {
    try {
        const { Address } = await import('@ton/ton');
        const validatedAddress = Address.parse(sponsorWallet).toString({
            bounceable: false,
            testOnly: network === 'testnet'
        });
        
        const msgs = [
            { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
            { address: validatedAddress, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
        ];
        // ... send
    } catch (err) {
        console.error('[StoreUI] Invalid sponsor wallet address:', err);
        // Fallback to single transaction
    }
}
```

### Fix 3: Consistent Decimal Precision

```typescript
const msgs = [
    { address: RHIZACORE_TREASURY_ADDRESS, amount: platformAmountTON.toFixed(6), comment: 'RhizaCore RZC Purchase' },
    { address: sponsorWallet, amount: tonCommissionAmount.toFixed(6), comment: 'RhizaCore 10% Referral Commission' },
];
```

## Conclusion

The multisend flow is **correctly implemented** in the code. If TON is not being sent to referrers, the issue is likely:

1. **Database Issue:** User's referrer_code is NULL or referrer has no wallet_address
2. **Silent Failure:** sponsorWallet state is not being set (check console logs)
3. **Transaction Failure:** Multisend transaction is failing but error not shown to user

**Next Step:** Add debug logging and check the database for the specific user who made the $5 purchase.
