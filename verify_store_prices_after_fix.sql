-- ═══════════════════════════════════════════════════════════════════════════════
-- Verify Store Prices After Fix
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this after applying fix_ico_prices_correct.sql to verify everything is correct
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Check all round prices ────────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    next_round_price,
    token_cap,
    tokens_sold,
    tokens_remaining,
    progress_pct,
    is_active,
    is_complete
FROM sale_rounds
ORDER BY round_number;

-- Expected:
-- Round 1: price_usd = 0.12, next_round_price = 0.18
-- Round 2: price_usd = 0.18, next_round_price = 0.25
-- Round 3: price_usd = 0.25, next_round_price = 1.00
-- Round 4: price_usd = 1.00, next_round_price = 1.00

-- ── 2. Test get_active_sale_round() function ─────────────────────────────────
SELECT * FROM get_active_sale_round();

-- Expected output should include:
-- price_usd: 0.12 (if Seed Round is active)
-- next_round_price: 0.18
-- round_name: 'Seed Round'

-- ── 3. Verify price progression is correct ───────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    next_round_price,
    ROUND((next_round_price / price_usd), 2) AS price_increase_multiplier
FROM sale_rounds
WHERE round_number < 4
ORDER BY round_number;

-- Expected multipliers:
-- Round 1 → 2: 1.5x  (0.18 / 0.12 = 1.5)
-- Round 2 → 3: 1.39x (0.25 / 0.18 = 1.39)
-- Round 3 → 4: 4.0x  (1.00 / 0.25 = 4.0)

-- ── 4. Check bonus tiers are valid ───────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    bonus_tiers
FROM sale_rounds
ORDER BY round_number;

-- Expected:
-- Round 1: [{"min": 2500, "bonus": 5}, {"min": 10000, "bonus": 15}]
-- Round 2: [{"min": 2500, "bonus": 3}, {"min": 10000, "bonus": 10}]
-- Round 3: [{"min": 1000, "bonus": 2}]
-- Round 4: []

-- ── 5. Verify total ICO allocation ───────────────────────────────────────────
SELECT 
    SUM(token_cap) AS total_ico_tokens,
    ROUND((SUM(token_cap)::numeric / 21000000) * 100, 2) AS pct_of_total_supply,
    21000000 - SUM(token_cap) AS remaining_for_ecosystem
FROM sale_rounds;

-- Expected:
-- total_ico_tokens: 10,500,000
-- pct_of_total_supply: 50.00%
-- remaining_for_ecosystem: 10,500,000

-- ── 6. Check which round is currently active ─────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    is_active,
    start_date::date,
    end_date::date
FROM sale_rounds
WHERE is_active = true;

-- Expected: Only ONE round should be active (Seed Round)

-- ── 7. Verify price consistency ──────────────────────────────────────────────
-- Check that no prices are suspiciously small (< 0.10) except for test data
SELECT 
    round_number,
    round_name,
    price_usd,
    CASE 
        WHEN price_usd < 0.10 THEN '⚠️ SUSPICIOUS - Too low'
        WHEN price_usd > 10.00 THEN '⚠️ SUSPICIOUS - Too high'
        ELSE '✅ OK'
    END AS price_check
FROM sale_rounds
ORDER BY round_number;

-- All should show '✅ OK'

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ Round 1 (Seed):        $0.12 → $0.18 (1.5x increase)
-- ✅ Round 2 (Private):     $0.18 → $0.25 (1.39x increase)
-- ✅ Round 3 (Pre-Launch):  $0.25 → $1.00 (4x increase)
-- ✅ Round 4 (Listing):     $1.00 (final price)
-- ✅ Total ICO: 10.5M RZC (50% of 21M supply)
-- ✅ Only 1 round active at a time
-- ═══════════════════════════════════════════════════════════════════════════════
