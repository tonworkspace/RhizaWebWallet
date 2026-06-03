-- ============================================================================
-- Fix All Admin RLS Issues - Complete Solution
-- ============================================================================
-- This script fixes RLS policy errors for admin operations
-- Errors fixed:
-- 1. "new row violates row-level security policy for table rzc_config"
-- 2. "new row violates row-level security policy for table rzc_price_history"
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════
-- PART 1: Check Current State
-- ══════════════════════════════════════════════════════════════════════════

SELECT '🔍 CHECKING CURRENT RLS STATUS' as step;

-- Check RLS status for both tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '⚠️ RLS Enabled (may cause issues)'
    ELSE '✅ RLS Disabled'
  END as status
FROM pg_tables 
WHERE tablename IN ('rzc_config', 'rzc_price_history')
ORDER BY tablename;

-- Check existing policies
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '📖 Read'
    WHEN cmd = 'INSERT' THEN '➕ Insert'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔓 All Operations'
    ELSE cmd
  END as operation_type
FROM pg_policies 
WHERE tablename IN ('rzc_config', 'rzc_price_history')
ORDER BY tablename, policyname;

-- ══════════════════════════════════════════════════════════════════════════
-- PART 2: Disable RLS on rzc_config
-- ══════════════════════════════════════════════════════════════════════════

SELECT '🔧 FIXING rzc_config TABLE' as step;

-- Disable RLS for rzc_config
ALTER TABLE rzc_config DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (they won't apply when RLS is disabled, but clean up anyway)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'rzc_config'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rzc_config', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

SELECT '✅ rzc_config RLS disabled' as result;

-- ══════════════════════════════════════════════════════════════════════════
-- PART 3: Disable RLS on rzc_price_history
-- ══════════════════════════════════════════════════════════════════════════

SELECT '🔧 FIXING rzc_price_history TABLE' as step;

-- Disable RLS for rzc_price_history
ALTER TABLE rzc_price_history DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'rzc_price_history'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rzc_price_history', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

SELECT '✅ rzc_price_history RLS disabled' as result;

-- ══════════════════════════════════════════════════════════════════════════
-- PART 4: Verify Fix
-- ══════════════════════════════════════════════════════════════════════════

SELECT '✅ VERIFICATION' as step;

-- Verify RLS is disabled
SELECT 
  '1. RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ Still Enabled'
    ELSE '✅ Disabled'
  END as status
FROM pg_tables 
WHERE tablename IN ('rzc_config', 'rzc_price_history')
ORDER BY tablename;

-- Verify no policies remain
SELECT 
  '2. Policy Count' as check_type,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ Policies still exist (but inactive)'
    ELSE '✅ No policies'
  END as status
FROM pg_policies 
WHERE tablename IN ('rzc_config', 'rzc_price_history')
GROUP BY tablename
ORDER BY tablename;

-- Test read access
SELECT 
  '3. Read Access Test' as check_type,
  'rzc_config' as table_name,
  COUNT(*) as record_count,
  '✅ Can read' as status
FROM rzc_config;

SELECT 
  '3. Read Access Test' as check_type,
  'rzc_price_history' as table_name,
  COUNT(*) as record_count,
  '✅ Can read' as status
FROM rzc_price_history;

-- ══════════════════════════════════════════════════════════════════════════
-- PART 5: Test Write Operations
-- ══════════════════════════════════════════════════════════════════════════

SELECT '🧪 TESTING WRITE OPERATIONS' as step;

-- Test 1: Update rzc_config
DO $$
DECLARE
  old_value TEXT;
  test_value TEXT;
BEGIN
  -- Save current value
  SELECT value INTO old_value FROM rzc_config WHERE key = 'TON_PRICE';
  
  -- Try to update
  UPDATE rzc_config 
  SET updated_at = NOW() 
  WHERE key = 'TON_PRICE';
  
  RAISE NOTICE '✅ Test 1 PASSED: Can update rzc_config';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test 1 FAILED: Cannot update rzc_config - %', SQLERRM;
END $$;

-- Test 2: Insert into rzc_price_history
DO $$
DECLARE
  test_old_price NUMERIC := 0.001;
  test_new_price NUMERIC := 0.0011;
BEGIN
  -- Try to insert
  INSERT INTO rzc_price_history (old_price, new_price, changed_by, reason)
  VALUES (test_old_price, test_new_price, 'system_test', 'RLS fix verification test');
  
  RAISE NOTICE '✅ Test 2 PASSED: Can insert into rzc_price_history';
  
  -- Clean up test record
  DELETE FROM rzc_price_history 
  WHERE changed_by = 'system_test' AND reason = 'RLS fix verification test';
  
  RAISE NOTICE '✅ Test cleanup successful';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test 2 FAILED: Cannot insert into rzc_price_history - %', SQLERRM;
END $$;

-- Test 3: Trigger test (update RZC_PRICE to trigger price history logging)
DO $$
DECLARE
  old_price NUMERIC;
  new_price NUMERIC;
  history_count_before INT;
  history_count_after INT;
BEGIN
  -- Get current price
  SELECT value::NUMERIC INTO old_price FROM rzc_config WHERE key = 'RZC_PRICE';
  
  -- Count history records before
  SELECT COUNT(*) INTO history_count_before FROM rzc_price_history;
  
  -- Update price (this should trigger the log_rzc_price_change function)
  new_price := old_price * 1.001; -- Tiny change for testing
  UPDATE rzc_config 
  SET value = new_price::TEXT,
      updated_at = NOW()
  WHERE key = 'RZC_PRICE';
  
  -- Count history records after
  SELECT COUNT(*) INTO history_count_after FROM rzc_price_history;
  
  IF history_count_after > history_count_before THEN
    RAISE NOTICE '✅ Test 3 PASSED: Trigger successfully logged price change';
  ELSE
    RAISE NOTICE '⚠️ Test 3 WARNING: Trigger did not log price change (trigger may not exist)';
  END IF;
  
  -- Restore original price
  UPDATE rzc_config 
  SET value = old_price::TEXT,
      updated_at = NOW()
  WHERE key = 'RZC_PRICE';
  
  -- Remove test history record
  DELETE FROM rzc_price_history 
  WHERE changed_at > NOW() - INTERVAL '1 minute'
  AND old_price = old_price
  AND new_price = new_price;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test 3 FAILED: Trigger test failed - %', SQLERRM;
END $$;

-- ══════════════════════════════════════════════════════════════════════════
-- PART 6: Summary
-- ══════════════════════════════════════════════════════════════════════════

SELECT '📊 SUMMARY' as step;

SELECT 
  '✅ FIX COMPLETE' as status,
  'Both rzc_config and rzc_price_history tables now have RLS disabled' as message,
  'Admin operations should work without RLS errors' as result;

-- ══════════════════════════════════════════════════════════════════════════
-- NOTES
-- ══════════════════════════════════════════════════════════════════════════

/*
WHY DISABLE RLS FOR THESE TABLES?

1. rzc_config:
   - Stores public configuration data (asset prices)
   - Access control is handled at application layer
   - Admin role is checked before allowing updates
   - All changes are logged with admin wallet address

2. rzc_price_history:
   - Audit log table for price changes
   - Written automatically by database triggers
   - Should not restrict writes from triggers
   - Access control is handled at application layer

SECURITY CONSIDERATIONS:

✅ Application-level security:
   - Admin role verification in adminService.ts
   - Wallet address validation
   - User notifications for all changes
   - Audit trail maintained

✅ Database-level security:
   - Triggers log all changes automatically
   - Timestamps track when changes occurred
   - changed_by field tracks who made changes

❌ RLS is NOT needed because:
   - These are not user-specific tables
   - No row-level access control required
   - Application handles authorization
   - Triggers need unrestricted write access

WHAT THIS FIXES:

Before: Admin updates RZC_PRICE → Trigger tries to log → RLS blocks → Error
After:  Admin updates RZC_PRICE → Trigger logs successfully → No error

ROLLBACK:

If you need to re-enable RLS (not recommended):

ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE rzc_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON rzc_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access" ON rzc_price_history FOR ALL USING (true) WITH CHECK (true);
*/
