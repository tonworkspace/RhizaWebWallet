-- ============================================================================
-- UPDATE REWARD VALUES - Keep Referral at 50 RZC, Reduce Others by 30%
-- ============================================================================
-- Simple version without complex functions
-- ============================================================================

-- Update Signup Bonus: 4.5 → 4 RZC (~$0.53)
UPDATE reward_config 
SET 
  value = 4,
  description = 'Welcome bonus on wallet creation (~$0.53)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'SIGNUP_BONUS';

-- KEEP Referral Bonus at 50 RZC (~$6.65) - NO CHANGE

-- Update Milestone 10: 75 → 53 RZC (~$7.00)
UPDATE reward_config 
SET 
  value = 53,
  description = 'Bonus at 10 referrals (~$7.00)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_10';

-- Update Milestone 50: 125 → 88 RZC (~$11.70)
UPDATE reward_config 
SET 
  value = 88,
  description = 'Bonus at 50 referrals (~$11.70)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_50';

-- Update Milestone 100: 500 → 350 RZC (~$46.55)
UPDATE reward_config 
SET 
  value = 350,
  description = 'Bonus at 100 referrals (~$46.55)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_100';

-- Update Milestone 250: 800 → 560 RZC (~$74.48)
UPDATE reward_config 
SET 
  value = 560,
  description = 'Bonus at 250 referrals (~$74.48)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_250';

-- Update Milestone 500: 1500 → 1050 RZC (~$139.65)
UPDATE reward_config 
SET 
  value = 1050,
  description = 'Bonus at 500 referrals (~$139.65)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_500';

-- Update Daily Login: 1 → 0.75 RZC (~$0.10)
UPDATE reward_config 
SET 
  value = 0.75,
  description = 'Daily login bonus (~$0.10)',
  updated_by = 'custom_reduction',
  updated_at = NOW()
WHERE key = 'DAILY_LOGIN';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
  '=== UPDATED REWARD VALUES ===' as summary;

SELECT 
  key,
  value as rzc_amount,
  ROUND(value * 0.133, 2) as usd_value,
  description,
  CASE 
    WHEN key = 'REFERRAL_BONUS' THEN '✓ KEPT AT 50'
    WHEN key IN ('ACTIVATION_BONUS', 'TRANSACTION_BONUS', 'SQUAD_MINING_BASE_REWARD') THEN 'NO CHANGE'
    WHEN key = 'SIGNUP_BONUS' THEN 'REDUCED 11%'
    WHEN key = 'DAILY_LOGIN' THEN 'REDUCED 25%'
    WHEN key LIKE '%MILESTONE%' THEN 'REDUCED 30%'
    ELSE 'NO CHANGE'
  END as change_status
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
    WHEN key = 'REFERRAL_BONUS' THEN 3
    WHEN key LIKE '%MILESTONE%' THEN 4
    WHEN key LIKE '%LOGIN%' THEN 5
    ELSE 6
  END,
  value;

-- Show summary
SELECT 
  'Total Configs' as metric,
  COUNT(*)::TEXT as value
FROM reward_config
UNION ALL
SELECT 
  'Active Configs',
  COUNT(*)::TEXT
FROM reward_config
WHERE is_active = true
UNION ALL
SELECT 
  'Referral Bonus (RZC)',
  value::TEXT
FROM reward_config
WHERE key = 'REFERRAL_BONUS'
UNION ALL
SELECT 
  'Referral Bonus (USD)',
  '$' || ROUND(value * 0.133, 2)::TEXT
FROM reward_config
WHERE key = 'REFERRAL_BONUS';
