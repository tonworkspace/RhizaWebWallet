-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: ICO Round Data Overflow (tokens_sold > token_cap)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Issue: tokens_sold (4,820,000) exceeds token_cap (3,150,000) causing 146.67% progress
-- This script:
-- 1. Audits the current state
-- 2. Fixes the overflow by either increasing cap or correcting sold count
-- 3. Adds a database constraint to prevent future overflows
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Audit Current State ──────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    token_cap,
    tokens_sold,
    tokens_sold - token_cap AS overflow_amount,
    ROUND((tokens_sold::numeric / NULLIF(token_cap, 0)) * 100, 2) AS progress_pct,
    is_active,
    is_complete
FROM sale_rounds
WHERE tokens_sold > token_cap
ORDER BY round_number;

-- ── STEP 2: Choose Your Fix Strategy ─────────────────────────────────────────

-- ── OPTION A: Increase token_cap to match reality (RECOMMENDED) ──────────────
-- If you actually sold 4,820,000 RZC and want to honor those sales:
UPDATE sale_rounds
SET 
    token_cap = 50000000,  -- Increase cap to 50M (your original plan)
    updated_at = now()
WHERE round_number = 1
AND tokens_sold > token_cap;

-- ── OPTION B: Correct tokens_sold if it's a data error ───────────────────────
-- If the 4,820,000 number is wrong and you actually sold less:
-- UPDATE sale_rounds
-- SET 
--     tokens_sold = 3150000,  -- Set to actual sold amount
--     updated_at = now()
-- WHERE round_number = 1
-- AND tokens_sold > token_cap;

-- ── STEP 3: Add Database Constraint to Prevent Future Overflows ──────────────
-- This ensures tokens_sold can never exceed token_cap
ALTER TABLE sale_rounds
DROP CONSTRAINT IF EXISTS check_tokens_sold_within_cap;

ALTER TABLE sale_rounds
ADD CONSTRAINT check_tokens_sold_within_cap
CHECK (tokens_sold <= token_cap);

-- ── STEP 4: Update the record_ico_purchase function to respect cap ───────────
CREATE OR REPLACE FUNCTION record_ico_purchase(
    p_wallet_address TEXT,
    p_rzc_amount NUMERIC,
    p_price_usd NUMERIC,
    p_cost_usd NUMERIC,
    p_payment_method TEXT,
    p_tx_hash TEXT,
    p_referrer_wallet TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    round_name TEXT,
    round_id UUID,
    tokens_remaining NUMERIC,
    is_sold_out BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_active_round RECORD;
    v_new_purchase_id UUID;
    v_tokens_remaining NUMERIC;
    v_is_sold_out BOOLEAN;
BEGIN
    -- Get active round
    SELECT * INTO v_active_round
    FROM sale_rounds
    WHERE is_active = true
    AND is_complete = false
    ORDER BY round_number ASC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, 0::NUMERIC, true, 'No active sale round'::TEXT;
        RETURN;
    END IF;

    -- ✅ CHECK: Would this purchase exceed the cap?
    IF (v_active_round.tokens_sold + p_rzc_amount) > v_active_round.token_cap THEN
        -- Calculate how many tokens are actually available
        v_tokens_remaining := v_active_round.token_cap - v_active_round.tokens_sold;
        
        IF v_tokens_remaining <= 0 THEN
            -- Round is already sold out
            RETURN QUERY SELECT 
                false, 
                v_active_round.round_name, 
                v_active_round.id, 
                0::NUMERIC, 
                true, 
                'Round is sold out'::TEXT;
            RETURN;
        ELSE
            -- Partial purchase possible
            RETURN QUERY SELECT 
                false, 
                v_active_round.round_name, 
                v_active_round.id, 
                v_tokens_remaining, 
                false, 
                format('Only %s RZC remaining in this round', v_tokens_remaining)::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Insert purchase record
    INSERT INTO ico_purchases (
        wallet_address,
        round_id,
        rzc_amount,
        price_at_purchase,
        cost_usd,
        payment_method,
        tx_hash,
        referrer_wallet
    ) VALUES (
        p_wallet_address,
        v_active_round.id,
        p_rzc_amount,
        p_price_usd,
        p_cost_usd,
        p_payment_method,
        p_tx_hash,
        p_referrer_wallet
    )
    RETURNING id INTO v_new_purchase_id;

    -- Update tokens_sold (constraint will prevent overflow)
    UPDATE sale_rounds
    SET 
        tokens_sold = tokens_sold + p_rzc_amount,
        updated_at = now()
    WHERE id = v_active_round.id;

    -- Calculate new remaining
    v_tokens_remaining := v_active_round.token_cap - (v_active_round.tokens_sold + p_rzc_amount);
    v_is_sold_out := v_tokens_remaining <= 0;

    -- Auto-complete round if sold out
    IF v_is_sold_out THEN
        UPDATE sale_rounds
        SET 
            is_complete = true,
            is_active = false,
            updated_at = now()
        WHERE id = v_active_round.id;
    END IF;

    RETURN QUERY SELECT 
        true, 
        v_active_round.round_name, 
        v_active_round.id, 
        GREATEST(0, v_tokens_remaining), 
        v_is_sold_out, 
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ── STEP 5: Verify Fix ───────────────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    token_cap,
    tokens_sold,
    token_cap - tokens_sold AS tokens_remaining,
    ROUND((tokens_sold::numeric / NULLIF(token_cap, 0)) * 100, 2) AS progress_pct,
    is_active,
    is_complete
FROM sale_rounds
ORDER BY round_number;

-- ── STEP 6: Test the active round query ──────────────────────────────────────
SELECT get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULT AFTER FIX:
-- ═══════════════════════════════════════════════════════════════════════════════
-- round_number | round_name  | token_cap  | tokens_sold | tokens_remaining | progress_pct
-- -------------|-------------|------------|-------------|------------------|-------------
-- 1            | Seed Round  | 50,000,000 | 4,820,000   | 45,180,000       | 9.64%
-- 2            | Round 2     | 75,000,000 | 0           | 75,000,000       | 0.00%
-- 3            | Round 3     | 100,000,000| 0           | 100,000,000      | 0.00%
-- 4            | Public      | 500,000,000| 0           | 500,000,000      | 0.00%
-- ═══════════════════════════════════════════════════════════════════════════════
