-- Final Airdrop Test - No Ambiguity Issues
-- Run this after create_airdrop_system_final.sql

-- 1. Check if table was created
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_task_completions')
    THEN '✅ Table EXISTS'
    ELSE '❌ Table MISSING'
  END as table_check;

-- 2. Check if functions were created
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_airdrop_completion')
    THEN '✅ Functions EXIST'
    ELSE '❌ Functions MISSING'
  END as function_check;

-- 3. Get a test wallet address
SELECT wu.wallet_address as test_wallet_address
FROM wallet_users wu
LIMIT 1;

-- 4. Manual test (replace 'YOUR_WALLET_HERE' with actual wallet from step 3)
-- SELECT record_airdrop_completion(
--   'YOUR_WALLET_HERE',
--   1,
--   'create_wallet',
--   'Create RhizaCore Wallet',
--   150,
--   '{"manual_test": true}'::jsonb
-- ) as completion_test;

-- 5. Check current completions
SELECT COUNT(*) as total_completions 
FROM airdrop_task_completions;

-- 6. Test stats function
SELECT get_airdrop_stats() as stats_test;

-- 7. Test leaderboard function
SELECT get_airdrop_leaderboard(3) as leaderboard_test;