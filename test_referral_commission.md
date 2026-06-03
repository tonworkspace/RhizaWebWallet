# Referral Commission System Test

## Overview
This document outlines how to test the referral commission system for both wallet types (24-word TON wallet and 12-word multi-chain wallet).

## How Referral Commissions Work

### 1. Commission Calculation
- **Rate**: 10% of the total purchase amount
- **Split**: Platform gets 90%, referrer gets 10%
- **Example**: If user buys a $50 package:
  - Total cost: $50 worth of TON
  - Platform receives: $45 worth of TON
  - Referrer receives: $5 worth of TON (10% commission)

### 2. Payment Flow
When a referred user makes a purchase, the system:

1. **Checks for referrer**: Looks up if the user has a referrer
2. **Calculates commission**: 10% of total purchase amount
3. **Creates multi-transaction**: Sends TON to both platform and referrer in one atomic transaction
4. **Records commission**: Updates database with commission details

### 3. Wallet Type Detection
The system automatically detects which wallet to use:

```typescript
// In GlobalPurchaseModal.tsx
const useWdk = !tonWalletService.isInitialized() && tetherWdkService.isInitialized();

if (referrerWalletAddress && tonCommissionAmount > 0) {
  const msgs = [
    { address: paymentAddress, amount: platformAmountTON.toFixed(4), comment: `RhizaCore ${pkg.tierName} Purchase` },
    { address: referrerWalletAddress, amount: tonCommissionAmount.toFixed(6), comment: `RhizaCore 10% Referral Commission` },
  ];
  paymentResult = useWdk
    ? await tetherWdkService.sendTonMultiTransaction(msgs)  // 12-word multi-chain wallet
    : await tonWalletService.sendMultiTransaction(msgs);    // 24-word TON wallet
}
```

## Test Scenarios

### Scenario 1: 24-Word TON Wallet (tonWalletService)

**Setup:**
1. User A creates a 24-word TON wallet
2. User A generates a referral code
3. User B signs up using User A's referral code
4. User B creates a 24-word TON wallet
5. User B makes a purchase

**Expected Behavior:**
- System uses `tonWalletService.sendMultiTransaction()`
- Single transaction with 2 internal messages:
  - Message 1: Platform payment (90% of total)
  - Message 2: Referrer commission (10% of total)
- Both payments processed atomically
- Transaction hash generated using normalized TEP-467 format

### Scenario 2: 12-Word Multi-Chain Wallet (tetherWdkService)

**Setup:**
1. User A creates a 12-word multi-chain wallet
2. User A generates a referral code
3. User B signs up using User A's referral code
4. User B creates a 12-word multi-chain wallet
5. User B makes a purchase

**Expected Behavior:**
- System uses `tetherWdkService.sendTonMultiTransaction()`
- Single W5R1 transaction with 2 internal messages:
  - Message 1: Platform payment (90% of total)
  - Message 2: Referrer commission (10% of total)
- Both payments processed atomically
- Transaction hash generated using normalized TEP-467 format

### Scenario 3: Mixed Wallet Types

**Setup:**
1. User A (referrer) has a 24-word TON wallet
2. User B (buyer) has a 12-word multi-chain wallet
3. User B makes a purchase

**Expected Behavior:**
- System detects User B's wallet type (multi-chain)
- Uses `tetherWdkService.sendTonMultiTransaction()`
- Referrer (User A) receives commission to their 24-word wallet address
- Commission payment works regardless of referrer's wallet type

## Testing Steps

### Step 1: Verify Multi-Transaction Functions

**For 24-word wallet:**
```typescript
// Test tonWalletService.sendMultiTransaction()
const recipients = [
  { address: "PLATFORM_ADDRESS", amount: "0.45", comment: "RhizaCore Test Purchase" },
  { address: "REFERRER_ADDRESS", amount: "0.05", comment: "RhizaCore 10% Referral Commission" }
];
const result = await tonWalletService.sendMultiTransaction(recipients);
```

**For 12-word wallet:**
```typescript
// Test tetherWdkService.sendTonMultiTransaction()
const recipients = [
  { address: "PLATFORM_ADDRESS", amount: "0.45", comment: "RhizaCore Test Purchase" },
  { address: "REFERRER_ADDRESS", amount: "0.05", comment: "RhizaCore 10% Referral Commission" }
];
const result = await tetherWdkService.sendTonMultiTransaction(recipients);
```

### Step 2: Test Commission Calculation

1. **Open GlobalPurchaseModal**
2. **Check calculation logic:**
   ```typescript
   if (referrerWalletAddress) {
     tonCommissionAmount = parseFloat((totalCostTON * 0.10).toFixed(6));
     platformAmountTON = parseFloat((totalCostTON - tonCommissionAmount).toFixed(6));
   }
   ```
3. **Verify amounts add up correctly**

### Step 3: Test Database Recording

After successful payment, verify:
1. **RZC commission recorded** in `wallet_rzc_transactions`
2. **TON commission recorded** in `wallet_ton_commissions`
3. **Referrer stats updated** in `wallet_referrals`

### Step 4: Test Transaction Hash Format

Both wallet types should generate proper transaction hashes:
- **Format**: 64-character hex string
- **Standard**: TEP-467 normalized external-in message hash
- **TonViewer compatibility**: Hash should resolve on tonviewer.com

## Verification Checklist

### ✅ Multi-Transaction Support
- [ ] `tonWalletService.sendMultiTransaction()` works (24-word wallet)
- [ ] `tetherWdkService.sendTonMultiTransaction()` works (12-word wallet)
- [ ] Both support up to 4 recipients per transaction
- [ ] Both validate addresses and amounts correctly
- [ ] Both check sufficient balance before sending

### ✅ Commission Calculation
- [ ] 10% commission calculated correctly
- [ ] Platform amount = total - commission
- [ ] Amounts rounded to appropriate precision
- [ ] No rounding errors or precision loss

### ✅ Wallet Type Detection
- [ ] System correctly detects 24-word vs 12-word wallet
- [ ] Falls back to appropriate service
- [ ] Auto-restores sessions when possible
- [ ] Handles uninitialized wallets gracefully

### ✅ Transaction Processing
- [ ] Both payments sent in single atomic transaction
- [ ] Network tags added to comments for security
- [ ] Comments sanitized to prevent XSS
- [ ] Proper error handling and user feedback

### ✅ Database Integration
- [ ] RZC commissions recorded correctly
- [ ] TON commissions tracked properly
- [ ] Referrer notifications sent
- [ ] Stats updated in real-time

### ✅ Hash Generation
- [ ] Normalized TEP-467 hash format used
- [ ] TonViewer links resolve correctly
- [ ] No more fake address+seqno hashes
- [ ] Consistent across both wallet types

## Common Issues to Check

### Issue 1: Wallet Not Initialized
**Symptom**: "Wallet not initialized" error
**Solution**: Ensure wallet is properly initialized before purchase

### Issue 2: Insufficient Balance
**Symptom**: Transaction fails with balance error
**Solution**: Check total cost includes both platform payment and commission

### Issue 3: Invalid Referrer Address
**Symptom**: Address parsing fails
**Solution**: Validate referrer wallet address format

### Issue 4: Commission Not Sent
**Symptom**: Only platform receives payment
**Solution**: Check if `referrerWalletAddress` is properly set

### Issue 5: Transaction Hash 404
**Symptom**: TonViewer shows "Transaction not found"
**Solution**: Verify normalized hash calculation is correct

## Expected Results

### Successful Test Results:
1. **Transaction succeeds** with proper hash
2. **Platform receives** 90% of payment
3. **Referrer receives** 10% commission
4. **Database updated** with commission records
5. **Notifications sent** to referrer
6. **TonViewer link** resolves correctly

### Performance Metrics:
- **Transaction time**: ~30 seconds for confirmation
- **Success rate**: >95% for valid transactions
- **Hash accuracy**: 100% TonViewer compatibility
- **Commission accuracy**: Exact 10% calculation

## Debugging Commands

### Check Transaction Status:
```bash
# Check if transaction was broadcast
curl "https://toncenter.com/api/v3/message" -X POST \
  -H "Content-Type: application/json" \
  -d '{"boc": "BOC_BASE64_HERE"}'

# Check transaction on TonViewer
open "https://tonviewer.com/transaction/HASH_HERE"
```

### Check Database Records:
```sql
-- Check RZC commissions
SELECT * FROM wallet_rzc_transactions 
WHERE type = 'referral_bonus' 
ORDER BY created_at DESC LIMIT 10;

-- Check TON commissions  
SELECT * FROM wallet_ton_commissions 
ORDER BY created_at DESC LIMIT 10;

-- Check referrer stats
SELECT * FROM wallet_referrals 
WHERE total_earned > 0;
```

This comprehensive test ensures the referral commission system works correctly for both wallet types and provides proper atomic transactions with accurate commission distribution.