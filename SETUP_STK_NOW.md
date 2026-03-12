# 🚀 Setup STK Migration NOW - Quick Guide

## The Problem
You're seeing this error:
```
ERROR: relation "public.stk_migrations" does not exist
```

## The Solution (2 Minutes)

### 📋 Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com
2. Open your project
3. Click **SQL Editor** in left sidebar

### 📝 Step 2: Run the Setup Script

1. Open file: **`RUN_THIS_FIRST_STK_SETUP.sql`**
2. Copy ALL the content (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **RUN** button (or press Ctrl+Enter)

### ✅ Step 3: Verify Success

You should see this message:
```
✅ STK MIGRATIONS TABLE CREATED!
📊 Table: public.stk_migrations
🔒 RLS: Enabled
💱 Conversion: 10,000,000 STK = 8 RZC
✅ Ready to use!
```

### 🧪 Step 4: Test It

Run this quick check:
```sql
SELECT * FROM public.stk_migrations;
```

If you see a table (even empty), it worked! ✅

---

## What This Does

Creates a database table to store STK migration requests with:
- User wallet address
- STK amount
- Conversion to RZC
- Status tracking (pending/approved/rejected)
- Admin review fields

---

## After Setup

1. **Refresh your web app**
2. **Go to:** Wallet Migration page
3. **Click:** STK to StarFi tab
4. **Test:** Submit a migration request

---

## Conversion Ratio

**10,000,000 STK = 8 RZC**

Examples:
- 50,000,000 STK → 40 RZC
- 100,000,000 STK → 80 RZC
- 10,109,000,000,000 STK → 8,087.20 RZC

---

## Files Reference

| File | Purpose |
|------|---------|
| `RUN_THIS_FIRST_STK_SETUP.sql` | ⭐ Run this first to create table |
| `check_stk_table.sql` | Verify table exists |
| `STK_SETUP_STEPS.md` | Detailed instructions |
| `test_stk_migration.js` | Browser test (after setup) |

---

## Troubleshooting

### "Permission denied"
→ Make sure you're logged in as admin in Supabase

### "Already exists"
→ Table already created! You're good to go

### Still seeing the error?
→ Make sure you ran the ENTIRE script from `RUN_THIS_FIRST_STK_SETUP.sql`

---

## Ready to Test?

After running the setup script:

1. ✅ Table created
2. ✅ Refresh web app
3. ✅ Go to Wallet Migration
4. ✅ Click STK to StarFi tab
5. ✅ Submit test migration

---

**Status:** 🔴 Table not created yet  
**Action:** Run `RUN_THIS_FIRST_STK_SETUP.sql` in Supabase SQL Editor  
**Time:** 2 minutes
