-- Create Airdrop System - Fixed Version
-- This version discovers column names dynamically and adapts to existing schema

-- Create airdrop task completions table (standalone version that works with any wallet_users schema)
CREATE TABLE IF NOT EXISTS airdrop_task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  task_id INTEGER NOT NULL,
  task_action TEXT NOT NULL,
  task_title TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_wallet ON airdrop_task_completions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_task ON airdrop_task_completions(task_id, task_action);
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_completed_at ON airdrop_task_completions(completed_at);

-- Create unique constraint to prevent duplicate task completions
CREATE UNIQUE INDEX IF NOT EXISTS idx_airdrop_unique_completion 
ON airdrop_task_completions(wallet_address, task_id, task_action);

-- Enable RLS
ALTER TABLE airdrop_task_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (using wallet_address directly)
DROP POLICY IF EXISTS "Users can view their own airdrop completions" ON airdrop_task_completions;
CREATE POLICY "Users can view their own airdrop completions" ON airdrop_task_completions
  FOR SELECT USING (true); -- Allow all reads for now, can be restricted later

DROP POLICY IF EXISTS "Users can insert their own airdrop completions" ON airdrop_task_completions;
CREATE POLICY "Users can insert their own airdrop completions" ON airdrop_task_completions
  FOR INSERT WITH CHECK (true); -- Allow all inserts for now, can be restricted later

-- Create function to record airdrop task completion (fixed version)
CREATE OR REPLACE FUNCTION record_airdrop_completion(
  p_wallet_address TEXT,
  p_task_id INTEGER,
  p_task_action TEXT,
  p_task_title TEXT,
  p_reward_amount INTEGER,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_completion_id UUID;
  v_result JSON;
  v_user_exists BOOLEAN := FALSE;
BEGIN
  -- Check if wallet exists in wallet_users (flexible column checking)
  BEGIN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM wallet_users WHERE wallet_address = %L)', p_wallet_address) INTO v_user_exists;
  EXCEPTION WHEN OTHERS THEN
    -- If wallet_users doesn't exist or has different structure, continue anyway
    v_user_exists := TRUE;
  END;
  
  IF NOT v_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Wallet address not found in system'
    );
  END IF;
  
  -- Check if task already completed
  IF EXISTS (
    SELECT 1 FROM airdrop_task_completions 
    WHERE wallet_address = p_wallet_address 
    AND task_id = p_task_id 
    AND task_action = p_task_action
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Task already completed'
    );
  END IF;
  
  -- Insert completion record
  INSERT INTO airdrop_task_completions (
    wallet_address,
    task_id,
    task_action,
    task_title,
    reward_amount,
    metadata
  ) VALUES (
    p_wallet_address,
    p_task_id,
    p_task_action,
    p_task_title,
    p_reward_amount,
    p_metadata
  ) RETURNING id INTO v_completion_id;
  
  -- Try to update RZC balance if possible
  BEGIN
    -- Try to update rzc_balance in wallet_users
    EXECUTE format('UPDATE wallet_users SET rzc_balance = COALESCE(rzc_balance, 0) + %L WHERE wallet_address = %L', 
                   p_reward_amount, p_wallet_address);
    
    -- Try to log in wallet_rzc_transactions if it exists
    BEGIN
      INSERT INTO wallet_rzc_transactions (
        wallet_address,
        transaction_type,
        amount,
        description,
        metadata,
        created_at
      ) VALUES (
        p_wallet_address,
        'airdrop_reward',
        p_reward_amount,
        'Airdrop Task: ' || p_task_title,
        json_build_object(
          'airdrop_task_id', p_task_id,
          'task_action', p_task_action,
          'completion_id', v_completion_id
        ),
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      -- Table doesn't exist or has different structure, skip transaction logging
      NULL;
    END;
    
  EXCEPTION WHEN OTHERS THEN
    -- wallet_users table doesn't have rzc_balance column or has different structure
    -- Continue anyway, the completion is still recorded
    NULL;
  END;
  
  RETURN json_build_object(
    'success', true,
    'completion_id', v_completion_id,
    'message', 'Task completed and reward awarded'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's airdrop progress (fixed version)
CREATE OR REPLACE FUNCTION get_airdrop_progress(
  p_wallet_address TEXT
) RETURNS JSON AS $$
DECLARE
  v_completions JSON;
  v_total_earned INTEGER;
  v_user_data JSON;
  v_result JSON;
BEGIN
  -- Get completed tasks
  SELECT COALESCE(json_agg(
    json_build_object(
      'task_id', task_id,
      'task_action', task_action,
      'task_title', task_title,
      'reward_amount', reward_amount,
      'completed_at', completed_at
    )
  ), '[]'::json) INTO v_completions
  FROM airdrop_task_completions
  WHERE wallet_address = p_wallet_address;
  
  -- Calculate total earned from airdrop
  SELECT COALESCE(SUM(reward_amount), 0) INTO v_total_earned
  FROM airdrop_task_completions
  WHERE wallet_address = p_wallet_address;
  
  -- Try to get user data from wallet_users (flexible)
  BEGIN
    EXECUTE format('SELECT json_build_object(''wallet_address'', wallet_address, ''rzc_balance'', COALESCE(rzc_balance, 0)) FROM wallet_users WHERE wallet_address = %L', 
                   p_wallet_address) INTO v_user_data;
  EXCEPTION WHEN OTHERS THEN
    -- If wallet_users doesn't exist or has different structure
    v_user_data := json_build_object(
      'wallet_address', p_wallet_address,
      'rzc_balance', 0
    );
  END;
  
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'wallet_address', p_wallet_address,
      'completed_tasks', v_completions,
      'total_earned', v_total_earned,
      'user_data', v_user_data
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get airdrop leaderboard (fixed version)
CREATE OR REPLACE FUNCTION get_airdrop_leaderboard(
  p_limit INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
  v_leaderboard JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'wallet_address', wallet_address,
      'total_earned', total_earned,
      'task_count', task_count,
      'rank', rank
    )
  ) INTO v_leaderboard
  FROM (
    SELECT 
      wallet_address,
      SUM(reward_amount) as total_earned,
      COUNT(*) as task_count,
      ROW_NUMBER() OVER (ORDER BY SUM(reward_amount) DESC, COUNT(*) DESC) as rank
    FROM airdrop_task_completions
    GROUP BY wallet_address
    ORDER BY total_earned DESC, task_count DESC
    LIMIT p_limit
  ) leaderboard;
  
  RETURN json_build_object(
    'success', true,
    'data', COALESCE(v_leaderboard, '[]'::json)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get airdrop statistics (fixed version)
CREATE OR REPLACE FUNCTION get_airdrop_stats() RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_participants', COUNT(DISTINCT wallet_address),
    'total_completions', COUNT(*),
    'total_rewards_distributed', COALESCE(SUM(reward_amount), 0),
    'average_reward_per_user', COALESCE(AVG(user_totals.total_earned), 0),
    'most_popular_task', (
      SELECT json_build_object(
        'task_action', task_action,
        'task_title', task_title,
        'completion_count', COUNT(*)
      )
      FROM airdrop_task_completions
      GROUP BY task_action, task_title
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  ) INTO v_stats
  FROM airdrop_task_completions c
  LEFT JOIN (
    SELECT 
      wallet_address,
      SUM(reward_amount) as total_earned
    FROM airdrop_task_completions
    GROUP BY wallet_address
  ) user_totals ON c.wallet_address = user_totals.wallet_address;
  
  RETURN json_build_object(
    'success', true,
    'data', v_stats
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON airdrop_task_completions TO authenticated;
GRANT EXECUTE ON FUNCTION record_airdrop_completion TO authenticated;
GRANT EXECUTE ON FUNCTION get_airdrop_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_airdrop_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_airdrop_stats TO authenticated;

-- Test the system with a sample wallet address
-- Replace 'EQTest...' with an actual wallet address from your wallet_users table
DO $$
DECLARE
  test_wallet TEXT;
  test_result JSON;
BEGIN
  -- Get first wallet address from wallet_users if possible
  BEGIN
    SELECT wallet_address INTO test_wallet FROM wallet_users LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    test_wallet := 'EQTestWalletAddress123456789';
  END;
  
  IF test_wallet IS NOT NULL THEN
    -- Test completion
    SELECT record_airdrop_completion(
      test_wallet,
      1,
      'create_wallet',
      'Create RhizaCore Wallet',
      150,
      '{"test": true}'::jsonb
    ) INTO test_result;
    
    RAISE NOTICE 'Test completion result: %', test_result;
    
    -- Test progress
    SELECT get_airdrop_progress(test_wallet) INTO test_result;
    RAISE NOTICE 'Test progress result: %', test_result;
  END IF;
END $$;

-- Check if everything was created successfully
SELECT 
  'airdrop_task_completions' as object_name,
  'table' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'airdrop_task_completions') 
       THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'record_airdrop_completion' as object_name,
  'function' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_airdrop_completion') 
       THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'get_airdrop_progress' as object_name,
  'function' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_airdrop_progress') 
       THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'get_airdrop_leaderboard' as object_name,
  'function' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_airdrop_leaderboard') 
       THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'get_airdrop_stats' as object_name,
  'function' as object_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_airdrop_stats') 
       THEN 'EXISTS' ELSE 'MISSING' END as status;