-- ============================================================================
-- RZC TOKEN SYSTEM MIGRATION
-- ============================================================================
-- This script adds RZC (RhizaCore Community Token) support to existing database
-- Safe to run on existing database - uses IF NOT EXISTS and ALTER TABLE IF EXISTS
-- 
-- Run this in Supabase SQL Editor after your base schema is set up
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: ADD RZC BALANCE COLUMN TO EXISTING USERS TABLE
-- ============================================================================

-- Add rzc_balance column to wallet_users table
-- Default value is 100 RZC (signup bonus)
-- For existing users, they will get 100 RZC retroactively
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'wallet_users' 
        AND column_name = 'rzc_balance'
    ) THEN
        ALTER TABLE wallet_users 
        ADD COLUMN rzc_balance NUMERIC(20, 8) NOT NULL DEFAULT 100.0;
        
        RAISE NOTICE 'Added rzc_balance column to wallet_users table';
    ELSE
        RAISE NOTICE 'rzc_balance column already exists in wallet_users table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: CREATE RZC TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_rzc_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(20, 8) NOT NULL,
  balance_after NUMERIC(20, 8) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE wallet_rzc_transactions IS 'Tracks all RZC token transactions (signup bonuses, referral rewards, milestone bonuses)';

-- Add comments to columns
COMMENT ON COLUMN wallet_rzc_transactions.type IS 'Transaction type: signup_bonus, referral_bonus, milestone_bonus, transaction_bonus, daily_login';
COMMENT ON COLUMN wallet_rzc_transactions.amount IS 'Amount of RZC tokens awarded (always positive)';
COMMENT ON COLUMN wallet_rzc_transactions.balance_after IS 'User RZC balance after this transaction';
COMMENT ON COLUMN wallet_rzc_transactions.metadata IS 'Additional transaction data (referral info, milestone details, etc.)';

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying user's RZC transactions
CREATE INDEX IF NOT EXISTS idx_wallet_rzc_transactions_user 
ON wallet_rzc_transactions(user_id);

-- Index for querying by transaction type
CREATE INDEX IF NOT EXISTS idx_wallet_rzc_transactions_type 
ON wallet_rzc_transactions(type);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_wallet_rzc_transactions_created 
ON wallet_rzc_transactions(created_at DESC);

-- Composite index for user + date queries
CREATE INDEX IF NOT EXISTS idx_wallet_rzc_transactions_user_created 
ON wallet_rzc_transactions(user_id, created_at DESC);

-- ============================================================================
-- STEP 4: CREATE AWARD RZC TOKENS FUNCTION
-- ============================================================================

-- Function to award RZC tokens atomically
-- This ensures balance updates and transaction records are created together
CREATE OR REPLACE FUNCTION award_rzc_tokens(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'RZC amount must be positive, got: %', p_amount;
  END IF;

  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM wallet_users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Update user's RZC balance atomically
  UPDATE wallet_users
  SET rzc_balance = rzc_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;
  
  -- Record the transaction
  INSERT INTO wallet_rzc_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_amount,
    v_new_balance,
    p_description,
    p_metadata,
    NOW()
  );
  
  -- Log the operation
  RAISE NOTICE 'Awarded % RZC to user %. New balance: %', p_amount, p_user_id, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION award_rzc_tokens IS 'Atomically awards RZC tokens to a user and records the transaction';

-- ============================================================================
-- STEP 5: CREATE RETROACTIVE SIGNUP BONUS FUNCTION (OPTIONAL)
-- ============================================================================

-- Function to award signup bonuses to existing users who don't have a signup bonus transaction
CREATE OR REPLACE FUNCTION award_retroactive_signup_bonuses() RETURNS TABLE (
  user_id UUID,
  wallet_address TEXT,
  awarded_amount NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_signup_bonus NUMERIC := 100.0;
BEGIN
  -- Loop through all users
  FOR v_user IN 
    SELECT u.id, u.wallet_address, u.rzc_balance
    FROM wallet_users u
    WHERE NOT EXISTS (
      SELECT 1 
      FROM wallet_rzc_transactions t 
      WHERE t.user_id = u.id 
      AND t.type = 'signup_bonus'
    )
  LOOP
    BEGIN
      -- Award signup bonus
      PERFORM award_rzc_tokens(
        v_user.id,
        v_signup_bonus,
        'signup_bonus',
        'Retroactive signup bonus',
        jsonb_build_object('retroactive', true)
      );
      
      -- Return success
      user_id := v_user.id;
      wallet_address := v_user.wallet_address;
      awarded_amount := v_signup_bonus;
      status := 'SUCCESS';
      RETURN NEXT;
      
    EXCEPTION WHEN OTHERS THEN
      -- Return error
      user_id := v_user.id;
      wallet_address := v_user.wallet_address;
      awarded_amount := 0;
      status := 'ERROR: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION award_retroactive_signup_bonuses IS 'Awards signup bonuses to existing users who created accounts before RZC system was implemented';

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on RZC transactions table
ALTER TABLE wallet_rzc_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own RZC transactions
CREATE POLICY "Users can view own RZC transactions"
ON wallet_rzc_transactions
FOR SELECT
USING (true);  -- Allow all reads for now (can be restricted later)

-- Policy: Only database functions can insert RZC transactions
-- This prevents direct manipulation from frontend
CREATE POLICY "Only functions can insert RZC transactions"
ON wallet_rzc_transactions
FOR INSERT
WITH CHECK (false);  -- Prevent direct inserts (must use award_rzc_tokens function)

-- ============================================================================
-- STEP 7: CREATE HELPER VIEWS (OPTIONAL)
-- ============================================================================

-- View: RZC transaction summary by type
CREATE OR REPLACE VIEW rzc_transaction_summary AS
SELECT 
  type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount
FROM wallet_rzc_transactions
GROUP BY type
ORDER BY total_amount DESC;

COMMENT ON VIEW rzc_transaction_summary IS 'Summary statistics of RZC transactions by type';

-- View: Top RZC holders
CREATE OR REPLACE VIEW top_rzc_holders AS
SELECT 
  u.id,
  u.wallet_address,
  u.name,
  u.rzc_balance,
  r.total_referrals,
  r.rank,
  u.created_at
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
ORDER BY u.rzc_balance DESC
LIMIT 100;

COMMENT ON VIEW top_rzc_holders IS 'Top 100 users by RZC balance';

-- View: Recent RZC activity
CREATE OR REPLACE VIEW recent_rzc_activity AS
SELECT 
  t.id,
  t.user_id,
  u.wallet_address,
  u.name,
  t.type,
  t.amount,
  t.balance_after,
  t.description,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 100;

COMMENT ON VIEW recent_rzc_activity IS 'Most recent 100 RZC transactions across all users';

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Check if migration was successful
DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_table_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_user_count INTEGER;
  v_transaction_count INTEGER;
BEGIN
  -- Check if rzc_balance column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'wallet_users' 
    AND column_name = 'rzc_balance'
  ) INTO v_column_exists;
  
  -- Check if wallet_rzc_transactions table exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'wallet_rzc_transactions'
  ) INTO v_table_exists;
  
  -- Check if award_rzc_tokens function exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.routines 
    WHERE routine_name = 'award_rzc_tokens'
  ) INTO v_function_exists;
  
  -- Count users with RZC balance
  SELECT COUNT(*) 
  FROM wallet_users 
  WHERE rzc_balance > 0 
  INTO v_user_count;
  
  -- Count RZC transactions
  SELECT COUNT(*) 
  FROM wallet_rzc_transactions 
  INTO v_transaction_count;
  
  -- Print results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RZC MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'rzc_balance column exists: %', v_column_exists;
  RAISE NOTICE 'wallet_rzc_transactions table exists: %', v_table_exists;
  RAISE NOTICE 'award_rzc_tokens function exists: %', v_function_exists;
  RAISE NOTICE 'Users with RZC balance: %', v_user_count;
  RAISE NOTICE 'Total RZC transactions: %', v_transaction_count;
  RAISE NOTICE '========================================';
  
  IF v_column_exists AND v_table_exists AND v_function_exists THEN
    RAISE NOTICE '✅ RZC MIGRATION SUCCESSFUL!';
  ELSE
    RAISE WARNING '⚠️ RZC MIGRATION INCOMPLETE - Check errors above';
  END IF;
END $$;

-- ============================================================================
-- STEP 9: OPTIONAL - AWARD RETROACTIVE BONUSES
-- ============================================================================

-- Uncomment the following line to award signup bonuses to existing users
-- This will give 100 RZC to all users who don't have a signup_bonus transaction

-- SELECT * FROM award_retroactive_signup_bonuses();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Display summary
SELECT 
  'RZC Migration Complete' as status,
  (SELECT COUNT(*) FROM wallet_users) as total_users,
  (SELECT COUNT(*) FROM wallet_users WHERE rzc_balance > 0) as users_with_rzc,
  (SELECT SUM(rzc_balance) FROM wallet_users) as total_rzc_in_circulation,
  (SELECT COUNT(*) FROM wallet_rzc_transactions) as total_transactions;
