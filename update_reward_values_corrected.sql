-- ============================================================================
-- UPDATE REWARD VALUES (Corrected for 1 RZC = $0.133)
-- ============================================================================
-- Run this AFTER running add_reward_config_system.sql
-- This updates the values to match the correct USD targets
-- ============================================================================

-- Update Signup Bonus: 50 → 4.5 RZC (~$0.60)
UPDATE reward_config 
SET 
  value = 4.5,
  description = 'Welcome bonus on wallet creation (~$0.60)',
  updated_by = 'price_correction',
  updated_at = NOW()
WHERE key = 'SIGNUP_BONUS';

-- Update Milestone 10: 25 → 75 RZC (~$10.00)
UPDATE reward_config 
SET 
  value = 75,
  description = 'Bonus at 10 referrals (~$10.00)',
  updated_by = 'price_correction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_10';

-- Update Milestone 250: 1500 → 800 RZC (~$106.40)
UPDATE reward_config 
SET 
  value = 800,
  description = 'Bonus at 250 referrals (~$106.40)',
  updated_by = 'price_correction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_250';

-- Update Milestone 500: 5000 → 1500 RZC (~$199.50)
UPDATE reward_config 
SET 
  value = 1500,
  description = 'Bonus at 500 referrals (~$199.50)',
  updated_by = 'price_correction',
  updated_at = NOW()
WHERE key = 'REFERRAL_MILESTONE_500';

-- Update Squad Mining: 10 → 1 RZC (~$0.13)
UPDATE reward_config 
SET 
  value = 1,
  description = 'Base reward per squad member for mining (~$0.13)',
  updated_by = 'price_correction',
  updated_at = NOW()
WHERE key = 'SQUAD_MINING_BASE_REWARD';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- View all updated values
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
  'SQUAD_MINING_BASE_REWARD'
)
ORDER BY 
  CASE category
    WHEN 'signup' THEN 1
    WHEN 'activation' THEN 2
    WHEN 'referral' THEN 3
    WHEN 'milestone' THEN 4
    WHEN 'general' THEN 5
  END,
  value;

-- ============================================================================
-- EXPECTED OUTPUT
-- ============================================================================
/*
key                          | rzc_amount | usd_value | description
-----------------------------|------------|-----------|----------------------------------
SIGNUP_BONUS                 | 4.5        | $0.60     | Welcome bonus (~$0.60)
ACTIVATION_BONUS             | 15         | $2.00     | Activation bonus (~$2.00)
REFERRAL_BONUS               | 50         | $6.65     | Referral bonus (~$6.65)
REFERRAL_MILESTONE_10        | 75         | $10.00    | 10 referrals (~$10.00)
REFERRAL_MILESTONE_50        | 125        | $16.63    | 50 referrals (~$16.63)
REFERRAL_MILESTONE_100       | 500        | $66.50    | 100 referrals (~$66.50)
REFERRAL_MILESTONE_250       | 800        | $106.40   | 250 referrals (~$106.40)
REFERRAL_MILESTONE_500       | 1500       | $199.50   | 500 referrals (~$199.50)
SQUAD_MINING_BASE_REWARD     | 1          | $0.13     | Squad mining (~$0.13)
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Reward values updated successfully!';
  RAISE NOTICE '💰 All values now based on 1 RZC = $0.133';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  • Signup Bonus: 4.5 RZC (~$0.60)';
  RAISE NOTICE '  • Referral Bonus: 50 RZC (~$6.65)';
  RAISE NOTICE '  • 10 Refs Milestone: 75 RZC (~$10.00)';
  RAISE NOTICE '  • 50 Refs Milestone: 125 RZC (~$16.63)';
  RAISE NOTICE '  • 100 Refs Milestone: 500 RZC (~$66.50)';
  RAISE NOTICE '  • 250 Refs Milestone: 800 RZC (~$106.40)';
  RAISE NOTICE '  • 500 Refs Milestone: 1500 RZC (~$199.50)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next: Clear frontend cache to use new values';
END $$;
