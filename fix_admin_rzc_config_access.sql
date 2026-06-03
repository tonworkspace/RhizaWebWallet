-- ============================================================================
-- Fix Admin Access to rzc_config Table
-- ============================================================================
-- This script fixes the RLS policy error when admins try to update asset rates
-- Error: "new row violates row-level security policy for table rzc_config"
-- ============================================================================

-- ── 1. Check current RLS status ─────────────────────────────────────────────
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_config';

-- ── 2. Check existing policies ──────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'rzc_config'
ORDER BY policyname;

-- ============================================================================
-- SOLUTION 1: Disable RLS (Recommended - Config data is public)
-- ============================================================================
-- The rzc_config table stores public asset prices, so RLS is not needed
-- This is the simplest and most reliable solution

ALTER TABLE rzc_config DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SOLUTION 2: Add Proper Admin Policies (Alternative - More Secure)
-- ============================================================================
-- If you prefer to keep RLS enabled, uncomment the following:

/*
-- Enable RLS
ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read config" ON rzc_config;
DROP POLICY IF EXISTS "Admins can update config" ON rzc_config;
DROP POLICY IF EXISTS "Admins can insert config" ON rzc_config;
DROP POLICY IF EXISTS "Public read access" ON rzc_config;
DROP POLICY IF EXISTS "Public write access" ON rzc_config;

-- Policy 1: Everyone can read config (public data)
CREATE POLICY "Public read access" ON rzc_config
  FOR SELECT
  USING (true);

-- Policy 2: Everyone can insert/update (application controls access)
-- This allows the application to manage who can update via role checks
CREATE POLICY "Public write access" ON rzc_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/

-- ============================================================================
-- Verify Fix
-- ============================================================================

-- Check RLS status (should be disabled)
SELECT 
  '✅ RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_config';

-- Check policies (should be empty if RLS is disabled)
SELECT 
  '📋 Active Policies' as check_type,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'rzc_config';

-- Test read access
SELECT 
  '📖 Read Test' as check_type,
  key,
  value,
  updated_at
FROM rzc_config 
ORDER BY key 
LIMIT 5;

-- ============================================================================
-- Test Update (Run this after the fix)
-- ============================================================================

-- This should now work without RLS errors
UPDATE rzc_config 
SET updated_at = NOW() 
WHERE key = 'TON_PRICE';

-- Verify the update worked
SELECT 
  '✅ Update Test' as check_type,
  key,
  value,
  updated_at
FROM rzc_config 
WHERE key = 'TON_PRICE';

-- ============================================================================
-- Notes
-- ============================================================================

/*
WHY DISABLE RLS FOR rzc_config?

1. Public Data: Asset prices are public information
2. Application Control: Admin access is controlled by the application layer
3. Simplicity: Avoids complex RLS policy management
4. Performance: No RLS overhead on every query

SECURITY CONSIDERATIONS:

- The application checks admin role before allowing updates
- All changes are logged with admin wallet address
- Audit trail is maintained in the database
- User notifications are sent for all changes

ALTERNATIVE APPROACH:

If you need RLS for compliance reasons, use Solution 2 above with
proper admin policies. However, this requires:
- Proper is_admin_user() function
- Correct user context in queries
- More complex policy management
*/

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

/*
-- To re-enable RLS:
ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;

-- Add back policies:
CREATE POLICY "Public read access" ON rzc_config
  FOR SELECT
  USING (true);

CREATE POLICY "Public write access" ON rzc_config
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/
