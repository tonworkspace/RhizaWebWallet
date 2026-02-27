-- ============================================================================
-- DIAGNOSTIC: Check Wallet Activation Schema Status
-- ============================================================================
-- Run this in Supabase SQL Editor to see what's already set up

-- 1. Check if wallet_activations table exists
SELECT 
  'wallet_activations table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'wallet_activations'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- 2. Check wallet_activations table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wallet_activations'
ORDER BY ordinal_position;

-- 3. Check if activation columns exist in wallet_users
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'wallet_users'
AND column_name IN ('is_activated', 'activated_at', 'activation_fee_paid')
ORDER BY column_name;

-- 4. Check RLS policies on wallet_activations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'wallet_activations';

-- 5. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'wallet_activations';

-- 6. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('activate_wallet', 'check_wallet_activation')
ORDER BY routine_name;

-- 7. Check function parameters for activate_wallet
SELECT 
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p 
  ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
AND r.routine_name = 'activate_wallet'
ORDER BY p.ordinal_position;

-- 8. Test if we can query wallet_activations (checks RLS SELECT policy)
SELECT 
  COUNT(*) as total_activations,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM wallet_activations;

-- 9. Check existing activation data
SELECT 
  id,
  wallet_address,
  activation_fee_ton,
  status,
  created_at,
  completed_at
FROM wallet_activations
ORDER BY created_at DESC
LIMIT 5;

-- 10. Check wallet_users activation status
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_activated = TRUE) as activated_users,
  COUNT(*) FILTER (WHERE is_activated = FALSE OR is_activated IS NULL) as not_activated
FROM wallet_users;
