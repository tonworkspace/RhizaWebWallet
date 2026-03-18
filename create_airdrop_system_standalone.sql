-- Create standalone airdrop system without profiles table dependency
-- This version works independently and can be integrated later

-- Create airdrop task completions table (standalone version)
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

-- Create RLS policies (simplified for standalone version)
CREATE POLICY "Users can view their own airdrop completions" ON airdrop_task_completions
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert their own airdrop completions" ON airdrop_task_completions
  FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create airdrop rewards tracking table (for RZC balance tracking)
CREATE TABLE IF NOT EXISTS airdrop_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  total_earned INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for airdrop rewards
CREATE UNIQUE INDEX IF NOT EXISTS idx_airdrop_rewards_wallet ON airdrop_rewards(wallet_address);

-- Enable RLS for airdrop rewards
ALTER TABLE airdrop_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for airdrop rewards
CREATE POLICY "Users can view their own airdrop rewards" ON airdrop_rewards
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can update their own airdrop rewards" ON airdrop_rewards
  FOR ALL USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create function to record airdrop task completion (standalone version)
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
BEGIN
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
  
  -- Update or insert airdrop rewards
  INSERT INTO airdrop_rewards (wallet_address, total_earned, last_updated)
  VALUES (p_wallet_address, p_reward_amount, NOW())
  ON CONFLICT (wallet_address) 
  DO UPDATE SET 
    total_earned = airdrop_rewards.total_earned + p_reward_amount,
    last_updated = NOW();
  
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

-- Create function to get user's airdrop progress (standalone version)
CREATE OR REPLACE FUNCTION get_airdrop_progress(
  p_wallet_address TEXT
) RETURNS JSON AS $$
DECLARE
  v_completions JSON;
  v_total_earned INTEGER;
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
  
  -- Get total earned from airdrop rewards table
  SELECT COALESCE(total_earned, 0) INTO v_total_earned
  FROM airdrop_rewards
  WHERE wallet_address = p_wallet_address;
  
  -- If no record in rewards table, calculate from completions
  IF v_total_earned IS NULL THEN
    SELECT COALESCE(SUM(reward_amount), 0) INTO v_total_earned
    FROM airdrop_task_completions
    WHERE wallet_address = p_wallet_address;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'wallet_address', p_wallet_address,
      'completed_tasks', v_completions,
      'total_earned', v_total_earned,
      'task_count', (
        SELECT COUNT(*) 
        FROM airdrop_task_completions 
        WHERE wallet_address = p_wallet_address
      )
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get airdrop leaderboard
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
      r.wallet_address,
      r.total_earned,
      COUNT(c.id) as task_count,
      ROW_NUMBER() OVER (ORDER BY r.total_earned DESC, COUNT(c.id) DESC) as rank
    FROM airdrop_rewards r
    LEFT JOIN airdrop_task_completions c ON r.wallet_address = c.wallet_address
    GROUP BY r.wallet_address, r.total_earned
    ORDER BY r.total_earned DESC, COUNT(c.id) DESC
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

-- Create function to get airdrop statistics
CREATE OR REPLACE FUNCTION get_airdrop_stats() RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_participants', COUNT(DISTINCT wallet_address),
    'total_completions', COUNT(*),
    'total_rewards_distributed', COALESCE(SUM(reward_amount), 0),
    'average_reward_per_user', COALESCE(AVG(total_earned), 0),
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
  LEFT JOIN airdrop_rewards r ON c.wallet_address = r.wallet_address;
  
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
GRANT SELECT, INSERT, UPDATE ON airdrop_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION record_airdrop_completion TO authenticated;
GRANT EXECUTE ON FUNCTION get_airdrop_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_airdrop_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_airdrop_stats TO authenticated;

-- Insert some sample data for testing (optional)
-- Uncomment the lines below to add test data

/*
INSERT INTO airdrop_task_completions (wallet_address, task_id, task_action, task_title, reward_amount) VALUES
('EQTest123...', 1, 'create_wallet', 'Create RhizaCore Wallet', 150),
('EQTest123...', 2, 'follow', 'Follow @RhizaCore on X', 100),
('EQTest456...', 1, 'create_wallet', 'Create RhizaCore Wallet', 150);

INSERT INTO airdrop_rewards (wallet_address, total_earned) VALUES
('EQTest123...', 250),
('EQTest456...', 150);
*/