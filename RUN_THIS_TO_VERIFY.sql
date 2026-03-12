-- ============================================================================
-- QUICK VERIFICATION - Run this to check if the fix is working
-- Replace the user ID below with yours
-- ============================================================================

-- Your user ID here:
DO $$ 
BEGIN 
  RAISE NOTICE 'Testing user: 99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
END $$;

-- ============================================================================
-- Check 1: Is the fix applied?
-- ============================================================================
SELECT 
  '1️⃣ Function Status' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'award_rzc_tokens'
    ) THEN '✅ Function exists'
    ELSE '❌ Function missing'
  END as result;

-- ============================================================================
-- Check 2: Current state
-- ============================================================================
SELECT 
  '2️⃣ Current State' as check_name,
  u.name,
  u.rzc_balance,
  COALESCE(r.total_referrals, 0) as total_referrals,
  COALESCE((SELECT COUNT(*) FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus'), 0) as bonuses_received
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- Check 3: Any duplicates?
-- ============================================================================
SELECT 
  '3️⃣ Duplicate Check' as check_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM wallet_rzc_transactions
      WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
        AND type = 'referral_bonus'
    ) THEN '⚠️ No referral bonuses yet'
    WHEN (
      SELECT COUNT(*) FROM wallet_rzc_transactions
      WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
        AND type = 'referral_bonus'
    ) = (
      SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID)
      FROM wallet_rzc_transactions
      WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
        AND type = 'referral_bonus'
    ) THEN '✅ No duplicates found'
    ELSE '❌ Duplicates exist'
  END as result;

-- ============================================================================
-- Check 4: Recent transactions
-- ============================================================================
SELECT 
  '4️⃣ Recent Bonuses' as check_name,
  type,
  amount,
  description,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND type = 'referral_bonus'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 
-- If Check 1 shows "✅ Function exists":
--   → The fix is applied
--
-- If Check 3 shows "✅ No duplicates found":
--   → Everything is working correctly
--
-- If Check 3 shows "❌ Duplicates exist":
--   → Old duplicates from before the fix
--   → New duplicates will be prevented
--
-- TO TEST:
-- 1. Go to Referral page
-- 2. Click "Claim Missing Rewards" if available
-- 3. Reload page
-- 4. Try to claim again - should not work
-- 5. Run this script again - balance should only increase once
-- ============================================================================
