-- RhizaCore Wallet - Safe Migration Script
-- This script safely creates or updates database objects without errors

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DROP EXISTING TRIGGERS (if they exist)
-- ============================================================================
DROP TRIGGER IF EXISTS update_wallet_users_updated_at ON wallet_users;
DROP TRIGGER IF EXISTS update_wallet_referrals_updated_at ON wallet_referrals;
DROP TRIGGER IF EXISTS update_referral_stats_on_earning ON wallet_referral_earnings;

-- ============================================================================
-- DROP EXISTING FUNCTIONS (if they exist)
-- ============================================================================
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_referral_stats() CASCADE;
DROP FUNCTION IF EXISTS count_referrals() CASCADE;
DROP FUNCTION IF EXISTS update_last_login() CASCADE;
DROP FUNCTION IF EXISTS get_wallet_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_wallet_admin() CASCADE;

-- ============================================================================
-- DROP EXISTING VIEWS (if they exist)
-- ============================================================================
DROP VIEW IF EXISTS referral_leaderboard CASCADE;
DROP VIEW IF EXISTS user_transaction_summary CASCADE;

-- ============================================================================
-- CREATE OR UPDATE TABLES
-- ============================================================================

-- TABLE: wallet_users
CREATE TABLE IF NOT EXISTS wallet_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID,
  wallet_address TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT NOT NULL DEFAULT 'Rhiza User',
  avatar TEXT NOT NULL DEFAULT '🌱',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  referrer_code TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='wallet_users' AND column_name='last_login_at') THEN
    ALTER TABLE wallet_users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
END $$;

-- TABLE: wallet_transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'swap', 'stake', 'unstake')),
  amount TEXT NOT NULL,
  asset TEXT NOT NULL DEFAULT 'TON',
  to_address TEXT,
  from_address TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  fee TEXT,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='wallet_transactions' AND column_name='fee') THEN
    ALTER TABLE wallet_transactions ADD COLUMN fee TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='wallet_transactions' AND column_name='comment') THEN
    ALTER TABLE wallet_transactions ADD COLUMN comment TEXT;
  END IF;
END $$;

-- TABLE: wallet_referrals
CREATE TABLE IF NOT EXISTS wallet_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  referrer_id UUID,
  referral_code TEXT UNIQUE NOT NULL,
  total_earned NUMERIC(20, 4) NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Core Node' CHECK (rank IN ('Core Node', 'Growth Node', 'Power Node', 'Master Node')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='wallet_referrals' AND column_name='total_referrals') THEN
    ALTER TABLE wallet_referrals ADD COLUMN total_referrals INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- TABLE: wallet_referral_earnings
CREATE TABLE IF NOT EXISTS wallet_referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  transaction_id UUID,
  amount NUMERIC(20, 4) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_analytics
CREATE TABLE IF NOT EXISTS wallet_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  wallet_address TEXT,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE: wallet_admin_audit
CREATE TABLE IF NOT EXISTS wallet_admin_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID,
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES (IF NOT EXISTS)
-- ============================================================================

-- Indexes for wallet_users
CREATE INDEX IF NOT EXISTS idx_wallet_users_address ON wallet_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_users_referrer ON wallet_users(referrer_code);
CREATE INDEX IF NOT EXISTS idx_wallet_users_created ON wallet_users(created_at DESC);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_address ON wallet_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_hash ON wallet_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

-- Indexes for wallet_referrals
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_user ON wallet_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_referrer ON wallet_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_code ON wallet_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_rank ON wallet_referrals(rank);

-- Indexes for wallet_referral_earnings
CREATE INDEX IF NOT EXISTS idx_wallet_referral_earnings_referrer ON wallet_referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referral_earnings_referred ON wallet_referral_earnings(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referral_earnings_created ON wallet_referral_earnings(created_at DESC);

-- Indexes for wallet_analytics
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_user ON wallet_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_event ON wallet_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_created ON wallet_analytics(created_at DESC);

-- Indexes for wallet_admin_audit
CREATE INDEX IF NOT EXISTS idx_wallet_admin_audit_admin ON wallet_admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_wallet_admin_audit_target ON wallet_admin_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_admin_audit_created ON wallet_admin_audit(created_at DESC);

-- ============================================================================
-- CREATE FUNCTIONS
-- ============================================================================

-- Function to get current wallet user ID from wallet address
CREATE OR REPLACE FUNCTION get_wallet_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM wallet_users 
    WHERE wallet_address = current_setting('app.wallet_address', true)
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_wallet_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((
    SELECT role = 'admin' FROM wallet_users 
    WHERE wallet_address = current_setting('app.wallet_address', true)
    LIMIT 1
  ), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_earned for referrer
  UPDATE wallet_referrals
  SET 
    total_earned = total_earned + NEW.amount,
    updated_at = NOW()
  WHERE user_id = NEW.referrer_id;
  
  -- Update rank based on total_earned
  UPDATE wallet_referrals
  SET rank = CASE
    WHEN total_earned >= 2000 THEN 'Master Node'
    WHEN total_earned >= 500 THEN 'Power Node'
    WHEN total_earned >= 100 THEN 'Growth Node'
    ELSE 'Core Node'
  END
  WHERE user_id = NEW.referrer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_login
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Trigger to update updated_at on wallet_users
CREATE TRIGGER update_wallet_users_updated_at
  BEFORE UPDATE ON wallet_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on wallet_referrals
CREATE TRIGGER update_wallet_referrals_updated_at
  BEFORE UPDATE ON wallet_referrals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update referral stats on new earning
CREATE TRIGGER update_referral_stats_on_earning
  AFTER INSERT ON wallet_referral_earnings
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_stats();

-- ============================================================================
-- CREATE VIEWS
-- ============================================================================

-- View for referral leaderboard
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  r.referral_code,
  r.total_earned,
  r.total_referrals,
  r.rank,
  r.level
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.is_active = true
ORDER BY r.total_earned DESC, r.total_referrals DESC;

-- View for user transaction summary
CREATE OR REPLACE VIEW user_transaction_summary AS
SELECT 
  wallet_address,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN type = 'send' THEN 1 ELSE 0 END) as total_sent,
  SUM(CASE WHEN type = 'receive' THEN 1 ELSE 0 END) as total_received,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_transactions,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_transactions,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_transactions
FROM wallet_transactions
GROUP BY wallet_address;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE wallet_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_admin_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON wallet_users;
DROP POLICY IF EXISTS "Users can update own profile" ON wallet_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON wallet_users;
DROP POLICY IF EXISTS "Admins can manage all users" ON wallet_users;
DROP POLICY IF EXISTS "Users can view own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can view own referral data" ON wallet_referrals;
DROP POLICY IF EXISTS "Users can view referral codes" ON wallet_referrals;
DROP POLICY IF EXISTS "Users can insert own referral data" ON wallet_referrals;
DROP POLICY IF EXISTS "Users can update own referral data" ON wallet_referrals;
DROP POLICY IF EXISTS "Users can view own earnings" ON wallet_referral_earnings;
DROP POLICY IF EXISTS "System can insert earnings" ON wallet_referral_earnings;
DROP POLICY IF EXISTS "Users can insert own analytics" ON wallet_analytics;
DROP POLICY IF EXISTS "Admins can view all analytics" ON wallet_analytics;
DROP POLICY IF EXISTS "Admins can view audit logs" ON wallet_admin_audit;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON wallet_admin_audit;

-- Policies for wallet_users (Allow all operations for now - can be restricted later)
CREATE POLICY "Users can view own profile"
  ON wallet_users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON wallet_users FOR UPDATE
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON wallet_users FOR INSERT
  WITH CHECK (true);

-- Policies for wallet_transactions (Allow all operations for now)
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (true);

-- Policies for wallet_referrals (Allow all operations for now)
CREATE POLICY "Users can view own referral data"
  ON wallet_referrals FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own referral data"
  ON wallet_referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own referral data"
  ON wallet_referrals FOR UPDATE
  USING (true);

-- Policies for wallet_referral_earnings (Allow all operations for now)
CREATE POLICY "Users can view own earnings"
  ON wallet_referral_earnings FOR SELECT
  USING (true);

CREATE POLICY "System can insert earnings"
  ON wallet_referral_earnings FOR INSERT
  WITH CHECK (true);

-- Policies for wallet_analytics (Allow all operations for now)
CREATE POLICY "Users can insert own analytics"
  ON wallet_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all analytics"
  ON wallet_analytics FOR SELECT
  USING (true);

-- Policies for wallet_admin_audit (Allow all operations for now)
CREATE POLICY "Admins can view audit logs"
  ON wallet_admin_audit FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert audit logs"
  ON wallet_admin_audit FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT ALL ON wallet_users TO anon, authenticated;
GRANT ALL ON wallet_transactions TO anon, authenticated;
GRANT ALL ON wallet_referrals TO anon, authenticated;
GRANT ALL ON wallet_referral_earnings TO anon, authenticated;
GRANT ALL ON wallet_analytics TO anon, authenticated;
GRANT ALL ON wallet_admin_audit TO authenticated;

-- Grant access to sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database migration completed successfully!';
  RAISE NOTICE '📊 Tables created/updated: 6';
  RAISE NOTICE '🔧 Functions created: 4';
  RAISE NOTICE '⚡ Triggers created: 3';
  RAISE NOTICE '👁️ Views created: 2';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your database is ready to use!';
END $$;
