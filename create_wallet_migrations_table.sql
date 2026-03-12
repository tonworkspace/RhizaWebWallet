-- ============================================================================
-- WALLET MIGRATION SYSTEM
-- ============================================================================
-- This system allows users to migrate their RZC balance from pre-mine season
-- wallets to mainnet wallets. Admins review and approve migration requests.
-- ============================================================================

-- Create wallet_migrations table
CREATE TABLE IF NOT EXISTS wallet_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  telegram_username TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  available_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
  claimable_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
  total_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  
  -- Indexes for performance
  CONSTRAINT wallet_migrations_wallet_address_key UNIQUE (wallet_address)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_migrations_wallet_address ON wallet_migrations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_migrations_status ON wallet_migrations(status);
CREATE INDEX IF NOT EXISTS idx_wallet_migrations_created_at ON wallet_migrations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE wallet_migrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own migration requests
CREATE POLICY "Users can view own migrations"
  ON wallet_migrations
  FOR SELECT
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Users can insert their own migration requests
CREATE POLICY "Users can create own migrations"
  ON wallet_migrations
  FOR INSERT
  WITH CHECK (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Admins can view all migrations (you'll need to adjust this based on your admin role system)
CREATE POLICY "Admins can view all migrations"
  ON wallet_migrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- Admins can update migrations
CREATE POLICY "Admins can update migrations"
  ON wallet_migrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallet_migrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_wallet_migrations_updated_at ON wallet_migrations;
CREATE TRIGGER trigger_update_wallet_migrations_updated_at
  BEFORE UPDATE ON wallet_migrations
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_migrations_updated_at();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table was created successfully
SELECT 
  'wallet_migrations table created' as status,
  COUNT(*) as row_count
FROM wallet_migrations;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wallet_migrations'
ORDER BY ordinal_position;

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Get all pending migrations
-- SELECT * FROM wallet_migrations WHERE status = 'pending' ORDER BY created_at DESC;

-- Get migration statistics
-- SELECT 
--   status,
--   COUNT(*) as count,
--   SUM(total_balance) as total_rzc
-- FROM wallet_migrations
-- GROUP BY status;

-- Get recent migrations
-- SELECT 
--   wallet_address,
--   telegram_username,
--   total_balance,
--   status,
--   created_at
-- FROM wallet_migrations
-- ORDER BY created_at DESC
-- LIMIT 10;

-- ============================================================================
-- ADMIN NOTES
-- ============================================================================
-- 
-- To approve a migration:
-- UPDATE wallet_migrations 
-- SET status = 'approved', 
--     admin_notes = 'Verified and approved',
--     reviewed_at = NOW(),
--     reviewed_by = 'admin_wallet_address'
-- WHERE id = 'migration_id';
--
-- To reject a migration:
-- UPDATE wallet_migrations 
-- SET status = 'rejected', 
--     admin_notes = 'Reason for rejection',
--     reviewed_at = NOW(),
--     reviewed_by = 'admin_wallet_address'
-- WHERE id = 'migration_id';
--
-- ============================================================================

COMMENT ON TABLE wallet_migrations IS 'Stores wallet migration requests from pre-mine to mainnet';
COMMENT ON COLUMN wallet_migrations.wallet_address IS 'Mainnet wallet address receiving the migration';
COMMENT ON COLUMN wallet_migrations.telegram_username IS 'User Telegram username from old wallet';
COMMENT ON COLUMN wallet_migrations.mobile_number IS 'User mobile number for verification';
COMMENT ON COLUMN wallet_migrations.available_balance IS 'Available RZC balance in old wallet';
COMMENT ON COLUMN wallet_migrations.claimable_balance IS 'Claimable RZC balance in old wallet';
COMMENT ON COLUMN wallet_migrations.total_balance IS 'Total RZC to migrate (available + claimable)';
COMMENT ON COLUMN wallet_migrations.status IS 'Migration status: pending, approved, or rejected';
COMMENT ON COLUMN wallet_migrations.admin_notes IS 'Admin notes about the migration decision';
COMMENT ON COLUMN wallet_migrations.reviewed_by IS 'Wallet address of admin who reviewed';
