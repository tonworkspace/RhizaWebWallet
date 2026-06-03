-- ============================================================================
-- RZC ICO ROUND CORRECTION — 21,000,000 TOTAL SUPPLY
-- Run this in Supabase SQL Editor AFTER the migration has been applied
-- ============================================================================
--
-- RHIZACORE RZC TOKENOMICS (21M Total Supply)
-- ─────────────────────────────────────────────
-- Total Supply:      21,000,000 RZC
--
-- Typical ICO allocation: ~60–70% for public sale across all rounds
-- Suggested breakdown:
--
-- ┌──────────────────┬────────────┬─────────────────────────────────────────────┐
-- │ Round            │ Allocation │ Notes                                       │
-- ├──────────────────┼────────────┼─────────────────────────────────────────────┤
-- │ Seed Round       │  3,150,000 │ 15% of supply · lowest early investors      │
-- │ Round 2          │  4,200,000 │ 20% of supply · community growth            │
-- │ Round 3          │  4,200,000 │ 20% of supply · pre-listing expansion       │
-- │ Public / Listing │  2,100,000 │  5% of supply · DEX listing liquidity       │
-- ├──────────────────┼────────────┼─────────────────────────────────────────────┤
-- │ ICO TOTAL        │ 13,650,000 │ 65% of 21M for public sale                 │
-- └──────────────────┴────────────┴─────────────────────────────────────────────┘
-- Remaining 35% (7,350,000 RZC):
--   · Team & Advisors:   2,100,000 (10%) — vested 12-24 months
--   · Ecosystem Reserve: 3,150,000 (15%) — rewards, mining, airdrops
--   · Liquidity Pool:    2,100,000 (10%) — DEX LP at listing
-- ============================================================================

-- ── STEP 1: Correct all 4 rounds in one go ───────────────────────────────────

-- Seed Round — 15% of 21M = 3,150,000 RZC at $0.012
UPDATE sale_rounds SET
  round_name  = 'Seed Round',
  price_usd   = 0.012,
  token_cap   = 3150000,
  bonus_tiers = '[{"min":500,"bonus":5},{"min":2000,"bonus":15}]'::jsonb,
  start_date  = '2025-01-01T00:00:00Z',
  end_date    = '2026-06-30T23:59:59Z',
  is_active   = true,
  is_complete = false
WHERE round_number = 1;

-- Round 2 — 20% of 21M = 4,200,000 RZC at $0.018
UPDATE sale_rounds SET
  round_name  = 'Round 2',
  price_usd   = 0.018,
  token_cap   = 4200000,
  bonus_tiers = '[{"min":500,"bonus":3},{"min":2000,"bonus":10}]'::jsonb,
  is_active   = false,
  is_complete = false
WHERE round_number = 2;

-- Round 3 — 20% of 21M = 4,200,000 RZC at $0.025
UPDATE sale_rounds SET
  round_name  = 'Round 3',
  price_usd   = 0.025,
  token_cap   = 4200000,
  bonus_tiers = '[{"min":500,"bonus":2}]'::jsonb,
  is_active   = false,
  is_complete = false
WHERE round_number = 3;

-- Public Listing — 5% of 21M = 1,050,000 RZC at $0.12
UPDATE sale_rounds SET
  round_name  = 'Public Listing',
  price_usd   = 0.12,
  token_cap   = 1050000,
  bonus_tiers = '[]'::jsonb,
  is_active   = false,
  is_complete = false
WHERE round_number = 4;

-- ── STEP 2: Verify the result ─────────────────────────────────────────────────
SELECT
  round_number,
  round_name,
  price_usd,
  token_cap,
  token_cap * price_usd::numeric AS round_raise_usd,
  tokens_sold,
  is_active,
  end_date::date
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 3: Check the active round RPC returns correct values ─────────────────
SELECT get_active_sale_round();

SELECT '✅ Round caps corrected for 21M RZC total supply' AS status;
