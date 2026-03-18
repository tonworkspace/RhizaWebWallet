-- Quick Airdrop Setup Verification
-- Run this after create_airdrop_system_fixed.sql to verify everything works

-- 1. Check if table exists
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_task_completions')
    THEN '✅ airdrop_task_completions table EXISTS'
    ELSE '❌ airdrop_task_completions table MISSING'
  END as table_status;

-- 2. Check if functions exist
SELECT 
  expected.routine_name,
  CASE WHEN r.routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
  VALUES 
    ('record_airdrop_completion'),
    ('get_airdrop_progress'),
    ('get_airdrop_leaderboard'),
    ('get_airdrop_stats')
) AS expected(routine_name)
LEFT JOIN information_schema.routines r ON r.routine_name = expected.routine_name
ORDER BY expected.routine_name;

-- 3. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'airdrop_task_completions'
ORDER BY ordinal_position;

-- 4. Test with a real wallet (get first wallet from wallet_users)
DO $$
DECLARE
  test_wallet TEXT;
  test_result JSON;
BEGIN
  -- Get first wallet address
  SELECT wallet_address INTO test_wallet FROM wallet_users LIMIT 1;
  
  IF test_wallet IS NOT NULL THEN
    RAISE NOTICE 'Testing with wallet: %', test_wallet;
    
    -- Test completion function
    SELECT record_airdrop_completion(
      test_wallet,
      999,
      'setup_test',
      'Setup Test Task',
      10,
      '{"test": true, "setup": true}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE 'Test completion result: %', test_result;
    
    -- Test progress function
    SELECT get_airdrop_progress(test_wallet) INTO test_result;
    RAISE NOTICE 'Test progress result: %', test_result;
    
  ELSE
    RAISE NOTICE 'No wallet addresses found in wallet_users table';
  END IF;
END $$;

-- 5. Show any existing completions
SELECT 
  COUNT(*) as total_completions,
  COUNT(DISTINCT wallet_address) as unique_wallets,
  SUM(reward_amount) as total_rewards
FROM airdrop_task_completions;

-- 6. Clean up test data
DELETE FROM airdrop_task_completions WHERE task_action = 'setup_test' AND task_id = 999;

SELECT '🎉 Setup verification complete! Check the results above.' as final_message;