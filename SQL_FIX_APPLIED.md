# SQL Diagnostic Queries - Fix Applied ✅

## Issue Found

The diagnostic SQL queries had an error:
```
ERROR: 42703: column t.source does not exist
```

## Root Cause

The `wallet_rzc_transactions` table uses the column name **`description`**, not `source`.

### Actual Schema:
```sql
CREATE TABLE wallet_rzc_transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  balance_after NUMERIC(20, 8) NOT NULL,
  description TEXT,           -- ✅ This is the correct column name
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL
);
```

## Fix Applied

Changed query #4 in `diagnose_referral_system.sql`:

**Before:**
```sql
SELECT 
  t.source,  -- ❌ Wrong column name
  ...
FROM wallet_rzc_transactions t
```

**After:**
```sql
SELECT 
  t.description,  -- ✅ Correct column name
  ...
FROM wallet_rzc_transactions t
```

## Files Updated

1. ✅ `diagnose_referral_system.sql` - Fixed and ready to use
2. ✅ `diagnose_referral_system_FIXED.sql` - Backup with additional schema check query

## How to Use

Now you can run all queries in `diagnose_referral_system.sql` without errors:

1. Open Supabase SQL Editor
2. Copy queries from `diagnose_referral_system.sql`
3. Run them one by one or all at once
4. Review the results

## What Each Query Does

| Query # | Purpose | What to Look For |
|---------|---------|------------------|
| 1 | Check foreign keys | Should show 2 FKs (user_id, referrer_id) |
| 2 | All users & referral data | Overview of all users and their referrals |
| 3 | Downline for specific user | Replace USER_ID_HERE with actual ID |
| 4 | RZC transactions | All RZC token movements |
| 5 | Referral bonuses | Who received referral bonuses |
| 6 | Signup bonuses | Who received signup bonuses |
| 7 | Missing bonuses | Users with referrals but no bonuses |
| 8 | Referral earnings | Detailed earnings records |
| 9 | Orphaned records | Data integrity check |
| 10 | Summary stats | Overall system health |
| 11 | Function exists | Verify award_rzc_tokens function |

## Expected Results

### Query 1 (Foreign Keys)
```
table_name         | column_name  | foreign_table_name | foreign_column_name
wallet_referrals   | user_id      | wallet_users       | id
wallet_referrals   | referrer_id  | wallet_users       | id
```

### Query 10 (Summary Stats)
```
metric                          | value
Total Users                     | 5
Users with Referral Codes       | 5
Users with Referrers            | 2
Total Referral Bonuses Awarded  | 2
Total Signup Bonuses Awarded    | 5
Total RZC in Circulation        | 600
```

### Query 11 (Function Check)
```
routine_name      | routine_type | data_type
award_rzc_tokens  | FUNCTION     | void
```

## Next Steps

1. ✅ SQL queries are fixed
2. Run the queries to check your system
3. Look for any issues in the results
4. Use the fix queries at the bottom if needed

## Common Issues to Look For

### Issue 1: No Foreign Keys (Query 1)
**If Query 1 returns 0 rows:**
```sql
-- Run these fix queries
ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_user
FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;

ALTER TABLE wallet_referrals
ADD CONSTRAINT fk_wallet_referrals_referrer
FOREIGN KEY (referrer_id) REFERENCES wallet_users(id) ON DELETE SET NULL;
```

### Issue 2: Function Missing (Query 11)
**If Query 11 returns 0 rows:**
- Run `supabase_rzc_migration.sql` to create the function

### Issue 3: Missing Bonuses (Query 7)
**If Query 7 shows users with referrals but no bonuses:**
```sql
-- Manually award missing bonuses
SELECT award_rzc_tokens(
  'REFERRER_USER_ID'::uuid,
  50,
  'referral_bonus',
  'Manual referral bonus correction',
  jsonb_build_object('referred_user_id', 'NEW_USER_ID', 'manual_correction', true)
);
```

### Issue 4: Users Not Active (Query 3)
**If is_active is NULL:**
```sql
UPDATE wallet_users SET is_active = true WHERE is_active IS NULL;
```

## Testing Your Fixes

After running any fix queries:

1. **Re-run the diagnostic queries** to verify the fix
2. **Check the UI** - Navigate to Referral page and refresh
3. **Test the flow** - Create a new referral to ensure it works
4. **Verify balances** - Check that RZC balances are correct

## Summary

✅ SQL queries are now fixed and ready to use
✅ All queries should run without errors
✅ Use the results to diagnose your referral system
✅ Apply fixes as needed based on the results

The diagnostic queries are your best tool for understanding what's happening in the database! 🔍
