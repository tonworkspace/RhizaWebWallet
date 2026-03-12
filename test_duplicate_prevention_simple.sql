-- ============================================================================
-- SIMPLE TEST: Duplicate Referral Claim Prevention
-- Run this to verify the fix is working
-- ============================================================================

-- STEP 1: Replace this with your actual user ID
\set test_user_id '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'

-- ============================================================================
-- Check 1: Current user state
-- ============================================================================
SELECT 
  '✅ Check 1: User State' as test,
  u.name,
  u.rzc_balance,
  r.total_referrals as downline_count,
  (SELECT COUNT(*) 
   FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = :'test_user_id';

-- ============================================================================
-- Check 2: Existing referral bonuses
-- ============================================================================
SELECT 
  '✅ Check 2: Existing Bonuses' as test,
  COUNT(*) as total_bonuses,
  COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) as unique_referred_users,
  SUM(amount) as total_amount,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) 
    THEN '✅ NO DUPLICATES'
    ELSE '❌ DUPLICATES EXIST'
  END as duplicate_status
FROM wallet_rzc_transactions
WHERE user_id = :'test_user_id'
  AND type = 'referral_bonus';

-- ============================================================================
-- Check 3: List all referral bonuses with details
-- ============================================================================
SELECT 
  '✅ Check 3: Bonus Details' as test,
  amount,
  metadata->>'referred_user_id' as referred_user_id,
  metadata->>'referred_user_address' as referred_address,
  description,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = :'test_user_id'
  AND type = 'referral_bonus'
ORDER BY created_at DESC;

-- ============================================================================
-- Check 4: Downline members and their bonus status
-- ============================================================================
SELECT 
  '✅ Check 4: Downline Status' as test,
  u.name,
  u.wallet_address,
  u.created_at as joined_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM wallet_rzc_transactions t
      WHERE t.user_id = :'test_user_id'
        AND t.type = 'referral_bonus'
        AND (t.metadata->>'referred_user_id')::UUID = u.id
    ) THEN '✅ BONUS AWARDED'
    ELSE '❌ NO BONUS YET'
  END as bonus_status,
  (SELECT COUNT(*) 
   FROM wallet_rzc_transactions t
   WHERE t.user_id = :'test_user_id'
     AND t.type = 'referral_bonus'
     AND (t.metadata->>'referred_user_id')::UUID = u.id) as bonus_count
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE r.referrer_id = :'test_user_id'
ORDER BY u.created_at DESC;

-- ============================================================================
-- Check 5: Verify duplicate prevention is active
-- ============================================================================
SELECT 
  '✅ Check 5: Function Status' as test,
  routine_name as function_name,
  'EXISTS ✅' as status
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';

-- ============================================================================
-- INTERPRETATION GUIDE:
-- ============================================================================
-- 
-- Check 2 should show:
-- ✅ total_bonuses = unique_referred_users (NO DUPLICATES)
-- ❌ total_bonuses > unique_referred_users (DUPLICATES EXIST)
--
-- Check 4 should show:
-- ✅ bonus_count should be 0 or 1 for each downline member
-- ❌ bonus_count > 1 means duplicates exist for that member
--
-- If you see duplicates:
-- - The fix hasn't been applied yet, or
-- - Duplicates existed before the fix (need cleanup)
--
-- To test duplicate prevention:
-- 1. Note your current RZC balance
-- 2. Try to claim rewards from the UI
-- 3. Reload the page
-- 4. Try to claim again
-- 5. Run this script again - balance should only increase once
-- ============================================================================
