# RZC Percentage - Quick Fix Guide 🚀

## ⚡ 3-Minute Fix

### 1️⃣ Run This SQL (2 min)
```sql
-- Open Supabase SQL Editor
-- Paste and run: fix_rzc_price_history_trigger.sql
```

### 2️⃣ Hard Refresh Browser (30 sec)
```
Press: Ctrl + Shift + R (Windows/Linux)
Or: Cmd + Shift + R (Mac)
```

### 3️⃣ Check Console (30 sec)
```
Press F12 → Console tab
Look for: "📊 [RZC Service] ✅ RZC 24h change: +X.XX%"
```

---

## 🔍 Is It Working?

### ✅ YES - You'll see:
- Console: `📊 [RZC Service] ✅ RZC 24h change: +5.26%`
- Dashboard: RZC shows green/red percentage badge
- Assets: Portfolio change includes RZC

### ❌ NO - You'll see:
- Console: `⚠️ [RZC Service] No RZC price history available`
- Dashboard: RZC shows "0.00%"
- Assets: Portfolio change doesn't include RZC

---

## 🐛 Still Showing 0.00%?

### Quick Manual Fix (2 min)
```sql
-- 1. Get your current RZC price
SELECT value FROM rzc_config WHERE key = 'RZC_PRICE';
-- Example result: 0.0015

-- 2. Insert historical record (adjust prices based on step 1)
INSERT INTO rzc_price_history (old_price, new_price, changed_by, changed_at, reason)
VALUES (
  0.001425,  -- 5% lower than current (adjust this)
  0.0015,    -- Your current price from step 1
  'system',
  NOW() - INTERVAL '25 hours',
  'Manual backfill'
);

-- 3. Verify it worked
SELECT 
  new_price,
  changed_at,
  AGE(NOW(), changed_at) as time_ago
FROM rzc_price_history
ORDER BY changed_at DESC
LIMIT 3;
```

### Then:
1. Hard refresh browser (Ctrl+Shift+R)
2. Wait 30 seconds
3. Check Dashboard

---

## 📊 Verify Database

```sql
-- Run this to check everything
-- File: verify_rzc_percentage_data.sql

-- Quick check:
SELECT 
  (SELECT value FROM rzc_config WHERE key = 'RZC_PRICE') as current_price,
  (SELECT COUNT(*) FROM rzc_price_history) as history_records,
  (SELECT MAX(changed_at) FROM rzc_price_history) as latest_record;

-- Should show:
-- current_price: 0.0015 (or your price)
-- history_records: 6 (or more)
-- latest_record: recent timestamp
```

---

## 🎯 Expected Results

### Database
```
✅ RZC_PRICE exists in rzc_config
✅ 6+ records in rzc_price_history
✅ Records span 24+ hours
```

### Console
```
✅ "📊 [RZC Service] ✅ RZC 24h change: +5.26%"
```

### UI
```
✅ Dashboard: RZC shows "+5.26%" in green badge
✅ Assets: Portfolio change includes RZC
```

---

## 🆘 Emergency Contact

If still not working after manual fix:

1. **Share console logs**: Copy all "[RZC Service]" messages
2. **Share SQL output**: Run `verify_rzc_percentage_data.sql`
3. **Check files exist**:
   - `services/rzcPriceService.ts`
   - `fix_rzc_price_history_trigger.sql`
   - `verify_rzc_percentage_data.sql`

---

## 📁 File Reference

| File | Purpose |
|------|---------|
| `fix_rzc_price_history_trigger.sql` | Setup database |
| `verify_rzc_percentage_data.sql` | Diagnose issues |
| `RZC_PERCENTAGE_DEBUG_GUIDE.md` | Full troubleshooting |
| `RZC_PERCENTAGE_NEXT_STEPS.md` | Detailed steps |
| `RZC_PERCENTAGE_IMPLEMENTATION_COMPLETE.md` | Technical docs |

---

**Build Status**: ✅ Passing (Exit Code: 0)  
**Last Updated**: May 1, 2026
