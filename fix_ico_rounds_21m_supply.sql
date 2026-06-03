-- ═══════════════════════════════════════════════════════════════════════════════
-- RhizaCore (RZC) ICO Rounds — 21 Million Total Supply
-- ═══════════════════════════════════════════════════════════════════════════════
-- This script updates your ICO rounds to reflect a realistic 21M total supply
-- distribution, inspired by Bitcoin's scarcity model.
--
-- TOTAL SUPPLY: 21,000,000 RZC (Fixed, Deflationary)
-- ICO ALLOCATION: 10,500,000 RZC (50% of total supply)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Backup Current State ─────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    is_active,
    is_complete
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 2: Update Seed Round (Round 1) ──────────────────────────────────────
-- 15% of total supply = 3,150,000 RZC
UPDATE sale_rounds SET
    round_name = 'Seed Round',
    price_usd = 0.012,                    -- $0.012 per RZC (lowest ever)
    token_cap = 3150000,                  -- 3.15M RZC (15% of 21M supply)
    bonus_tiers = '[
        {"min": 2500,  "bonus": 5},
        {"min": 10000, "bonus": 15}
    ]'::jsonb,
    start_date = '2025-01-01T00:00:00Z',
    end_date = '2026-06-30T23:59:59Z',
    updated_at = now()
WHERE round_number = 1;

-- ── STEP 3: Update Private Sale (Round 2) ────────────────────────────────────
-- 15% of total supply = 3,150,000 RZC
UPDATE sale_rounds SET
    round_name = 'Private Sale',
    price_usd = 0.018,                    -- $0.018 per RZC (+50% from seed)
    token_cap = 3150000,                  -- 3.15M RZC (15% of 21M supply)
    bonus_tiers = '[
        {"min": 2500,  "bonus": 3},
        {"min": 10000, "bonus": 10}
    ]'::jsonb,
    start_date = '2026-07-01T00:00:00Z',
    end_date = '2026-12-31T23:59:59Z',
    updated_at = now()
WHERE round_number = 2;

-- ── STEP 4: Update Pre-Launch Sale (Round 3) ─────────────────────────────────
-- 10% of total supply = 2,100,000 RZC
UPDATE sale_rounds SET
    round_name = 'Pre-Launch Sale',
    price_usd = 0.025,                    -- $0.025 per RZC (+108% from seed)
    token_cap = 2100000,                  -- 2.1M RZC (10% of 21M supply)
    bonus_tiers = '[
        {"min": 1000, "bonus": 2}
    ]'::jsonb,
    start_date = '2027-01-01T00:00:00Z',
    end_date = '2027-03-31T23:59:59Z',
    updated_at = now()
WHERE round_number = 3;

-- ── STEP 5: Update Public Listing (Round 4) ──────────────────────────────────
-- 10% of total supply = 2,100,000 RZC
UPDATE sale_rounds SET
    round_name = 'Public Listing',
    price_usd = 1.00,                     -- $1.00 per RZC (83x ROI from seed)
    token_cap = 2100000,                  -- 2.1M RZC (10% of 21M supply)
    bonus_tiers = '[]'::jsonb,            -- No bonuses at listing
    start_date = '2027-04-01T00:00:00Z',
    end_date = '2030-12-31T23:59:59Z',    -- Open-ended listing
    updated_at = now()
WHERE round_number = 4;

-- ── STEP 6: Add Database Constraint (Prevent Overflow) ───────────────────────
ALTER TABLE sale_rounds
DROP CONSTRAINT IF EXISTS check_tokens_sold_within_cap;

ALTER TABLE sale_rounds
ADD CONSTRAINT check_tokens_sold_within_cap
CHECK (tokens_sold <= token_cap);

-- ── STEP 7: Verify Updated Rounds ────────────────────────────────────────────
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

-- ── STEP 8: Calculate Total ICO Allocation ───────────────────────────────────
SELECT 
    SUM(token_cap) AS total_ico_allocation,
    ROUND((SUM(token_cap)::numeric / 21000000) * 100, 2) AS pct_of_total_supply,
    21000000 - SUM(token_cap) AS remaining_for_team_ecosystem
FROM sale_rounds;

-- ── STEP 9: Test Active Round Query ──────────────────────────────────────────
SELECT get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS AFTER UPDATE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Round | Name           | Price   | Cap       | % of Supply | Total Raise
-- ------|----------------|---------|-----------|-------------|-------------
-- 1     | Seed Round     | $0.012  | 3,150,000 | 15.00%      | $37,800
-- 2     | Private Sale   | $0.018  | 3,150,000 | 15.00%      | $56,700
-- 3     | Pre-Launch     | $0.025  | 2,100,000 | 10.00%      | $52,500
-- 4     | Public Listing | $1.00   | 2,100,000 | 10.00%      | $2,100,000
-- ------|----------------|---------|-----------|-------------|-------------
-- TOTAL | ICO Allocation |         | 10,500,000| 50.00%      | $2,247,000
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 10: Optional — Reset tokens_sold if needed ──────────────────────────
-- If you want to start fresh with the new caps:
-- UPDATE sale_rounds SET tokens_sold = 0 WHERE round_number IN (1, 2, 3, 4);

-- ── STEP 11: Optional — Adjust Current Sales to Fit New Cap ──────────────────
-- If you already sold 4,820,000 RZC but new cap is 3,150,000:
-- OPTION A: Keep the sales, mark round as over-subscribed and complete
UPDATE sale_rounds
SET 
    is_complete = true,
    is_active = false,
    tokens_sold = LEAST(tokens_sold, token_cap),  -- Cap at 3.15M
    updated_at = now()
WHERE round_number = 1
AND tokens_sold > token_cap;

-- OPTION B: Honor all sales by increasing Round 1 cap temporarily
-- (Not recommended — breaks tokenomics)
-- UPDATE sale_rounds
-- SET token_cap = tokens_sold
-- WHERE round_number = 1 AND tokens_sold > token_cap;

-- ═══════════════════════════════════════════════════════════════════════════════
-- TOKENOMICS SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════
-- Total Supply:              21,000,000 RZC (100%)
-- ICO Sales (All Rounds):    10,500,000 RZC (50%)
-- Team & Advisors:            2,100,000 RZC (10%)
-- Ecosystem & Development:    3,150,000 RZC (15%)
-- Marketing & Community:      2,100,000 RZC (10%)
-- Liquidity Reserves:         1,575,000 RZC (7.5%)
-- Treasury Reserve:           1,575,000 RZC (7.5%)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 12: Create Tokenomics Tracking Table (Optional) ─────────────────────
CREATE TABLE IF NOT EXISTS tokenomics_allocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    allocation_rzc NUMERIC NOT NULL,
    percentage NUMERIC NOT NULL,
    vesting_schedule TEXT,
    released_rzc NUMERIC DEFAULT 0,
    locked_rzc NUMERIC GENERATED ALWAYS AS (allocation_rzc - released_rzc) STORED,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert tokenomics allocations
INSERT INTO tokenomics_allocation (category, allocation_rzc, percentage, vesting_schedule) VALUES
('ICO Sales', 10500000, 50.00, 'Released per round completion'),
('Team & Advisors', 2100000, 10.00, '6-month cliff, 24-month linear vesting'),
('Ecosystem & Development', 3150000, 15.00, '10% at TGE, 5% monthly over 18 months'),
('Marketing & Community', 2100000, 10.00, '20% at TGE, 10% monthly over 8 months'),
('Liquidity Reserves', 1575000, 7.50, '50% at listing, 50% over 6 months'),
('Treasury Reserve', 1575000, 7.50, 'Locked 12 months, then governance-controlled')
ON CONFLICT DO NOTHING;

-- ── STEP 13: View Tokenomics Summary ─────────────────────────────────────────
SELECT 
    category,
    allocation_rzc,
    percentage || '%' AS pct_of_supply,
    released_rzc,
    locked_rzc,
    vesting_schedule
FROM tokenomics_allocation
ORDER BY allocation_rzc DESC;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DEPLOYMENT CHECKLIST
-- ═══════════════════════════════════════════════════════════════════════════════
-- [ ] Run this script in Supabase SQL Editor
-- [ ] Verify all 4 rounds updated correctly
-- [ ] Check total ICO allocation = 10,500,000 RZC (50% of 21M)
-- [ ] Confirm active round shows correct cap and price
-- [ ] Test purchase flow with new caps
-- [ ] Update frontend to show "21M Total Supply" messaging
-- [ ] Update whitepaper/docs with new tokenomics
-- [ ] Announce tokenomics update to community
-- ═══════════════════════════════════════════════════════════════════════════════
