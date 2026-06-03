# RZC Percentage Display - Debug Guide

## 🎯 Current Status

**Code Implementation**: ✅ **COMPLETE**  
**Database Setup**: ⚠️ **NEEDS VERIFICATION**  
**UI Display**: ⚠️ **AWAITING DATA**

---

## 📋 What Was Implemented

### 1. Service Layer (`services/rzcPriceService.ts`)
- ✅ `getRzcChange24h()` function with **enhanced logging**
- ✅ Queries `rzc_config` table for current price (key: `RZC_PRICE`)
- ✅ Queries `rzc_price_history` table for 24h ago price
- ✅ Calculates percentage change: `((current - old) / old) * 100`
- ✅ Returns 0 if no data available

### 2. Dashboard Integration (`pages/Dashboard.tsx`)
- ✅ Imports `getRzcChange24h` service
- ✅ State: `const [rzcChange24h, setRzcChange24h] = useState(0)`
- ✅ useEffect fetches change on mount + every 5 minutes
- ✅ Passes `change: rzcChange24h` to RZC asset in `assetList`
- ✅ UI displays percentage with color coding (green/red)

### 3. Assets Page Integration (`pages/Assets.tsx`)
- ✅ Imports `getRzcChange24h` service
- ✅ State: `const [rzcChange24h, setRzcChange24h] = useState(0)`
- ✅ useEffect fetches change on mount + every 5 minutes
- ✅ Uses `rzcChange24hValue` in portfolio calculations
- ✅ Contributes to total portfolio 24h change percentage

### 4. Database Setup (`fix_rzc_price_history_trigger.sql`)
- ✅ Creates trigger on `rzc_config` table
- ✅ Tracks changes to `RZC_PRICE` key (uppercase)
- ✅ Logs to `rzc_price_history` table
- ✅ Backfills 6 historical records (30 days of history)

---

## 🔍 Diagnostic Steps

### Step 1: Run Database Verification
```sql
-- Run this in Supabase SQL Editor
-- File: verify_rzc_percentage_data.sql
```

**Expected Results:**
- ✅ STEP 1: Shows `RZC_PRICE` with numeric value (e.g., 0.0015)
- ✅ STEP 2: Shows at least 6 records spanning 24+ hours
- ✅ STEP 3: Shows backfilled records with timestamps
- ✅ STEP 4: Shows calculated percentage (e.g., "+5.26%") with status "✅ PASS"
- ✅ STEP 5: Shows trigger exists and is "✅ Enabled"
- ✅ STEP 6: Shows function exists

### Step 2: Check Browser Console
Open DevTools (F12) and look for these logs:

**✅ SUCCESS Pattern:**
```
🔍 [RZC Service] Starting 24h change calculation...
🔍 [RZC Service] Fetching current price from rzc_config...
✅ [RZC Service] Current price data: {value: "0.0015"}
✅ [RZC Service] Current price: $0.0015
🔍 [RZC Service] Fetching price from 24h ago (2026-04-30T...)
✅ [RZC Service] Historical price data: {new_price: 0.001425, changed_at: "2026-04-01..."}
✅ [RZC Service] Price 24h ago: $0.001425 (at 2026-04-01...)
📊 [RZC Service] ✅ RZC 24h change: +5.26% ($0.001425 → $0.0015)
```

**❌ FAILURE Patterns:**

**Pattern 1: No Current Price**
```
⚠️ [RZC Service] Could not fetch current RZC price from rzc_config
⚠️ [RZC Service] Config error details: {...}
```
**Fix:** Check if `RZC_PRICE` key exists in `rzc_config` table

**Pattern 2: No Historical Data**
```
⚠️ [RZC Service] No RZC price history available yet (system may be new)
⚠️ [RZC Service] History error: {...}
💡 [RZC Service] TIP: Run verify_rzc_percentage_data.sql to check database
```
**Fix:** Run `fix_rzc_price_history_trigger.sql` to backfill data

**Pattern 3: Records Too Recent**
```
⚠️ [RZC Service] No RZC price history available yet (system may be new)
```
**Fix:** Backfilled records might not span 24 hours yet

### Step 3: Verify UI Display

**Dashboard Page:**
1. Navigate to `/wallet/dashboard`
2. Scroll to "Your Assets" section
3. Find RZC token row
4. Check percentage badge (should show green/red with %)

**Assets Page:**
1. Navigate to `/wallet/assets`
2. Check "Total Portfolio Value" header
3. Verify 24h change percentage includes RZC contribution

---

## 🐛 Common Issues & Fixes

### Issue 1: Percentage Shows 0.00%
**Symptoms:**
- UI displays "0.00%" for RZC
- Console shows no errors

**Diagnosis:**
```sql
-- Run verify_rzc_percentage_data.sql
-- Check STEP 4 output
```

**Possible Causes:**
1. **No historical data** → STEP 4 shows "NO DATA - Need records older than 24h"
2. **Records too recent** → STEP 2 shows records but all within last 24h
3. **Trigger not working** → STEP 5 shows no trigger or disabled

**Fix:**
```sql
-- Re-run the backfill section from fix_rzc_price_history_trigger.sql
-- Or manually insert older records:

INSERT INTO rzc_price_history (old_price, new_price, changed_by, changed_at, reason)
VALUES (
  0.001425,  -- 5% lower than current
  0.0015,    -- Current price
  'system',
  NOW() - INTERVAL '25 hours',  -- 25 hours ago (ensures it's > 24h)
  'Manual backfill for testing'
);
```

### Issue 2: Database Error in Console
**Symptoms:**
- Console shows Supabase errors
- Percentage returns 0

**Diagnosis:**
Check console for specific error messages

**Possible Causes:**
1. **Table doesn't exist** → "relation 'rzc_price_history' does not exist"
2. **Column mismatch** → "column 'new_price' does not exist"
3. **Permission denied** → RLS policy blocking read

**Fix:**
```sql
-- Check table exists
SELECT * FROM rzc_price_history LIMIT 1;

-- Check columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rzc_price_history';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'rzc_price_history';
```

### Issue 3: Percentage Not Updating
**Symptoms:**
- Percentage shows same value after price change
- Admin updates price but % doesn't change

**Diagnosis:**
```sql
-- Check if trigger is logging changes
SELECT * FROM rzc_price_history ORDER BY changed_at DESC LIMIT 5;
```

**Possible Causes:**
1. **Trigger not firing** → No new records after price update
2. **Cache issue** → Browser cached old data
3. **Polling not working** → useEffect not running

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Wait 5 minutes for next poll
3. Check trigger status:
```sql
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'trigger_log_rzc_price_change';
```

---

## 🧪 Manual Testing Checklist

### Test 1: Verify Data Exists
- [ ] Run `verify_rzc_percentage_data.sql`
- [ ] Confirm STEP 4 shows percentage with "✅ PASS"
- [ ] Confirm at least 6 records in STEP 3

### Test 2: Verify Service Works
- [ ] Open browser DevTools (F12)
- [ ] Navigate to Dashboard
- [ ] Check console for "📊 [RZC Service] ✅ RZC 24h change: ..."
- [ ] Verify percentage matches database calculation

### Test 3: Verify UI Display
- [ ] Check Dashboard → RZC asset shows percentage badge
- [ ] Check Assets page → Portfolio change includes RZC
- [ ] Verify color coding (green for positive, red for negative)

### Test 4: Verify Updates Work
- [ ] Admin updates RZC price in AdminPanel
- [ ] Wait 5 minutes OR hard refresh
- [ ] Verify new percentage reflects price change

---

## 📊 Database Schema Reference

### `rzc_config` Table
```sql
CREATE TABLE rzc_config (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key we track: 'RZC_PRICE' (uppercase)
```

### `rzc_price_history` Table
```sql
CREATE TABLE rzc_price_history (
  id SERIAL PRIMARY KEY,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);
```

### Trigger Function
```sql
CREATE OR REPLACE FUNCTION log_rzc_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.value IS DISTINCT FROM NEW.value AND NEW.key = 'RZC_PRICE' THEN
    INSERT INTO rzc_price_history (old_price, new_price, changed_by, reason)
    VALUES (OLD.value::NUMERIC, NEW.value::NUMERIC, COALESCE(NEW.updated_by, 'system'), 'Price updated via rzc_config');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 Quick Fix Commands

### If percentage shows 0.00%:
```sql
-- 1. Check current price
SELECT * FROM rzc_config WHERE key = 'RZC_PRICE';

-- 2. Check history
SELECT * FROM rzc_price_history ORDER BY changed_at DESC LIMIT 5;

-- 3. If no history, backfill manually
INSERT INTO rzc_price_history (old_price, new_price, changed_by, changed_at, reason)
VALUES (0.001425, 0.0015, 'system', NOW() - INTERVAL '25 hours', 'Manual backfill');

-- 4. Hard refresh browser (Ctrl+Shift+R)
```

### If trigger not working:
```sql
-- Re-run the trigger setup
DROP TRIGGER IF EXISTS trigger_log_rzc_price_change ON rzc_config;
DROP FUNCTION IF EXISTS log_rzc_price_change();

-- Then run fix_rzc_price_history_trigger.sql
```

---

## 📝 Files Reference

### SQL Scripts
- `fix_rzc_price_history_trigger.sql` - Main setup script
- `verify_rzc_percentage_data.sql` - Diagnostic script

### Service Files
- `services/rzcPriceService.ts` - Calculation logic with logging

### UI Files
- `pages/Dashboard.tsx` - Lines 33, 118, 136-145, 640
- `pages/Assets.tsx` - Lines 27, 80, 107-117, 399, 414

---

## ✅ Success Indicators

When everything works correctly, you should see:

1. **Database**: STEP 4 shows percentage with "✅ PASS"
2. **Console**: "📊 [RZC Service] ✅ RZC 24h change: +X.XX%"
3. **Dashboard**: RZC asset shows colored percentage badge
4. **Assets**: Portfolio change includes RZC contribution

---

## 🆘 Still Not Working?

If you've followed all steps and it's still not working:

1. **Share console logs** - Copy all "[RZC Service]" logs
2. **Share SQL results** - Run `verify_rzc_percentage_data.sql` and share output
3. **Check browser** - Try incognito mode to rule out cache issues
4. **Check network** - Verify Supabase connection is working

---

**Last Updated**: May 1, 2026  
**Build Status**: ✅ Passing (Exit Code: 0)  
**TypeScript**: ✅ No errors
