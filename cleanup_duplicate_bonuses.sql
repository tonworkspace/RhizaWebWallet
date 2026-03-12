-- ============================================================================
-- CLEANUP DUPLICATE REFERRAL BONUSES
-- This script identifies and removes duplicate bonuses, keeping only one per user
-- ============================================================================

-- IMPORTANT: Replace with your user ID
-- User ID: 99c8c1fd-7174-4bad-848f-4c0cc0bb4641

-- ============================================================================
-- Step 1: Identify duplicates
-- ============================================================================
SELECT 
  '📊 Step 1: Duplicate Analysis' as step,
  metadata->>'referred_user_id' as referred_user_id,
  COUNT(*) as times_claimed,
  SUM(amount) as total_amount,
  MIN(created_at) as first_claim,
  MAX(created_at) as last_claim,
  ARRAY_AGG(id ORDER BY created_at) as transaction_ids
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  AND type = 'referral_bonus'
GROUP BY metadata->>'referred_user_id'
HAVING COUNT(*) > 1;

-- ============================================================================
-- Step 2: Calculate how much to remove
-- ============================================================================
SELECT 
  '💰 Step 2: Removal Summary' as step,
  COUNT(*) as duplicate_transactions,
  SUM(amount) as amount_to_remove
FROM (
  SELECT 
    id,
    amount,
    ROW_NUMBER() OVER (
      PARTITION BY metadata->>'referred_user_id' 
      ORDER BY created_at
    ) as rn
  FROM wallet_rzc_transactions
  WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
    AND type = 'referral_bonus'
) duplicates
WHERE rn > 1;

-- ============================================================================
-- Step 3: Show current balance
-- ============================================================================
SELECT 
  '💵 Step 3: Current Balance' as step,
  name,
  rzc_balance as current_balance,
  (SELECT SUM(amount) 
   FROM wallet_rzc_transactions 
   WHERE user_id = u.id 
     AND type = 'referral_bonus'
     AND id IN (
       SELECT id FROM (
         SELECT 
           id,
           ROW_NUMBER() OVER (
             PARTITION BY metadata->>'referred_user_id' 
             ORDER BY created_at
           ) as rn
         FROM wallet_rzc_transactions
         WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
           AND type = 'referral_bonus'
       ) x WHERE rn > 1
     )
  ) as duplicate_amount,
  rzc_balance - COALESCE((
    SELECT SUM(amount) 
    FROM wallet_rzc_transactions 
    WHERE user_id = u.id 
      AND type = 'referral_bonus'
      AND id IN (
        SELECT id FROM (
          SELECT 
            id,
            ROW_NUMBER() OVER (
              PARTITION BY metadata->>'referred_user_id' 
              ORDER BY created_at
            ) as rn
          FROM wallet_rzc_transactions
          WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
            AND type = 'referral_bonus'
        ) x WHERE rn > 1
      )
  ), 0) as corrected_balance
FROM wallet_users u
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- Step 4: REMOVE DUPLICATES (keeps first claim, removes rest)
-- ============================================================================
-- UNCOMMENT THE SECTION BELOW TO EXECUTE THE CLEANUP

/*
-- Delete duplicate transactions (keeps the first one for each referred user)
DELETE FROM wallet_rzc_transactions
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY metadata->>'referred_user_id' 
        ORDER BY created_at
      ) as rn
    FROM wallet_rzc_transactions
    WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
      AND type = 'referral_bonus'
  ) duplicates
  WHERE rn > 1
);

-- Recalculate the user's RZC balance based on remaining transactions
UPDATE wallet_users
SET 
  rzc_balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM wallet_rzc_transactions
    WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
  ),
  updated_at = NOW()
WHERE id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Update referral earnings
UPDATE wallet_referrals
SET 
  total_earned = (
    SELECT COALESCE(SUM(amount), 0)
    FROM wallet_rzc_transactions
    WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
      AND type IN ('referral_bonus', 'milestone_bonus')
  ),
  updated_at = NOW()
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';
*/

-- ============================================================================
-- Step 5: Verify cleanup (run after uncommenting Step 4)
-- ============================================================================
SELECT 
  '✅ Step 5: Verification' as step,
  u.name,
  u.rzc_balance,
  r.total_referrals,
  (SELECT COUNT(*) FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received,
  (SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID)
   FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as unique_bonuses,
  CASE 
    WHEN (SELECT COUNT(*) FROM wallet_rzc_transactions 
          WHERE user_id = u.id AND type = 'referral_bonus') = 
         (SELECT COUNT(DISTINCT (metadata->>'referred_user_id')::UUID)
          FROM wallet_rzc_transactions 
          WHERE user_id = u.id AND type = 'referral_bonus')
    THEN '✅ NO DUPLICATES'
    ELSE '❌ DUPLICATES STILL EXIST'
  END as status
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 
-- 1. First, run Steps 1-3 to see what will be removed
-- 2. Review the duplicate_amount - this will be deducted from balance
-- 3. If you're happy with the cleanup, UNCOMMENT Step 4
-- 4. Run the entire script again
-- 5. Check Step 5 to verify cleanup was successful
-- 
-- WHAT THIS DOES:
-- - Keeps the FIRST claim for each referred user
-- - Removes all subsequent duplicate claims
-- - Recalculates your RZC balance correctly
-- - Updates referral earnings
-- 
-- SAFE TO RUN:
-- - Only affects duplicate transactions
-- - Keeps one valid bonus per referred user
-- - Properly recalculates balances
-- 
-- ============================================================================
