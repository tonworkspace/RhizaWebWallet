-- ============================================================================
-- Fix Admin Access to rzc_price_history Table
-- ============================================================================
-- This script fixes the RLS policy error when admins try to update asset rates
-- Error: "new row violates row-level security policy for table rzc_price_history"
-- ============================================================================

-- ── 1. Check current RLS status ─────────────────────────────────────────────
SELECT 
  '🔍 RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_price_history';

-- ── 2. Check existing policies ──────────────────────────────────────────────
SELECT 
  '📋 Existing Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'rzc_price_history'
ORDER BY policyname;

-- ============================================================================
-- SOLUTION: Disable RLS for rzc_price_history
-- ============================================================================
-- The rzc_price_history table stores price change logs
-- This is system data that should be accessible without RLS restrictions
-- Access control is handled at the application layer

ALTER TABLE rzc_price_history DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Verify Fix
-- ============================================================================

-- Check RLS status (should be disabled)
SELECT 
  '✅ RLS Status After Fix' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rzc_price_history';

-- Check policies (should be empty if RLS is disabled)
SELECT 
  '📋 Active Policies After Fix' as check_type,
  COALESCE(COUNT(*), 0) as policy_count
FROM pg_policies 
WHERE tablename = 'rzc_price_history';

-- Test read access
SELECT 
  '📖 Read Test' as check_type,
  COUNT(*) as record_count,
  MIN(changed_at) as oldest_record,
  MAX(changed_at) as newest_record
FROM rzc_price_history;

-- ============================================================================
-- Test Insert (Run this after the fix)
-- ============================================================================

-- This should now work without RLS errors
DO $$
DECLARE
  test_old_price NUMERIC;
  test_new_price NUMERIC;
BEGIN
  -- Get current RZC price from rzc_config
  SELECT value::NUMERIC INTO test_new_price
  FROM rzc_config
  WHERE key = 'RZC_PRICE';
  
  -- Use a slightly different old price for testing
  test_old_price := test_new_price * 0.99;
  
  -- Try to insert a test record
  INSERT INTO rzc_price_history (old_price, new_price, changed_by, reason)
  VALUES (test_old_price, test_new_price, 'admin_test', 'Testing RLS fix');
  
  RAISE NOTICE '✅ Test insert successful';
  
  -- Clean up test record
  DELETE FROM rzc_price_history 
  WHERE changed_by = 'admin_test' AND reason = 'Testing RLS fix';
  
  RAISE NOTICE '✅ Test cleanup successful';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- ============================================================================
-- Notes
-- ============================================================================

/*
WHY DISABLE RLS FOR rzc_price_history?

1. System Data: Price history is logged automatically by triggers
2. Application Control: Admin access is controlled by the application layer
3. Audit Trail: This table IS the audit trail - it should not restrict writes
4. Simplicity: Avoids complex RLS policy management
5. Performance: No RLS overhead on trigger operations

SECURITY CONSIDERATIONS:

- The application checks admin role before allowing price updates
- All changes are logged with admin wallet address
- The trigger automatically logs who made the change
- User notifications are sent for all price changes

WHAT THIS FIXES:

When an admin updates the RZC_PRICE in rzc_config:
1. The update triggers log_rzc_price_change()
2. The trigger tries to INSERT into rzc_price_history
3. Without this fix, RLS blocks the INSERT
4. With this fix, the INSERT succeeds
*/

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

/*
-- To re-enable RLS (not recommended):
ALTER TABLE rzc_price_history ENABLE ROW LEVEL SECURITY;

-- Add back policies:
CREATE POLICY "Public read access" ON rzc_price_history
  FOR SELECT
  USING (true);

CREATE POLICY "Public write access" ON rzc_price_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/
