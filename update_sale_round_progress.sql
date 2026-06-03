-- ═══════════════════════════════════════════════════════════════════════════════
-- Update Sale Round Progress (Increase Percentage)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Use this to manually adjust the tokens_sold to show higher progress percentage
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Check Current Progress ──────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    token_cap,
    tokens_sold,
    tokens_sold::numeric / token_cap * 100 AS progress_pct,
    is_active
FROM sale_rounds
WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPTION 1: Set Specific Percentage (e.g., 50%)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Set to 50% sold (2,410,000 out of 4,820,000)
UPDATE sale_rounds
SET 
    tokens_sold = FLOOR(token_cap * 0.50),  -- 50% = 2,410,000 tokens
    updated_at = now()
WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPTION 2: Set Specific Token Amount
-- ═══════════════════════════════════════════════════════════════════════════════

-- Example: Set to 3,000,000 tokens sold (62.2% of 4,820,000)
-- UPDATE sale_rounds
-- SET 
--     tokens_sold = 3000000,
--     updated_at = now()
-- WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- OPTION 3: Add More Tokens (Increment)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Add 500,000 more tokens to current amount
-- UPDATE sale_rounds
-- SET 
--     tokens_sold = tokens_sold + 500000,
--     updated_at = now()
-- WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMON PERCENTAGES (for Seed Round with 4,820,000 cap)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 10% = 482,000 tokens
-- UPDATE sale_rounds SET tokens_sold = 482000 WHERE is_active = true;

-- 25% = 1,205,000 tokens
-- UPDATE sale_rounds SET tokens_sold = 1205000 WHERE is_active = true;

-- 50% = 2,410,000 tokens
-- UPDATE sale_rounds SET tokens_sold = 2410000 WHERE is_active = true;

-- 75% = 3,615,000 tokens
-- UPDATE sale_rounds SET tokens_sold = 3615000 WHERE is_active = true;

-- 90% = 4,338,000 tokens (creates urgency!)
-- UPDATE sale_rounds SET tokens_sold = 4338000 WHERE is_active = true;

-- 95% = 4,579,000 tokens (almost sold out!)
-- UPDATE sale_rounds SET tokens_sold = 4579000 WHERE is_active = true;

-- 99% = 4,771,800 tokens (extreme urgency!)
-- UPDATE sale_rounds SET tokens_sold = 4771800 WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Verify New Progress
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 
    round_number,
    round_name,
    token_cap,
    tokens_sold,
    token_cap - tokens_sold AS tokens_remaining,
    ROUND((tokens_sold::numeric / token_cap) * 100, 2) AS progress_pct,
    is_active,
    updated_at
FROM sale_rounds
WHERE is_active = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Test Active Round Query (What Frontend Sees)
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT * FROM get_active_sale_round();

-- ═══════════════════════════════════════════════════════════════════════════════
-- RECOMMENDED SETTINGS FOR DIFFERENT SCENARIOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- 🟢 EARLY STAGE (Low Urgency)
-- Progress: 10-25%
-- Message: "Plenty of time to buy"
-- UPDATE sale_rounds SET tokens_sold = 1205000 WHERE is_active = true;  -- 25%

-- 🟡 MID STAGE (Moderate Urgency)
-- Progress: 50-70%
-- Message: "Half sold, act soon"
-- UPDATE sale_rounds SET tokens_sold = 2892000 WHERE is_active = true;  -- 60%

-- 🟠 LATE STAGE (High Urgency)
-- Progress: 80-90%
-- Message: "Almost sold out!"
-- UPDATE sale_rounds SET tokens_sold = 4338000 WHERE is_active = true;  -- 90%

-- 🔴 CRITICAL STAGE (Extreme Urgency)
-- Progress: 95-99%
-- Message: "Last chance!"
-- UPDATE sale_rounds SET tokens_sold = 4771800 WHERE is_active = true;  -- 99%

-- ═══════════════════════════════════════════════════════════════════════════════
-- IMPORTANT NOTES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. The UI will auto-refresh every 2 minutes
-- 2. Progress bar will animate to new percentage
-- 3. "Remaining tokens" will update automatically
-- 4. Don't set tokens_sold > token_cap (constraint will fail)
-- 5. Higher percentage = more urgency = more conversions

-- ═══════════════════════════════════════════════════════════════════════════════
-- RESET TO ORIGINAL (if needed)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Reset to 10% (482,000 tokens)
-- UPDATE sale_rounds SET tokens_sold = 482000, updated_at = now() WHERE round_number = 1;

-- ═══════════════════════════════════════════════════════════════════════════════
