-- ============================================================================
-- TEST REWARD CONFIGURATION SYSTEM
-- ============================================================================
-- Run this to verify everything is working correctly
-- ============================================================================

\echo '=== TESTING REWARD CONFIGURATION SYSTEM ==='
\echo ''

-- Test 1: Check if table exists and has data
\echo '1. Checking reward_config table...'
SELECT 
  COUNT(*) as total_configs,
  COUNT(*) FILTER (WHERE is_active = true) as active_configs
FROM reward_config;

\echo ''
\echo '2. Checking key reward values...'
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

\echo ''
\echo '3. Testing get_reward_amount() function...'
SELECT 
  'REFERRAL_BONUS' as key,
  get_reward_amount('REFERRAL_BONUS') as value,
  'Should be 50' as expected;

SELECT 
  'SIGNUP_BONUS' as key,
  get_reward_amount('SIGNUP_BONUS') as value,
  'Should be 4' as expected;

\echo ''
\echo '4. Testing get_all_rewards() function...'
SELECT COUNT(*) as total_from_function
FROM get_all_rewards();

\echo ''
\echo '5. Checking audit table...'
SELECT 
  COUNT(*) as total_audit_records,
  COUNT(DISTINCT key) as unique_keys_changed
FROM reward_config_audit;

\echo ''
\echo '6. Verifying custom values (referral kept at 50)...'
SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'REFERRAL_BONUS') = 50 
    THEN '✅ PASS: Referral bonus is 50 RZC'
    ELSE '❌ FAIL: Referral bonus is not 50 RZC'
  END as test_referral_bonus;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'SIGNUP_BONUS') = 4 
    THEN '✅ PASS: Signup bonus is 4 RZC'
    ELSE '❌ FAIL: Signup bonus is not 4 RZC'
  END as test_signup_bonus;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'REFERRAL_MILESTONE_10') = 53 
    THEN '✅ PASS: Milestone 10 is 53 RZC (30% reduction)'
    ELSE '❌ FAIL: Milestone 10 is not 53 RZC'
  END as test_milestone_10;

SELECT 
  CASE 
    WHEN (SELECT value FROM reward_config WHERE key = 'DAILY_LOGIN') = 0.75 
    THEN '✅ PASS: Daily login is 0.75 RZC (25% reduction)'
    ELSE '❌ FAIL: Daily login is not 0.75 RZC'
  END as test_daily_login;

\echo ''
\echo '7. Summary of all rewards...'
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

\echo ''
\echo '=== TEST COMPLETE ==='
\echo ''
\echo 'Expected Results:'
\echo '  • Total configs: 14'
\echo '  • Referral bonus: 50 RZC ($6.65)'
\echo '  • Signup bonus: 4 RZC ($0.53)'
\echo '  • Milestone 10: 53 RZC ($7.05)'
\echo '  • Daily login: 0.75 RZC ($0.10)'
\echo ''
