-- Verify Airdrop Database Setup
-- Run this in Supabase SQL Editor to verify the airdrop system is properly set up

-- 1. Check if airdrop_task_completions table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'airdrop_task_completions';

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'airdrop_task_completions'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'airdrop_task_completions';

-- 4. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'airdrop_task_completions';

-- 5. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('record_airdrop_completion', 'get_airdrop_progress');

-- 6. Test record_airdrop_completion function (replace with actual wallet address)
SELECT record_airdrop_completion(
  'EQTest123...', -- Replace with actual wallet address
  1,
  'test_task',
  'Test Task',
  100,
  '{"test": true}'::jsonb
);

-- 7. Test get_airdrop_progress function (replace with actual wallet address)
SELECT get_airdrop_progress('EQTest123...'); -- Replace with actual wallet address

-- 8. Check existing completions (if any)
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

-- 9. Check total rewards distributed
SELECT 
  COUNT(*) as total_completions,
  SUM(reward_amount) as total_rewards_distributed,
  COUNT(DISTINCT wallet_address) as unique_users
FROM airdrop_task_completions;

-- 10. Check task completion breakdown
SELECT 
  task_action,
  task_title,
  COUNT(*) as completions,
  SUM(reward_amount) as total_rewards,
  AVG(reward_amount) as avg_reward
FROM airdrop_task_completions 
GROUP BY task_action, task_title
ORDER BY completions DESC;

-- Expected Results:
-- 1. Table should exist
-- 2. Should have all required columns (id, user_id, wallet_address, etc.)
-- 3. Should have performance indexes
-- 4. Should have RLS policies for security
-- 5. Both functions should exist
-- 6. Function calls should work (or show appropriate errors)
-- 7. Data queries should return results or empty sets

-- If any of these fail, check:
-- 1. Run create_airdrop_system.sql first
-- 2. Ensure proper permissions are granted
-- 3. Check if profiles table exists (required for foreign key)
-- 4. Verify RLS is properly configured