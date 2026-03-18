-- Create integrated airdrop system that works with existing wallet_users table
-- This version integrates with your existing database structure

-- Create airdrop task completions table (integrated version)
CREATE TABLE IF NOT EXISTS airdrop_task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_user_id ON airdrop_task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_wallet ON airdrop_task_completions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_task ON airdrop_task_completions(task_id, task_action);
CREATE INDEX IF NOT EXISTS idx_airdrop_completions_completed_at ON airdrop_task_completions(completed_at);

-- Create unique constraint to prevent duplicate task completions
CREATE UNIQUE INDEX IF NOT EXISTS idx_airdrop_unique_completion 
ON airdrop_task_completions(user_id, task_id, task_action);

-- Enable RLS
ALTER TABLE airdrop_task_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own airdrop completions" ON airdrop_task_completions
  FOR SELECT USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert their own airdrop completions" ON airdrop_task_completions
  FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create function to record airdrop task completion (integrated version)
CREATE OR REPLACE FUNCTION record_airdrop_completion(
  p_wallet_address TEXT,
  p_task_id INTEGER,
  p_task_action TEXT,
  p_task_title TEXT,
  p_reward_amount INTEGER,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_completion_id UUID;
  v_result JSON;
BEGIN
  -- Get user ID from wallet address
  SELECT id INTO v_user_id 
  FROM wallet_users 
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Check if task already completed
  IF EXISTS (
    SELECT 1 FROM airdrop_task_completions 
    WHERE user_id = v_user_id 
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
    user_id,
    wallet_address,
    task_id,
    task_action,
    task_title,
    reward_amount,
    metadata
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_task_id,
    p_task_action,
    p_task_title,
    p_reward_amount,
    p_metadata
  ) RETURNING id INTO v_completion_id;
  
  -- Award RZC tokens using existing RZC system
  -- Check if award_rzc_tokens function exists, if not create a simple version
  BEGIN
    PERFORM award_rzc_tokens(
      v_user_id,
      p_reward_amount,
      'Airdrop Task: ' || p_task_title,
      json_build_object(
        'airdrop_task_id', p_task_id,
        'task_action', p_task_action,
        'completion_id', v_completion_id
      )
    );
  EXCEPTION WHEN undefined_function THEN
    -- If award_rzc_tokens doesn't exist, update rzc_balance directly
    UPDATE wallet_users 
    SET rzc_balance = COALESCE(rzc_balance, 0) + p_reward_amount,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Log the transaction in wallet_rzc_transactions if table exists
    BEGIN
      INSERT INTO wallet_rzc_transactions (
        user_id,
        wallet_address,
        transaction_type,
        amount,
        description,
        metadata,
        created_at
      ) VALUES (
        v_user_id,
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
    EXCEPTION WHEN undefined_table THEN
      -- Table doesn't exist, skip transaction logging
      NULL;
    END;
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

-- Create function to get user's airdrop progress (integrated version)
CREATE OR REPLACE FUNCTION get_airdrop_progress(
  p_wallet_address TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_user_data wallet_users%ROWTYPE;
  v_referral_data RECORD;
  v_completions JSON;
  v_total_earned INTEGER;
  v_result JSON;
BEGIN
  -- Get user ID and data
  SELECT * INTO v_user_data 
  FROM wallet_users 
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_data.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get referral data if wallet_referrals table exists
  BEGIN
    SELECT 
      COUNT(*) as total_referrals
    INTO v_referral_data
    FROM wallet_referrals
    WHERE referrer_id = v_user_data.id;
  EXCEPTION WHEN undefined_table THEN
    v_referral_data.total_referrals := 0;
  END;
  
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
  WHERE user_id = v_user_data.id;
  
  -- Calculate total earned from airdrop
  SELECT COALESCE(SUM(reward_amount), 0) INTO v_total_earned
  FROM airdrop_task_completions
  WHERE user_id = v_user_data.id;
  
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'user_id', v_user_data.id,
      'wallet_address', v_user_data.wallet_address,
      'profile_complete', (
        v_user_data.avatar IS NOT NULL AND v_user_data.avatar != '' AND 
        v_user_data.name IS NOT NULL AND v_user_data.name != ''
      ),
      'total_referrals', COALESCE(v_referral_data.total_referrals, 0),
      'completed_tasks', v_completions,
      'total_earned', v_total_earned,
      'rzc_balance', COALESCE(v_user_data.rzc_balance, 0)
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get airdrop leaderboard (integrated version)
CREATE OR REPLACE FUNCTION get_airdrop_leaderboard(
  p_limit INTEGER DEFAULT 10
) RETURNS JSON AS $$
DECLARE
  v_leaderboard JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'wallet_address', wallet_address,
      'username', username,
      'total_earned', total_earned,
      'task_count', task_count,
      'rank', rank
    )
  ) INTO v_leaderboard
  FROM (
    SELECT 
      u.wallet_address,
      u.username,
      COALESCE(SUM(c.reward_amount), 0) as total_earned,
      COUNT(c.id) as task_count,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.reward_amount), 0) DESC, COUNT(c.id) DESC) as rank
    FROM wallet_users u
    LEFT JOIN airdrop_task_completions c ON u.id = c.user_id
    WHERE EXISTS (SELECT 1 FROM airdrop_task_completions WHERE user_id = u.id)
    GROUP BY u.id, u.wallet_address, u.username
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

-- Create function to get airdrop statistics (integrated version)
CREATE OR REPLACE FUNCTION get_airdrop_stats() RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_participants', COUNT(DISTINCT c.user_id),
    'total_completions', COUNT(c.*),
    'total_rewards_distributed', COALESCE(SUM(c.reward_amount), 0),
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
      user_id,
      SUM(reward_amount) as total_earned
    FROM airdrop_task_completions
    GROUP BY user_id
  ) user_totals ON c.user_id = user_totals.user_id;
  
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

-- Create trigger to update wallet_users.updated_at when airdrop tasks are completed
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallet_users 
  SET updated_at = NOW() 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER airdrop_completion_update_user
  AFTER INSERT ON airdrop_task_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamp();

-- Add airdrop-related columns to wallet_users if they don't exist
DO $$ 
BEGIN
  -- Add airdrop_total_earned column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'airdrop_total_earned'
  ) THEN
    ALTER TABLE wallet_users ADD COLUMN airdrop_total_earned INTEGER DEFAULT 0;
  END IF;
  
  -- Add airdrop_tasks_completed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'airdrop_tasks_completed'
  ) THEN
    ALTER TABLE wallet_users ADD COLUMN airdrop_tasks_completed INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create trigger to update airdrop summary in wallet_users
CREATE OR REPLACE FUNCTION update_airdrop_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallet_users 
  SET 
    airdrop_total_earned = (
      SELECT COALESCE(SUM(reward_amount), 0)
      FROM airdrop_task_completions 
      WHERE user_id = NEW.user_id
    ),
    airdrop_tasks_completed = (
      SELECT COUNT(*)
      FROM airdrop_task_completions 
      WHERE user_id = NEW.user_id
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER airdrop_completion_update_summary
  AFTER INSERT ON airdrop_task_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_airdrop_summary();