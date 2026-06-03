-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix Seed Round to Reflect Current Reality
-- ═══════════════════════════════════════════════════════════════════════════════
-- Current Reality:
-- - Seed Round is ACTIVE (not complete)
-- - Started: April 1, 2026
-- - Ends: May 1, 2026 (30 days)
-- - Progress: ~10% sold
-- - Price: $0.12 per RZC
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Check Current State ──────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    ROUND((tokens_sold::numeric / NULLIF(token_cap, 0)) * 100, 2) AS progress_pct,
    is_active,
    is_complete,
    start_date,
    end_date
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 2: Deactivate ALL Rounds First (to avoid constraint violation) ──────
UPDATE sale_rounds SET
    is_active = false
WHERE is_active = true;

-- ── STEP 3: Update Seed Round (Round 1) to Current Reality ───────────────────
UPDATE sale_rounds SET
    round_name = 'Seed Round',
    price_usd = 0.12,
    token_cap = 4820000,                  -- Keep the 4.82M cap
    tokens_sold = 482000,                 -- 10% of 4.82M = 482K sold
    bonus_tiers = '[
        {"min": 2500,  "bonus": 5},
        {"min": 10000, "bonus": 15}
    ]'::jsonb,
    start_date = '2026-04-01T00:00:00Z',  -- Started April 1, 2026
    end_date = '2026-05-01T23:59:59Z',    -- Ends May 1, 2026 (30 days)
    is_active = true,                     -- ACTIVE (not complete)
    is_complete = false,                  -- NOT complete
    updated_at = now()
WHERE round_number = 1;

-- ── STEP 4: Verify Updated Status ────────────────────────────────────────────
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

-- ── STEP 5: Test Active Round Query ──────────────────────────────────────────
SELECT get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS AFTER FIX
-- ═══════════════════════════════════════════════════════════════════════════════
-- Round | Name           | Price  | Cap       | Sold    | Remaining | Progress | Status
-- ------|----------------|--------|-----------|---------|-----------|----------|----------
-- 1     | Seed Round     | $0.12  | 4,820,000 | 482,000 | 4,338,000 | 10.00%   | 🟢 ACTIVE
-- 2     | Private Sale   | $0.18  | 1,480,000 | 0       | 1,480,000 | 0.00%    | ⏸️ PENDING
-- 3     | Pre-Launch     | $0.25  | 2,100,000 | 0       | 2,100,000 | 0.00%    | ⏸️ PENDING
-- 4     | Public Listing | $1.00  | 2,100,000 | 0       | 2,100,000 | 0.00%    | ⏸️ PENDING
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 6: Calculate Days Remaining ─────────────────────────────────────────
SELECT 
    round_name,
    end_date,
    EXTRACT(DAY FROM (end_date - now())) AS days_remaining,
    EXTRACT(HOUR FROM (end_date - now())) AS hours_remaining
FROM sale_rounds
WHERE round_number = 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- UI EXPECTATIONS AFTER FIX
-- ═══════════════════════════════════════════════════════════════════════════════
-- Header: "Only 90% of seed round left"
-- Countdown: Shows days/hours until May 1, 2026
-- Progress Bar: 10% filled
-- Price: $0.12 per RZC
-- Next Round: $0.18 (Private Sale)
-- Status: Seed Round ACTIVE
-- ═══════════════════════════════════════════════════════════════════════════════
