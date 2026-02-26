-- ============================================================================
-- IMMEDIATE FIX - Run this query to see the referred user data
-- ============================================================================

-- This will show you the actual user who was referred
SELECT 
  'Referred User Data' as section,
  u.id as user_id,
  u.name,
  u.wallet_address,
  u.avatar,
  u.email,
  u.role,
  u.is_active,
  u.referrer_code as code_they_used_to_signup,
  u.rzc_balance,
  u.created_at as when_they_joined,
  r.referral_code as their_own_referral_code,
  r.total_referrals as people_they_referred,
  (u.rzc_balance - 100) as rzc_earned_from_referrals
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY r.created_at DESC;

-- ============================================================================
-- If the above query returns 0 rows, run this to find the issue:
-- ============================================================================

-- Check if the referral record exists but user doesn't
SELECT 
  'Orphaned Referral Record' as issue,
  r.id as referral_record_id,
  r.user_id as user_id_in_referral_table,
  r.referrer_id,
  r.referral_code,
  r.created_at,
  CASE 
    WHEN u.id IS NULL THEN '❌ USER NOT FOUND IN wallet_users'
    ELSE '✅ User exists'
  END as user_status
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- If user_status shows "USER NOT FOUND", find the correct user:
-- ============================================================================

-- Find recent users who might be the referred user
SELECT 
  'Recent Users (potential matches)' as section,
  u.id,
  u.name,
  u.wallet_address,
  u.referrer_code as code_they_used,
  u.created_at,
  r.referral_code as their_own_code,
  r.referrer_id as their_referrer
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.created_at > NOW() - INTERVAL '7 days'
ORDER BY u.created_at DESC
LIMIT 10;
