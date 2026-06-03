-- ============================================================================
-- UPDATE REWARD VALUES - Keep Referral at 50 RZC, Reduce Others by 30%
-- ============================================================================
-- This applies Option B (30% reduction) but keeps REFERRAL_BONUS at 50 RZC
-- Run this AFTER running add_reward_config_system.sql
-- ============================================================================

-- Keep Signup Bonus: 4 RZC (~$0.53) - 11% reduction
UPDATE reward_config 
SET 
  value = 4,
  description = 'Welcome bonus on wallet creation (~$0.53)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'SIGNUP_BONUS';

-- Keep Activation Bonus: 15 RZC (~$2.00) - NO CHANGE
-- (Already at target value)

-- KEEP Referral Bonus: 50 RZC (~$6.65) - NO CHANGE
-- User requested to keep this at 50 RZC

-- Update Milestone 10: 75 → 53 RZC (~$7.00) - 30% reduction
UPDATE reward_config 
SET 
  value = 53,
  description = 'Bonus at 10 referrals (~$7.00)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_10';

-- Update Milestone 50: 125 → 88 RZC (~$11.70) - 30% reduction
UPDATE reward_config 
SET 
  value = 88,
  description = 'Bonus at 50 referrals (~$11.70)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_50';

-- Update Milestone 100: 500 → 350 RZC (~$46.55) - 30% reduction
UPDATE reward_config 
SET 
  value = 350,
  description = 'Bonus at 100 referrals (~$46.55)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_100';

-- Update Milestone 250: 800 → 560 RZC (~$74.48) - 30% reduction
UPDATE reward_config 
SET 
  value = 560,
  description = 'Bonus at 250 referrals (~$74.48)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_250';

-- Update Milestone 500: 1500 → 1050 RZC (~$139.65) - 30% reduction
UPDATE reward_config 
SET 
  value = 1050,
  description = 'Bonus at 500 referrals (~$139.65)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_500';

-- Update Daily Login: 1 → 0.75 RZC (~$0.10) - 25% reduction
UPDATE reward_config 
SET 
  value = 0.75,
  description = 'Daily login bonus (~$0.10)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'DAILY_LOGIN';

-- Keep Transaction Bonus: 1 RZC (~$0.13) - NO CHANGE
-- (Already reasonable)

-- Keep Squad Mining: 1 RZC (~$0.13) - NO CHANGE
-- (Already corrected from 10 to 1)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  key,
  value as rzc_amount,
  ROUND(value * 0.133, 2) as usd_value,
  description,
  category,
  updated_by,
  updated_at
FROM reward_config
WHERE key IN (
  'SIGNUP_BONUS',
  'ACTIVATION_BONUS',
  'REFERRAL_BONUS',
  'REFERRAL_MILESTONE_10',
  'REFERRAL_MILESTONE_50',
  'REFERRAL_MILESTONE_100',
  'REFERRAL_MILESTONE_250',
  'REFERRAL_MILESTONE_500',
  'DAILY_LOGIN',
  'TRANSACTION_BONUS',
  'SQUAD_MINING_BASE_REWARD'
)
ORDER BY 
  CASE category
    WHEN 'signup' THEN 1
    WHEN 'activation' THEN 2
    WHEN 'referral' THEN 3
    WHEN 'milestone' THEN 4
    WHEN 'login' THEN 5
    WHEN 'transaction' THEN 6
    WHEN 'general' THEN 7
  END,
  value;

-- ============================================================================
-- EXPECTED OUTPUT
-- ============================================================================
/*
key                          | rzc_amount | usd_value | description
-----------------------------|------------|-----------|----------------------------------
SIGNUP_BONUS                 | 4          | $0.53     | Welcome bonus (~$0.53)
ACTIVATION_BONUS             | 15         | $2.00     | Activation bonus (~$2.00)
REFERRAL_BONUS               | 50         | $6.65     | Referral bonus (~$6.65) ✓ KEPT
REFERRAL_MILESTONE_10        | 53         | $7.05     | 10 referrals (~$7.00)
REFERRAL_MILESTONE_50        | 88         | $11.70    | 50 referrals (~$11.70)
REFERRAL_MILESTONE_100       | 350        | $46.55    | 100 referrals (~$46.55)
REFERRAL_MILESTONE_250       | 560        | $74.48    | 250 referrals (~$74.48)
REFERRAL_MILESTONE_500       | 1050       | $139.65   | 500 referrals (~$139.65)
DAILY_LOGIN                  | 0.75       | $0.10     | Daily login (~$0.10)
TRANSACTION_BONUS            | 1          | $0.13     | Transaction bonus (~$0.13)
SQUAD_MINING_BASE_REWARD     | 1          | $0.13     | Squad mining (~$0.13)
*/

-- ============================================================================
-- COST ANALYSIS AFTER UPDATE
-- ============================================================================

DO $$
DECLARE
  v_signup NUMERIC;
  v_activation NUMERIC;
  v_referral NUMERIC;
  v_m10 NUMERIC;
  v_m50 NUMERIC;
  v_m100 NUMERIC;
  v_m250 NUMERIC;
  v_m500 NUMERIC;
  v_daily NUMERIC;
  v_cac_10 NUMERIC;
  v_cac_100 NUMERIC;
BEGIN
  -- Get updated values
  SELECT value INTO v_signup FROM reward_config WHERE key = 'SIGNUP_BONUS';
  SELECT value INTO v_activation FROM reward_config WHERE key = 'ACTIVATION_BONUS';
  SELECT value INTO v_referral FROM reward_config WHERE key = 'REFERRAL_BONUS';
  SELECT value INTO v_m10 FROM reward_config WHERE key = 'REFERRAL_MILESTONE_10';
  SELECT value INTO v_m50 FROM reward_config WHERE key = 'REFERRAL_MILESTONE_50';
  SELECT value INTO v_m100 FROM reward_config WHERE key = 'REFERRAL_MILESTONE_100';
  SELECT value INTO v_m250 FROM reward_config WHERE key = 'REFERRAL_MILESTONE_250';
  SELECT value INTO v_m500 FROM reward_config WHERE key = 'REFERRAL_MILESTONE_500';
  SELECT value INTO v_daily FROM reward_config WHERE key = 'DAILY_LOGIN';

  -- Calculate CAC for 10 referrals
  v_cac_10 := (
    (v_signup + v_activation) * 11 +  -- 11 users (referrer + 10 refs)
    (v_referral * 10) +                -- 10 referral bonuses
    v_m10                              -- 10-ref milestone
  ) * 0.133 / 11;

  -- Calculate CAC for 100 referrals
  v_cac_100 := (
    (v_signup + v_activation) * 101 +  -- 101 users
    (v_referral * 100) +               -- 100 referral bonuses
    v_m10 + v_m50 + v_m100            -- All milestones up to 100
  ) * 0.133 / 101;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Reward values updated successfully!';
  RAISE NOTICE '💰 1 RZC = $0.133 USD';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Updated Values:';
  RAISE NOTICE '  • Signup Bonus: % RZC (~$%)', v_signup, ROUND(v_signup * 0.133, 2);
  RAISE NOTICE '  • Activation Bonus: % RZC (~$%)', v_activation, ROUND(v_activation * 0.133, 2);
  RAISE NOTICE '  • Referral Bonus: % RZC (~$%) ✓ KEPT AT 50', v_referral, ROUND(v_referral * 0.133, 2);
  RAISE NOTICE '  • 10 Refs Milestone: % RZC (~$%)', v_m10, ROUND(v_m10 * 0.133, 2);
  RAISE NOTICE '  • 50 Refs Milestone: % RZC (~$%)', v_m50, ROUND(v_m50 * 0.133, 2);
  RAISE NOTICE '  • 100 Refs Milestone: % RZC (~$%)', v_m100, ROUND(v_m100 * 0.133, 2);
  RAISE NOTICE '  • 250 Refs Milestone: % RZC (~$%)', v_m250, ROUND(v_m250 * 0.133, 2);
  RAISE NOTICE '  • 500 Refs Milestone: % RZC (~$%)', v_m500, ROUND(v_m500 * 0.133, 2);
  RAISE NOTICE '  • Daily Login: % RZC (~$%)', v_daily, ROUND(v_daily * 0.133, 2);
  RAISE NOTICE '';
  RAISE NOTICE '💵 Cost Analysis:';
  RAISE NOTICE '  • CAC (10 referrals): $%', ROUND(v_cac_10, 2);
  RAISE NOTICE '  • CAC (100 referrals): $%', ROUND(v_cac_100, 2);
  RAISE NOTICE '  • Daily Login Cost/Year: $%', ROUND(v_daily * 0.133 * 365, 2);
  RAISE NOTICE '';
  RAISE NOTICE '📈 Improvements:';
  RAISE NOTICE '  • Milestone costs reduced by 30%';
  RAISE NOTICE '  • Daily login cost reduced by 25%';
  RAISE NOTICE '  • Referral bonus KEPT at 50 RZC as requested';
  RAISE NOTICE '  • CAC reduced from $9.55 to ~$% (% reduction)', ROUND(v_cac_10, 2), ROUND((1 - v_cac_10/9.55) * 100, 0);
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next Steps:';
  RAISE NOTICE '  1. Clear frontend cache';
  RAISE NOTICE '  2. Test reward flows';
  RAISE NOTICE '  3. Monitor conversion metrics';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SUMMARY TABLE
-- ============================================================================

SELECT 
  '=== REWARD SUMMARY (REFERRAL KEPT AT 50 RZC) ===' as summary;

SELECT 
  key as reward_type,
  value as rzc_amount,
  ROUND(value * 0.133, 2) as usd_value,
  CASE 
    WHEN key = 'REFERRAL_BONUS' THEN '✓ KEPT'
    WHEN key IN ('ACTIVATION_BONUS', 'TRANSACTION_BONUS', 'SQUAD_MINING_BASE_REWARD') THEN 'NO CHANGE'
    WHEN key = 'SIGNUP_BONUS' THEN '-11%'
    WHEN key = 'DAILY_LOGIN' THEN '-25%'
    ELSE '-30%'
  END as change
FROM reward_config
WHERE key IN (
  'SIGNUP_BONUS',
  'ACTIVATION_BONUS',
  'REFERRAL_BONUS',
  'REFERRAL_MILESTONE_10',
  'REFERRAL_MILESTONE_50',
  'REFERRAL_MILESTONE_100',
  'REFERRAL_MILESTONE_250',
  'REFERRAL_MILESTONE_500',
  'DAILY_LOGIN',
  'TRANSACTION_BONUS',
  'SQUAD_MINING_BASE_REWARD'
)
ORDER BY 
  CASE 
    WHEN key LIKE '%SIGNUP%' THEN 1
    WHEN key LIKE '%ACTIVATION%' THEN 2
    WHEN key LIKE '%REFERRAL_BONUS' THEN 3
    WHEN key LIKE '%MILESTONE%' THEN 4
    WHEN key LIKE '%LOGIN%' THEN 5
    WHEN key LIKE '%TRANSACTION%' THEN 6
    ELSE 7
  END,
  value;
