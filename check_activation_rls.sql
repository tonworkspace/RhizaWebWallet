-- ============================================================================
-- Check RLS Policies on wallet_activations Table
-- Run this to diagnose why Admin Panel might not see activation data
-- ============================================================================

-- ── 1. Check if RLS is enabled ─────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'wallet_activations';

-- ── 2. List all policies on wallet_activations ────────────────────────────
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
WHERE tablename = 'wallet_activations'
ORDER BY policyname;

-- ── 3. Test direct query (should work if RLS is the issue) ────────────────
-- This bypasses RLS by using service role
SELECT 
  COUNT(*) as total_activations,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM wallet_activations;

-- ── 4. Test the exact query that Admin Panel uses ─────────────────────────
SELECT 
  wa.id,
  wa.wallet_address,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.ton_price_at_activation,
  wa.transaction_hash,
  wa.status,
  wa.completed_at,
  wa.created_at,
  wu.name,
  wu.email,
  wu.rzc_balance
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.wallet_address = wu.wallet_address
ORDER BY wa.completed_at DESC NULLS LAST
LIMIT 5;

-- ============================================================================
-- SOLUTION: Fix RLS Policies for Admin Access
-- ============================================================================

-- If RLS is blocking admin access, add an admin policy:

-- First, check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get the role from wallet_users table
  SELECT role INTO user_role
  FROM wallet_users
  WHERE wallet_address = current_setting('app.current_user_address', TRUE);
  
  RETURN user_role IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policy to wallet_activations
DROP POLICY IF EXISTS "Admins can view all activations" ON wallet_activations;
CREATE POLICY "Admins can view all activations" ON wallet_activations
  FOR SELECT 
  USING (
    -- Allow if user is admin
    is_admin_user()
    OR
    -- Or if viewing their own activation
    wallet_address = current_setting('app.current_user_address', TRUE)
  );

-- ============================================================================
-- ALTERNATIVE: Temporarily disable RLS for testing
-- ============================================================================

-- WARNING: Only use this for testing! Re-enable RLS after fixing the issue.

-- Disable RLS temporarily:
-- ALTER TABLE wallet_activations DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable:
-- ALTER TABLE wallet_activations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After applying the fix, verify admin can see activations:
SELECT 
  COUNT(*) as visible_activations
FROM wallet_activations;

-- Should return the same count as Query 3 above

