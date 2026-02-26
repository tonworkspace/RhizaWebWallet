-- =====================================================
-- SQUAD MINING SYSTEM - Database Migration
-- =====================================================
-- This adds squad mining functionality to the referral system
-- Allows users to claim RZC rewards every 8 hours based on squad size

-- 1. Add squad mining fields to wallet_users table
ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS last_squad_claim_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_squad_rewards NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- 2. Create squad_claims table to track all claims
CREATE TABLE IF NOT EXISTS wallet_squad_claims (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  squad_size INTEGER NOT NULL DEFAULT 0,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  premium_members INTEGER DEFAULT 0,
  transaction_id TEXT UNIQUE NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_squad_claims_user_id ON wallet_squad_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_claims_wallet_address ON wallet_squad_claims(wallet_address);
CREATE INDEX IF NOT EXISTS idx_squad_claims_claimed_at ON wallet_squad_claims(claimed_at);
CREATE INDEX IF NOT EXISTS idx_squad_claims_transaction_id ON wallet_squad_claims(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wallet_users_last_squad_claim ON wallet_users(last_squad_claim_at);
CREATE INDEX IF NOT EXISTS idx_wallet_users_is_premium ON wallet_users(is_premium);

-- 4. Create function to claim squad rewards
CREATE OR REPLACE FUNCTION claim_squad_rewards(
  p_user_id UUID,
  p_wallet_address TEXT,
  p_squad_size INTEGER,
  p_reward_amount NUMERIC,
  p_premium_members INTEGER,
  p_transaction_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_last_claim TIMESTAMPTZ;
  v_hours_since_claim NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM wallet_users WHERE id = p_user_id) THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'User not found';
    RETURN;
  END IF;

  -- Get last claim time
  SELECT last_squad_claim_at INTO v_last_claim
  FROM wallet_users
  WHERE id = p_user_id;

  -- Check if 8 hours have passed since last claim
  IF v_last_claim IS NOT NULL THEN
    v_hours_since_claim := EXTRACT(EPOCH FROM (NOW() - v_last_claim)) / 3600;
    
    IF v_hours_since_claim < 8 THEN
      RETURN QUERY SELECT 
        false, 
        0::NUMERIC, 
        'Must wait ' || ROUND(8 - v_hours_since_claim, 1) || ' more hours before next claim';
      RETURN;
    END IF;
  END IF;

  -- Check if squad size is valid
  IF p_squad_size <= 0 THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 'No squad members to claim from';
    RETURN;
  END IF;

  -- Award RZC tokens
  UPDATE wallet_users
  SET 
    rzc_balance = rzc_balance + p_reward_amount,
    last_squad_claim_at = NOW(),
    total_squad_rewards = COALESCE(total_squad_rewards, 0) + p_reward_amount
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;

  -- Record the claim
  INSERT INTO wallet_squad_claims (
    user_id,
    wallet_address,
    squad_size,
    reward_amount,
    premium_members,
    transaction_id
  ) VALUES (
    p_user_id,
    p_wallet_address,
    p_squad_size,
    p_reward_amount,
    p_premium_members,
    p_transaction_id
  );

  -- Create RZC transaction record
  INSERT INTO wallet_rzc_transactions (
    user_id,
    wallet_address,
    type,
    amount,
    balance_after,
    source,
    metadata
  ) VALUES (
    p_user_id,
    p_wallet_address,
    'earn',
    p_reward_amount,
    v_new_balance,
    'squad_mining',
    jsonb_build_object(
      'squad_size', p_squad_size,
      'premium_members', p_premium_members,
      'transaction_id', p_transaction_id
    )
  );

  -- Create notification
  INSERT INTO wallet_notifications (
    user_id,
    wallet_address,
    type,
    title,
    message,
    priority,
    metadata
  ) VALUES (
    p_user_id,
    p_wallet_address,
    'reward',
    'Squad Mining Reward Claimed! 🎉',
    'You claimed ' || p_reward_amount || ' RZC from ' || p_squad_size || ' squad members!',
    'normal',
    jsonb_build_object(
      'reward_amount', p_reward_amount,
      'squad_size', p_squad_size,
      'claim_type', 'squad_mining'
    )
  );

  RETURN QUERY SELECT true, v_new_balance, 'Successfully claimed ' || p_reward_amount || ' RZC!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get squad mining stats
CREATE OR REPLACE FUNCTION get_squad_mining_stats(p_user_id UUID)
RETURNS TABLE(
  squad_size BIGINT,
  potential_reward NUMERIC,
  total_rewards_earned NUMERIC,
  last_claim_at TIMESTAMPTZ,
  can_claim BOOLEAN,
  hours_until_claim NUMERIC
) AS $$
DECLARE
  v_last_claim TIMESTAMPTZ;
  v_hours_since_claim NUMERIC;
BEGIN
  -- Get user's last claim time and total rewards
  SELECT 
    u.last_squad_claim_at,
    COALESCE(u.total_squad_rewards, 0)
  INTO v_last_claim, total_rewards_earned
  FROM wallet_users u
  WHERE u.id = p_user_id;

  -- Calculate squad size (downline count)
  SELECT COUNT(*)
  INTO squad_size
  FROM wallet_referrals
  WHERE referrer_id = p_user_id;

  -- Calculate potential reward (2 RZC per member, 5 RZC per premium)
  SELECT 
    COALESCE(SUM(CASE WHEN u.is_premium THEN 5 ELSE 2 END), 0)
  INTO potential_reward
  FROM wallet_referrals r
  JOIN wallet_users u ON r.user_id = u.id
  WHERE r.referrer_id = p_user_id;

  -- Calculate if can claim
  IF v_last_claim IS NULL THEN
    can_claim := true;
    hours_until_claim := 0;
  ELSE
    v_hours_since_claim := EXTRACT(EPOCH FROM (NOW() - v_last_claim)) / 3600;
    can_claim := v_hours_since_claim >= 8;
    hours_until_claim := GREATEST(0, 8 - v_hours_since_claim);
  END IF;

  last_claim_at := v_last_claim;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create view for squad mining leaderboard
CREATE OR REPLACE VIEW squad_mining_leaderboard AS
SELECT 
  u.id,
  u.wallet_address,
  u.name,
  u.avatar,
  COALESCE(u.total_squad_rewards, 0) as total_earned,
  COUNT(DISTINCT r.user_id) as squad_size,
  u.last_squad_claim_at,
  u.is_premium,
  RANK() OVER (ORDER BY COALESCE(u.total_squad_rewards, 0) DESC) as rank
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.referrer_id
GROUP BY u.id, u.wallet_address, u.name, u.avatar, u.total_squad_rewards, u.last_squad_claim_at, u.is_premium
ORDER BY total_earned DESC;

-- 7. Enable Row Level Security
ALTER TABLE wallet_squad_claims ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for squad_claims
CREATE POLICY "Users can view their own squad claims"
  ON wallet_squad_claims FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own squad claims"
  ON wallet_squad_claims FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- 9. Grant permissions
GRANT SELECT, INSERT ON wallet_squad_claims TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE wallet_squad_claims_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION claim_squad_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION get_squad_mining_stats TO authenticated;

-- 10. Add comments for documentation
COMMENT ON TABLE wallet_squad_claims IS 'Tracks squad mining reward claims - users can claim every 8 hours';
COMMENT ON COLUMN wallet_users.last_squad_claim_at IS 'Timestamp of last squad mining claim';
COMMENT ON COLUMN wallet_users.total_squad_rewards IS 'Total RZC earned from squad mining';
COMMENT ON COLUMN wallet_users.is_premium IS 'Premium members earn 5 RZC per claim instead of 2';
COMMENT ON FUNCTION claim_squad_rewards IS 'Claims squad mining rewards - enforces 8 hour cooldown';
COMMENT ON FUNCTION get_squad_mining_stats IS 'Gets squad mining statistics for a user';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name IN ('last_squad_claim_at', 'total_squad_rewards', 'is_premium');

-- Check if table was created
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'wallet_squad_claims'
);

-- Check if functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('claim_squad_rewards', 'get_squad_mining_stats');

-- =====================================================
-- SAMPLE USAGE
-- =====================================================

-- Get squad mining stats for a user
-- SELECT * FROM get_squad_mining_stats('user_id_here');

-- Claim squad rewards
-- SELECT * FROM claim_squad_rewards(
--   'user_id_here',
--   'wallet_address_here',
--   5,  -- squad_size
--   10, -- reward_amount
--   1,  -- premium_members
--   'squad_user123_1234567890_abc123' -- transaction_id
-- );

-- View leaderboard
-- SELECT * FROM squad_mining_leaderboard LIMIT 10;

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================
