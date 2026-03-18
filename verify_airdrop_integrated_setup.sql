-- Verify Integrated Airdrop Database Setup
-- Run this in Supabase SQL Editor to verify the integrated airdrop system

-- 1. Check if airdrop_task_completions table exists and is properly linked
SELECT 
  t.table_name,
  t.table_type,
  'airdrop_task_completions' as expected_table
FROM information_schema.tables t
WHERE t.table_name = 'airdrop_task_completions'
UNION ALL
SELECT 
  'wallet_users' as table_name,
  table_type,
  'wallet_users (required)' as expected_table
FROM information_schema.tables 
WHERE table_name = 'wallet_users';

-- 2. Check foreign key relationship
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'airdrop_task_completions';

-- 3. Check if new columns were added to wallet_users
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
  AND column_name IN ('airdrop_total_earned', 'airdrop_tasks_completed')
ORDER BY column_name;

-- 4. Check airdrop_task_completions table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'airdrop_task_completions'
ORDER BY ordinal_position;

-- 5. Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'airdrop_task_completions'
ORDER BY indexname;

-- 6. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'airdrop_task_completions'
ORDER BY policyname;

-- 7. Check if functions exist
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

-- 8. Check if triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name IN (
  'airdrop_completion_update_user',
  'airdrop_completion_update_summary'
)
ORDER BY trigger_name;

-- 9. Test with a real wallet address (replace with actual address)
-- First, let's see what wallet addresses exist
SELECT 
  id,
  wallet_address,
  username,
  rzc_balance,
  airdrop_total_earned,
  airdrop_tasks_completed,
  created_at
FROM wallet_users 
ORDER BY created_at DESC 
LIMIT 5;

-- 10. Test record_airdrop_completion function with first available wallet
DO $$
DECLARE
  test_wallet TEXT;
BEGIN
  -- Get first wallet address
  SELECT wallet_address INTO test_wallet 
  FROM wallet_users 
  LIMIT 1;
  
  IF test_wallet IS NOT NULL THEN
    -- Test completion
    PERFORM record_airdrop_completion(
      test_wallet,
      999,
      'integration_test',
      'Integration Test Task',
      100,
      '{"test": true, "integration": true}'::jsonb
    );
    
    RAISE NOTICE 'Test completed with wallet: %', test_wallet;
  ELSE
    RAISE NOTICE 'No wallet addresses found for testing';
  END IF;
END $$;

-- 11. Test get_airdrop_progress function
DO $$
DECLARE
  test_wallet TEXT;
  progress_result JSON;
BEGIN
  -- Get first wallet address
  SELECT wallet_address INTO test_wallet 
  FROM wallet_users 
  LIMIT 1;
  
  IF test_wallet IS NOT NULL THEN
    SELECT get_airdrop_progress(test_wallet) INTO progress_result;
    RAISE NOTICE 'Progress result: %', progress_result;
  END IF;
END $$;

-- 12. Test get_airdrop_stats function
SELECT get_airdrop_stats() as stats_result;

-- 13. Test get_airdrop_leaderboard function
SELECT get_airdrop_leaderboard(5) as leaderboard_result;

-- 14. Check existing completions (if any)
SELECT 
  c.id,
  u.wallet_address,
  u.username,
  c.task_id,
  c.task_action,
  c.task_title,
  c.reward_amount,
  c.completed_at,
  c.verified
FROM airdrop_task_completions c
JOIN wallet_users u ON c.user_id = u.id
ORDER BY c.completed_at DESC 
LIMIT 10;

-- 15. Check wallet_users airdrop summary
SELECT 
  wallet_address,
  username,
  rzc_balance,
  airdrop_total_earned,
  airdrop_tasks_completed,
  updated_at
FROM wallet_users 
WHERE airdrop_tasks_completed > 0
ORDER BY airdrop_total_earned DESC
LIMIT 10;

-- 16. Test duplicate prevention
DO $$
DECLARE
  test_wallet TEXT;
  duplicate_result JSON;
BEGIN
  -- Get first wallet address
  SELECT wallet_address INTO test_wallet 
  FROM wallet_users 
  LIMIT 1;
  
  IF test_wallet IS NOT NULL THEN
    -- Try to complete the same task again (should fail)
    SELECT record_airdrop_completion(
      test_wallet,
      999,
      'integration_test',
      'Integration Test Task',
      100,
      '{"duplicate_test": true}'::jsonb
    ) INTO duplicate_result;
    
    RAISE NOTICE 'Duplicate test result: %', duplicate_result;
  END IF;
END $$;

-- Cleanup test data (uncomment to remove test entries)
/*
DELETE FROM airdrop_task_completions 
WHERE task_action = 'integration_test' AND task_id = 999;

-- Reset airdrop summary for test users
UPDATE wallet_users 
SET airdrop_total_earned = 0, airdrop_tasks_completed = 0
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM airdrop_task_completions 
  WHERE task_action = 'integration_test'
);
*/

-- Expected Results:
-- 1. Both tables should exist
-- 2. Foreign key relationship should be established
-- 3. New columns should be added to wallet_users
-- 4. airdrop_task_completions should have all required columns
-- 5. Should have performance indexes including unique constraint
-- 6. Should have RLS policies for security
-- 7. All four functions should exist
-- 8. Triggers should be created for automatic updates
-- 9-11. Functions should work with real wallet addresses
-- 12-13. Stats and leaderboard should work
-- 14-15. Should show test data and updated summaries
-- 16. Duplicate prevention should work (second attempt should fail)