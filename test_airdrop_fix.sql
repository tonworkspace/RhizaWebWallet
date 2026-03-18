-- Quick test to verify the airdrop fix works
-- Run this after setting up the standalone system

-- 1. Test basic table creation
SELECT 'Tables exist' as test_name, 
       COUNT(*) as result,
       'Should be 2' as expected
FROM information_schema.tables 
WHERE table_name IN ('airdrop_task_completions', 'airdrop_rewards');

-- 2. Test function creation
SELECT 'Functions exist' as test_name,
       COUNT(*) as result,
       'Should be 4' as expected
FROM information_schema.routines 
WHERE routine_name IN (
  'record_airdrop_completion',
  'get_airdrop_progress', 
  'get_airdrop_leaderboard',
  'get_airdrop_stats'
);

-- 3. Test task completion (should succeed)
SELECT 'Task completion' as test_name,
       (record_airdrop_completion(
         'EQTestFixWallet123456789012345678901234567890',
         999,
         'fix_test',
         'Fix Test Task',
         50,
         '{"fix_test": true}'::jsonb
       )).success as result,
       'Should be true' as expected;

-- 4. Test duplicate prevention (should fail)
SELECT 'Duplicate prevention' as test_name,
       (record_airdrop_completion(
         'EQTestFixWallet123456789012345678901234567890',
         999,
         'fix_test',
         'Fix Test Task',
         50,
         '{"duplicate": true}'::jsonb
       )).success as result,
       'Should be false' as expected;

-- 5. Test progress retrieval
SELECT 'Progress retrieval' as test_name,
       (get_airdrop_progress('EQTestFixWallet123456789012345678901234567890')).success as result,
       'Should be true' as expected;

-- 6. Test statistics
SELECT 'Statistics' as test_name,
       (get_airdrop_stats()).success as result,
       'Should be true' as expected;

-- 7. Test leaderboard
SELECT 'Leaderboard' as test_name,
       (get_airdrop_leaderboard(5)).success as result,
       'Should be true' as expected;

-- Cleanup test data
DELETE FROM airdrop_task_completions WHERE wallet_address = 'EQTestFixWallet123456789012345678901234567890';
DELETE FROM airdrop_rewards WHERE wallet_address = 'EQTestFixWallet123456789012345678901234567890';

SELECT 'All tests completed!' as status;