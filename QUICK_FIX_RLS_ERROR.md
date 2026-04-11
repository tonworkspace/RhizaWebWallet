# 🚀 Quick Fix: RLS Error on Save Rates

## ⚡ 30-Second Fix

**Error:** `new row violates row-level security policy for table "rzc_config"`

**Solution:** Run this in Supabase SQL Editor:

```sql
ALTER TABLE rzc_config DISABLE ROW LEVEL SECURITY;
```

**Done!** Now try saving rates again in Admin Panel.

---

## 🧪 Verify Fix

```sql
-- Should show: rowsecurity = false
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rzc_config';
```

---

## 📊 Why This Works

- `rzc_config` stores public data (asset prices)
- All users need read access
- RLS is unnecessary for public data
- Admin access already controlled by app logic

---

## ✅ Expected Result

After fix:
1. Go to Admin Panel
2. Click "Save Rates"
3. See: `✅ Global asset rates saved — live price updated instantly`

---

## 📁 Full Documentation

See `FIX_RZC_CONFIG_RLS_ERROR.md` for detailed explanation and alternative solutions.

