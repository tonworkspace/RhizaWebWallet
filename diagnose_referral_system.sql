-- ============================================================================
-- REFERRAL SYSTEM DIAGNOSTIC QUERIES
-- Run these queries in Supabase SQL Editor to diagnose referral issues
-- 
-- IMPORTANT: wallet_rzc_transactions uses 'description' column, NOT 'source'
-- ============================================================================

-- ============================================================================
-- 1. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================================================
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'wallet_referrals' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- Expected: Should show FK from user_id and referrer_id to wallet_users.id

-- ============================================================================
-- 2. CHECK ALL USERS AND THEIR REFERRAL DATA
-- ============================================================================
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.rzc_balance,
  u.referrer_code as used_referrer_code,
  u.created_at as user_created,
  r.referral_code as my_referral_code,
  r.referrer_id,
  r.total_referrals,
  r.total_earned,
  r.rank,
  ref_user.name as referrer_name,
  ref_user.wallet_address as referrer_address
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users ref_user ON r.referrer_id = ref_user.id
ORDER BY u.created_at DESC
LIMIT 50;

-- ============================================================================
-- 3. CHECK DOWNLINE FOR SPECIFIC USER
-- Replace 'USER_ID_HERE' with actual user ID from query above
-- ============================================================================
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.rzc_balance,
  u.is_active,
  r.total_referrals,
  r.referral_code,
  r.created_at as joined_at,
  EXTRACT(EPOCH FROM (NOW() - r.created_at))/3600 as hours_since_join
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'USER_ID_HERE'
ORDER BY r.created_at DESC;

-- ============================================================================
-- 4. CHECK RZC TRANSACTIONS
-- ============================================================================
SELECT 
  t.id,
  t.user_id,
  u.name,
  u.wallet_address,
  t.type,
  t.amount,
  t.balance_after,
  t.description,
  t.metadata,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 50;

-- ============================================================================
-- 5. CHECK REFERRAL BONUSES AWARDED
-- ============================================================================
SELECT 
  t.user_id,
  u.name,
  u.wallet_address,
  COUNT(*) as referral_bonus_count,
  SUM(t.amount) as total_referral_bonuses,
  MAX(t.created_at) as last_bonus_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'referral_bonus'
GROUP BY t.user_id, u.name, u.wallet_address
ORDER BY total_referral_bonuses DESC;

-- ============================================================================
-- 6. CHECK SIGNUP BONUSES AWARDED
-- ============================================================================
SELECT 
  t.user_id,
  u.name,
  u.wallet_address,
  t.amount,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'signup_bonus'
ORDER BY t.created_at DESC
LIMIT 50;

-- ============================================================================
-- 7. FIND USERS WITH REFERRALS BUT NO BONUSES
-- ============================================================================
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  r.total_referrals,
  r.total_earned,
  u.rzc_balance,
  COALESCE(bonus_count.count, 0) as actual_bonuses_received
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM wallet_rzc_transactions
  WHERE type = 'referral_bonus'
  GROUP BY user_id
) bonus_count ON u.id = bonus_count.user_id
WHERE r.total_referrals > 0
  AND (bonus_count.count IS NULL OR bonus_count.count < r.total_referrals)
ORDER BY r.total_referrals DESC;

-- ============================================================================
-- 8. CHECK REFERRAL EARNINGS TABLE
-- ============================================================================
SELECT 
  e.id,
  e.referral_id,
  r.user_id as referrer_user_id,
  ref_user.name as referrer_name,
  e.referred_user_id,
  new_user.name as new_user_name,
  e.amount,
  e.percentage,
  e.transaction_id,
  e.created_at
FROM wallet_referral_earnings e
LEFT JOIN wallet_referrals r ON e.referral_id = r.id
LEFT JOIN wallet_users ref_user ON r.user_id = ref_user.id
LEFT JOIN wallet_users new_user ON e.referred_user_id = new_user.id
ORDER BY e.created_at DESC
LIMIT 50;

-- ============================================================================
-- 9. CHECK FOR ORPHANED REFERRAL RECORDS
-- ============================================================================
-- Users in wallet_referrals but not in wallet_users
SELECT 
  r.id,
  r.user_id,
  r.referral_code,
  r.referrer_id,
  'User not found' as issue
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE u.id IS NULL;

-- ============================================================================
-- 10. SUMMARY STATISTICS
-- ============================================================================
SELECT 
  'Total Users' as metric,
  COUNT(*) as value
FROM wallet_users
UNION ALL
SELECT 
  'Users with Referral Codes',
  COUNT(*)
FROM wallet_referrals
UNION ALL
SELECT 
  'Users with Referrers',
  COUNT(*)
FROM wallet_referrals
WHERE referrer_id IS NOT NULL
UNION ALL
SELECT 
  'Total Referral Bonuses Awarded',
  COUNT(*)
FROM wallet_rzc_transactions
WHERE type = 'referral_bonus'
UNION ALL
SELECT 
  'Total Signup Bonuses Awarded',
  COUNT(*)
FROM wallet_rzc_transactions
WHERE type = 'signup_bonus'
UNION ALL
SELECT 
  'Total RZC in Circulation',
  SUM(rzc_balance)
FROM wallet_users;

-- ============================================================================
-- 11. CHECK award_rzc_tokens FUNCTION EXISTS
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens';

-- ============================================================================
-- FIX QUERIES (Run only if issues found)
-- ============================================================================

-- Add missing foreign keys (if not present)
-- ALTER TABLE wallet_referrals
-- ADD CONSTRAINT fk_wallet_referrals_user
-- FOREIGN KEY (user_id) REFERENCES wallet_users(id) ON DELETE CASCADE;

-- ALTER TABLE wallet_referrals
-- ADD CONSTRAINT fk_wallet_referrals_referrer
-- FOREIGN KEY (referrer_id) REFERENCES wallet_users(id) ON DELETE SET NULL;

-- Manually award missing referral bonuses (use with caution!)
-- SELECT award_rzc_tokens(
--   'REFERRER_USER_ID'::uuid,
--   50,
--   'referral_bonus',
--   'Manual referral bonus correction',
--   jsonb_build_object('referred_user_id', 'NEW_USER_ID', 'manual_correction', true)
-- );
