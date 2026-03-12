# RZC Price Management Guide

## 📊 Current System

The RZC price is now managed through a centralized configuration system with both frontend and backend components.

**Current RZC Price**: $0.10 USD

---

## 🎯 How to Update RZC Price

### Step 1: Update Frontend Configuration (5 minutes)

**File**: `config/rzcConfig.ts`

```typescript
export const RZC_CONFIG = {
  RZC_PRICE_USD: 0.10,  // ← Change this value
  // ... other config
}
```

**Example**: To change price to $0.15:
```typescript
RZC_PRICE_USD: 0.15,
```

---

### Step 2: Update Database Functions (5 minutes)

**File**: `update_rzc_price.sql`

Run this SQL command in Supabase SQL Editor:

```sql
-- Update RZC price to $0.15
SELECT * FROM update_rzc_price(0.15, 'admin');
```

**What this does**:
- Updates the `rzc_config` table with new price
- Logs the change in `rzc_price_history` table
- All database functions automatically use the new price

---

### Step 3: Verify Changes (2 minutes)

**Check Frontend**:
1. Refresh the app
2. Check Dashboard - RZC balance should show correct USD value
3. Check Sales Packages - commission calculations should use new price

**Check Database**:
```sql
-- Verify current price
SELECT get_rzc_price();

-- Check price history
SELECT * FROM rzc_price_history ORDER BY changed_at DESC LIMIT 5;

-- Test conversions
SELECT 
  usd_to_rzc(100) as "100_USD_to_RZC",
  rzc_to_usd(1000) as "1000_RZC_to_USD";
```

---

## 📁 Files That Use RZC Price

### Frontend Files
1. **config/rzcConfig.ts** - Main configuration
2. **pages/Dashboard.tsx** - Portfolio value calculation
3. **pages/MiningNodes.tsx** - Package rewards display
4. **pages/Referral.tsx** - Reward amounts display

### Database Functions
1. **award_package_purchase_commission()** - 10% referral commission
2. **calculate_weekly_team_sales_commissions()** - 1% team sales
3. **get_rzc_price()** - Returns current price
4. **usd_to_rzc()** - Conversion helper
5. **rzc_to_usd()** - Conversion helper

---

## 🔧 Available Functions

### Frontend (TypeScript)

```typescript
import { 
  RZC_CONFIG, 
  usdToRzc, 
  rzcToUsd, 
  formatRzc,
  formatRzcAsUsd,
  getRzcPrice,
  calculateCommissionRzc
} from '../config/rzcConfig';

// Get current price
const price = getRzcPrice(); // 0.10

// Convert USD to RZC
const rzc = usdToRzc(100); // 1000 RZC

// Convert RZC to USD
const usd = rzcToUsd(1000); // $100

// Format for display
const formatted = formatRzc(1000); // "1,000 RZC"
const usdDisplay = formatRzcAsUsd(1000); // "$100.00"

// Calculate commission
const commission = calculateCommissionRzc(100, 10); // 100 RZC (10% of $100)
```

### Backend (SQL)

```sql
-- Get current price
SELECT get_rzc_price(); -- 0.10

-- Update price
SELECT * FROM update_rzc_price(0.15, 'admin');

-- Convert USD to RZC
SELECT usd_to_rzc(100); -- 1000

-- Convert RZC to USD
SELECT rzc_to_usd(1000); -- 100

-- View price history
SELECT * FROM rzc_price_history ORDER BY changed_at DESC;
```

---

## 📊 Price Impact Examples

### Example 1: Price Increase ($0.10 → $0.15)

**Before** (at $0.10):
- $100 package = 1,000 RZC
- 10% commission = 100 RZC ($10)
- Welcome bonus = 50 RZC ($5)

**After** (at $0.15):
- $100 package = 666 RZC
- 10% commission = 66 RZC ($10)
- Welcome bonus = 33 RZC ($5)

**Impact**: Users receive fewer RZC tokens, but each token is worth more

---

### Example 2: Price Decrease ($0.10 → $0.05)

**Before** (at $0.10):
- $100 package = 1,000 RZC
- 10% commission = 100 RZC ($10)
- Welcome bonus = 50 RZC ($5)

**After** (at $0.05):
- $100 package = 2,000 RZC
- 10% commission = 200 RZC ($10)
- Welcome bonus = 100 RZC ($5)

**Impact**: Users receive more RZC tokens, but each token is worth less

---

## 🔍 Monitoring & Analytics

### Check Current Configuration

```sql
-- View current config
SELECT * FROM rzc_config;

-- View price history
SELECT 
  old_price,
  new_price,
  (new_price - old_price) as change,
  ((new_price - old_price) / old_price * 100) as percent_change,
  changed_by,
  changed_at,
  reason
FROM rzc_price_history
ORDER BY changed_at DESC;
```

### Check Impact on Rewards

```sql
-- Check recent commissions at current price
SELECT 
  rt.created_at,
  wu.wallet_address,
  rt.amount as rzc_amount,
  rzc_to_usd(rt.amount) as usd_value,
  rt.metadata->>'rzc_price_usd' as price_at_time
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
WHERE rt.type IN ('referral_commission', 'team_sales_commission')
ORDER BY rt.created_at DESC
LIMIT 20;
```

---

## ⚠️ Important Considerations

### 1. Existing Balances
- User RZC balances are NOT automatically adjusted when price changes
- Only NEW transactions use the new price
- Example: User has 1000 RZC at $0.10 = $100. If price changes to $0.15, their balance is still 1000 RZC but now worth $150

### 2. Package Rewards
- Package RZC rewards are FIXED in the code (e.g., $100 package = 1000 RZC)
- If you change the price, you may want to update package rewards too
- Location: `pages/MiningNodes.tsx` - `rzcReward` field in each package

### 3. Commission Calculations
- Commissions are calculated in USD first, then converted to RZC
- Example: 10% of $100 = $10 → $10 / RZC_PRICE = RZC amount
- This ensures commission VALUE stays constant regardless of RZC price

### 4. Historical Data
- All transactions store the RZC price at the time in metadata
- You can audit historical transactions to see what price was used
- Price history table tracks all changes

---

## 🚀 Quick Reference

### Update Price to $0.15

**Frontend**:
```typescript
// config/rzcConfig.ts
RZC_PRICE_USD: 0.15,
```

**Backend**:
```sql
SELECT * FROM update_rzc_price(0.15, 'admin');
```

### Update Price to $0.20

**Frontend**:
```typescript
// config/rzcConfig.ts
RZC_PRICE_USD: 0.20,
```

**Backend**:
```sql
SELECT * FROM update_rzc_price(0.20, 'admin');
```

### Update Price to $0.05

**Frontend**:
```typescript
// config/rzcConfig.ts
RZC_PRICE_USD: 0.05,
```

**Backend**:
```sql
SELECT * FROM update_rzc_price(0.05, 'admin');
```

---

## 📋 Checklist for Price Updates

- [ ] Update `config/rzcConfig.ts` with new price
- [ ] Run `update_rzc_price.sql` in Supabase
- [ ] Verify price with `SELECT get_rzc_price();`
- [ ] Test conversions with `SELECT usd_to_rzc(100);`
- [ ] Check Dashboard displays correct USD values
- [ ] Test package purchase with new price
- [ ] Verify commission calculations
- [ ] Check price history table
- [ ] Announce price change to users (if applicable)
- [ ] Update documentation/marketing materials

---

## 🛠️ Troubleshooting

### Issue: Frontend shows old price
**Solution**: Clear browser cache and refresh

### Issue: Database functions use old price
**Solution**: Run `update_rzc_price.sql` again

### Issue: Conversions are incorrect
**Solution**: 
```sql
-- Check current price
SELECT get_rzc_price();

-- If wrong, update it
SELECT * FROM update_rzc_price(0.10, 'admin');
```

### Issue: Price history not logging
**Solution**: Check trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_log_rzc_price_change';
```

---

## 📞 Support

If you encounter issues:
1. Check current price: `SELECT get_rzc_price();`
2. Check config table: `SELECT * FROM rzc_config;`
3. Check price history: `SELECT * FROM rzc_price_history;`
4. Verify functions exist: `SELECT * FROM pg_proc WHERE proname LIKE '%rzc%';`

---

## 🎯 Best Practices

1. **Always update both frontend and backend** - Keep them in sync
2. **Test in development first** - Don't change production price without testing
3. **Announce price changes** - Inform users before changing price
4. **Monitor impact** - Check how price changes affect user behavior
5. **Keep history** - Price history table helps with auditing
6. **Document reasons** - Add reason when updating price
7. **Gradual changes** - Avoid sudden large price changes

---

## 📈 Future Enhancements

Potential improvements to the price management system:

1. **Dynamic Pricing**: Fetch price from external API
2. **Price Schedules**: Set future price changes in advance
3. **Price Alerts**: Notify admins when price changes
4. **Price Analytics**: Dashboard showing price impact on metrics
5. **Multi-Currency**: Support different prices for different regions
6. **Price Locks**: Lock price for specific transactions
7. **Price Oracles**: Use blockchain oracles for decentralized pricing

---

## ✅ Summary

The RZC price management system provides:
- ✅ Centralized configuration in one place
- ✅ Easy updates via simple SQL command
- ✅ Automatic price history tracking
- ✅ Conversion helper functions
- ✅ Consistent pricing across all features
- ✅ Audit trail for all price changes

**Current Price**: $0.10 USD per RZC
**Last Updated**: Initial setup
**Next Review**: TBD
