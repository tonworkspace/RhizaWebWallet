# Fix: metadata Column Does Not Exist

## ❌ Error
```
ERROR: 42703: column wa.metadata does not exist
```

## ✅ Solution

You have **two options**:

---

## Option 1: Use Simplified Test Queries (Recommended)

The `metadata` column is optional. Use the simplified test file instead:

### Steps:
1. Open `test_activation_tracking_simple.sql`
2. Run the queries in Supabase SQL Editor
3. All queries work without the metadata column

**This is the recommended approach** - the system works perfectly without metadata.

---

## Option 2: Add metadata Column (Optional)

If you want to store additional information like admin activation details:

### Steps:
1. Open `add_metadata_to_wallet_activations.sql`
2. Run it in Supabase SQL Editor
3. This adds a `metadata` JSONB column
4. Then you can use the original `test_activation_tracking.sql`

### What metadata Stores:
```json
{
  "admin_activated": true,
  "admin_wallet": "EQB2b3Uk...",
  "reason": "Manual activation for testing",
  "activated_at": "2024-04-10T14:30:00Z"
}
```

---

## 📁 File Guide

### Use These Files:
- ✅ **`test_activation_tracking_simple.sql`** - Works without metadata (USE THIS)
- ✅ **`check_wallet_activations_schema.sql`** - Check your table structure
- ✅ **`add_metadata_to_wallet_activations.sql`** - Add metadata column (optional)

### Original File (Fixed):
- ✅ **`test_activation_tracking.sql`** - Now works with or without metadata

---

## 🔍 Check Your Table Structure

Run this to see what columns you have:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_activations'
ORDER BY ordinal_position;
```

### Expected Columns (Minimum):
- `id` - UUID
- `user_id` - UUID (optional)
- `wallet_address` - TEXT
- `activation_fee_usd` - DECIMAL
- `activation_fee_ton` - DECIMAL
- `ton_price_at_activation` - DECIMAL
- `transaction_hash` - TEXT
- `status` - TEXT
- `completed_at` - TIMESTAMP
- `created_at` - TIMESTAMP

### Optional Column:
- `metadata` - JSONB (for storing extra info)

---

## ✅ Quick Fix

**Just use the simplified version:**

```bash
# In Supabase SQL Editor:
# 1. Close test_activation_tracking.sql
# 2. Open test_activation_tracking_simple.sql
# 3. Run the queries
```

**Everything will work!** The Admin Panel doesn't require the metadata column.

---

## 🎯 Summary

- **Error Cause**: Original test file assumed `metadata` column exists
- **Fix**: Use `test_activation_tracking_simple.sql` instead
- **Result**: All queries work, Admin Panel works, no issues

The activation tracking system is **fully functional** without the metadata column. It's only needed if you want to store extra details about admin activations.
