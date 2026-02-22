-- RhizaCore Wallet - Simple Setup Script
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: CREATE TABLES
-- ============================================================================

-- TABLE: wallet_users
CREATE TABLE IF NOT EXISTS wallet_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID,
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT NOT NULL DEFAULT 'Rhiza User',
  avatar TEXT NOT NULL DEFAULT '🌱',
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  referrer_code TEXT,
  rzc_balance NUMERIC(20, 8) NOT NULL DEFAULT 100.0,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL DEFAULT 'TON',
  to_address TEXT,
  from_address TEXT,
  tx_hash TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_referrals
CREATE TABLE IF NOT EXISTS wallet_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES wallet_users(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  total_earned NUMERIC(20, 8) NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Core Node',
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_referral_earnings
CREATE TABLE IF NOT EXISTS wallet_referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_analytics
CREATE TABLE IF NOT EXISTS wallet_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_admin_audit
CREATE TABLE IF NOT EXISTS wallet_admin_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_reward_claims
CREATE TABLE IF NOT EXISTS wallet_reward_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  amount NUMERIC(20, 8) NOT NULL,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- TABLE: wallet_rzc_transactions
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

-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wallet_users_address ON wallet_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_users_referrer ON wallet_users(referrer_code);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_address ON wallet_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_hash ON wallet_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_code ON wallet_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_user ON wallet_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_user ON wallet_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_event ON wallet_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_wallet_reward_claims_user ON wallet_reward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_reward_claims_status ON wallet_reward_claims(status);
CREATE INDEX IF NOT EXISTS idx_wallet_rzc_transactions_user ON wallet_rzc_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_rzc_transactions_type ON wallet_rzc_transactions(type);

-- ============================================================================
-- STEP 3: CREATE FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get current wallet user ID
CREATE OR REPLACE FUNCTION get_wallet_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM wallet_users WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_wallet_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM wallet_users WHERE auth_user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_wallet_users_updated_at ON wallet_users;
CREATE TRIGGER update_wallet_users_updated_at
  BEFORE UPDATE ON wallet_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_wallet_referrals_updated_at ON wallet_referrals;
CREATE TRIGGER update_wallet_referrals_updated_at
  BEFORE UPDATE ON wallet_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE wallet_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_admin_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES
-- ============================================================================

-- wallet_users policies
DROP POLICY IF EXISTS "Users can view their own profile" ON wallet_users;
CREATE POLICY "Users can view their own profile"
  ON wallet_users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON wallet_users;
CREATE POLICY "Users can update their own profile"
  ON wallet_users FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON wallet_users;
CREATE POLICY "Users can insert their own profile"
  ON wallet_users FOR INSERT
  WITH CHECK (true);

-- wallet_transactions policies
DROP POLICY IF EXISTS "Users can view their own transactions" ON wallet_transactions;
CREATE POLICY "Users can view their own transactions"
  ON wallet_transactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON wallet_transactions;
CREATE POLICY "Users can insert their own transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (true);

-- wallet_referrals policies
DROP POLICY IF EXISTS "Users can view referral data" ON wallet_referrals;
CREATE POLICY "Users can view referral data"
  ON wallet_referrals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert referral data" ON wallet_referrals;
CREATE POLICY "Users can insert referral data"
  ON wallet_referrals FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update referral data" ON wallet_referrals;
CREATE POLICY "Users can update referral data"
  ON wallet_referrals FOR UPDATE
  USING (true);

-- wallet_analytics policies
DROP POLICY IF EXISTS "Anyone can insert analytics" ON wallet_analytics;
CREATE POLICY "Anyone can insert analytics"
  ON wallet_analytics FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view analytics" ON wallet_analytics;
CREATE POLICY "Anyone can view analytics"
  ON wallet_analytics FOR SELECT
  USING (true);

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'wallet_%'
ORDER BY table_name;


-- ============================================================================
-- ADDITIONAL FUNCTIONS FOR REFERRAL SYSTEM
-- ============================================================================

-- Function to increment referral count atomically
CREATE OR REPLACE FUNCTION increment_referral_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE wallet_referrals
  SET 
    total_referrals = total_referrals + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- Function to award RZC tokens
CREATE OR REPLACE FUNCTION award_rzc_tokens(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- Update user's RZC balance
  UPDATE wallet_users
  SET rzc_balance = rzc_balance + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;
  
  -- Record transaction
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
END;
$$ LANGUAGE plpgsql;
