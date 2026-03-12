-- ============================================================================
-- VERIFY DUPLICATE REFERRAL CLAIM FIX
-- Quick verification that the fix is working
-- ============================================================================

-- IMPORTANT: Replace '99c8c1fd-7174-4bad-848f-4c0cc0bb4641' with your user ID
-- throughout this script

-- ============================================================================
-- Test 1: Check if award_rzc_tokens function has duplicate prevention
-- ============================================================================
SELECT 
  'Test 1: Function Check' as test_name,
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%v_existing_bonus_count%' 
    THEN '✅ DUPLICATE PREVENTION ACTIVE'
    ELSE '❌ OLD VERSION (NO PROTECTION)'
  END as status
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';

-- ============================================================================
-- Test 2: Check for existing duplicates
-- ============================================================================
SELECT 
  'Test 2: Duplicate Check' as test_name,
  user_id,
  COUNT(*) as total_bonuses,
  COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) as unique_users,
  COUNT(*) - COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) as duplicate_count,
  CASE 
    WHEN COUNT(*) = COUNT(DISTINCT (metadata->>'referred_user_id')::UUID) 
    THEN '✅ NO DUPLICATES'
    ELSE '❌ DUPLICATES FOUND'
  END as status
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND type = 'referral_bonus'
GROUP BY user_id;

-- ============================================================================
-- Test 3: Show any duplicate bonuses (if they exist)
-- ============================================================================
SELECT 
  'Test 3: Duplicate Details' as test_name,
  metadata->>'referred_user_id' as referred_user_id,
  COUNT(*) as times_awarded,
  SUM(amount) as total_amount,
  ARRAY_AGG(created_at ORDER BY created_at) as award_dates
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND type = 'referral_bonus'
GROUP BY metadata->>'referred_user_id'
HAVING COUNT(*) > 1;

-- ============================================================================
-- Test 4: Current balance and bonus summary
-- ============================================================================
SELECT 
  'Test 4: Balance Summary' as test_name,
  u.name,
  u.rzc_balance,
  r.total_referrals as downline_count,
  (SELECT COUNT(*) 
   FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received,
  (SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID)
   FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as unique_bonuses
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 
-- Test 1: Should show "✅ DUPLICATE PREVENTION ACTIVE"
--         If it shows "❌ OLD VERSION", run fix_duplicate_referral_claims.sql
--
-- Test 2: Should show "✅ NO DUPLICATES"
--         If it shows "❌ DUPLICATES FOUND", you have old duplicates
--         (but new ones will be prevented)
--
-- Test 3: Should return NO ROWS (no duplicates)
--         If it returns rows, those are old duplicates from before the fix
--
-- Test 4: bonuses_received should equal unique_bonuses
--         If bonuses_received > unique_bonuses, old duplicates exist
--
-- ============================================================================
-- HOW TO TEST THE FIX:
-- ============================================================================
-- 
-- 1. Run this script and note your current RZC balance
-- 2. Go to the Referral page in your app
-- 3. If there's a "Claim Missing Rewards" button, click it
-- 4. Wait for the claim to complete
-- 5. Reload the page (F5)
-- 6. Try to claim again - it should NOT work
-- 7. Run this script again - balance should only have increased once
-- 
-- ============================================================================
