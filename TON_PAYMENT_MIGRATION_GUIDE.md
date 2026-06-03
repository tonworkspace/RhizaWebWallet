# 🔧 TON Payment Migration Guide

## Issue: Function Already Exists Error

If you see this error:
```
ERROR: 42P13: cannot change return type of existing function
DETAIL: Row type defined by OUT parameters is different.
HINT: Use DROP FUNCTION get_project_progress(uuid) first.
```

**Solution:** Use the updated migration file that includes `DROP FUNCTION`.

---

## ✅ Fixed Migration Files

### Option 1: Standard Migration (Recommended)
**File:** `add_ton_payment_support.sql`

This file now includes:
```sql
DROP FUNCTION IF EXISTS get_project_progress(uuid);
```

**Usage:**
```bash
# Via Supabase SQL Editor
# 1. Open SQL Editor
# 2. Paste contents of add_ton_payment_support.sql
# 3. Click "Run"
```

### Option 2: Safe Migration (Extra Safe)
**File:** `add_ton_payment_support_SAFE.sql`

This version:
- ✅ Checks if columns exist before adding
- ✅ Drops function before recreating
- ✅ Drops view before recreating
- ✅ Safe to run multiple times
- ✅ Provides detailed progress messages

**Usage:**
```bash
# Via Supabase SQL Editor
# 1. Open SQL Editor
# 2. Paste contents of add_ton_payment_support_SAFE.sql
# 3. Click "Run"
```

---

## 🚀 Step-by-Step Migration

### Step 1: Choose Your Migration File

**Use `add_ton_payment_support.sql` if:**
- First time running the migration
- Clean database
- Want standard migration

**Use `add_ton_payment_support_SAFE.sql` if:**
- Already tried to run migration
- Want extra safety checks
- Want detailed progress messages
- Want to run multiple times safely

### Step 2: Run the Migration

#### Via Supabase Dashboard (Recommended)
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of your chosen SQL file
5. Paste into the editor
6. Click "Run" (or press Ctrl+Enter)
7. Wait for success message

#### Via psql Command Line
```bash
# Standard version
psql -U your_user -d your_database -f add_ton_payment_support.sql

# Safe version
psql -U your_user -d your_database -f add_ton_payment_support_SAFE.sql
```

### Step 3: Verify Migration

Run this query to verify:
```sql
-- Check if columns were added
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'presale_transactions'
  AND column_name IN ('payment_method', 'amount_ton');

-- Check if presale_wallet_address was added
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_name = 'launchpad_projects'
  AND column_name = 'presale_wallet_address';

-- Check if view was created
SELECT * FROM launchpad_payment_stats LIMIT 1;

-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_project_progress';
```

Expected output:
```
✅ payment_method column exists
✅ amount_ton column exists
✅ presale_wallet_address column exists
✅ launchpad_payment_stats view exists
✅ get_project_progress function exists
```

---

## 🐛 Troubleshooting

### Error: "relation presale_transactions does not exist"
**Cause:** Launchpad tables haven't been created yet

**Solution:**
```sql
-- Run the launchpad table creation first
\i create_launchpad_tables_FIXED.sql

-- Then run the TON payment migration
\i add_ton_payment_support_SAFE.sql
```

### Error: "permission denied for table presale_transactions"
**Cause:** Insufficient database permissions

**Solution:**
```sql
-- Grant necessary permissions (run as admin)
GRANT ALL ON presale_transactions TO your_user;
GRANT ALL ON launchpad_projects TO your_user;
```

### Error: "column payment_method already exists"
**Cause:** Migration was partially run before

**Solution:** Use the SAFE version:
```bash
# This version checks if columns exist before adding
\i add_ton_payment_support_SAFE.sql
```

### Error: "view launchpad_payment_stats already exists"
**Cause:** View was created in a previous run

**Solution:** The SAFE version handles this automatically, or manually:
```sql
DROP VIEW IF EXISTS launchpad_payment_stats;
-- Then run the migration again
```

---

## 🔄 Rollback (If Needed)

If you need to undo the migration:

```sql
-- Remove columns
ALTER TABLE presale_transactions 
DROP COLUMN IF EXISTS payment_method,
DROP COLUMN IF EXISTS amount_ton;

ALTER TABLE launchpad_projects 
DROP COLUMN IF EXISTS presale_wallet_address;

-- Remove view
DROP VIEW IF EXISTS launchpad_payment_stats;

-- Remove index
DROP INDEX IF EXISTS idx_presale_transactions_payment_method;

-- Restore original function (if you have a backup)
-- Or just drop it
DROP FUNCTION IF EXISTS get_project_progress(uuid);
```

---

## ✅ Post-Migration Checklist

After successful migration:

- [ ] Verify all columns exist
- [ ] Verify view is accessible
- [ ] Verify function works
- [ ] Configure presale_wallet_address for projects
- [ ] Test with a sample query
- [ ] Proceed with component integration

### Test Query
```sql
-- Test inserting a TON transaction
INSERT INTO presale_transactions (
  project_id,
  user_address,
  amount_usdc,
  amount_ton,
  payment_method,
  tokens_received,
  tx_hash,
  status
) VALUES (
  (SELECT id FROM launchpad_projects LIMIT 1),
  'UQD...test',
  110,
  20,
  'ton',
  5500,
  'test_hash_' || gen_random_uuid(),
  'pending'
);

-- Verify it was inserted
SELECT 
  payment_method,
  amount_ton,
  amount_usdc,
  tokens_received
FROM presale_transactions
WHERE payment_method = 'ton'
ORDER BY created_at DESC
LIMIT 1;

-- Clean up test data
DELETE FROM presale_transactions 
WHERE tx_hash LIKE 'test_hash_%';
```

---

## 📊 Migration Summary

### What Gets Added

**Tables Modified:**
- `presale_transactions` - 2 new columns
- `launchpad_projects` - 1 new column

**New Database Objects:**
- `launchpad_payment_stats` view
- `idx_presale_transactions_payment_method` index
- Updated `get_project_progress` function

**Permissions:**
- SELECT on `launchpad_payment_stats` for authenticated users
- SELECT on `launchpad_payment_stats` for anonymous users

### What Doesn't Change

- Existing data in tables (preserved)
- Existing transactions (untouched)
- RLS policies (unchanged)
- Other functions (unaffected)

---

## 🎯 Next Steps After Migration

1. **Configure Projects**
   ```sql
   UPDATE launchpad_projects 
   SET presale_wallet_address = 'UQD...' 
   WHERE id = 'your-project-id';
   ```

2. **Integrate Component**
   - Add `TonPresalePayment` component
   - Update `ProjectDetail.tsx`
   - Add payment method selector

3. **Test**
   - Test price fetching
   - Test validation
   - Test payment flow
   - Verify database records

4. **Deploy**
   - Deploy to staging
   - Test thoroughly
   - Deploy to production
   - Monitor transactions

---

## 📞 Support

**Migration Issues?**
1. Check error message carefully
2. Use the SAFE version if standard fails
3. Verify table structure
4. Check permissions
5. Review this guide

**Still Stuck?**
- Check `README_TON_PAYMENT.md` for overview
- Review `LAUNCHPAD_TON_PAYMENT_INTEGRATION.md` for details
- Verify your database schema matches requirements

---

## 🎉 Success!

Once you see:
```
✅ TON Payment Support Migration Complete!
```

You're ready to proceed with component integration!

**Next:** Read `README_TON_PAYMENT.md` for integration steps.

---

**Version:** 1.0.1 (Fixed)  
**Last Updated:** 2026-05-14  
**Status:** ✅ Ready to Use
