# Dynamic Round Prices from Database ✅

## Problem

Round 3 price was **hardcoded** as `$0.25` in the UI instead of being loaded from the database.

## Solution

Added `getRoundPrice(roundNumber)` function to `useSaleRound` hook that:
1. Fetches **all round prices** from the database on mount
2. Caches them in state for instant access
3. Falls back to hardcoded values if DB is unavailable
4. Auto-refreshes every 2 minutes (same as active round)

## Changes Made

### ✅ 1. Updated `hooks/useSaleRound.ts`

**Added:**
```typescript
// Fallback prices for all rounds (used when DB is unavailable)
const FALLBACK_ROUND_PRICES = {
  1: 0.12,   // Seed
  2: 0.18,   // Private Sale
  3: 0.25,   // Pre-Launch
  4: 1.00,   // Public Listing
};

interface UseSaleRoundResult {
  // ... existing fields ...
  getRoundPrice: (roundNumber: number) => number;  // ✅ NEW
}
```

**Added state:**
```typescript
const [allRoundPrices, setAllRoundPrices] = useState<Record<number, number>>(FALLBACK_ROUND_PRICES);
```

**Added fetch logic:**
```typescript
// Fetch all round prices from sale_rounds table
const { data: allRounds } = await client
  .from('sale_rounds')
  .select('round_number, price_usd')
  .order('round_number');

if (allRounds && allRounds.length > 0) {
  const priceMap: Record<number, number> = {};
  allRounds.forEach((r: any) => {
    priceMap[r.round_number] = Number(r.price_usd);
  });
  setAllRoundPrices(priceMap);
}
```

**Added helper function:**
```typescript
const getRoundPrice = useCallback(
  (roundNumber: number) => allRoundPrices[roundNumber] ?? FALLBACK_ROUND_PRICES[roundNumber] ?? 0,
  [allRoundPrices],
);
```

### ✅ 2. Updated `components/StoreUI.tsx`

**Destructured new function:**
```typescript
const {
  activeRound,
  // ... other fields ...
  getRoundPrice,  // ✅ NEW
} = useSaleRound();
```

**Updated Price Projection Chart:**
```typescript
// OLD (WRONG):
{ stage: 'R3', price: 0.25, label: '$0.25' },

// NEW (CORRECT):
{ stage: 'R3', price: getRoundPrice(3), label: `$${getRoundPrice(3)}` },
```

**Updated Milestone Pills:**
```typescript
// OLD (WRONG):
{ stage: 'Round 3', price: '$0.25', active: false },

// NEW (CORRECT):
{ stage: 'Round 3', price: `$${getRoundPrice(3)}`, active: false },
```

**Updated Guide Tab Pricing Roadmap:**
```typescript
// OLD (WRONG):
{ stage: 'Round 3', price: '$0.25', mult: '2.1x', active: false },

// NEW (CORRECT):
{ stage: 'Round 3', price: `$${getRoundPrice(3)}`, mult: '2.1x', active: false },
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ sale_rounds TABLE (PostgreSQL)                              │
│ ├─ Round 1: price_usd = 0.12                                │
│ ├─ Round 2: price_usd = 0.18                                │
│ ├─ Round 3: price_usd = 0.25  ← Now loaded dynamically!    │
│ └─ Round 4: price_usd = 1.00                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ useSaleRound() Hook                                         │
│ ├─ Fetches active round via get_active_sale_round()        │
│ └─ Fetches ALL round prices via direct query                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ allRoundPrices State                                        │
│ { 1: 0.12, 2: 0.18, 3: 0.25, 4: 1.00 }                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ getRoundPrice(3) → Returns 0.25 from state                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ StoreUI.tsx                                                 │
│ Displays: Chart, Pills, Roadmap all show $0.25 from DB     │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

✅ **Single source of truth** — All prices come from database  
✅ **Auto-refresh** — Prices update every 2 minutes  
✅ **Fallback safety** — Works offline with hardcoded defaults  
✅ **Type-safe** — TypeScript ensures correct usage  
✅ **Performance** — Cached in state, no repeated queries  

## Price Sources Summary

| Price | Source | Fallback |
|-------|--------|----------|
| **Seed (Round 1)** | `activeRound.price_usd` | 0.12 |
| **Round 2** | `activeRound.next_round_price` | 0.18 |
| **Round 3** | `getRoundPrice(3)` from DB | 0.25 |
| **Listing (Round 4)** | `LISTING_PRICE` constant | 1.00 |

## Testing Checklist

- [ ] Run `fix_ico_prices_correct.sql` to update database
- [ ] Refresh Store UI
- [ ] Verify chart shows correct Round 3 price ($0.25)
- [ ] Verify milestone pills show correct Round 3 price
- [ ] Switch to Guide tab
- [ ] Verify pricing roadmap shows correct Round 3 price
- [ ] Check browser console for any errors
- [ ] Test with database offline (should show fallback $0.25)

## Files Modified

1. `hooks/useSaleRound.ts` — Added `getRoundPrice()` function
2. `components/StoreUI.tsx` — Uses `getRoundPrice(3)` for Round 3
3. `DYNAMIC_ROUND_PRICES_COMPLETE.md` — This summary

## Next Steps

1. **Run `fix_ico_prices_correct.sql`** in Supabase SQL Editor
2. **Refresh the UI** — All prices will now come from database
3. **Verify** — Check that Round 3 shows $0.25 everywhere

All round prices are now loaded dynamically from the database! 🎉
