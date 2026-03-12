-- ============================================================================
-- DISABLE RLS FOR WALLET MIGRATIONS (Quick Fix)
-- ============================================================================
-- This disables Row Level Security for the wallet_migrations table
-- Use this if you're handling authentication at the application level
-- ============================================================================

-- Disable RLS on wallet_migrations table
ALTER TABLE wallet_migrations DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'wallet_migrations';

-- Should show: rowsecurity = false

-- ============================================================================
-- TEST INSERT
-- ============================================================================

-- Test that inserts now work (replace with actual wallet address)
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
-- ) RETURNING *;

-- ============================================================================
-- SECURITY NOTE
-- ============================================================================
-- 
-- With RLS disabled, the table is accessible to all authenticated users.
-- Make sure your application layer:
-- 
-- 1. Validates user identity before allowing operations
-- 2. Filters queries to only show user's own data
-- 3. Restricts admin operations to admin users only
-- 
-- To re-enable RLS later:
-- ALTER TABLE wallet_migrations ENABLE ROW LEVEL SECURITY;
-- 
-- Then create appropriate policies based on your auth system
-- 
-- ============================================================================

COMMENT ON TABLE wallet_migrations IS 'RLS disabled - security handled at application layer';
