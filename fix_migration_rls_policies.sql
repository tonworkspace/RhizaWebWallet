-- ============================================================================
-- FIX WALLET MIGRATION RLS POLICIES
-- ============================================================================
-- This fixes the RLS policies to work without JWT authentication
-- and allows users to insert/view their own migrations
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own migrations" ON wallet_migrations;
DROP POLICY IF EXISTS "Users can create own migrations" ON wallet_migrations;
DROP POLICY IF EXISTS "Admins can view all migrations" ON wallet_migrations;
DROP POLICY IF EXISTS "Admins can update migrations" ON wallet_migrations;

-- ============================================================================
-- SIMPLIFIED RLS POLICIES (No JWT Required)
-- ============================================================================

-- Allow users to insert migrations (no authentication check on insert)
-- We validate wallet_address in the application layer
CREATE POLICY "Allow migration inserts"
  ON wallet_migrations
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their own migrations by wallet_address
CREATE POLICY "Users can view own migrations by address"
  ON wallet_migrations
  FOR SELECT
  USING (true);  -- Allow all reads for now, filter in application

-- Allow admins to update migrations (check admin role)
CREATE POLICY "Admins can update migrations by role"
  ON wallet_migrations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_users.wallet_address = wallet_migrations.wallet_address
      AND wallet_users.role = 'admin'
    )
  );

-- ============================================================================
-- ALTERNATIVE: DISABLE RLS (If policies still cause issues)
-- ============================================================================
-- Uncomment the line below if you want to disable RLS entirely
-- This is less secure but will work immediately

-- ALTER TABLE wallet_migrations DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'wallet_migrations';

-- Test insert (replace with actual wallet address)
-- INSERT INTO wallet_migrations (
--   wallet_address,
--   telegram_username,
--   mobile_number,
--   available_balance,
--   claimable_balance,
--   total_balance,
--   status
-- ) VALUES (
--   'EQTest123...',
--   '@testuser',
--   '+1234567890',
--   1000,
--   500,
--   1500,
--   'pending'
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Option 1: Use simplified policies (current approach)
-- - Allows all inserts
-- - Allows all selects
-- - Application layer handles filtering
-- 
-- Option 2: Disable RLS entirely
-- - Uncomment the ALTER TABLE line above
-- - Most permissive, least secure
-- - Good for development/testing
-- 
-- Option 3: Implement proper authentication
-- - Set up Supabase Auth
-- - Use JWT tokens
-- - Most secure, requires more setup
-- 
-- ============================================================================

COMMENT ON TABLE wallet_migrations IS 'Migration requests with simplified RLS policies';
