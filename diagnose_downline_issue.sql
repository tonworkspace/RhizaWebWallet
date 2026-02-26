-- ============================================================================
-- DIAGNOSE DOWNLINE ISSUE
-- Run these queries to find why downline is not showing
-- ============================================================================

-- ============================================================================
-- STEP 1: Find your user ID
-- Replace 'YOUR_WALLET_ADDRESS' with your actual wallet address
-- ============================================================================
SELECT 
  u.id as your_user_id,
  u.name,
  u.wallet_address,
  u.rzc_balance,
  r.referral_code as your_referral_code,
  r.total_referrals,
  r.referrer_id as who_referred_you
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.wallet_address = 'YOUR_WALLET_ADDRESS';

-- Copy the 'your_user_id' from the result above

-- ============================================================================
-- STEP 2: Check who you referred
-- Replace 'YOUR_USER_ID' with the ID from Step 1
-- ============================================================================
SELECT 
  'Checking referrals for user:' as step,
  'YOUR_USER_ID' as user_id;

SELECT 
  r.id as referral_record_id,
  r.user_id as referred_user_id,
  r.referrer_id as referrer_id_in_record,
  r.referral_code as their_referral_code,
  r.total_referrals as their_referral_count,
  r.created_at as when_they_joined,
  u.id as user_table_id,
  u.name as their_name,
  u.wallet_address as their_wallet,
  u.rzc_balance as their_balance,
  u.is_active as their_active_status
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'YOUR_USER_ID'
ORDER BY r.created_at DESC;

-- ============================================================================
-- STEP 3: Check if the relationship is correct
-- This should show 1 row if you have 1 referral
-- ============================================================================
SELECT 
  COUNT(*) as referral_count,
  COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as users_found,
  COUNT(CASE WHEN u.id IS NULL THEN 1 END) as orphaned_records
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'YOUR_USER_ID';

-- Expected: referral_count = 1, users_found = 1, orphaned_records = 0

-- ============================================================================
-- STEP 4: Check the referred user's details
-- ============================================================================
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.email,
  u.avatar,
  u.role,
  u.is_active,
  u.referrer_code as code_they_used,
  u.rzc_balance,
  u.created_at,
  r.referral_code as their_own_code,
  r.referrer_id as their_referrer,
  r.total_referrals as people_they_referred
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE r.referrer_id = 'YOUR_USER_ID';

-- ============================================================================
-- STEP 5: Check if bonuses were awarded
-- ============================================================================

-- Your referral bonuses
SELECT 
  'Your referral bonuses' as category,
  type,
  amount,
  description,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = 'YOUR_USER_ID'
  AND type = 'referral_bonus'
ORDER BY created_at DESC;

-- Their signup bonus
SELECT 
  'Their signup bonus' as category,
  t.type,
  t.amount,
  t.description,
  t.created_at,
  u.name,
  u.wallet_address
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.user_id IN (
  SELECT user_id FROM wallet_referrals WHERE referrer_id = 'YOUR_USER_ID'
)
  AND t.type = 'signup_bonus'
ORDER BY t.created_at DESC;

-- ============================================================================
-- STEP 6: Check notifications
-- ============================================================================
SELECT 
  type,
  title,
  message,
  is_read,
  priority,
  metadata,
  created_at
FROM wallet_notifications
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
SELECT 
  'DIAGNOSTIC SUMMARY' as section,
  '' as details
UNION ALL
SELECT 
  'Total users in system',
  COUNT(*)::text
FROM wallet_users
UNION ALL
SELECT 
  'Total referral records',
  COUNT(*)::text
FROM wallet_referrals
UNION ALL
SELECT 
  'Your referral count',
  total_referrals::text
FROM wallet_referrals
WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 
  'Actual downline records',
  COUNT(*)::text
FROM wallet_referrals
WHERE referrer_id = 'YOUR_USER_ID'
UNION ALL
SELECT 
  'Downline with user data',
  COUNT(*)::text
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'YOUR_USER_ID';

-- ============================================================================
-- INTERPRETATION
-- ============================================================================
-- 
-- If "Your referral count" = 1 but "Actual downline records" = 0:
--   → The total_referrals was incremented but referrer_id was not set
--   → This is a bug in the signup process
--   → Fix: Update the referral record with correct referrer_id
--
-- If "Actual downline records" = 1 but "Downline with user data" = 0:
--   → The referral record exists but user_id doesn't match any user
--   → This is a data integrity issue
--   → Fix: Check the user_id in the referral record
--
-- If both = 1:
--   → Database is correct, issue is in the getDownline() function
--   → Fix: Update services/supabaseService.ts
--
-- ============================================================================
-- QUICK FIXES (Run only if needed)
-- ============================================================================

-- Fix 1: If referrer_id is NULL but should be set
-- UPDATE wallet_referrals
-- SET referrer_id = 'YOUR_USER_ID'
-- WHERE user_id = 'REFERRED_USER_ID'
--   AND referrer_id IS NULL;

-- Fix 2: Manually create notification
-- INSERT INTO wallet_notifications (
--   user_id,
--   wallet_address,
--   type,
--   title,
--   message,
--   priority,
--   is_read
-- )
-- SELECT 
--   'YOUR_USER_ID',
--   wallet_address,
--   'referral_signup',
--   'New Referral Signup! 🎉',
--   'Someone just joined using your referral link! You earned 50 RZC.',
--   'high',
--   false
-- FROM wallet_users
-- WHERE id = 'YOUR_USER_ID';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Replace 'YOUR_WALLET_ADDRESS' in Step 1 with your actual wallet address
-- Replace 'YOUR_USER_ID' in Steps 2-6 with the ID from Step 1
-- 
-- Run each step in order and note the results
-- The diagnostic summary will show you exactly where the issue is
-- 
