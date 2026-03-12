# RZC System Setup Checklist

## Current Status: ❌ Database Not Set Up

The `rzc_transactions` table doesn't exist yet. Follow these steps to set it up.

---

## Setup Steps

### ☐ Step 1: Run Database Setup Script
**File:** `create_rzc_transactions_system.sql`

**Action:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy entire contents of `create_rzc_transactions_system.sql`
4. Paste and click "Run"

**Expected Result:**
```
✅ Tables Created: rzc_transactions, package_purchases
✅ Functions Created: award_rzc_tokens, get_rzc_balance, etc.
```

**Time:** ~30 seconds

---

### ☐ Step 2: Verify Tables Created
**Run this query in Supabase:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('rzc_transactions', 'package_purchases');
```

**Expected:** 2 rows returned

---

### ☐ Step 3: Verify Functions Created
**Run this query:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'award_rzc_tokens';
```

**Expected:** 1 row returned

---

### ☐ Step 4: Test RZC Award Function
**Run this query (replace USER_ID):**
```sql
-- First, get a user ID
SELECT id, wallet_address FROM wallet_users LIMIT 1;

-- Then award test RZC
SELECT award_rzc_tokens(
  'YOUR_USER_ID'::UUID,
  100,
  'test_credit',
  'Testing RZC system',
  '{"test": true}'::jsonb
);
```

**Expected:** No errors, function executes successfully

---

### ☐ Step 5: Verify Balance Updated
**Run this query:**
```sql
SELECT wallet_address, rzc_balance 
FROM wallet_users 
WHERE id = 'YOUR_USER_ID'::UUID;
```

**Expected:** `rzc_balance` should be 100 (or increased by 100)

---

### ☐ Step 6: Check Transaction Recorded
**Run this query:**
```sql
SELECT * FROM rzc_transactions 
WHERE user_id = 'YOUR_USER_ID'::UUID 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:** 1 row showing the test transaction

---

### ☐ Step 7: Test Package Purchase Flow (Browser)
**Action:**
1. Open your app in browser
2. Login with wallet
3. Open browser console (F12)
4. Paste contents of `test_package_purchase_flow.js`
5. Run: `testPackagePurchaseFlow()`

**Expected:**
```
✅ ALL TESTS PASSED! RZC crediting works correctly.
```

---

### ☐ Step 8: Test Real Package Purchase
**Action:**
1. Go to Sales Packages page
2. Purchase test package (0.5 TON) on testnet
3. Check Assets page for RZC balance update

**Expected:** 
- Payment successful
- RZC balance increases by 10
- Transaction appears in history

---

### ☐ Step 9: Verify in Production
**Action:**
1. Purchase activation-only package ($15)
2. Check RZC balance increases by 150
3. Verify transaction in database

**Expected:**
- Wallet activated
- 150 RZC credited
- Transaction recorded

---

## Verification Queries

### Check System Health
```sql
-- Count total transactions
SELECT COUNT(*) as total_transactions FROM rzc_transactions;

-- Count total RZC distributed
SELECT SUM(amount) as total_rzc_distributed FROM rzc_transactions;

-- Count users with RZC
SELECT COUNT(*) as users_with_rzc 
FROM wallet_users 
WHERE rzc_balance > 0;

-- Recent transactions
SELECT 
  wu.wallet_address,
  rt.amount,
  rt.type,
  rt.description,
  rt.created_at
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
ORDER BY rt.created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Issue: Table already exists
**Solution:** This is fine! The script uses `IF NOT EXISTS`.

### Issue: Function already exists
**Solution:** This is fine! The script uses `CREATE OR REPLACE`.

### Issue: User not found
**Solution:** Make sure user exists in `wallet_users` table first.

### Issue: RZC not credited
**Check:**
1. Function executed without errors?
2. User ID is correct?
3. Amount is positive?
4. Check Supabase logs for errors

---

## Success Criteria

✅ **System is working when:**
- [ ] Tables exist: `rzc_transactions`, `package_purchases`
- [ ] Functions exist: `award_rzc_tokens`, `get_rzc_balance`
- [ ] Test RZC award works
- [ ] Balance updates correctly
- [ ] Transactions are recorded
- [ ] Browser test passes
- [ ] Real purchase credits RZC
- [ ] UI shows updated balance

---

## Files Reference

| File | Purpose |
|------|---------|
| `create_rzc_transactions_system.sql` | Main setup script |
| `SETUP_RZC_SYSTEM_NOW.md` | Detailed setup guide |
| `test_package_purchase_flow.js` | Browser testing script |
| `verify_rzc_crediting_system.sql` | Verification queries |
| `RZC_CREDITING_VERIFICATION_GUIDE.md` | Complete testing guide |

---

## Quick Start (TL;DR)

1. Run `create_rzc_transactions_system.sql` in Supabase SQL Editor
2. Verify with: `SELECT * FROM rzc_transactions LIMIT 1;`
3. Test purchase on testnet
4. Done! ✅

---

## Current Status After Setup

Once complete, you'll have:
- ✅ RZC transaction tracking
- ✅ Package purchase recording
- ✅ Automatic RZC crediting
- ✅ Balance management
- ✅ Transaction history

## Next Phase: Referral Commissions

After RZC crediting works:
1. Implement 10% direct referral commission
2. Implement 1% weekly team sales commission
3. Create commission distribution system
4. Add commission tracking UI

---

**Start Here:** Run `create_rzc_transactions_system.sql` now! 🚀
