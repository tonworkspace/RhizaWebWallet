# RZC Token System - Database Migration Guide

## 📋 Overview

This guide walks you through adding the RZC (RhizaCore Community Token) system to your existing Supabase database.

**Migration File:** `supabase_rzc_migration.sql`

**Safe to Run:** ✅ Yes - Uses `IF NOT EXISTS` checks and won't break existing data

---

## 🎯 What This Migration Does

1. ✅ Adds `rzc_balance` column to existing `wallet_users` table
2. ✅ Creates `wallet_rzc_transactions` table for transaction history
3. ✅ Creates `award_rzc_tokens()` function for atomic operations
4. ✅ Adds performance indexes
5. ✅ Sets up Row Level Security (RLS) policies
6. ✅ Creates helper views for analytics
7. ✅ Includes verification queries
8. ✅ Optional: Awards retroactive signup bonuses to existing users

---

## 🚀 Migration Steps

### Step 1: Backup Your Database (Recommended)

Before running any migration, create a backup:

1. Go to Supabase Dashboard
2. Navigate to **Database** → **Backups**
3. Click **Create Backup**
4. Wait for backup to complete

### Step 2: Open SQL Editor

1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 3: Run the Migration Script

1. Open the file `supabase_rzc_migration.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 4: Review the Output

The migration will display verification results:

```
========================================
RZC MIGRATION VERIFICATION
========================================
rzc_balance column exists: true
wallet_rzc_transactions table exists: true
award_rzc_tokens function exists: true
Users with RZC balance: 5
Total RZC transactions: 0
========================================
✅ RZC MIGRATION SUCCESSFUL!
```

### Step 5: Award Retroactive Bonuses (Optional)

If you have existing users who created accounts before the RZC system, you can award them signup bonuses:

```sql
-- Run this query to award 100 RZC to all existing users
SELECT * FROM award_retroactive_signup_bonuses();
```

This will:
- Award 100 RZC to each existing user
- Create a `signup_bonus` transaction record
- Skip users who already have a signup bonus

**Output Example:**
```
user_id                              | wallet_address | awarded_amount | status
-------------------------------------|----------------|----------------|--------
123e4567-e89b-12d3-a456-426614174000 | EQAbc...       | 100.00         | SUCCESS
223e4567-e89b-12d3-a456-426614174001 | EQDef...       | 100.00         | SUCCESS
```

---

## 🔍 Verification Queries

### Check RZC Balance Column

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name = 'rzc_balance';
```

**Expected Result:**
```
column_name | data_type | column_default
------------|-----------|---------------
rzc_balance | numeric   | 100.0
```

### Check RZC Transactions Table

```sql
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'wallet_rzc_transactions';
```

**Expected Result:**
```
table_name               | table_type
-------------------------|------------
wallet_rzc_transactions  | BASE TABLE
```

### Check Award Function

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'award_rzc_tokens';
```

**Expected Result:**
```
routine_name      | routine_type
------------------|-------------
award_rzc_tokens  | FUNCTION
```

### View All Users with RZC Balance

```sql
SELECT 
  name,
  wallet_address,
  rzc_balance,
  created_at
FROM wallet_users
ORDER BY rzc_balance DESC
LIMIT 10;
```

### View RZC Transaction History

```sql
SELECT 
  u.name,
  t.type,
  t.amount,
  t.balance_after,
  t.description,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;
```

### View RZC Statistics

```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE rzc_balance > 0) as users_with_rzc,
  SUM(rzc_balance) as total_rzc_in_circulation,
  AVG(rzc_balance) as avg_rzc_per_user,
  MAX(rzc_balance) as highest_balance
FROM wallet_users;
```

---

## 🧪 Test the Migration

### Test 1: Award RZC Manually

```sql
-- Get a test user ID
SELECT id, name, wallet_address, rzc_balance 
FROM wallet_users 
LIMIT 1;

-- Award 50 RZC to the user (replace USER_ID with actual ID)
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  50.0,
  'test_bonus',
  'Manual test bonus',
  '{"test": true}'::JSONB
);

-- Verify the balance increased
SELECT id, name, rzc_balance 
FROM wallet_users 
WHERE id = 'USER_ID'::UUID;

-- Check transaction was recorded
SELECT * 
FROM wallet_rzc_transactions 
WHERE user_id = 'USER_ID'::UUID 
ORDER BY created_at DESC 
LIMIT 1;
```

### Test 2: Verify Atomic Operations

```sql
-- Try to award negative amount (should fail)
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  -10.0,
  'test',
  'This should fail',
  NULL
);
-- Expected: ERROR: RZC amount must be positive

-- Try to award to non-existent user (should fail)
SELECT award_rzc_tokens(
  '00000000-0000-0000-0000-000000000000'::UUID,
  50.0,
  'test',
  'This should fail',
  NULL
);
-- Expected: ERROR: User not found
```

### Test 3: Check Indexes

```sql
-- Verify indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'wallet_rzc_transactions'
ORDER BY indexname;
```

**Expected Result:**
```
indexname                                  | indexdef
-------------------------------------------|------------------------------------------
idx_wallet_rzc_transactions_created        | CREATE INDEX ... ON created_at DESC
idx_wallet_rzc_transactions_type           | CREATE INDEX ... ON type
idx_wallet_rzc_transactions_user           | CREATE INDEX ... ON user_id
idx_wallet_rzc_transactions_user_created   | CREATE INDEX ... ON user_id, created_at
```

---

## 🔄 Rollback (If Needed)

If you need to rollback the migration:

```sql
-- WARNING: This will delete all RZC data!
-- Only run if you need to completely remove RZC system

-- Drop views
DROP VIEW IF EXISTS recent_rzc_activity;
DROP VIEW IF EXISTS top_rzc_holders;
DROP VIEW IF EXISTS rzc_transaction_summary;

-- Drop function
DROP FUNCTION IF EXISTS award_rzc_tokens(UUID, NUMERIC, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS award_retroactive_signup_bonuses();

-- Drop table
DROP TABLE IF EXISTS wallet_rzc_transactions;

-- Remove column from wallet_users
ALTER TABLE wallet_users DROP COLUMN IF EXISTS rzc_balance;

-- Verify rollback
SELECT 
  'Rollback Complete' as status,
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance'
  ) as column_removed,
  NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wallet_rzc_transactions'
  ) as table_removed;
```

---

## 📊 Post-Migration Analytics

### View RZC Distribution

```sql
SELECT 
  CASE 
    WHEN rzc_balance = 100 THEN '100 RZC (New Users)'
    WHEN rzc_balance BETWEEN 101 AND 500 THEN '101-500 RZC'
    WHEN rzc_balance BETWEEN 501 AND 1000 THEN '501-1,000 RZC'
    WHEN rzc_balance BETWEEN 1001 AND 5000 THEN '1,001-5,000 RZC'
    ELSE '5,000+ RZC'
  END as balance_range,
  COUNT(*) as user_count,
  SUM(rzc_balance) as total_rzc
FROM wallet_users
GROUP BY balance_range
ORDER BY MIN(rzc_balance);
```

### View Transaction Types

```sql
SELECT * FROM rzc_transaction_summary;
```

### View Top Earners

```sql
SELECT * FROM top_rzc_holders LIMIT 20;
```

### View Recent Activity

```sql
SELECT * FROM recent_rzc_activity LIMIT 50;
```

---

## 🐛 Troubleshooting

### Issue: Column already exists

**Error:** `column "rzc_balance" of relation "wallet_users" already exists`

**Solution:** This is normal if you've run the migration before. The script uses `IF NOT EXISTS` checks, so it's safe to run multiple times.

### Issue: Function already exists

**Error:** `function "award_rzc_tokens" already exists`

**Solution:** The script uses `CREATE OR REPLACE FUNCTION`, so it will update the function if it exists.

### Issue: Permission denied

**Error:** `permission denied for table wallet_users`

**Solution:** Make sure you're running the script as a database admin or the table owner.

### Issue: Foreign key constraint fails

**Error:** `foreign key constraint "wallet_rzc_transactions_user_id_fkey" fails`

**Solution:** Ensure the `wallet_users` table exists before running the migration.

---

## ✅ Migration Checklist

- [ ] Database backup created
- [ ] Migration script executed successfully
- [ ] Verification queries show all components exist
- [ ] Test queries executed successfully
- [ ] Retroactive bonuses awarded (if applicable)
- [ ] Frontend updated to use RZC system
- [ ] Users can see RZC balance in Dashboard
- [ ] Users can earn RZC through referrals
- [ ] Transaction history is being recorded

---

## 🚀 Next Steps

After successful migration:

1. **Test the Frontend:**
   - Create a new wallet → Should receive 100 RZC
   - Check Dashboard → Should display RZC balance
   - Check Referral page → Should show RZC info

2. **Monitor RZC Activity:**
   ```sql
   -- Check recent RZC transactions
   SELECT * FROM recent_rzc_activity LIMIT 10;
   
   -- Check total RZC in circulation
   SELECT SUM(rzc_balance) as total_rzc FROM wallet_users;
   ```

3. **Set Up Monitoring:**
   - Track RZC distribution over time
   - Monitor for unusual activity
   - Set up alerts for large transactions

4. **Document for Team:**
   - Share RZC system documentation
   - Train support team on RZC queries
   - Create user-facing RZC documentation

---

## 📞 Support

If you encounter issues:

1. Check the verification queries above
2. Review the troubleshooting section
3. Check Supabase logs for detailed error messages
4. Review `RZC_TOKEN_SYSTEM.md` for system documentation
5. Review `RZC_TESTING_GUIDE.md` for testing procedures

---

## 📝 Migration Summary

**What Changed:**
- Added `rzc_balance` column to `wallet_users` (default: 100 RZC)
- Created `wallet_rzc_transactions` table
- Created `award_rzc_tokens()` function
- Added 4 indexes for performance
- Created 3 helper views for analytics
- Set up RLS policies

**Data Impact:**
- Existing users: Get `rzc_balance` column with default 100 RZC
- New users: Will automatically get 100 RZC on signup
- No data loss or corruption
- All changes are additive (no deletions)

**Performance Impact:**
- Minimal - indexes optimize queries
- Function is efficient (single transaction)
- Views are computed on-demand

---

**Migration Date:** February 21, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
