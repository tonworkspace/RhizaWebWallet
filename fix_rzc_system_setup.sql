-- ============================================================================
-- FIX RZC TRANSACTIONS SYSTEM SETUP
-- ============================================================================
-- This script safely creates/updates the RZC system, handling existing objects
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create rzc_transactions table (safe version)
-- ============================================================================
DO $$ 
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rzc_transactions') THEN
    CREATE TABLE rzc_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL,
      amount NUMERIC NOT NULL CHECK (amount > 0),
      type TEXT NOT NULL,
      description TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ Created rzc_transactions table';
  ELSE
    RAISE NOTICE 'ℹ️ rzc_transactions table already exists';
  END IF;

  -- Add foreign key constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'rzc_transactions_user_id_fkey' 
    AND table_name = 'rzc_transactions'
  ) THEN
    ALTER TABLE rzc_transactions 
    ADD CONSTRAINT rzc_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Added foreign key constraint';
  ELSE
    RAISE NOTICE 'ℹ️ Foreign key constraint already exists';
  END IF;
END $$;

-- Create indexes (safe - will skip if exists)
CREATE INDEX IF NOT EXISTS idx_rzc_transactions_user_id ON rzc_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_rzc_transactions_type ON rzc_transactions(type);
CREATE INDEX IF NOT EXISTS idx_rzc_transactions_created_at ON rzc_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rzc_transactions_user_created ON rzc_transactions(user_id, created_at DESC);

COMMENT ON TABLE rzc_transactions IS 'Tracks all RZC token transactions';


-- Step 2: Add rzc_balance column to wallet_users (safe)
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' 
    AND column_name = 'rzc_balance'
  ) THEN
    ALTER TABLE wallet_users ADD COLUMN rzc_balance NUMERIC DEFAULT 0 NOT NULL;
    RAISE NOTICE '✅ Added rzc_balance column';
  ELSE
    RAISE NOTICE 'ℹ️ rzc_balance column already exists';
  END IF;
END $$;


-- Step 3: Create award_rzc_tokens function (always replace)
-- ============================================================================
CREATE OR REPLACE FUNCTION award_rzc_tokens(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM wallet_users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert transaction record
  INSERT INTO rzc_transactions (
    user_id,
    amount,
    type,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    p_type,
    p_description,
    COALESCE(p_metadata, '{}'::jsonb),
    NOW()
  );

  -- Update user balance atomically
  UPDATE wallet_users
  SET rzc_balance = rzc_balance + p_amount
  WHERE id = p_user_id;

  RAISE NOTICE 'Awarded % RZC to user % (type: %)', p_amount, p_user_id, p_type;
END;
$$;


-- Step 4: Create helper functions
-- ============================================================================
CREATE OR REPLACE FUNCTION get_rzc_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT rzc_balance INTO v_balance
  FROM wallet_users
  WHERE id = p_user_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;


-- Step 5: Enable RLS and create policies
-- ============================================================================
ALTER TABLE rzc_transactions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe)
DROP POLICY IF EXISTS "Users can view their own transactions" ON rzc_transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON rzc_transactions;
DROP POLICY IF EXISTS "Allow all operations for now" ON rzc_transactions;

-- Simple policy: Allow all operations for now (tighten later)
CREATE POLICY "Allow all operations for now"
ON rzc_transactions
FOR ALL
USING (true)
WITH CHECK (true);


-- Step 6: Create package_purchases table (safe)
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'package_purchases') THEN
    CREATE TABLE package_purchases (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
      package_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      package_tier TEXT NOT NULL,
      price_usd NUMERIC NOT NULL,
      activation_fee_usd NUMERIC DEFAULT 0,
      total_cost_usd NUMERIC NOT NULL,
      total_cost_ton NUMERIC NOT NULL,
      rzc_reward INTEGER NOT NULL,
      transaction_hash TEXT,
      network TEXT NOT NULL DEFAULT 'mainnet',
      metadata JSONB DEFAULT '{}'::jsonb,
      purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE '✅ Created package_purchases table';
  ELSE
    RAISE NOTICE 'ℹ️ package_purchases table already exists';
  END IF;
END $$;

-- Create indexes for package_purchases
CREATE INDEX IF NOT EXISTS idx_package_purchases_user_id ON package_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_package_purchases_purchased_at ON package_purchases(purchased_at DESC);
CREATE INDEX IF NOT EXISTS idx_package_purchases_package_tier ON package_purchases(package_tier);

-- Enable RLS
ALTER TABLE package_purchases ENABLE ROW LEVEL SECURITY;

-- Simple policy
DROP POLICY IF EXISTS "Allow all operations on purchases" ON package_purchases;
CREATE POLICY "Allow all operations on purchases"
ON package_purchases
FOR ALL
USING (true)
WITH CHECK (true);


-- Step 7: Verification
-- ============================================================================
DO $$
DECLARE
  v_tables_count INTEGER;
  v_functions_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_tables_count
  FROM information_schema.tables
  WHERE table_name IN ('rzc_transactions', 'package_purchases');

  -- Count functions
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines
  WHERE routine_name IN ('award_rzc_tokens', 'get_rzc_balance');

  -- Report
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║         RZC SYSTEM SETUP COMPLETE                             ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables: % / 2', v_tables_count;
  RAISE NOTICE '✅ Functions: % / 2', v_functions_count;
  RAISE NOTICE '';
  
  IF v_tables_count = 2 AND v_functions_count = 2 THEN
    RAISE NOTICE '🎉 SUCCESS! RZC system is ready to use!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test with: SELECT award_rzc_tokens(user_id, 100, ''test'', ''Test'');';
    RAISE NOTICE '2. Check balance: SELECT rzc_balance FROM wallet_users WHERE id = user_id;';
    RAISE NOTICE '3. View transactions: SELECT * FROM rzc_transactions WHERE user_id = user_id;';
  ELSE
    RAISE NOTICE '⚠️ Some components missing. Check errors above.';
  END IF;
  
  RAISE NOTICE '';
END $$;


-- Step 8: Quick test query (optional - comment out if not needed)
-- ============================================================================
-- Uncomment to test with first user in database
/*
DO $$
DECLARE
  v_user_id UUID;
  v_initial_balance NUMERIC;
  v_final_balance NUMERIC;
BEGIN
  -- Get first user
  SELECT id, rzc_balance INTO v_user_id, v_initial_balance
  FROM wallet_users
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with user: %', v_user_id;
    RAISE NOTICE 'Initial balance: %', v_initial_balance;
    
    -- Award test RZC
    PERFORM award_rzc_tokens(
      v_user_id,
      50,
      'test_credit',
      'System setup test',
      '{"test": true}'::jsonb
    );
    
    -- Check new balance
    SELECT rzc_balance INTO v_final_balance
    FROM wallet_users
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Final balance: %', v_final_balance;
    RAISE NOTICE 'Increase: %', (v_final_balance - v_initial_balance);
    
    IF (v_final_balance - v_initial_balance) = 50 THEN
      RAISE NOTICE '✅ TEST PASSED!';
    ELSE
      RAISE NOTICE '❌ TEST FAILED!';
    END IF;
  ELSE
    RAISE NOTICE 'No users found for testing';
  END IF;
END $$;
*/
