-- ============================================================================
-- TEST DUPLICATE REFERRAL CLAIM PREVENTION
-- Run this to verify the fix is working correctly
-- ============================================================================

-- Step 1: Check current state of a user with referrals
-- ============================================================================
-- Replace with your actual user ID
DO $$
DECLARE
  test_user_id UUID := '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
BEGIN
  RAISE NOTICE '=== STEP 1: Current State ===';
END $$;

SELECT 
  '1. User Current State' as test_step,
  u.name,
  u.wallet_address,
  u.rzc_balance as current_rzc_balance,
  r.total_referrals,
  r.total_earned as referral_earnings
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Step 2: Check existing referral bonus transactions
-- ============================================================================
SELECT 
  '2. Existing Referral Bonuses' as test_step,
  t.id,
  t.amount,
  t.description,
  t.metadata->>'referred_user_id' as referred_user_id,
  t.metadata->>'referred_user_address' as referred_user_address,
  t.created_at
FROM wallet_rzc_transactions t
WHERE t.user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND t.type = 'referral_bonus'
ORDER BY t.created_at DESC;

-- Step 3: Get list of downline members
-- ============================================================================
SELECT 
  '3. Downline Members' as test_step,
  u.id as downline_user_id,
  u.name,
  u.wallet_address,
  u.created_at as joined_at,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM wallet_rzc_transactions t
      WHERE t.user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
        AND t.type = 'referral_bonus'
        AND (t.metadata->>'referred_user_id')::UUID = u.id
    ) THEN 'YES ✅'
    ELSE 'NO ❌'
  END as bonus_awarded
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY u.created_at DESC;

-- Step 4: Try to award a duplicate bonus (should be prevented)
-- ============================================================================
DO $$
DECLARE
  test_user_id UUID := '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
  test_referred_user_id UUID;
  balance_before NUMERIC;
  balance_after NUMERIC;
BEGIN
  RAISE NOTICE '=== STEP 4: Testing Duplicate Prevention ===';
  
  -- Get the first referred user
  SELECT u.id INTO test_referred_user_id
  FROM wallet_users u
  JOIN wallet_referrals r ON u.id = r.user_id
  WHERE r.referrer_id = test_user_id
  LIMIT 1;
  
  IF test_referred_user_id IS NULL THEN
    RAISE NOTICE 'No referred users found for testing';
    RETURN;
  END IF;
  
  -- Get balance before
  SELECT rzc_balance INTO balance_before
  FROM wallet_users
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Balance before duplicate attempt: %', balance_before;
  RAISE NOTICE 'Attempting to award duplicate bonus for user: %', test_referred_user_id;
  
  -- Try to award duplicate bonus
  PERFORM award_rzc_tokens(
    test_user_id,
    25,
    'referral_bonus',
    'TEST: Duplicate prevention check',
    jsonb_build_object(
      'referred_user_id', test_referred_user_id,
      'test', true
    )
  );
  
  -- Get balance after
  SELECT rzc_balance INTO balance_after
  FROM wallet_users
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Balance after duplicate attempt: %', balance_after;
  
  IF balance_before = balance_after THEN
    RAISE NOTICE '✅ SUCCESS: Duplicate was prevented! Balance unchanged.';
  ELSE
    RAISE NOTICE '❌ FAILED: Duplicate was NOT prevented! Balance changed from % to %', balance_before, balance_after;
  END IF;
END $$;

-- Step 5: Verify no duplicate transaction was created
-- ============================================================================
SELECT 
  '5. Verify No Duplicate Created' as test_step,
  COUNT(*) as total_referral_bonuses,
  COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) as unique_referred_users,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) 
    THEN '✅ NO DUPLICATES'
    ELSE '❌ DUPLICATES FOUND'
  END as duplicate_status
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND type = 'referral_bonus';

-- Step 6: Check for any test transactions created
-- ============================================================================
SELECT 
  '6. Recent Transactions (Last 5)' as test_step,
  type,
  amount,
  balance_after,
  description,
  metadata->>'referred_user_id' as referred_user_id,
  metadata->>'test' as is_test,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY created_at DESC
LIMIT 5;

-- Step 7: Final verification summary
-- ============================================================================
SELECT 
  '7. Final Summary' as test_step,
  u.name,
  u.rzc_balance,
  r.total_referrals as downline_count,
  (SELECT COUNT(*) FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received,
  (SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) 
   FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as unique_bonuses,
  CASE 
    WHEN r.total_referrals = (SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) 
                               FROM wallet_rzc_transactions 
                               WHERE user_id = u.id AND type = 'referral_bonus')
    THEN '✅ ALL BONUSES CLAIMED (NO DUPLICATES)'
    WHEN r.total_referrals > (SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) 
                               FROM wallet_rzc_transactions 
                               WHERE user_id = u.id AND type = 'referral_bonus')
    THEN '⚠️ SOME BONUSES NOT CLAIMED YET'
    ELSE '❌ MORE BONUSES THAN REFERRALS (DUPLICATES EXIST)'
  END as status
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- Step 4 should show:
-- ✅ "Duplicate was prevented! Balance unchanged."
-- 
-- Step 5 should show:
-- ✅ total_referral_bonuses = unique_referred_users (NO DUPLICATES)
-- 
-- Step 7 should show:
-- ✅ "ALL BONUSES CLAIMED (NO DUPLICATES)" or "SOME BONUSES NOT CLAIMED YET"
-- ❌ Should NEVER show "MORE BONUSES THAN REFERRALS"
-- 
-- ============================================================================

-- ============================================================================
-- CLEANUP: Remove test transactions (optional)
-- ============================================================================
-- Uncomment to remove test transactions created during testing
/*
DELETE FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND metadata->>'test' = 'true'
  AND created_at > NOW() - INTERVAL '5 minutes';

-- Recalculate balance after cleanup
UPDATE wallet_users
SET rzc_balance = (
  SELECT COALESCE(SUM(amount), 0)
  FROM wallet_rzc_transactions
  WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
)
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
*/
