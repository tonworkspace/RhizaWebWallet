-- RhizaCore Wallet - Supabase Database Schema
-- This file contains all table definitions, policies, and functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: wallet_users
-- Stores user profiles linked to wallet addresses
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Indexes for wallet_users
CREATE INDEX IF NOT EXISTS idx_wallet_users_address ON wallet_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_users_referrer ON wallet_users(referrer_code);
CREATE INDEX IF NOT EXISTS idx_wallet_users_created ON wallet_users(created_at DESC);

-- ============================================================================
-- TABLE: wallet_transactions
-- Stores transaction history for all wallets
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'swap', 'stake', 'unstake')),
  amount TEXT NOT NULL,
  asset TEXT NOT NULL DEFAULT 'TON',
  to_address TEXT,
  from_address TEXT,
  tx_hash TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  fee TEXT,
  comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_address ON wallet_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_hash ON wallet_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

-- ============================================================================
-- TABLE: wallet_referrals
-- Stores referral system data
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES wallet_users(id) ON DELETE CASCADE,
  referrer_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  total_earned NUMERIC(20, 4) NOT NULL DEFAULT 0,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Core Node' CHECK (rank IN ('Core Node', 'Growth Node', 'Power Node', 'Master Node')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_referrals
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_user ON wallet_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_referrer ON wallet_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_code ON wallet_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallet_referrals_rank ON wallet_referrals(rank);

-- ============================================================================
-- TABLE: wallet_referral_earnings
-- Tracks individual referral earnings
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES wallet_transactions(id) ON DELETE SET NULL,
  amount NUMERIC(20, 4) NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_referral_earnings
CREATE INDEX IF NOT EXISTS idx_wallet_referral_earnings_referrer ON wallet_referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referral_earnings_referred ON wallet_referral_earnings(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_referral_earnings_created ON wallet_referral_earnings(created_at DESC);

-- ============================================================================
-- TABLE: wallet_analytics
-- Stores analytics events
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  event_name TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_analytics
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_user ON wallet_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_event ON wallet_analytics(event_name);
CREATE INDEX IF NOT EXISTS idx_wallet_analytics_created ON wallet_analytics(created_at DESC);

-- ============================================================================
-- TABLE: wallet_admin_audit
-- Stores admin action logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallet_admin_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_admin_audit
CREATE INDEX IF NOT EXISTS idx_wallet_admin_audit_admin ON wallet_admin_audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_wallet_admin_audit_target ON wallet_admin_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_admin_audit_created ON wallet_admin_audit(created_at DESC);

-- ============================================================================
-- FUNCTIONS
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
  RETURN (
    SELECT role = 'admin' FROM wallet_users 
    WHERE wallet_address = current_setting('app.wallet_address', true)
    LIMIT 1
  );
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

-- Function to count referrals
CREATE OR REPLACE FUNCTION count_referrals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update total_referrals count
  UPDATE wallet_referrals
  SET 
    total_referrals = (
      SELECT COUNT(*) FROM wallet_users 
      WHERE referrer_code = (
        SELECT referral_code FROM wallet_referrals WHERE user_id = NEW.referrer_id
      )
    ),
    updated_at = NOW()
  WHERE user_id = NEW.referrer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
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

-- Trigger to update last_login_at
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- Policies for wallet_users
CREATE POLICY "Users can view own profile"
  ON wallet_users FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true) OR is_wallet_admin());

CREATE POLICY "Users can update own profile"
  ON wallet_users FOR UPDATE
  USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own profile"
  ON wallet_users FOR INSERT
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Admins can manage all users"
  ON wallet_users FOR ALL
  USING (is_wallet_admin());

-- Policies for wallet_transactions
CREATE POLICY "Users can view own transactions"
  ON wallet_transactions FOR SELECT
  USING (wallet_address = current_setting('app.wallet_address', true) OR is_wallet_admin());

CREATE POLICY "Users can insert own transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Admins can manage all transactions"
  ON wallet_transactions FOR ALL
  USING (is_wallet_admin());

-- Policies for wallet_referrals
CREATE POLICY "Users can view own referral data"
  ON wallet_referrals FOR SELECT
  USING (user_id = get_wallet_user_id() OR is_wallet_admin());

CREATE POLICY "Users can view referral codes"
  ON wallet_referrals FOR SELECT
  USING (true); -- Anyone can view referral codes for validation

CREATE POLICY "Users can insert own referral data"
  ON wallet_referrals FOR INSERT
  WITH CHECK (user_id = get_wallet_user_id());

CREATE POLICY "Users can update own referral data"
  ON wallet_referrals FOR UPDATE
  USING (user_id = get_wallet_user_id());

-- Policies for wallet_referral_earnings
CREATE POLICY "Users can view own earnings"
  ON wallet_referral_earnings FOR SELECT
  USING (referrer_id = get_wallet_user_id() OR is_wallet_admin());

CREATE POLICY "System can insert earnings"
  ON wallet_referral_earnings FOR INSERT
  WITH CHECK (true); -- System-level inserts

-- Policies for wallet_analytics
CREATE POLICY "Users can insert own analytics"
  ON wallet_analytics FOR INSERT
  WITH CHECK (user_id = get_wallet_user_id() OR user_id IS NULL);

CREATE POLICY "Admins can view all analytics"
  ON wallet_analytics FOR SELECT
  USING (is_wallet_admin());

-- Policies for wallet_admin_audit
CREATE POLICY "Admins can view audit logs"
  ON wallet_admin_audit FOR SELECT
  USING (is_wallet_admin());

CREATE POLICY "Admins can insert audit logs"
  ON wallet_admin_audit FOR INSERT
  WITH CHECK (is_wallet_admin());

-- ============================================================================
-- VIEWS
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
-- INITIAL DATA
-- ============================================================================

-- Insert default admin user (optional - update with your wallet address)
-- INSERT INTO wallet_users (wallet_address, name, avatar, role)
-- VALUES ('YOUR_ADMIN_WALLET_ADDRESS', 'Admin', '👑', 'admin')
-- ON CONFLICT (wallet_address) DO NOTHING;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE ON wallet_users TO anon, authenticated;
GRANT SELECT, INSERT ON wallet_transactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON wallet_referrals TO anon, authenticated;
GRANT SELECT, INSERT ON wallet_referral_earnings TO anon, authenticated;
GRANT SELECT, INSERT ON wallet_analytics TO anon, authenticated;
GRANT SELECT, INSERT ON wallet_admin_audit TO authenticated;

-- Grant access to sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE wallet_users IS 'User profiles linked to TON wallet addresses';
COMMENT ON TABLE wallet_transactions IS 'Transaction history for all wallets';
COMMENT ON TABLE wallet_referrals IS 'Referral system data and statistics';
COMMENT ON TABLE wallet_referral_earnings IS 'Individual referral commission earnings';
COMMENT ON TABLE wallet_analytics IS 'Analytics and event tracking';
COMMENT ON TABLE wallet_admin_audit IS 'Admin action audit logs';

COMMENT ON FUNCTION get_wallet_user_id() IS 'Returns user ID from current wallet address context';
COMMENT ON FUNCTION is_wallet_admin() IS 'Checks if current user has admin role';
COMMENT ON FUNCTION update_referral_stats() IS 'Updates referral statistics when new earnings are added';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================

-- To apply this schema:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Paste this entire file
-- 4. Click "Run"
-- 5. Verify all tables and policies are created
