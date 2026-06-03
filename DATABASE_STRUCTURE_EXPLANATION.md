# Database Structure: sale_rounds vs ico_summary

## Quick Answer

**We use `sale_rounds` TABLE** — `ico_summary` is just a VIEW (read-only query) that shows the same data with calculated fields.

## Detailed Explanation

### `sale_rounds` (TABLE) — Source of Truth ✅

**Type:** PostgreSQL Table (stores actual data)

**Purpose:** The **primary source of truth** for all ICO round data

**Columns:**
- `id` (UUID, primary key)
- `round_number` (integer, 1-4)
- `round_name` (text, e.g., "Seed Round")
- `price_usd` (numeric, e.g., 0.12)
- `token_cap` (bigint, max tokens for round)
- `tokens_sold` (bigint, updated by purchases)
- `bonus_tiers` (jsonb, array of bonus rules)
- `start_date`, `end_date` (timestamps)
- `is_active` (boolean, only 1 can be true)
- `is_complete` (boolean)
- `created_at`, `updated_at` (timestamps)

**Used by:**
- `get_active_sale_round()` RPC function
- `record_ico_purchase()` RPC function
- `saleRoundService.getActiveRound()` in frontend
- All purchase and progress tracking logic

**Example Query:**
```sql
SELECT * FROM sale_rounds WHERE is_active = true;
```

---

### `ico_summary` (VIEW) — Convenience Display 📊

**Type:** PostgreSQL View (virtual table, no data storage)

**Purpose:** A **read-only convenience view** that adds calculated fields for display

**Definition:**
```sql
CREATE OR REPLACE VIEW ico_summary AS
SELECT 
    r.round_number,
    r.round_name,
    r.price_usd,
    r.token_cap,
    r.tokens_sold,
    r.token_cap - r.tokens_sold AS tokens_remaining,  -- ✅ Calculated
    ROUND((r.tokens_sold::numeric / NULLIF(r.token_cap, 0)) * 100, 2) AS progress_pct,  -- ✅ Calculated
    r.token_cap * r.price_usd AS total_raise_usd,  -- ✅ Calculated
    r.tokens_sold * r.price_usd AS raised_so_far_usd,  -- ✅ Calculated
    r.is_active,
    r.is_complete,
    r.start_date::date AS start_date,
    r.end_date::date AS end_date
FROM sale_rounds r
ORDER BY r.round_number;
```

**Used by:**
- Admin dashboards (optional)
- Quick reporting queries
- **NOT used by the frontend** (we use `get_active_sale_round()` instead)

**Example Query:**
```sql
SELECT * FROM ico_summary;  -- Shows all rounds with calculated fields
```

---

## Data Flow in the App

```
┌─────────────────────────────────────────────────────────────┐
│ sale_rounds TABLE (PostgreSQL)                              │
│ ├─ Round 1: price_usd = 0.12, tokens_sold = 482000         │
│ ├─ Round 2: price_usd = 0.18, tokens_sold = 0              │
│ ├─ Round 3: price_usd = 0.25, tokens_sold = 0              │
│ └─ Round 4: price_usd = 1.00, tokens_sold = 0              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ get_active_sale_round() RPC Function                        │
│ Returns: Active round + calculated fields (progress, etc.)  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ saleRoundService.getActiveRound() (Frontend)                │
│ Fetches active round via RPC                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ useSaleRound() Hook                                         │
│ Provides: activeRound, roundProgress, isSoldOut, etc.      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ StoreUI.tsx                                                 │
│ Displays: RZC_PRICE_USD, NEXT_ROUND_PRICE, progress bar    │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Two Structures?

### `sale_rounds` (Table)
- **Writable** — Can INSERT, UPDATE, DELETE
- **Enforces constraints** — Unique active round, tokens_sold <= token_cap
- **Triggers** — Can have triggers for auto-calculations
- **Primary key** — Has UUID for relationships
- **Used for:** All write operations (purchases, round transitions)

### `ico_summary` (View)
- **Read-only** — Cannot INSERT, UPDATE, DELETE
- **No storage** — Just a saved query
- **Always up-to-date** — Reflects current `sale_rounds` data
- **Convenience** — Pre-calculates common fields
- **Used for:** Quick reporting, admin dashboards

---

## Which One Should You Use?

| Operation | Use This |
|-----------|----------|
| **Frontend display** | `get_active_sale_round()` RPC (reads from `sale_rounds`) |
| **Record purchase** | `record_ico_purchase()` RPC (writes to `sale_rounds`) |
| **Admin dashboard** | `ico_summary` VIEW (optional, for convenience) |
| **Update prices** | `UPDATE sale_rounds SET price_usd = ...` |
| **Check progress** | `useSaleRound()` hook (fetches from `sale_rounds` via RPC) |

---

## Summary

✅ **`sale_rounds`** = Real table with actual data (use this for everything)  
📊 **`ico_summary`** = Virtual view for convenience (optional, read-only)

The frontend **only uses `sale_rounds`** via the `get_active_sale_round()` RPC function. The `ico_summary` view is just a helper for quick queries and doesn't affect the app's functionality.

---

## Files That Use `sale_rounds`

1. `hooks/useSaleRound.ts` — Fetches active round
2. `services/saleRoundService.ts` — Calls `get_active_sale_round()` RPC
3. `components/StoreUI.tsx` — Displays round data
4. `supabase/migrations/20260419_ico_rounds.sql` — Defines table and RPC functions
5. `fix_ico_prices_correct.sql` — Updates prices in `sale_rounds`

## Files That Use `ico_summary`

- **None in the frontend** — it's only for manual queries and admin dashboards
