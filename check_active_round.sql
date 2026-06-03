-- ═══════════════════════════════════════════════════════════════════════════════
-- Check Active ICO Round Status
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── QUERY 1: Check All Rounds ────────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    token_cap - tokens_sold AS tokens_remaining,
    ROUND((tokens_sold::numeric / NULLIF(token_cap, 0)) * 100, 2) AS progress_pct,
    is_active,
    is_complete,
    start_date::date AS start_date,
    end_date::date AS end_date,
    CASE 
        WHEN is_active THEN '🟢 ACTIVE'
        WHEN is_complete THEN '✅ COMPLETE'
        ELSE '⏸️ PENDING'
    END AS status
FROM sale_rounds
ORDER BY round_number;

-- ── QUERY 2: Check Active Round (What the App Sees) ──────────────────────────
SELECT get_active_sale_round();

-- ── QUERY 3: Count Active Rounds ─────────────────────────────────────────────
SELECT 
    COUNT(*) FILTER (WHERE is_active = true) AS active_rounds,
    COUNT(*) FILTER (WHERE is_complete = true) AS completed_rounds,
    COUNT(*) FILTER (WHERE is_active = false AND is_complete = false) AS pending_rounds,
    COUNT(*) AS total_rounds
FROM sale_rounds;

-- ── QUERY 4: Check for Issues ────────────────────────────────────────────────
SELECT 
    'Multiple Active Rounds' AS issue,
    COUNT(*) AS count
FROM sale_rounds
WHERE is_active = true
HAVING COUNT(*) > 1

UNION ALL

SELECT 
    'No Active Round' AS issue,
    0 AS count
WHERE NOT EXISTS (SELECT 1 FROM sale_rounds WHERE is_active = true)

UNION ALL

SELECT 
    'Tokens Sold > Cap' AS issue,
    COUNT(*) AS count
FROM sale_rounds
WHERE tokens_sold > token_cap
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Active Round is Complete' AS issue,
    COUNT(*) AS count
FROM sale_rounds
WHERE is_active = true AND is_complete = true
HAVING COUNT(*) > 0;

-- ── QUERY 5: ICO Progress Summary ────────────────────────────────────────────
SELECT 
    SUM(token_cap) AS total_ico_allocation,
    SUM(tokens_sold) AS total_sold,
    SUM(token_cap) - SUM(tokens_sold) AS total_remaining,
    ROUND((SUM(tokens_sold)::numeric / NULLIF(SUM(token_cap), 0)) * 100, 2) AS overall_progress_pct,
    SUM(tokens_sold * price_usd) AS total_raised_usd,
    SUM(token_cap * price_usd) AS total_potential_raise_usd
FROM sale_rounds;

-- ═══════════════════════════════════════════════════════════════════════════════
-- INTERPRETATION GUIDE
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- QUERY 1: Shows all rounds with their status
-- - Look for 🟢 ACTIVE — this is the current round
-- - If no 🟢 ACTIVE, you need to activate a round
-- 
-- QUERY 2: Shows what get_active_sale_round() returns
-- - This is what your frontend sees
-- - Should return JSON with round details
-- - If NULL or empty, no active round exists
-- 
-- QUERY 3: Counts rounds by status
-- - active_rounds should be 1 (exactly one)
-- - If 0, no round is active
-- - If >1, multiple rounds are active (error)
-- 
-- QUERY 4: Lists any issues found
-- - Empty result = no issues ✅
-- - Any rows = problems that need fixing
-- 
-- QUERY 5: Overall ICO progress
-- - Shows total allocation, sold, remaining
-- - Shows total USD raised vs potential
-- ═══════════════════════════════════════════════════════════════════════════════
