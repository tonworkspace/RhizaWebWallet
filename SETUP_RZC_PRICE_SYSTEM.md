# 🚀 Setup RZC Price Management System

## Quick Start (10 minutes)

### Step 1: Run SQL Script (5 min)

1. Open Supabase SQL Editor
2. Copy and paste the entire content of `update_rzc_price.sql`
3. Click "Run"
4. Wait for success message

**Expected Output**:
```
RZC price configuration system installed successfully!
```

---

### Step 2: Verify Installation (2 min)

Run these queries to verify:

```sql
-- Check current price (should return 0.10)
SELECT get_rzc_price();

-- Check config table
SELECT * FROM rzc_config;

-- Test conversions
SELECT 
  usd_to_rzc(100) as "100_USD_to_RZC",
  rzc_to_usd(1000) as "1000_RZC_to_USD";
```

**Expected Results**:
- `get_rzc_price()` returns `0.10`
- `usd_to_rzc(100)` returns `1000`
- `rzc_to_usd(1000)` returns `100`

---

### Step 3: Frontend Integration (3 min)

The frontend configuration is already set up in `config/rzcConfig.ts`.

**Verify it's working**:
1. Open Dashboard
2. Check that RZC balance shows correct USD value
3. Formula: RZC Balance × $0.10 = USD Value

---

## ✅ What Was Installed

### Database Tables
1. **rzc_config** - Stores current RZC price
2. **rzc_price_history** - Tracks all price changes

### Database Functions
1. **get_rzc_price()** - Returns current price
2. **update_rzc_price()** - Updates price and logs change
3. **usd_to_rzc()** - Converts USD to RZC
4. **rzc_to_usd()** - Converts RZC to USD

### Updated Functions
1. **award_package_purchase_commission()** - Now uses dynamic price
2. **calculate_weekly_team_sales_commissions()** - Now uses dynamic price

### Frontend Files
1. **config/rzcConfig.ts** - Centralized configuration
2. **pages/Dashboard.tsx** - Updated to use config

---

## 🎯 How to Change RZC Price

### Example: Change to $0.15

**Step 1**: Update frontend
```typescript
// config/rzcConfig.ts
RZC_PRICE_USD: 0.15,
```

**Step 2**: Update database
```sql
SELECT * FROM update_rzc_price(0.15, 'admin');
```

**Step 3**: Verify
```sql
SELECT get_rzc_price(); -- Should return 0.15
```

That's it! All calculations will now use $0.15.

---

## 📊 Quick Tests

### Test 1: Check Current Price
```sql
SELECT 
  'Current Price' as info,
  get_rzc_price() as price_usd,
  '$' || get_rzc_price()::TEXT || ' per RZC' as display;
```

### Test 2: Test Conversions
```sql
SELECT 
  'Conversion Tests' as info,
  usd_to_rzc(100) as "100_USD",
  usd_to_rzc(50) as "50_USD",
  rzc_to_usd(1000) as "1000_RZC",
  rzc_to_usd(500) as "500_RZC";
```

### Test 3: Update Price (Test)
```sql
-- Update to $0.12
SELECT * FROM update_rzc_price(0.12, 'test');

-- Check new price
SELECT get_rzc_price();

-- Revert to $0.10
SELECT * FROM update_rzc_price(0.10, 'test');
```

### Test 4: View Price History
```sql
SELECT 
  old_price,
  new_price,
  changed_by,
  changed_at
FROM rzc_price_history
ORDER BY changed_at DESC;
```

---

## 🔍 Verification Checklist

- [ ] SQL script ran without errors
- [ ] `rzc_config` table exists
- [ ] `rzc_price_history` table exists
- [ ] `get_rzc_price()` returns 0.10
- [ ] `usd_to_rzc(100)` returns 1000
- [ ] `rzc_to_usd(1000)` returns 100
- [ ] Dashboard shows correct RZC USD value
- [ ] Can update price with `update_rzc_price()`
- [ ] Price changes are logged in history table

---

## 📁 Files Reference

- `config/rzcConfig.ts` - Frontend configuration
- `update_rzc_price.sql` - Database setup script
- `RZC_PRICE_MANAGEMENT_GUIDE.md` - Full documentation

---

## 🆘 Troubleshooting

### Error: "function get_rzc_price does not exist"
**Solution**: Run `update_rzc_price.sql` script

### Error: "relation rzc_config does not exist"
**Solution**: Run `update_rzc_price.sql` script

### Price not updating
**Solution**: 
1. Check: `SELECT * FROM rzc_config;`
2. Update: `SELECT * FROM update_rzc_price(0.10, 'admin');`

### Frontend shows wrong price
**Solution**: 
1. Update `config/rzcConfig.ts`
2. Clear browser cache
3. Refresh page

---

## ✅ Success!

If all checks pass, your RZC price management system is ready!

**Next Steps**:
1. Read `RZC_PRICE_MANAGEMENT_GUIDE.md` for detailed usage
2. Test changing the price in development
3. Monitor price impact on user behavior

**Current Status**:
- ✅ Database functions installed
- ✅ Frontend configuration ready
- ✅ Price management system active
- ✅ Price: $0.10 per RZC
