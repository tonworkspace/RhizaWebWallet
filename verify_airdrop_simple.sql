-- Simple Airdrop Setup Verification (Error-Free)
-- Run this after create_airdrop_system_fixed.sql

-- 1. Check if airdrop table exists
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_task_completions')
    THEN '✅ airdrop_task_completions table EXISTS'
    ELSE '❌ airdrop_task_completions table MISSING - Run create_airdrop_system_fixed.sql first'
  END as table_status;

-- 2. Check functions one by one
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_airdrop_completion')
    THEN '✅ record_airdrop_completion function EXISTS'
    ELSE '❌ record_airdrop_completion function MISSING'
  END as function_1_status;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_airdrop_progress')
    THEN '✅ get_airdrop_progress function EXISTS'
    ELSE '❌ get_airdrop_progress function MISSING'
  END as function_2_status;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_airdrop_leaderboard')
    THEN '✅ get_airdrop_leaderboard function EXISTS'
    ELSE '❌ get_airdrop_leaderboard function MISSING'
  END as function_3_status;

SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_airdrop_stats')
    THEN '✅ get_airdrop_stats function EXISTS'
    ELSE '❌ get_airdrop_stats function MISSING'
  END as function_4_status;

-- 3. Check table structure
SELECT 
  'Table Structure:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'airdrop_task_completions'
ORDER BY ordinal_position;

-- 4. Check if wallet_users table exists
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallet_users')
    THEN '✅ wallet_users table EXISTS'
    ELSE '❌ wallet_users table MISSING'
  END as wallet_users_status;

-- 5. Show sample wallet addresses (first 3)
SELECT 
  'Sample wallet addresses:' as info,
  wallet_address
FROM wallet_users 
LIMIT 3;

-- 6. Test basic functionality with first available wallet
DO $$
DECLARE
  test_wallet TEXT;
  test_result JSON;
BEGIN
  -- Get first wallet address
  SELECT wallet_address INTO test_wallet FROM wallet_users LIMIT 1;
  
  IF test_wallet IS NOT NULL THEN
    RAISE NOTICE '🎯 Testing with wallet: %', test_wallet;
    
    -- Test completion function
    SELECT record_airdrop_completion(
      test_wallet,
      999,
      'setup_test',
      'Setup Verification Test',
      1,
      '{"test": true, "verification": true}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE '✅ Test completion result: %', test_result;
    
    -- Test progress function
    SELECT get_airdrop_progress(test_wallet) INTO test_result;
    RAISE NOTICE '📊 Test progress result: %', test_result;
    
    -- Clean up test data
    DELETE FROM airdrop_task_completions WHERE task_action = 'setup_test' AND task_id = 999;
    RAISE NOTICE '🧹 Test data cleaned up';
    
  ELSE
    RAISE NOTICE '⚠️ No wallet addresses found in wallet_users table';
  END IF;
END $$;

-- 7. Show current airdrop statistics
SELECT 
  'Current Statistics:' as info,
  COUNT(*) as total_completions,
  COUNT(DISTINCT wallet_address) as unique_participants,
  COALESCE(SUM(reward_amount), 0) as total_rewards_distributed
FROM airdrop_task_completions;

-- Final success message
SELECT '🎉 Airdrop system verification complete! Check the results above.' as final_status;