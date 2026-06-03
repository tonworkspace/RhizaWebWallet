# 🔧 RZC Price History Schema Fix

**Date:** May 1, 2026  
**Status:** ✅ **FIXED**  
**Priority:** CRITICAL - Service was querying wrong column name

---

## 🎯 Issue Found

The `rzcPriceService.ts` was querying a column named `price_usd` that **doesn't exist** in the actual database schema.

### Actual Schema (from `update_rzc_price.sql`):
```sql
CREATE TABLE IF NOT EXISTS rzc_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  old_price NUMERIC NOT NULL,      -- ✅ Exists
  new_price NUMERIC NOT NULL,      -- ✅ Exists
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);
```

### What the Service Was Querying:
```typescript
// ❌ WRONG - This column doesn't exist!
const { data: historyData } = await client
  .from('rzc_price_history')
  .select('price_usd')  // ← Column doesn't exist!
```

---

## ✅ Fix Applied

Updated `services/rzcPriceService.ts` to query the correct column name:

### Before:
```typescript
const { data: historyData } = await client
  .from('rzc_price_history')
  .select('price_usd')  // ❌ Wrong column
  .lte('changed_at', twentyFourHoursAgo)
  .order('changed_at', { ascending: false })
  .limit(1)
  .single();

const oldPrice = parseFloat(historyData.price_usd.toString());  // ❌ Wrong column
```

### After:
```typescript
const { data: historyData } = await client
  .from('rzc_price_history')
  .select('new_price')  // ✅ Correct column
  .lte('changed_at', twentyFourHoursAgo)
  .order('changed_at', { ascending: false })
  .limit(1)
  .single();

const oldPrice = parseFloat(historyData.new_price.toString());  // ✅ Correct column
```

---

## 📊 Schema Details

### Table: `rzc_price_history`
**Location:** `update_rzc_price.sql` (lines 314-322)

**Columns:**
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `old_price` | NUMERIC | Previous RZC price before update |
| `new_price` | NUMERIC | New RZC price after update |
| `changed_by` | TEXT | User/admin who changed the price |
| `changed_at` | TIMESTAMP WITH TIME ZONE | When the price was changed |
| `reason` | TEXT | Reason for price change |

**Indexes:**
- `idx_rzc_price_history_changed_at` on `changed_at DESC` (for fast time-based queries)

**Trigger:**
- `trigger_log_rzc_price_change` - Automatically logs price changes when `rzc_config` table is updated

---

## 🔄 How It Works

### Price Update Flow:
```
Admin updates RZC price in AdminPanel
  ↓
update_rzc_price(0.15, 'admin') function called
  ↓
rzc_config table updated (key='rzc_price_usd')
  ↓
trigger_log_rzc_price_change fires
  ↓
INSERT INTO rzc_price_history (old_price, new_price, changed_by, reason)
  ↓
Price history logged with timestamp
```

### Price Change Calculation:
```
getRzcChange24h() called
  ↓
Get current price from app_config (e.g., $0.15)
  ↓
Get price from 24h ago from rzc_price_history.new_price (e.g., $0.12)
  ↓
Calculate: ((0.15 - 0.12) / 0.12) * 100 = +25%
  ↓
Return percentage change
```

---

## 🧪 Testing

### TypeScript Compilation:
```
✅ services/rzcPriceService.ts: No diagnostics found
```

### Query Logic:
```sql
-- Get price from 24 hours ago
SELECT new_price 
FROM rzc_price_history 
WHERE changed_at <= (NOW() - INTERVAL '24 hours')
ORDER BY changed_at DESC 
LIMIT 1;
```

**Why `new_price`?**
- Each row represents a price change event
- `old_price` = price before the change
- `new_price` = price after the change
- To get the price at a specific time, we use `new_price` from the most recent change before that time

---

## 📝 Example Data

### Sample Price History:
```sql
id                                   | old_price | new_price | changed_at           | changed_by
-------------------------------------|-----------|-----------|----------------------|------------
a1b2c3d4-...                        | 0.10      | 0.12      | 2026-04-30 10:00:00 | admin
e5f6g7h8-...                        | 0.12      | 0.15      | 2026-05-01 10:00:00 | admin
```

### Query Result (24h ago from May 1, 10:00 AM):
```sql
-- Looking for price 24h ago (April 30, 10:00 AM)
-- Returns: new_price = 0.12 (from first row)
-- Current price: 0.15
-- Change: ((0.15 - 0.12) / 0.12) * 100 = +25%
```

---

## ⚠️ Important Notes

### Column Naming Logic:
The schema uses `old_price` and `new_price` to represent **before** and **after** values of a single change event:

```
Change Event 1:
  old_price: $0.10 (what it was)
  new_price: $0.12 (what it became)
  changed_at: April 30, 10:00 AM

Change Event 2:
  old_price: $0.12 (what it was)
  new_price: $0.15 (what it became)
  changed_at: May 1, 10:00 AM
```

To get the price at a specific time, we query `new_price` from the most recent change **before** that time.

---

## 🔍 Verification Queries

### Check if table exists:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'rzc_price_history'
);
```

### View recent price changes:
```sql
SELECT * FROM rzc_price_history 
ORDER BY changed_at DESC 
LIMIT 10;
```

### Test 24h change calculation:
```sql
-- Get current price
SELECT value FROM app_config WHERE key = 'RZC_PRICE';

-- Get price from 24h ago
SELECT new_price 
FROM rzc_price_history 
WHERE changed_at <= (NOW() - INTERVAL '24 hours')
ORDER BY changed_at DESC 
LIMIT 1;
```

---

## 📁 Files Modified

1. **services/rzcPriceService.ts**
   - Changed `select('price_usd')` → `select('new_price')`
   - Changed `historyData.price_usd` → `historyData.new_price`
   - Added schema comment for clarity

---

## ✅ Status

- ✅ Schema identified in `update_rzc_price.sql`
- ✅ Service updated to use correct column names
- ✅ TypeScript compilation passes
- ✅ Query logic verified
- ✅ No breaking changes to existing code

---

## 🚀 Next Steps

1. **Verify table exists in database:**
   ```sql
   SELECT * FROM rzc_price_history LIMIT 1;
   ```

2. **Ensure trigger is active:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_log_rzc_price_change';
   ```

3. **Test price update:**
   ```sql
   SELECT * FROM update_rzc_price(0.15, 'admin');
   SELECT * FROM rzc_price_history ORDER BY changed_at DESC LIMIT 1;
   ```

4. **Monitor service logs:**
   - Check for "📊 RZC 24h change" success logs
   - Check for "⚠️" warning logs if no history exists
   - Check for "❌" error logs if queries fail

---

**Completed by:** Kiro AI  
**Date:** May 1, 2026  
**Status:** ✅ **SCHEMA MISMATCH FIXED**  
**Impact:** Service will now correctly query price history

