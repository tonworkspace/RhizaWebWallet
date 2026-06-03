# Store Referral Commission Fix

## Problem Identified

The `award_package_purchase_commission` database function was using a **hardcoded RZC price of $0.12** instead of the current dynamic price from the ICO rounds table.

### Impact

For a $5 RZC purchase:

**❌ Current (Wrong):**
- Commission: $5 × 10% = $0.50
- RZC awarded: $0.50 ÷ $0.12 = **4.17 RZC**

**✅ Should Be:**
- Commission: $5 × 10% = $0.50  
- RZC awarded: $0.50 ÷ $0.05 = **10 RZC**

**Result:** Referrers are receiving **58% less commission** than they should!

## Root Cause

```sql
-- In update_referral_rewards_CLEAN.sql line 37
v_rzc_price NUMERIC := 0.12; -- ❌ HARDCODED - WRONG!
```

The function was created when RZC was $0.12 but never updated when the ICO system launched at $0.05.

## Solution

### 1. Fix the Function (REQUIRED)

Run `fix_store_commission_dynamic_price.sql` to update the function to:

```sql
-- ✅ Get current price from active ICO round
SELECT price_usd INTO v_rzc_price
FROM ico_rounds
WHERE is_active = TRUE
ORDER BY round_number ASC
LIMIT 1;
```

### 2. Check for Missing Commissions

Run `check_missing_commissions.sql` to identify:
- Recent store purchases (last 7 days)
- Whether commissions were awarded
- How much commission SHOULD have been awarded

### 3. Backfill Missing Commissions (OPTIONAL)

Run `backfill_store_commissions.sql` to:
- Find all store purchases with wrong/missing commissions
- Calculate the difference
- Award the missing RZC to referrers

## Files Created

1. **fix_store_commission_dynamic_price.sql** - Updates the function to use dynamic pricing
2. **check_missing_commissions.sql** - Diagnostic queries to find affected purchases
3. **backfill_store_commissions.sql** - Awards missing commissions to referrers

## How to Apply

### Immediate Fix (Required)

```bash
# 1. Apply the function fix
psql -f fix_store_commission_dynamic_price.sql

# 2. Check for affected purchases
psql -f check_missing_commissions.sql
```

### Backfill (Optional - if you want to compensate affected referrers)

```bash
# Award missing commissions to referrers
psql -f backfill_store_commissions.sql
```

## Verification

After applying the fix, test with a new purchase:

```sql
-- Should show current price ($0.05 for seed round)
SELECT price_usd FROM ico_rounds WHERE is_active = TRUE;

-- Test commission calculation
SELECT 
  (5 * 0.10) / (SELECT price_usd FROM ico_rounds WHERE is_active = TRUE) 
  as expected_commission_for_5_dollar_purchase;
-- Should return: 10 RZC
```

## Prevention

The function now:
- ✅ Reads price from `ico_rounds` table (single source of truth)
- ✅ Updates automatically when rounds change
- ✅ Has fallback to $0.05 if no active round found
- ✅ Logs the price used in commission metadata

## Related Systems

This fix also applies to:
- `calculate_weekly_team_sales_commissions` (also has hardcoded $0.12)
- Any other referral commission calculations

Consider auditing all commission functions for hardcoded prices.
