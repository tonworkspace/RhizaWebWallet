# 🔍 Troubleshooting: RZC Percentage Still Showing 0.00%

**Issue:** RZC percentage change is still showing 0.00% after implementing the fix.

---

## 🎯 Root Cause Analysis

There are **4 possible reasons** why RZC is still showing 0.00%:

### 1. ❌ Price History Table Doesn't Exist
**Symptom:** Table `rzc_price_history` not created in database  
**Solution:** Run `fix_rzc_price_history_complete.sql`

### 2. ❌ Price History Table is Empty
**Symptom:** Table exists but has no records  
**Solution:** Run `fix_rzc_price_history_complete.sql` (includes backfill)

### 3. ❌ No Data from 24 Hours Ago
**Symptom:** Table has records but all are recent (< 24h old)  
**Solution:** Run `fix_rzc_price_history_complete.sql` (backfills 30 days of history)

### 4. ⏰ Frontend Cache Not Refreshed
**Symptom:** Database is correct but UI hasn't updated  
**Solution:** Wait 5 minutes or hard refresh browser (Ctrl+Shift+R)

---

## 🔧 Step-by-Step Fix

### Step 1: Run Diagnostic Query
```sql
-- Run this in your Supabase SQL Editor
-- File: debug_rzc_price_history.sql

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'rzc_price_history'
) as table_exists;

-- Check row count
SELECT COUNT(*) as total_records FROM rzc_price_history;

-- Check if we have data from 24h ago
SELECT 
  COUNT(*) as records_older_than_24h
FROM rzc_price_history
WHERE changed_at <= (NOW() - INTERVAL '24 hours');

-- View all records
SELECT * FROM rzc_price_history ORDER BY changed_at DESC;
```

### Step 2: Interpret Results

**Case A: Table doesn't exist**
```
table_exists: false
```
→ **Action:** Run `fix_rzc_price_history_complete.sql`

**Case B: Table is empty**
```
table_exists: true
total_records: 0
```
→ **Action:** Run `fix_rzc_price_history_complete.sql`

**Case C: No old data**
```
table_exists: true
total_records: 5
records_older_than_24h: 0
```
→ **Action:** Run `fix_rzc_price_history_complete.sql` (backfills historical data)

**Case D: Data exists**
```
table_exists: true
total_records: 10
records_older_than_24h: 5
```
→ **Action:** Check frontend (Step 3)

### Step 3: Fix Database (if needed)

Run the complete fix script:
```sql
-- File: fix_rzc_price_history_complete.sql
-- This script will:
-- 1. Create table if missing
-- 2. Create trigger to log future changes
-- 3. Backfill 30 days of price history
-- 4. Verify everything is working
```

**Expected Output:**
```
✅ Backfilled 6 price history records
✅ Table Status: 6 total records
✅ Oldest record: 30 days ago
✅ Newest record: 1 day ago
✅ Calculated 24h Change: +2.50% (or similar)
```

### Step 4: Verify Service is Working

Open browser console (F12) and look for these logs:

**Success:**
```
📊 RZC 24h change: +2.50% (0.135 → 0.14)
```

**No History:**
```
ℹ️ No RZC price history available yet (system may be new)
```

**Error:**
```
❌ Error calculating RZC 24h change: [error details]
```

### Step 5: Force Frontend Refresh

**Option A: Wait for automatic refresh**
- Service fetches every 5 minutes
- Wait up to 5 minutes after database fix

**Option B: Hard refresh browser**
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

**Option C: Clear browser cache**
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

---

## 🧪 Testing the Fix

### Test 1: Check Database
```sql
-- Should return a percentage (not 0%)
WITH current_price AS (
  SELECT value::NUMERIC as price FROM app_config WHERE key = 'RZC_PRICE'
),
price_24h_ago AS (
  SELECT new_price as price
  FROM rzc_price_history
  WHERE changed_at <= (NOW() - INTERVAL '24 hours')
  ORDER BY changed_at DESC
  LIMIT 1
)
SELECT 
  c.price as current_price,
  p.price as price_24h_ago,
  ROUND(((c.price - p.price) / p.price * 100)::NUMERIC, 2) as change_24h_percent
FROM current_price c
LEFT JOIN price_24h_ago p ON true;
```

**Expected Result:**
```
current_price | price_24h_ago | change_24h_percent
--------------|---------------|-------------------
0.140         | 0.135         | 3.70
```

### Test 2: Check Service Logs
Open browser console and refresh the page. Look for:
```
📊 RZC 24h change: +3.70% (0.135 → 0.140)
```

### Test 3: Check UI
After 5 minutes (or hard refresh):
```
RhizaCore Token
4,366.2207 RZC
$611.27  +3.70% ✅  ← Should show percentage!
```

---

## 🚨 Common Issues

### Issue 1: "No RZC price history available yet"
**Cause:** Table is empty or has no data from 24h ago  
**Fix:** Run `fix_rzc_price_history_complete.sql`

### Issue 2: "Could not fetch current RZC price"
**Cause:** `app_config` table doesn't have `RZC_PRICE` key  
**Fix:** 
```sql
INSERT INTO app_config (key, value, updated_by, updated_at)
VALUES ('RZC_PRICE', '0.140', 'system', NOW())
ON CONFLICT (key) DO UPDATE SET value = '0.140';
```

### Issue 3: Percentage shows but is wrong
**Cause:** Backfilled data doesn't match current price  
**Fix:** Manually adjust the most recent backfilled record:
```sql
UPDATE rzc_price_history
SET new_price = (SELECT value::NUMERIC FROM app_config WHERE key = 'RZC_PRICE') * 0.98
WHERE changed_at = (SELECT MAX(changed_at) FROM rzc_price_history);
```

### Issue 4: Still showing 0.00% after everything
**Cause:** Browser cache or service not running  
**Fix:**
1. Open DevTools Console (F12)
2. Check for errors
3. Hard refresh (Ctrl+Shift+R)
4. Check Network tab for API calls to Supabase
5. Verify `getRzcChange24h()` is being called

---

## 📊 Expected Timeline

```
T+0min:  Run fix_rzc_price_history_complete.sql
T+1min:  Verify database has historical data
T+2min:  Hard refresh browser (Ctrl+Shift+R)
T+2min:  Check console for "📊 RZC 24h change" log
T+2min:  ✅ RZC percentage should now display!
```

If automatic refresh:
```
T+0min:  Run fix_rzc_price_history_complete.sql
T+5min:  Service auto-fetches RZC change
T+5min:  ✅ RZC percentage should now display!
```

---

## 🎯 Quick Fix Commands

### Run in Supabase SQL Editor:

**1. Complete Fix (Recommended):**
```sql
-- Copy entire contents of fix_rzc_price_history_complete.sql
-- Paste into Supabase SQL Editor
-- Click "Run"
```

**2. Quick Diagnostic:**
```sql
-- Check status
SELECT 
  (SELECT COUNT(*) FROM rzc_price_history) as total_records,
  (SELECT COUNT(*) FROM rzc_price_history WHERE changed_at <= NOW() - INTERVAL '24 hours') as records_24h_ago,
  (SELECT value FROM app_config WHERE key = 'RZC_PRICE') as current_price;
```

**3. Manual Backfill (if needed):**
```sql
-- Insert 24h old price record
INSERT INTO rzc_price_history (old_price, new_price, changed_by, changed_at, reason)
VALUES (
  0.135, 
  0.138, 
  'system', 
  NOW() - INTERVAL '25 hours', 
  'Manual backfill for 24h change'
);
```

---

## ✅ Success Checklist

- [ ] Database table `rzc_price_history` exists
- [ ] Table has at least 1 record older than 24 hours
- [ ] Trigger `trigger_log_rzc_price_change` exists and is enabled
- [ ] SQL query returns a percentage (not NULL or 0)
- [ ] Browser console shows "📊 RZC 24h change" log
- [ ] UI displays percentage badge (not 0.00%)

---

## 🆘 Still Not Working?

If RZC percentage is still 0.00% after following all steps:

1. **Share these outputs:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM rzc_price_history ORDER BY changed_at DESC LIMIT 5;
   SELECT key, value FROM app_config WHERE key = 'RZC_PRICE';
   ```

2. **Share browser console logs:**
   - Open DevTools (F12)
   - Go to Console tab
   - Filter for "RZC"
   - Screenshot any errors or warnings

3. **Check Network tab:**
   - Open DevTools (F12)
   - Go to Network tab
   - Refresh page
   - Look for Supabase API calls
   - Check if `rzc_price_history` query is being made

---

**Next Steps:** Run `fix_rzc_price_history_complete.sql` in your Supabase SQL Editor and wait 2-5 minutes for the UI to update.
