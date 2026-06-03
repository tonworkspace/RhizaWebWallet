-- ═══════════════════════════════════════════════════════════════════════════════
-- Activate ICO Round — Quick Fix Scripts
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── OPTION 1: Activate Round 1 (Seed Round) ──────────────────────────────────
-- Use this if you want to continue selling in the seed round
UPDATE sale_rounds
SET 
    is_active = true,
    is_complete = false,
    updated_at = now()
WHERE round_number = 1;

-- Deactivate all other rounds
UPDATE sale_rounds
SET is_active = false
WHERE round_number != 1;

-- ── OPTION 2: Activate Round 2 (Private Sale) ────────────────────────────────
-- Use this if seed round is complete and you want to start private sale
UPDATE sale_rounds
SET 
    is_active = false,
    is_complete = true,
    updated_at = now()
WHERE round_number = 1;

UPDATE sale_rounds
SET 
    is_active = true,
    is_complete = false,
    start_date = now(),
    updated_at = now()
WHERE round_number = 2;

-- Deactivate rounds 3 and 4
UPDATE sale_rounds
SET is_active = false
WHERE round_number IN (3, 4);

-- ── OPTION 3: Activate Round 3 (Pre-Launch) ──────────────────────────────────
-- Use this if rounds 1 and 2 are complete
UPDATE sale_rounds
SET 
    is_active = false,
    is_complete = true
WHERE round_number IN (1, 2);

UPDATE sale_rounds
SET 
    is_active = true,
    is_complete = false,
    start_date = now(),
    updated_at = now()
WHERE round_number = 3;

UPDATE sale_rounds
SET is_active = false
WHERE round_number = 4;

-- ── OPTION 4: Activate Round 4 (Public Listing) ──────────────────────────────
-- Use this if all previous rounds are complete
UPDATE sale_rounds
SET 
    is_active = false,
    is_complete = true
WHERE round_number IN (1, 2, 3);

UPDATE sale_rounds
SET 
    is_active = true,
    is_complete = false,
    start_date = now(),
    updated_at = now()
WHERE round_number = 4;

-- ── VERIFY ACTIVATION ─────────────────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    is_active,
    is_complete,
    CASE 
        WHEN is_active THEN '🟢 ACTIVE'
        WHEN is_complete THEN '✅ COMPLETE'
        ELSE '⏸️ PENDING'
    END AS status
FROM sale_rounds
ORDER BY round_number;

-- ── TEST ACTIVE ROUND QUERY ───────────────────────────────────────────────────
SELECT get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- QUICK REFERENCE
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- To activate a specific round, uncomment ONE of the options above:
-- 
-- OPTION 1: Seed Round ($0.012)
-- OPTION 2: Private Sale ($0.018)
-- OPTION 3: Pre-Launch ($0.025)
-- OPTION 4: Public Listing ($1.00)
-- 
-- After running, verify with:
-- SELECT * FROM sale_rounds ORDER BY round_number;
-- 
-- ═══════════════════════════════════════════════════════════════════════════════
