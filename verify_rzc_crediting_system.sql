-- ============================================================================
-- RZC CREDITING SYSTEM VERIFICATION
-- ============================================================================
-- This script verifies that RZC tokens are properly credited after package purchase
-- Run this in Supabase SQL Editor to check the system
-- ============================================================================

-- Step 1: Check if award_rzc_tokens function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'award_rzc_tokens';

-- Expected: Should return 1 row showing the function exists


-- Step 2: Check wallet_users table structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'wallet_users'
  AND column_name IN ('id', 'wallet_address', 'rzc_balance', 'is_activated')
ORDER BY ordinal_position;

-- Expected: Should show id, wallet_address, rzc_balance, is_activated columns


-- Step 3: Check rzc_transactions table structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rzc_transactions'
ORDER BY ordinal_position;

-- Expected: Should show all transaction tracking columns


-- Step 4: Test the award_rzc_tokens function with a test user
-- ============================================================================
-- IMPORTANT: Replace 'YOUR_TEST_WALLET_ADDRESS' with an actual test wallet address

DO $$
DECLARE
  v_user_id UUID;
  v_initial_balance NUMERIC;
  v_final_balance NUMERIC;
  v_test_amount NUMERIC := 100;
BEGIN
  -- Get a test user (replace with your test wallet address)
  SELECT id, rzc_balance INTO v_user_id, v_initial_balance
  FROM wallet_users
  WHERE wallet_address = 'YOUR_TEST_WALLET_ADDRESS' -- REPLACE THIS
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ Test user not found. Please replace YOUR_TEST_WALLET_ADDRESS with a real wallet address';
    RETURN;
  END IF;

  RAISE NOTICE '📊 Initial balance: %', v_initial_balance;

  -- Award test RZC tokens
  PERFORM award_rzc_tokens(
    v_user_id,
    v_test_amount,
    'test_credit',
    'Test RZC crediting system',
    jsonb_build_object('test', true, 'timestamp', NOW())
  );

  -- Get updated balance
  SELECT rzc_balance INTO v_final_balance
  FROM wallet_users
  WHERE id = v_user_id;

  RAISE NOTICE '📊 Final balance: %', v_final_balance;
  RAISE NOTICE '✅ Balance increased by: %', (v_final_balance - v_initial_balance);

  IF (v_final_balance - v_initial_balance) = v_test_amount THEN
    RAISE NOTICE '✅ RZC CREDITING WORKS CORRECTLY!';
  ELSE
    RAISE NOTICE '❌ RZC CREDITING FAILED - Expected increase: %, Actual increase: %', 
      v_test_amount, (v_final_balance - v_initial_balance);
  END IF;

END $$;


-- Step 5: Check recent RZC transactions
-- ============================================================================
SELECT 
  rt.id,
  wu.wallet_address,
  rt.amount,
  rt.type,
  rt.description,
  rt.metadata,
  rt.created_at
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
ORDER BY rt.created_at DESC
LIMIT 10;

-- Expected: Should show recent RZC transactions including test transaction


-- Step 6: Verify package purchase transaction types
-- ============================================================================
SELECT 
  type,
  COUNT(*) as count,
  SUM(amount) as total_rzc
FROM rzc_transactions
WHERE type IN ('package_purchase', 'activation_bonus', 'test_credit')
GROUP BY type
ORDER BY count DESC;

-- Expected: Should show counts for each transaction type


-- Step 7: Check for any failed transactions (if error logging exists)
-- ============================================================================
SELECT 
  wu.wallet_address,
  rt.type,
  rt.amount,
  rt.description,
  rt.metadata,
  rt.created_at
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
WHERE rt.metadata->>'error' IS NOT NULL
  OR rt.metadata->>'failed' = 'true'
ORDER BY rt.created_at DESC
LIMIT 10;

-- Expected: Should return 0 rows if no errors


-- Step 8: Verify RZC balance consistency
-- ============================================================================
-- Check if calculated balance matches stored balance
SELECT 
  wu.wallet_address,
  wu.rzc_balance as stored_balance,
  COALESCE(SUM(rt.amount), 0) as calculated_balance,
  (wu.rzc_balance - COALESCE(SUM(rt.amount), 0)) as difference
FROM wallet_users wu
LEFT JOIN rzc_transactions rt ON wu.id = rt.user_id
WHERE wu.is_activated = true
GROUP BY wu.id, wu.wallet_address, wu.rzc_balance
HAVING ABS(wu.rzc_balance - COALESCE(SUM(rt.amount), 0)) > 0.01
ORDER BY difference DESC
LIMIT 10;

-- Expected: Should return 0 rows if all balances are consistent


-- Step 9: Check activation bonus distribution
-- ============================================================================
SELECT 
  COUNT(DISTINCT wu.id) as activated_users,
  COUNT(DISTINCT rt.user_id) as users_with_activation_bonus,
  (COUNT(DISTINCT wu.id) - COUNT(DISTINCT rt.user_id)) as missing_bonus_count
FROM wallet_users wu
LEFT JOIN rzc_transactions rt ON wu.id = rt.user_id 
  AND rt.type = 'activation_bonus'
WHERE wu.is_activated = true;

-- Expected: missing_bonus_count should be 0 or small


-- Step 10: Summary Report
-- ============================================================================
SELECT 
  '=== RZC CREDITING SYSTEM SUMMARY ===' as report;

SELECT 
  'Total Activated Users' as metric,
  COUNT(*) as value
FROM wallet_users
WHERE is_activated = true
UNION ALL
SELECT 
  'Total RZC Distributed' as metric,
  SUM(amount)::TEXT as value
FROM rzc_transactions
UNION ALL
SELECT 
  'Total Transactions' as metric,
  COUNT(*)::TEXT as value
FROM rzc_transactions
UNION ALL
SELECT 
  'Average RZC per User' as metric,
  ROUND(AVG(rzc_balance), 2)::TEXT as value
FROM wallet_users
WHERE is_activated = true
UNION ALL
SELECT 
  'Users with RZC Balance > 0' as metric,
  COUNT(*)::TEXT as value
FROM wallet_users
WHERE rzc_balance > 0;


-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- If RZC is not being credited, check these:

-- 1. Check if function has proper permissions
SELECT 
  routine_name,
  routine_schema,
  security_type
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens';

-- 2. Check RLS policies on wallet_users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'wallet_users';

-- 3. Check RLS policies on rzc_transactions table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rzc_transactions';


-- ============================================================================
-- MANUAL TEST: Award RZC to Specific User
-- ============================================================================
-- Use this to manually test RZC crediting for a specific user
-- Replace the values below with actual data

/*
-- Step 1: Get user ID
SELECT id, wallet_address, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';

-- Step 2: Award RZC (replace USER_ID with actual UUID)
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  1000, -- amount
  'package_purchase',
  'Bronze Package purchase',
  jsonb_build_object(
    'package_id', 'starter-100',
    'package_name', 'Bronze Package',
    'price_usd', 100
  )
);

-- Step 3: Verify balance updated
SELECT id, wallet_address, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'YOUR_WALLET_ADDRESS';

-- Step 4: Check transaction was recorded
SELECT * FROM rzc_transactions 
WHERE user_id = 'USER_ID'::UUID 
ORDER BY created_at DESC 
LIMIT 5;
*/
