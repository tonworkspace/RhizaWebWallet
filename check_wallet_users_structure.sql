-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔍 WALLET_USERS TABLE STRUCTURE CHECK
-- ═══════════════════════════════════════════════════════════════════════════════
-- Quick diagnostic to understand your wallet_users table structure

SELECT 'WALLET_USERS TABLE ANALYSIS' as section;

-- ─── 1. Check if table exists ───────────────────────────────────────────────────
SELECT 
  'Table Existence' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wallet_users'
  ) as table_exists;

-- ─── 2. Show all columns ────────────────────────────────────────────────────────
SELECT 
  'Column Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_users'
ORDER BY ordinal_position;

-- ─── 3. Check specific columns we need ──────────────────────────────────────────
SELECT 
  'Required Columns Check' as check_type,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'id') as has_id,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'wallet_address') as has_wallet_address,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance') as has_rzc_balance,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'role') as has_role;

-- ─── 4. Check admin users (if any) ──────────────────────────────────────────────
SELECT 
  'Admin Users Check' as check_type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admin_users_by_role
FROM wallet_users;

-- ─── 5. Sample data (first 3 rows, safe columns only) ───────────────────────────
SELECT 
  'Sample Data' as check_type,
  id,
  LEFT(wallet_address, 8) || '...' as wallet_address_preview,
  COALESCE(role, 'no_role') as role,
  COALESCE(rzc_balance, 0) as rzc_balance,
  created_at
FROM wallet_users 
ORDER BY created_at DESC 
LIMIT 3;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 🎯 DIAGNOSTIC COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════