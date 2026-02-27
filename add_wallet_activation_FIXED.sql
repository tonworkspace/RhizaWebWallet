-- Add wallet activation feature to existing wallet_users table
-- Execute this in your Supabase SQL Editor

-- Add activation columns to wallet_users table
ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS activation_fee_paid DECIMAL(10,4) DEFAULT 0;

-- Create index for faster activation queries
CREATE INDEX IF NOT EXISTS idx_wallet_users_is_activated ON wallet_users(is_activated);

-- Update existing users to be activated (optional - for migration)
-- Comment out if you want all existing users to require activation
-- UPDATE wallet_users 
-- SET is_activated = TRUE, 
--     activated_at = created_at 
-- WHERE is_activated IS NULL OR is_activated = FALSE;

-- NOTE: New users will need to purchase a mining node to activate their wallet

-- Create activation transactions table for tracking
CREATE TABLE IF NOT EXISTS wallet_activations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  activation_fee_usd DECIMAL(10,2) NOT NULL,
  activation_fee_ton DECIMAL(10,4) NOT NULL,
  ton_price_at_activation DECIMAL(10,2) NOT NULL,
  transaction_hash TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallet_activations_user_id ON wallet_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activations_wallet_address ON wallet_activations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_activations_status ON wallet_activations(status);

-- Function to activate wallet
CREATE OR REPLACE FUNCTION activate_wallet(
  p_wallet_address TEXT,
  p_activation_fee_usd DECIMAL(10,2),
  p_activation_fee_ton DECIMAL(10,4),
  p_ton_price DECIMAL(10,2),
  p_transaction_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_already_activated BOOLEAN;
BEGIN
  -- Get user_id and check if already activated
  SELECT id, is_activated INTO v_user_id, v_already_activated
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF v_already_activated THEN
    RAISE EXCEPTION 'Wallet already activated';
  END IF;
  
  -- Update wallet_users
  UPDATE wallet_users
  SET is_activated = TRUE,
      activated_at = NOW(),
      activation_fee_paid = p_activation_fee_ton,
      updated_at = NOW()
  WHERE wallet_address = p_wallet_address;
  
  -- Record activation
  INSERT INTO wallet_activations (
    user_id,
    wallet_address,
    activation_fee_usd,
    activation_fee_ton,
    ton_price_at_activation,
    transaction_hash,
    status,
    completed_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_activation_fee_usd,
    p_activation_fee_ton,
    p_ton_price,
    p_transaction_hash,
    'completed',
    NOW()
  );
  
  -- Create notification
  INSERT INTO wallet_notifications (
    user_id,
    type,
    title,
    message,
    priority,
    created_at
  ) VALUES (
    v_user_id,
    'system_announcement',
    'Wallet Activated Successfully!',
    'Welcome to RhizaCore! Your wallet is now fully activated and you can access all ecosystem features.',
    'high',
    NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check activation status
CREATE OR REPLACE FUNCTION check_wallet_activation(p_wallet_address TEXT)
RETURNS TABLE (
  is_activated BOOLEAN,
  activated_at TIMESTAMP,
  activation_fee_paid DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.is_activated,
    w.activated_at,
    w.activation_fee_paid
  FROM wallet_users w
  WHERE w.wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for wallet_activations
ALTER TABLE wallet_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activations" ON wallet_activations
  FOR SELECT USING (user_id = auth.uid() OR wallet_address = current_setting('app.current_user_address', TRUE));

CREATE POLICY "Users can insert their own activations" ON wallet_activations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR wallet_address = current_setting('app.current_user_address', TRUE));

-- Create view for activation statistics (admin only)
CREATE OR REPLACE VIEW activation_statistics AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_activated = TRUE) as activated_users,
  COUNT(*) FILTER (WHERE is_activated = FALSE) as pending_activations,
  SUM(activation_fee_paid) as total_activation_fees_ton,
  AVG(activation_fee_paid) as avg_activation_fee_ton,
  MIN(activated_at) as first_activation,
  MAX(activated_at) as latest_activation
FROM wallet_users;

-- Grant access to view (adjust as needed)
-- GRANT SELECT ON activation_statistics TO authenticated;

COMMENT ON TABLE wallet_activations IS 'Tracks wallet activation payments and status';
COMMENT ON FUNCTION activate_wallet IS 'Activates a wallet after payment verification';
COMMENT ON FUNCTION check_wallet_activation IS 'Checks if a wallet is activated';

-- ============================================================================
-- DONE! 
-- ============================================================================
-- Your wallet activation system is now ready.
-- 
-- Next steps:
-- 1. Test the activation flow in your app
-- 2. Integrate TON payment processing
-- 3. Monitor activation statistics
