-- Verify Standalone Airdrop Database Setup
-- Run this in Supabase SQL Editor to verify the standalone airdrop system

-- 1. Check if airdrop tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('airdrop_task_completions', 'airdrop_rewards')
ORDER BY table_name;

-- 2. Check airdrop_task_completions table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'airdrop_task_completions'
ORDER BY ordinal_position;

-- 3. Check airdrop_rewards table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'airdrop_rewards'
ORDER BY ordinal_position;

-- 4. Check indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('airdrop_task_completions', 'airdrop_rewards')
ORDER BY tablename, indexname;

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('airdrop_task_completions', 'airdrop_rewards')
ORDER BY tablename, policyname;

-- 6. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN (
  'record_airdrop_completion', 
  'get_airdrop_progress',
  'get_airdrop_leaderboard',
  'get_airdrop_stats'
)
ORDER BY routine_name;

-- 7. Test record_airdrop_completion function
SELECT record_airdrop_completion(
  'EQTestWallet123456789012345678901234567890123456', -- Test wallet address
  1,
  'test_task',
  'Test Task Completion',
  100,
  '{"test": true, "timestamp": "2024-01-01T00:00:00Z"}'::jsonb
);

-- 8. Test get_airdrop_progress function
SELECT get_airdrop_progress('EQTestWallet123456789012345678901234567890123456');

-- 9. Test get_airdrop_stats function
SELECT get_airdrop_stats();

-- 10. Test get_airdrop_leaderboard function
SELECT get_airdrop_leaderboard(5);

-- 11. Check existing completions (if any)
SELECT 
  id,
  wallet_address,
  task_id,
  task_action,
  task_title,
  reward_amount,
  completed_at,
  verified
FROM airdrop_task_completions 
ORDER BY completed_at DESC 
LIMIT 10;

-- 12. Check airdrop rewards summary
SELECT 
  wallet_address,
  total_earned,
  last_updated
FROM airdrop_rewards 
ORDER BY total_earned DESC 
LIMIT 10;

-- 13. Check task completion statistics
SELECT 
  task_action,
  task_title,
  COUNT(*) as completions,
  SUM(reward_amount) as total_rewards,
  AVG(reward_amount) as avg_reward,
  MIN(completed_at) as first_completion,
  MAX(completed_at) as latest_completion
FROM airdrop_task_completions 
GROUP BY task_action, task_title
ORDER BY completions DESC;

-- 14. Test duplicate prevention
SELECT record_airdrop_completion(
  'EQTestWallet123456789012345678901234567890123456', -- Same wallet
  1, -- Same task ID
  'test_task', -- Same action
  'Test Task Completion',
  100,
  '{"test": true, "duplicate_test": true}'::jsonb
);

-- Expected Results:
-- 1. Both tables should exist
-- 2-3. Tables should have all required columns
-- 4. Should have performance indexes including unique constraint
-- 5. Should have RLS policies for security
-- 6. All four functions should exist
-- 7. First completion should succeed
-- 8. Progress should show the completed task
-- 9-10. Stats and leaderboard should work
-- 11-12. Should show the test data
-- 13. Should show task statistics
-- 14. Second identical completion should fail with "Task already completed"

-- Cleanup test data (uncomment to remove test entries)
/*
DELETE FROM airdrop_task_completions WHERE wallet_address = 'EQTestWallet123456789012345678901234567890123456';
DELETE FROM airdrop_rewards WHERE wallet_address = 'EQTestWallet123456789012345678901234567890123456';
*/