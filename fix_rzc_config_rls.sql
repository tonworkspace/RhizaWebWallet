-- ============================================================================
-- Fix RLS Policies for rzc_config Table
-- Allows admins to update asset rates
-- ============================================================================

-- ── 1. Check current RLS status ────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_config';

-- ── 2. Check existing policies ─────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'rzc_config'
ORDER BY policyname;

-- ============================================================================
-- FIX: Add Admin Policies for rzc_config
-- ============================================================================

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  current_address TEXT;
BEGIN
  -- Get current user's wallet address from session
  current_address := current_setting('app.current_user_address', TRUE);
  
  IF current_address IS NULL OR current_address = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Get the role from wallet_users table
  SELECT role INTO user_role
  FROM wallet_users
  WHERE wallet_address = current_address;
  
  -- Check if user is admin or super_admin
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read config" ON rzc_config;
DROP POLICY IF EXISTS "Admins can update config" ON rzc_config;
DROP POLICY IF EXISTS "Admins can insert config" ON rzc_config;
DROP POLICY IF EXISTS "Service role can manage config" ON rzc_config;

-- Enable RLS on rzc_config table
ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can read config (public data)
CREATE POLICY "Anyone can read config" ON rzc_config
  FOR SELECT
  USING (true);

-- Policy 2: Admins can insert new config entries
CREATE POLICY "Admins can insert config" ON rzc_config
  FOR INSERT
  WITH CHECK (is_admin_user());

-- Policy 3: Admins can update existing config entries
CREATE POLICY "Admins can update config" ON rzc_config
  FOR UPDATE
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Policy 4: Service role can do everything (for backend operations)
CREATE POLICY "Service role can manage config" ON rzc_config
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ============================================================================
-- ALTERNATIVE: Simpler approach - Disable RLS for rzc_config
-- ============================================================================

-- If the above doesn't work, you can disable RLS entirely for this table
-- since config data is not sensitive and should be publicly readable anyway

-- Uncomment this if you want to disable RLS:
-- ALTER TABLE rzc_config DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test 1: Check if policies were created
SELECT 
  policyname,
  cmd as command,
  permissive
FROM pg_policies 
WHERE tablename = 'rzc_config'
ORDER BY policyname;

-- Test 2: Try to read config (should work for everyone)
SELECT * FROM rzc_config LIMIT 5;

-- Test 3: Try to update config (should work for admins)
-- Run this as an admin user:
/*
UPDATE rzc_config 
SET value = value 
WHERE key = 'TON_PRICE';
*/

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

-- If still getting RLS errors, check:

-- 1. Verify the is_admin_user() function works
SELECT is_admin_user();

-- 2. Check current session settings
SELECT 
  current_setting('app.current_user_address', TRUE) as current_address,
  current_setting('role', TRUE) as current_role;

-- 3. Verify admin user exists
SELECT wallet_address, role 
FROM wallet_users 
WHERE role IN ('admin', 'super_admin');

-- 4. Check if RLS is actually enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'rzc_config';

-- ============================================================================
-- QUICK FIX: Temporarily disable RLS for testing
-- ============================================================================

-- If you need to test immediately, disable RLS temporarily:
-- ALTER TABLE rzc_config DISABLE ROW LEVEL SECURITY;

-- Remember to re-enable it later:
-- ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
The error "new row violates row-level security policy" means:
1. RLS is enabled on rzc_config table
2. There's no policy allowing the current user to INSERT/UPDATE
3. The is_admin_user() function needs to properly identify admins

Solutions:
A. Add proper admin policies (recommended)
B. Disable RLS for rzc_config (simpler, but less secure)
C. Use service role key for admin operations (most secure)

For production, option A is recommended.
For quick testing, option B works fine since config data is public anyway.
*/

