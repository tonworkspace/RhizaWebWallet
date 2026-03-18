-- Step-by-Step Airdrop Test
-- Run each section separately if you encounter issues

-- STEP 1: Check if table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'airdrop_task_completions';

-- STEP 2: Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'airdrop_task_completions'
ORDER BY ordinal_position;

-- STEP 3: Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'record_airdrop_completion',
  'get_airdrop_progress', 
  'get_airdrop_leaderboard',
  'get_airdrop_stats'
);

-- STEP 4: Get a test wallet address
SELECT wallet_address FROM wallet_users LIMIT 1;

-- STEP 5: Test completion function (replace 'YOUR_WALLET_HERE' with actual wallet)
-- SELECT record_airdrop_completion(
--   'YOUR_WALLET_HERE',
--   1,
--   'create_wallet',
--   'Create RhizaCore Wallet',
--   150,
--   '{"test": true}'::jsonb
-- );

-- STEP 6: Test progress function (replace 'YOUR_WALLET_HERE' with actual wallet)
-- SELECT get_airdrop_progress('YOUR_WALLET_HERE');

-- STEP 7: Check current data
SELECT COUNT(*) as total_completions FROM airdrop_task_completions;

-- STEP 8: Test stats function
SELECT get_airdrop_stats();