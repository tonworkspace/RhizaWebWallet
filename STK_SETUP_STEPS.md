# STK Migration Setup - Step by Step

## Error You're Seeing
```
ERROR: 42P01: relation "public.stk_migrations" does not exist
```

This means the database table hasn't been created yet.

---

## Fix: 3 Simple Steps

### Step 1: Create the Table

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Open the file: `RUN_THIS_FIRST_STK_SETUP.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**

You should see:
```
✅ STK MIGRATIONS TABLE CREATED!
📊 Table: public.stk_migrations
🔒 RLS: Enabled
💱 Conversion: 10,000,000 STK = 8 RZC
✅ Ready to use!
```

### Step 2: Verify It Worked

1. In SQL Editor, run: `check_stk_table.sql`
2. You should see:
   - ✅ Table EXISTS
   - ✅ RLS Enabled
   - ✅ Policies OK

### Step 3: Test in Browser

1. Refresh your web app
2. Connect wallet
3. Go to **Wallet Migration** page
4. Click **STK to StarFi** tab
5. Try submitting a test migration

---

## Quick Verification

Run this in Supabase SQL Editor:

```sql
-- Quick check
SELECT * FROM public.stk_migrations;
```

If you see a table (even if empty), it worked! ✅

If you see an error, go back to Step 1.

---

## What Gets Created

- **Table:** `stk_migrations`
- **Columns:** 13 fields including wallet_address, stk_amount, rzc_equivalent
- **Indexes:** 3 indexes for performance
- **RLS Policies:** 3 policies for security
- **Constraints:** Unique wallet address, positive amounts

---

## Files to Run (In Order)

1. ✅ `RUN_THIS_FIRST_STK_SETUP.sql` - Creates table
2. ✅ `check_stk_table.sql` - Verifies it worked
3. ⏳ `test_stk_migration.js` - Test in browser (after table exists)

---

## Still Having Issues?

### Error: Permission denied
**Solution:** Make sure you're logged into Supabase as admin

### Error: Already exists
**Solution:** Table already created! Skip to Step 2

### Error: Syntax error
**Solution:** Make sure you copied the ENTIRE script from `RUN_THIS_FIRST_STK_SETUP.sql`

---

## After Setup Works

Once the table is created, you can:
- Submit STK migration requests from UI
- View migrations in admin dashboard
- Approve/reject migrations
- Automatically credit RZC to users

---

## Need Help?

1. Check Supabase logs for detailed errors
2. Verify you're in the correct project
3. Make sure you have admin access
4. Try running `check_stk_table.sql` to see current status

---

**Next:** After table is created, test the UI by going to Wallet Migration → STK to StarFi tab
