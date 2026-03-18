-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧪 BALANCE VERIFICATION SYSTEM TEST
-- ═══════════════════════════════════════════════════════════════════════════════
-- Test script to verify the balance verification system is working correctly

-- ─── 1. Check System Setup ──────────────────────────────────────────────────────
SELECT 'SYSTEM SETUP CHECK' as test_section;

-- Check if table exists
SELECT 
  'Table Check' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'balance_verification_requests'
  ) as table_exists;

-- Check if functions exist
SELECT 
  'Functions Check' as check_type,
  COUNT(*) as function_count,
  array_agg(routine_name) as function_names
FROM information_schema.routines 
WHERE routine_name LIKE '%balance_verification%';

-- Check RLS policies
SELECT 
  'RLS Policies Check' as check_type,
  COUNT(*) as policy_count,
  array_agg(policyname) as policy_names
FROM pg_policies 
WHERE tablename = 'balance_verification_requests';

-- Check storage bucket
SELECT 
  'Storage Bucket Check' as check_type,
  EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'verification-documents'
  ) as bucket_exists;

-- ─── 2. Check wallet_users Table Compatibility ─────────────────────────────────
SELECT 'WALLET_USERS COMPATIBILITY CHECK' as test_section;

-- Check if wallet_users table has required columns
SELECT 
  'wallet_users Columns' as check_type,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'id') as has_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'wallet_address') as has_wallet_address,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance') as has_rzc_balance,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'is_admin') as has_is_admin;

-- Check sample data
SELECT 
  'Sample Data' as check_type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE COALESCE(rzc_balance, 0) > 0) as users_with_balance,
  COUNT(*) FILTER (WHERE COALESCE(is_admin, false) = true) as admin_users
FROM wallet_users;

-- ─── 3. Test Function Calls (Safe Tests) ────────────────────────────────────────
SELECT 'FUNCTION TESTS' as test_section;

-- Test the verification setup function
SELECT 
  'Setup Verification' as test_type,
  verify_balance_verification_setup() as result;

-- ─── 4. Check Foreign Key Constraints ──────────────────────────────────────────
SELECT 'FOREIGN KEY CONSTRAINTS' as test_section;

SELECT 
  'FK Constraints' as check_type,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'balance_verification_requests';

-- ─── 5. Sample Query Test (Read-Only) ───────────────────────────────────────────
SELECT 'SAMPLE QUERIES' as test_section;

-- Test basic table structure
SELECT 
  'Table Structure' as test_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'balance_verification_requests'
ORDER BY ordinal_position;

-- ─── 6. Final Status Report ─────────────────────────────────────────────────────
SELECT 'FINAL STATUS REPORT' as test_section;

WITH setup_check AS (
  SELECT 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'balance_verification_requests') as table_ok,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%balance_verification%') >= 4 as functions_ok,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'balance_verification_requests') >= 4 as policies_ok,
    EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'verification-documents') as bucket_ok,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance') as wallet_users_ok
)
SELECT 
  'System Status' as status_type,
  CASE 
    WHEN table_ok AND functions_ok AND policies_ok AND bucket_ok AND wallet_users_ok 
    THEN '✅ ALL SYSTEMS READY'
    ELSE '❌ SETUP INCOMPLETE'
  END as overall_status,
  json_build_object(
    'table_created', table_ok,
    'functions_ready', functions_ok,
    'policies_active', policies_ok,
    'storage_ready', bucket_ok,
    'wallet_users_compatible', wallet_users_ok
  ) as details
FROM setup_check;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎯 TEST COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════