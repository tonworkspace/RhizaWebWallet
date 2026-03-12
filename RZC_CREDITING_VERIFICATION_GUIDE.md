# RZC Crediting Verification Guide

## Overview
This guide helps you verify that RZC tokens are properly credited after package purchases.

## Current Implementation Status

### ✅ What's Already Working
1. **Database Function**: `award_rzc_tokens()` exists and is functional
2. **Service Method**: `supabaseService.awardRZCTokens()` is implemented
3. **Purchase Flow**: Package purchase calls the award function
4. **Transaction Logging**: All RZC awards are recorded in `rzc_transactions` table
5. **Balance Updates**: User balances are updated atomically

### 🔍 What We're Verifying
1. RZC tokens are credited immediately after purchase
2. Transaction records are created correctly
3. Balance calculations are accurate
4. No duplicate credits or missing credits

## Verification Steps

### Step 1: Database Verification (SQL)

Run the SQL verification script in Supabase SQL Editor:

```bash
# File: verify_rzc_crediting_system.sql
```

**What it checks:**
- ✅ `award_rzc_tokens` function exists
- ✅ Database tables are properly structured
- ✅ RZC transactions are being recorded
- ✅ Balances are consistent with transaction history
- ✅ No failed transactions

**Expected Results:**
- Function exists: ✅
- All tables present: ✅
- Balance consistency: 100%
- Failed transactions: 0

### Step 2: Browser Console Test (JavaScript)

1. Open your app in browser
2. Login with your wallet
3. Open browser console (F12)
4. Copy and paste the test script:

```bash
# File: test_package_purchase_flow.js
```

5. Run the complete test:
```javascript
testPackagePurchaseFlow()
```

**What it tests:**
- ✅ User profile retrieval
- ✅ Initial balance check
- ✅ Test RZC award (100 RZC)
- ✅ Package purchase simulation (1000 RZC)
- ✅ Transaction recording
- ✅ Final balance verification

**Expected Output:**
```
✅ ALL TESTS PASSED! RZC crediting works correctly.
📊 TEST SUMMARY
Initial Balance: X RZC
Test Credit: 100 RZC
Package Reward: 1000 RZC
Final Balance: X+1100 RZC
Total Credited: 1100 RZC
```

### Step 3: Real Package Purchase Test

1. **Testnet Test** (Recommended First):
   - Use test package (0.5 TON)
   - Should receive 10 RZC instantly
   - Check balance in Assets page

2. **Mainnet Test** (After Testnet Success):
   - Start with activation-only ($15)
   - Should receive 150 RZC instantly
   - Or purchase Bronze Package ($100)
   - Should receive 1000 RZC instantly

### Step 4: Verify in UI

After purchase, check these locations:

1. **Assets Page** (`/assets`)
   - RZC balance should update immediately
   - Should show new balance

2. **Dashboard** (`/dashboard`)
   - Total RZC should reflect new balance

3. **Activity Log** (if implemented)
   - Should show package purchase transaction

## Quick Test Commands

### Check Current Balance
```javascript
checkRZCBalance()
```

### Award Test RZC
```javascript
awardTestRZC(100)  // Award 100 test RZC
```

### View Recent Transactions
```javascript
viewRecentTransactions(10)  // Show last 10 transactions
```

## Troubleshooting

### Issue: RZC Not Credited

**Possible Causes:**
1. Database function not found
2. RLS policies blocking updates
3. User ID not found
4. Transaction failed silently

**Solutions:**

1. **Check Database Function:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'award_rzc_tokens';
```

2. **Check RLS Policies:**
```sql
SELECT * FROM pg_policies 
WHERE tablename IN ('wallet_users', 'rzc_transactions');
```

3. **Check User Exists:**
```sql
SELECT id, wallet_address, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'YOUR_ADDRESS';
```

4. **Check Error Logs:**
```javascript
// In browser console
localStorage.getItem('rzc_error_log')
```

### Issue: Balance Mismatch

**Check Consistency:**
```sql
SELECT 
  wu.wallet_address,
  wu.rzc_balance as stored_balance,
  COALESCE(SUM(rt.amount), 0) as calculated_balance,
  (wu.rzc_balance - COALESCE(SUM(rt.amount), 0)) as difference
FROM wallet_users wu
LEFT JOIN rzc_transactions rt ON wu.id = rt.user_id
WHERE wu.wallet_address = 'YOUR_ADDRESS'
GROUP BY wu.id, wu.wallet_address, wu.rzc_balance;
```

**Fix Mismatch:**
```sql
-- Recalculate balance from transactions
UPDATE wallet_users wu
SET rzc_balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM rzc_transactions
  WHERE user_id = wu.id
)
WHERE wallet_address = 'YOUR_ADDRESS';
```

### Issue: Duplicate Credits

**Check for Duplicates:**
```sql
SELECT 
  user_id,
  type,
  amount,
  description,
  COUNT(*) as count
FROM rzc_transactions
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, type, amount, description
HAVING COUNT(*) > 1;
```

**Prevention:**
- Transaction hash should be unique
- Add unique constraint on transaction_hash if needed

## Manual RZC Award (Admin)

If you need to manually credit RZC to a user:

```sql
-- Step 1: Get user ID
SELECT id, wallet_address, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'USER_WALLET_ADDRESS';

-- Step 2: Award RZC
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  1000, -- amount
  'manual_credit',
  'Manual RZC credit - reason here',
  jsonb_build_object(
    'admin', 'your_name',
    'reason', 'compensation/bonus/etc',
    'timestamp', NOW()
  )
);

-- Step 3: Verify
SELECT id, wallet_address, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'USER_WALLET_ADDRESS';
```

## Monitoring Queries

### Daily RZC Distribution
```sql
SELECT 
  DATE(created_at) as date,
  type,
  COUNT(*) as transactions,
  SUM(amount) as total_rzc
FROM rzc_transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), type
ORDER BY date DESC, total_rzc DESC;
```

### Top RZC Holders
```sql
SELECT 
  wallet_address,
  rzc_balance,
  is_activated,
  created_at
FROM wallet_users
WHERE rzc_balance > 0
ORDER BY rzc_balance DESC
LIMIT 20;
```

### Recent Package Purchases
```sql
SELECT 
  wu.wallet_address,
  rt.amount as rzc_received,
  rt.description,
  rt.metadata->>'package_name' as package,
  rt.metadata->>'price_usd' as price,
  rt.created_at
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
WHERE rt.type = 'package_purchase'
ORDER BY rt.created_at DESC
LIMIT 20;
```

## Success Criteria

### ✅ System is Working Correctly When:
1. RZC balance updates immediately after purchase
2. Transaction record is created in `rzc_transactions`
3. Balance matches sum of all transactions
4. No duplicate transactions
5. No failed transactions
6. User can see updated balance in UI

### ❌ System Needs Attention When:
1. Balance doesn't update after purchase
2. Transactions missing from history
3. Balance mismatch with transaction sum
4. Duplicate transactions appearing
5. Error messages in console
6. UI shows old balance

## Next Steps After Verification

Once RZC crediting is verified:

1. ✅ **Test on Testnet**: Use test package (0.5 TON)
2. ✅ **Test Activation**: Use activation-only ($15)
3. ✅ **Test Package Purchase**: Use Bronze Package ($100)
4. ✅ **Verify UI Updates**: Check Assets and Dashboard
5. ✅ **Monitor Transactions**: Check transaction history
6. 🔄 **Implement Referral Commissions**: 10% direct + 1% team sales
7. 🔄 **Add Activity Notifications**: Notify users of RZC credits
8. 🔄 **Create Admin Dashboard**: Monitor RZC distribution

## Support

If you encounter issues:

1. Run SQL verification script
2. Run browser console test
3. Check browser console for errors
4. Check Supabase logs
5. Review transaction history
6. Contact support with:
   - Wallet address
   - Transaction hash (if available)
   - Expected vs actual RZC amount
   - Screenshots of error messages

## Files Reference

- `verify_rzc_crediting_system.sql` - SQL verification script
- `test_package_purchase_flow.js` - Browser test script
- `pages/MiningNodes.tsx` - Package purchase implementation
- `services/supabaseService.ts` - RZC award service method
