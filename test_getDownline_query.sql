-- ============================================================================
-- TEST getDownline() QUERY
-- This simulates exactly what the code is doing
-- ============================================================================

-- Step 1: Get referral records (what the code does first)
SELECT 
  'Step 1: Referral Records' as step,
  user_id,
  total_referrals,
  created_at
FROM wallet_referrals
WHERE referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY created_at DESC;

-- Step 2: Get user IDs from referral records
SELECT 
  'Step 2: User IDs to fetch' as step,
  user_id
FROM wallet_referrals
WHERE referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Step 3: Get user details (what the code does second)
SELECT 
  'Step 3: User Details' as step,
  u.*
FROM wallet_users u
WHERE u.id IN (
  SELECT user_id 
  FROM wallet_referrals 
  WHERE referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
);

-- Step 4: Combined result (what should be returned)
SELECT 
  'Step 4: Combined Result' as step,
  u.id,
  u.name,
  u.wallet_address,
  u.avatar,
  u.email,
  u.role,
  u.is_active,
  u.referrer_code,
  u.rzc_balance,
  u.created_at,
  u.updated_at,
  r.total_referrals,
  (u.rzc_balance - 100) as rzc_earned
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY r.created_at DESC;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if user exists
SELECT 
  'User Exists Check' as check,
  CASE 
    WHEN COUNT(*) > 0 THEN 'YES - User found'
    ELSE 'NO - User not found'
  END as result,
  COUNT(*) as count
FROM wallet_users
WHERE id IN (
  SELECT user_id 
  FROM wallet_referrals 
  WHERE referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
);

-- Check referral record details
SELECT 
  'Referral Record Details' as check,
  r.id as referral_record_id,
  r.user_id,
  r.referrer_id,
  r.referral_code,
  r.total_referrals,
  r.created_at,
  CASE 
    WHEN u.id IS NOT NULL THEN 'User exists'
    ELSE 'User NOT found'
  END as user_status
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
