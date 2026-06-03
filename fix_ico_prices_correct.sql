-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix ICO Round Prices — Correct Values
-- ═══════════════════════════════════════════════════════════════════════════════
-- Problem: Database shows $0.018 instead of $0.18 for Round 2
-- Solution: Update all rounds with correct decimal prices
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Check Current State ──────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    next_round_price,
    token_cap,
    tokens_sold,
    is_active
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 2: Update Prices to Correct Values ──────────────────────────────────

-- Round 1: Seed Round — $0.12 (correct)
UPDATE sale_rounds SET
    price_usd = 0.12,
    updated_at = now()
WHERE round_number = 1;

-- Round 2: Private Sale — $0.18 (was showing $0.018 — missing zero!)
UPDATE sale_rounds SET
    price_usd = 0.18,
    updated_at = now()
WHERE round_number = 2;

-- Round 3: Pre-Launch — $0.25 (verify it's correct)
UPDATE sale_rounds SET
    price_usd = 0.25,
    updated_at = now()
WHERE round_number = 3;

-- Round 4: Public Listing — $1.00 (correct)
UPDATE sale_rounds SET
    price_usd = 1.00,
    updated_at = now()
WHERE round_number = 4;

-- ── STEP 3: Update next_round_price for Each Round ───────────────────────────

-- Round 1 → next is Round 2 at $0.18
UPDATE sale_rounds SET
    next_round_price = 0.18,
    updated_at = now()
WHERE round_number = 1;

-- Round 2 → next is Round 3 at $0.25
UPDATE sale_rounds SET
    next_round_price = 0.25,
    updated_at = now()
WHERE round_number = 2;

-- Round 3 → next is Round 4 at $1.00
UPDATE sale_rounds SET
    next_round_price = 1.00,
    updated_at = now()
WHERE round_number = 3;

-- Round 4 → no next round (listing price)
UPDATE sale_rounds SET
    next_round_price = 1.00,  -- same as current (final round)
    updated_at = now()
WHERE round_number = 4;

-- ── STEP 4: Verify Updated Prices ────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    next_round_price,
    token_cap,
    tokens_sold,
    is_active,
    is_complete
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 5: Test Active Round Function ───────────────────────────────────────
SELECT * FROM get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS AFTER FIX
-- ═══════════════════════════════════════════════════════════════════════════════
-- Round | Name           | Price  | Next Price | Status
-- ------|----------------|--------|------------|--------
-- 1     | Seed Round     | $0.12  | $0.18      | Active ✅
-- 2     | Private Sale   | $0.18  | $0.25      | Pending
-- 3     | Pre-Launch     | $0.25  | $1.00      | Pending
-- 4     | Public Listing | $1.00  | $1.00      | Pending
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 6: Clear localStorage Override (Run in Browser Console) ─────────────
-- localStorage.removeItem('admin_price_overrides');
-- location.reload();
-- ═══════════════════════════════════════════════════════════════════════════════
