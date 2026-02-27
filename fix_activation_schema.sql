-- ============================================================================
-- FIX WALLET ACTIVATION SCHEMA
-- ============================================================================
-- This script safely adds only missing components
-- Run this in Supabase SQL Editor

-- 1. Ensure wallet_activations table exists with correct structure
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

-- 2. Add activation columns to wallet_users (if they don't exist)
DO $$ 
BEGIN
  -- Add is_activated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'is_activated'
  ) THEN
    ALTER TABLE wallet_users ADD COLUMN is_activated BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added is_activated column';
  ELSE
    RAISE NOTICE 'ℹ️ is_activated column already exists';
  END IF;

  -- Add activated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'activated_at'
  ) THEN
    ALTER TABLE wallet_users ADD COLUMN activated_at TIMESTAMP;
    RAISE NOTICE '✅ Added activated_at column';
  ELSE
    RAISE NOTICE 'ℹ️ activated_at column already exists';
  END IF;

  -- Add activation_fee_paid column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'activation_fee_paid'
  ) THEN
    ALTER TABLE wallet_users ADD COLUMN activation_fee_paid DECIMAL(10,4) DEFAULT 0;
    RAISE NOTICE '✅ Added activation_fee_paid column';
  ELSE
    RAISE NOTICE 'ℹ️ activation_fee_paid column already exists';
  END IF;
END $$;

-- 3. Create indexes (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_wallet_users_is_activated ON wallet_users(is_activated);
CREATE INDEX IF NOT EXISTS idx_wallet_activations_user_id ON wallet_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_activations_wallet_address ON wallet_activations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_activations_status ON wallet_activations(status);

-- 4. Enable RLS on wallet_activations
ALTER TABLE wallet_activations ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Users can view their own activations" ON wallet_activations;
DROP POLICY IF EXISTS "Users can insert their own activations" ON wallet_activations;

-- 6. Create RLS policies
CREATE POLICY "Users can view their own activations" ON wallet_activations
  FOR SELECT USING (
    user_id = auth.uid() OR 
    wallet_address = current_setting('app.current_user_address', TRUE)
  );

CREATE POLICY "Users can insert their own activations" ON wallet_activations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    wallet_address = current_setting('app.current_user_address', TRUE)
  );

-- 7. Create or replace activate_wallet function
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
  
  -- Create notification (with wallet_address included)
  BEGIN
    INSERT INTO wallet_notifications (
      user_id,
      wallet_address,
      type,
      title,
      message,
      priority,
      created_at
    ) VALUES (
      v_user_id,
      p_wallet_address,
      'system_announcement',
      'Wallet Activated Successfully!',
      'Welcome to RhizaCore! Your wallet is now fully activated and you can access all ecosystem features.',
      'high',
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'Notifications table does not exist, skipping notification';
    WHEN undefined_column THEN
      -- If wallet_address column doesn't exist in notifications, try without it
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
  END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create or replace check_wallet_activation function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION activate_wallet TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_wallet_activation TO authenticated, anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table exists
SELECT 'wallet_activations table' as item, 
       CASE WHEN EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_name = 'wallet_activations'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check columns in wallet_users
SELECT 'wallet_users columns' as item,
       string_agg(column_name, ', ') as columns
FROM information_schema.columns
WHERE table_name = 'wallet_users'
AND column_name IN ('is_activated', 'activated_at', 'activation_fee_paid');

-- Check RLS policies
SELECT 'RLS policies' as item,
       COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'wallet_activations';

-- Check functions
SELECT 'Functions' as item,
       string_agg(routine_name, ', ') as functions
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('activate_wallet', 'check_wallet_activation');

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Wallet activation schema is ready!';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Test activation with Test Node (0.01 TON)';
  RAISE NOTICE '   2. Verify wallet activates successfully';
  RAISE NOTICE '   3. Check lock overlay disappears';
END $$;
