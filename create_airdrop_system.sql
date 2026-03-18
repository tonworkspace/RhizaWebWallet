-- Create airdrop task completions table
CREATE TABLE IF NOT EXISTS airdrop_task_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Create function to record airdrop task completion
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
  FROM profiles 
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
  
  -- Award RZC tokens
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

-- Create function to get user's airdrop progress
CREATE OR REPLACE FUNCTION get_airdrop_progress(
  p_wallet_address TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_profile profiles%ROWTYPE;
  v_referral_data referral_codes%ROWTYPE;
  v_completions JSON;
  v_total_earned INTEGER;
  v_result JSON;
BEGIN
  -- Get user ID and profile
  SELECT * INTO v_profile 
  FROM profiles 
  WHERE wallet_address = p_wallet_address;
  
  IF v_profile.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get referral data
  SELECT * INTO v_referral_data
  FROM referral_codes
  WHERE user_id = v_profile.id;
  
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
  WHERE user_id = v_profile.id;
  
  -- Calculate total earned from airdrop
  SELECT COALESCE(SUM(reward_amount), 0) INTO v_total_earned
  FROM airdrop_task_completions
  WHERE user_id = v_profile.id;
  
  RETURN json_build_object(
    'success', true,
    'data', json_build_object(
      'user_id', v_profile.id,
      'wallet_address', v_profile.wallet_address,
      'profile_complete', (v_profile.avatar IS NOT NULL AND v_profile.avatar != '' AND v_profile.name IS NOT NULL AND v_profile.name != ''),
      'total_referrals', COALESCE(v_referral_data.total_referrals, 0),
      'completed_tasks', v_completions,
      'total_earned', v_total_earned,
      'rzc_balance', v_profile.rzc_balance
    )
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