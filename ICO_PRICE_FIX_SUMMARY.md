# ICO Price Display Issue — Root Cause & Fix

## Problem

The Store UI is showing **incorrect prices**:
- **Seed Round**: Showing `$0.133` instead of `$0.12`
- **Round 2 (Private Sale)**: Showing `$0.018` instead of `$0.18`
- **Round 3 (Pre-Launch)**: Showing `$0.025` instead of `$0.25`

## Root Causes

### 1. Database Has Wrong Decimal Values
The `sale_rounds` table has incorrect prices:
```sql
-- WRONG (current database):
Round 1: price_usd = 0.012  (should be 0.12)
Round 2: price_usd = 0.018  (should be 0.18)
Round 3: price_usd = 0.025  (should be 0.25)
```

**Why?** The migration script `fix_ico_rounds_21m_supply_SAFE.sql` has the **correct values** (0.12, 0.18, 0.25), but it seems the database was updated with values that are **10x smaller** (missing a zero).

### 2. localStorage Override Was Blocking Database Price
**FIXED** — The UI was using this priority chain:
```javascript
// OLD (WRONG):
const RZC_PRICE_USD = rzcPriceProp || contextRzcPrice || activeRound.price_usd;
```

The `contextRzcPrice` came from `localStorage.getItem('admin_price_overrides')` which had:
```json
{ "rzc": 0.133 }
```

This **overrode** the database value.

**NEW (CORRECT):**
```javascript
// ✅ ALWAYS use database price from active ICO round (ignore localStorage overrides)
const RZC_PRICE_USD = activeRound.price_usd;  // Direct from DB, no overrides
```

The ICO rounds system is now the **single source of truth** for RZC pricing.

## Solution

### Step 1: Fix Database Prices
Run `fix_ico_prices_correct.sql`:
```sql
UPDATE sale_rounds SET price_usd = 0.12 WHERE round_number = 1;  -- Seed
UPDATE sale_rounds SET price_usd = 0.18 WHERE round_number = 2;  -- Private
UPDATE sale_rounds SET price_usd = 0.25 WHERE round_number = 3;  -- Pre-Launch
UPDATE sale_rounds SET price_usd = 1.00 WHERE round_number = 4;  -- Listing

-- Also fix next_round_price:
UPDATE sale_rounds SET next_round_price = 0.18 WHERE round_number = 1;
UPDATE sale_rounds SET next_round_price = 0.25 WHERE round_number = 2;
UPDATE sale_rounds SET next_round_price = 1.00 WHERE round_number = 3;
```

### Step 2: Clear localStorage Override (Optional)
The code fix in Step 1 already ignores localStorage, but you can clean it up:

Run in **browser console**:
```javascript
localStorage.removeItem('admin_price_overrides');
location.reload();
```

**Note:** This is now optional since `StoreUI.tsx` no longer reads the RZC price from localStorage.

## Expected Results After Fix

### Database Query
```sql
SELECT round_number, round_name, price_usd, next_round_price, is_active
FROM sale_rounds ORDER BY round_number;
```

**Expected Output:**
| round_number | round_name      | price_usd | next_round_price | is_active |
|--------------|-----------------|-----------|------------------|-----------|
| 1            | Seed Round      | 0.12      | 0.18             | true      |
| 2            | Private Sale    | 0.18      | 0.25             | false     |
| 3            | Pre-Launch Sale | 0.25      | 1.00             | false     |
| 4            | Public Listing  | 1.00      | 1.00             | false     |

### UI Display
After clearing localStorage and refreshing:
- **Seed Price**: `$0.12` ✅
- **Round 2 Price**: `$0.18` ✅
- **Round 3 Price**: `$0.25` ✅
- **Listing Price**: `$1.00` ✅

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Database (sale_rounds table)                                │
│ ├─ Round 1: price_usd = 0.12, next_round_price = 0.18      │
│ ├─ Round 2: price_usd = 0.18, next_round_price = 0.25      │
│ └─ Round 3: price_usd = 0.25, next_round_price = 1.00      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Supabase RPC: get_active_sale_round()                      │
│ Returns active round with price_usd and next_round_price   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ saleRoundService.getActiveRound()                           │
│ Converts to ActiveSaleRound type                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ useSaleRound() hook                                         │
│ Provides: activeRound.price_usd, activeRound.next_round_price│
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ StoreUI.tsx                                                 │
│ const RZC_PRICE_USD = rzcPriceProp || contextRzcPrice ||   │
│                       activeRound.price_usd                 │
│ const NEXT_ROUND_PRICE = activeRound.next_round_price      │
└─────────────────────────────────────────────────────────────┘
```

## Why This Happened

The migration script `fix_ico_rounds_21m_supply_SAFE.sql` has **correct values**:
```sql
-- Line 35: Round 1
price_usd = 0.12,  ✅ CORRECT

-- Line 50: Round 2
price_usd = 0.18,  ✅ CORRECT

-- Line 66: Round 3
price_usd = 0.25,  ✅ CORRECT
```

**But the database has wrong values** — likely because:
1. The migration was never run, OR
2. An older migration with wrong values was run instead, OR
3. Manual updates were made with incorrect decimal places

## Action Items

- [x] Fix `StoreUI.tsx` to always use database price (ignore localStorage)
- [ ] Run `fix_ico_prices_correct.sql` in Supabase SQL Editor
- [ ] Verify with `SELECT * FROM get_active_sale_round();`
- [ ] Refresh UI and verify prices display correctly ($0.12, $0.18, $0.25, $1.00)
- [ ] Test purchase flow with correct prices
- [ ] (Optional) Clear localStorage override in browser console

## Files Modified

- `components/StoreUI.tsx` — **FIXED**: Now always uses `activeRound.price_usd` from database
- `fix_ico_prices_correct.sql` — Database fix script
- `check_current_ico_prices.sql` — Diagnostic query
- `ICO_PRICE_FIX_SUMMARY.md` — This document

## Related Files

- `hooks/useSaleRound.ts` — Fetches round data (no changes needed)
- `services/saleRoundService.ts` — Service layer (no changes needed)
- `components/StoreUI.tsx` — UI display (no changes needed)
- `fix_ico_rounds_21m_supply_SAFE.sql` — Original migration (has correct values)


## About localStorage Price Overrides

The `admin_price_overrides` localStorage system is **still valid** for other assets (TON, BTC, ETH, SOL, etc.) — it provides fallback prices when CoinGecko API fails.

**However, for RZC specifically:**
- ❌ **Should NOT** use localStorage overrides
- ✅ **Should ALWAYS** use database (`sale_rounds` table)
- ✅ ICO rounds system is the single source of truth

### Why?
1. **RZC price changes by round** — Seed ($0.12) → Private ($0.18) → Pre-Launch ($0.25) → Listing ($1.00)
2. **Database tracks progress** — tokens sold, remaining, bonuses, dates
3. **localStorage is static** — can't track round transitions or sold-out status
4. **Admin control** — Admins update prices via database, not localStorage

### Other Assets (TON, BTC, ETH, etc.)
These **should continue** using the localStorage fallback system because:
- Prices come from external APIs (CoinGecko)
- Need fallback when API is down
- Don't have round-based pricing logic

## Summary

| Asset | Price Source | Fallback |
|-------|-------------|----------|
| RZC | `sale_rounds` table (database) | Hardcoded in `useSaleRound.ts` |
| TON, BTC, ETH, etc. | CoinGecko API | `admin_price_overrides` localStorage |
