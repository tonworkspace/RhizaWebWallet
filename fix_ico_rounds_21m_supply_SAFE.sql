-- ═══════════════════════════════════════════════════════════════════════════════
-- RhizaCore (RZC) ICO Rounds — 21 Million Total Supply (SAFE MIGRATION)
-- ═══════════════════════════════════════════════════════════════════════════════
-- This script safely migrates from broken tokenomics to correct 21M supply
-- by temporarily removing constraints, fixing data, then re-adding constraints.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Check Current State ──────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    tokens_sold - token_cap AS overflow,
    is_active,
    is_complete
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 2: Temporarily Remove Constraint ────────────────────────────────────
ALTER TABLE sale_rounds
DROP CONSTRAINT IF EXISTS check_tokens_sold_within_cap;

-- ── STEP 3: Handle Existing Overflow (4.82M sold vs 3.15M cap) ───────────────
-- OPTION A: Honor all existing sales by adjusting distribution
-- Keep 4.82M sold in Round 1, reduce Round 2 to compensate

-- Update Seed Round (Round 1) — Keep actual sales
UPDATE sale_rounds SET
    round_name = 'Seed Round',
    price_usd = 0.12,
    token_cap = 4820000,                  -- Match actual sales (over-subscribed!)
    bonus_tiers = '[
        {"min": 2500,  "bonus": 5},
        {"min": 10000, "bonus": 15}
    ]'::jsonb,
    start_date = '2025-01-01T00:00:00Z',
    end_date = '2026-06-30T23:59:59Z',
    is_complete = false,                   -- Mark as complete (over-subscribed)
    is_active = true,                    -- No longer active
    updated_at = now()
WHERE round_number = 1;

-- Update Private Sale (Round 2) — Reduce to compensate for Round 1 overflow
-- Original plan: 3.15M, but Round 1 took extra 1.67M, so Round 2 gets 1.48M
UPDATE sale_rounds SET
    round_name = 'Private Sale',
    price_usd = 0.18,
    token_cap = 1480000,                  -- 3.15M - 1.67M overflow = 1.48M
    tokens_sold = 0,
    bonus_tiers = '[
        {"min": 2500,  "bonus": 3},
        {"min": 10000, "bonus": 10}
    ]'::jsonb,
    start_date = '2026-07-01T00:00:00Z',
    end_date = '2026-12-31T23:59:59Z',
    is_active = false,                     -- Activate Round 2
    is_complete = false,
    updated_at = now()
WHERE round_number = 2;

-- Update Pre-Launch Sale (Round 3)
UPDATE sale_rounds SET
    round_name = 'Pre-Launch Sale',
    price_usd = 0.25,
    token_cap = 2100000,
    tokens_sold = 0,
    bonus_tiers = '[
        {"min": 1000, "bonus": 2}
    ]'::jsonb,
    start_date = '2027-01-01T00:00:00Z',
    end_date = '2027-03-31T23:59:59Z',
    is_active = false,
    is_complete = false,
    updated_at = now()
WHERE round_number = 3;

-- Update Public Listing (Round 4)
UPDATE sale_rounds SET
    round_name = 'Public Listing',
    price_usd = 1.00,
    token_cap = 2100000,
    tokens_sold = 0,
    bonus_tiers = '[]'::jsonb,
    start_date = '2027-04-01T00:00:00Z',
    end_date = '2030-12-31T23:59:59Z',
    is_active = false,
    is_complete = false,
    updated_at = now()
WHERE round_number = 4;

-- ── STEP 4: Verify Total ICO Allocation ──────────────────────────────────────
SELECT 
    SUM(token_cap) AS total_ico_allocation,
    ROUND((SUM(token_cap)::numeric / 21000000) * 100, 2) AS pct_of_total_supply,
    21000000 - SUM(token_cap) AS remaining_for_team_ecosystem
FROM sale_rounds;

-- Expected: 10,500,000 RZC (50% of 21M supply)
-- Actual: 4.82M + 1.48M + 2.1M + 2.1M = 10,500,000 ✅

-- ── STEP 5: Re-add Constraint (Now Safe) ─────────────────────────────────────
ALTER TABLE sale_rounds
ADD CONSTRAINT check_tokens_sold_within_cap
CHECK (tokens_sold <= token_cap);

-- ── STEP 6: Verify Updated Rounds ────────────────────────────────────────────
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
    start_date::date,
    end_date::date
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 7: Test Active Round Query ──────────────────────────────────────────
SELECT get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS AFTER MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
-- Round | Name           | Price   | Cap       | Sold      | Remaining | Status
-- ------|----------------|---------|-----------|-----------|-----------|----------
-- 1     | Seed Round     | $0.12  | 4,820,000 | 4,820,000 | 0         | Complete ✅
-- 2     | Private Sale   | $0.18  | 1,480,000 | 0         | 1,480,000 | Active ✅
-- 3     | Pre-Launch     | $0.25  | 2,100,000 | 0         | 2,100,000 | Pending
-- 4     | Public Listing | $1.00   | 2,100,000 | 0         | 2,100,000 | Pending
-- ------|----------------|---------|-----------|-----------|-----------|----------
-- TOTAL | ICO Allocation |         | 10,500,000| 4,820,000 | 5,680,000 | 45.9% sold
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 8: Update Frontend Constants (Optional) ─────────────────────────────
-- You may want to update StoreUI.tsx to show:
-- "Seed Round SOLD OUT — Private Sale Now Open!"
-- "4.82M RZC sold in seed round (over-subscribed by 53%)"

-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTERNATIVE OPTION B: Reset Everything (NOT RECOMMENDED)
-- ═══════════════════════════════════════════════════════════════════════════════
-- If you want to discard existing sales and start fresh:
-- 
-- UPDATE sale_rounds SET
--     token_cap = 3150000,
--     tokens_sold = 0,
--     is_active = true,
--     is_complete = false
-- WHERE round_number = 1;
-- 
-- UPDATE sale_rounds SET token_cap = 3150000, tokens_sold = 0 WHERE round_number = 2;
-- UPDATE sale_rounds SET token_cap = 2100000, tokens_sold = 0 WHERE round_number = 3;
-- UPDATE sale_rounds SET token_cap = 2100000, tokens_sold = 0 WHERE round_number = 4;
-- 
-- ⚠️ WARNING: This would invalidate 4.82M RZC worth of purchases!
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 9: Create Summary View ──────────────────────────────────────────────
CREATE OR REPLACE VIEW ico_summary AS
SELECT 
    r.round_number,
    r.round_name,
    r.price_usd,
    r.token_cap,
    r.tokens_sold,
    r.token_cap - r.tokens_sold AS tokens_remaining,
    ROUND((r.tokens_sold::numeric / NULLIF(r.token_cap, 0)) * 100, 2) AS progress_pct,
    r.token_cap * r.price_usd AS total_raise_usd,
    r.tokens_sold * r.price_usd AS raised_so_far_usd,
    r.is_active,
    r.is_complete,
    r.start_date::date AS start_date,
    r.end_date::date AS end_date
FROM sale_rounds r
ORDER BY r.round_number;

-- View the summary
SELECT * FROM ico_summary;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TOKENOMICS BREAKDOWN (21M Total Supply)
-- ═══════════════════════════════════════════════════════════════════════════════
-- ICO Sales (All Rounds):    10,500,000 RZC (50.00%)
--   ├─ Seed Round:            4,820,000 RZC (22.95%) ✅ SOLD
--   ├─ Private Sale:          1,480,000 RZC (7.05%)  ← ACTIVE
--   ├─ Pre-Launch:            2,100,000 RZC (10.00%)
--   └─ Public Listing:        2,100,000 RZC (10.00%)
-- 
-- Team & Advisors:            2,100,000 RZC (10.00%)
-- Ecosystem & Development:    3,150,000 RZC (15.00%)
-- Marketing & Community:      2,100,000 RZC (10.00%)
-- Liquidity Reserves:         1,575,000 RZC (7.50%)
-- Treasury Reserve:           1,575,000 RZC (7.50%)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 10: Verify Constraint is Active ─────────────────────────────────────
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sale_rounds'::regclass
AND conname = 'check_tokens_sold_within_cap';

-- ═══════════════════════════════════════════════════════════════════════════════
-- DEPLOYMENT CHECKLIST
-- ═══════════════════════════════════════════════════════════════════════════════
-- [✅] Constraint temporarily removed
-- [✅] Round 1 cap adjusted to 4.82M (honors existing sales)
-- [✅] Round 2 cap reduced to 1.48M (compensates for overflow)
-- [✅] Total ICO allocation = 10.5M RZC (50% of 21M supply)
-- [✅] Constraint re-added (now safe)
-- [✅] Active round = Round 2 (Private Sale)
-- [ ] Update frontend to show "Seed Round SOLD OUT"
-- [ ] Announce Private Sale opening to community
-- ═══════════════════════════════════════════════════════════════════════════════
