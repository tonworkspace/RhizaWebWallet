-- ============================================================================
-- VERIFY REWARD CONFIGURATION SYSTEM
-- ============================================================================

-- Test 1: Check if table exists and has data
SELECT 
  '=== TABLE STATUS ===' as test,
  COUNT(*) as total_configs,
  COUNT(*) FILTER (WHERE is_active = true) as active_configs
FROM reward_config;

-- Test 2: Check key reward values
SELECT 
  '=== KEY REWARD VALUES ===' as section;

SELECT 
  key,
  value as rzc,
  ROUND(value * 0.133, 2) as usd,
  description
FROM reward_config
WHERE key IN (
  'SIGNUP_BONUS',
  'REFERRAL_BONUS',
  'ACTIVATION_BONUS',
  'REFERRAL_MILESTONE_10',
  'DAILY_LOGIN'
)
ORDER BY key;

-- Test 3: Test get_reward_amount() function
SELECT 
  '=== FUNCTION TESTS ===' as section;

SELECT 
  'REFERRAL_BONUS' as key,
  get_reward_amount('REFERRAL_BONUS') as value,
  50 as expected,
  CASE 
    WHEN get_reward_amount('REFERRAL_BONUS') = 50 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

SELECT 
  'SIGNUP_BONUS' as key,
  get_reward_amount('SIGNUP_BONUS') as value,
  4 as expected,
  CASE 
    WHEN get_reward_amount('SIGNUP_BONUS') = 4 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

SELECT 
  'REFERRAL_MILESTONE_10' as key,
  get_reward_amount('REFERRAL_MILESTONE_10') as value,
  53 as expected,
  CASE 
    WHEN get_reward_amount('REFERRAL_MILESTONE_10') = 53 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

SELECT 
  'DAILY_LOGIN' as key,
  get_reward_amount('DAILY_LOGIN') as value,
  0.75 as expected,
  CASE 
    WHEN get_reward_amount('DAILY_LOGIN') = 0.75 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status;

-- Test 4: Verify all rewards with change status
SELECT 
  '=== ALL REWARDS SUMMARY ===' as section;

SELECT 
  key,
  value as rzc_amount,
  ROUND(value * 0.133, 2) as usd_value,
  category,
  CASE 
    WHEN key = 'REFERRAL_BONUS' THEN '✓ KEPT AT 50'
    WHEN key IN ('ACTIVATION_BONUS', 'TRANSACTION_BONUS', 'SQUAD_MINING_BASE_REWARD') THEN 'NO CHANGE'
    WHEN key = 'SIGNUP_BONUS' THEN 'REDUCED 11%'
    WHEN key = 'DAILY_LOGIN' THEN 'REDUCED 25%'
    WHEN key LIKE '%MILESTONE%' THEN 'REDUCED 30%'
    ELSE 'NO CHANGE'
  END as change_status
FROM reward_config
WHERE is_active = true
ORDER BY 
  CASE category
    WHEN 'signup' THEN 1
    WHEN 'activation' THEN 2
    WHEN 'referral' THEN 3
    WHEN 'milestone' THEN 4
    WHEN 'login' THEN 5
    WHEN 'transaction' THEN 6
    WHEN 'commission' THEN 7
    ELSE 8
  END,
  key;

-- Test 5: Check audit records
SELECT 
  '=== AUDIT LOG STATUS ===' as section;

SELECT 
  COUNT(*) as total_audit_records,
  COUNT(DISTINCT key) as unique_keys_changed,
  MAX(created_at) as last_change
FROM reward_config_audit;

-- Test 6: Final validation
SELECT 
  '=== VALIDATION RESULTS ===' as section;

SELECT 
  CASE 
    WHEN COUNT(*) = 14 THEN '✅ All 14 reward configs present'
    ELSE '❌ Missing reward configs: ' || (14 - COUNT(*))::TEXT
  END as config_count_check
FROM reward_config;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'REFERRAL_BONUS') = 50 
    THEN '✅ Referral bonus correctly set to 50 RZC'
    ELSE '❌ Referral bonus incorrect'
  END as referral_check;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'SIGNUP_BONUS') = 4 
    THEN '✅ Signup bonus correctly reduced to 4 RZC'
    ELSE '❌ Signup bonus incorrect'
  END as signup_check;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'REFERRAL_MILESTONE_10') = 53 
    THEN '✅ Milestone 10 correctly reduced to 53 RZC'
    ELSE '❌ Milestone 10 incorrect'
  END as milestone_check;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'DAILY_LOGIN') = 0.75 
    THEN '✅ Daily login correctly reduced to 0.75 RZC'
    ELSE '❌ Daily login incorrect'
  END as daily_login_check;

-- Summary message
SELECT 
  '=== TEST COMPLETE ===' as final_message,
  'All reward values are database-driven!' as status;
