-- ============================================================================
-- CHECK AND CLAIM MISSING REFERRAL REWARDS
-- This script checks for missing rewards and awards them
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK FOR MISSING REFERRAL BONUSES
-- ============================================================================

-- Find users who have referrals but didn't receive bonuses
SELECT 
  u.id as referrer_user_id,
  u.name as referrer_name,
  u.wallet_address as referrer_wallet,
  r.total_referrals as referral_count,
  r.total_earned as total_earned_recorded,
  u.rzc_balance as current_rzc_balance,
  COALESCE(bonus_count.count, 0) as actual_bonuses_received,
  (r.total_referrals - COALESCE(bonus_count.count, 0)) as missing_bonuses,
  (r.total_referrals - COALESCE(bonus_count.count, 0)) * 50 as missing_rzc_amount
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
ORDER BY missing_bonuses DESC;

-- ============================================================================
-- STEP 2: CHECK SPECIFIC USER (YOUR CASE)
-- ============================================================================

-- Check your specific case
SELECT 
  'Your Referral Status' as section,
  u.name,
  u.wallet_address,
  u.rzc_balance as current_balance,
  r.total_referrals as referral_count,
  COALESCE(bonus_count.count, 0) as bonuses_received,
  (r.total_referrals - COALESCE(bonus_count.count, 0)) as missing_bonuses,
  (r.total_referrals - COALESCE(bonus_count.count, 0)) * 50 as missing_rzc
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as count
  FROM wallet_rzc_transactions
  WHERE type = 'referral_bonus'
  GROUP BY user_id
) bonus_count ON u.id = bonus_count.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- STEP 3: CHECK WHO YOU REFERRED AND IF THEY GOT SIGNUP BONUS
-- ============================================================================

SELECT 
  'Referred Users Status' as section,
  u.id as referred_user_id,
  u.name as referred_user_name,
  u.wallet_address,
  u.rzc_balance,
  u.created_at as joined_at,
  CASE 
    WHEN signup_bonus.id IS NOT NULL THEN '✅ Got signup bonus'
    ELSE '❌ Missing signup bonus'
  END as signup_bonus_status,
  CASE 
    WHEN referral_bonus.id IS NOT NULL THEN '✅ You got referral bonus'
    ELSE '❌ You missing referral bonus'
  END as referral_bonus_status
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
LEFT JOIN (
  SELECT id, user_id FROM wallet_rzc_transactions WHERE type = 'signup_bonus'
) signup_bonus ON signup_bonus.user_id = u.id
LEFT JOIN (
  SELECT id, user_id, metadata FROM wallet_rzc_transactions 
  WHERE type = 'referral_bonus'
    AND metadata->>'referred_user_id' = u.id::text
) referral_bonus ON referral_bonus.user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
WHERE r.referrer_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- ============================================================================
-- STEP 4: AWARD MISSING REFERRAL BONUSES
-- Run this ONLY if Step 2 shows missing_bonuses > 0
-- ============================================================================

-- Award missing referral bonus (50 RZC per referral)
-- Replace the user IDs with actual values from Step 3

-- Example for 1 missing bonus:
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,  -- Your user ID (referrer)
  50,                                              -- Amount (50 RZC per referral)
  'referral_bonus',                                -- Type
  'Referral bonus - retroactive claim',            -- Description
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',  -- Referred user ID
    'retroactive', true,
    'reason', 'Missing bonus from signup'
  )
);

-- ============================================================================
-- STEP 5: VERIFY THE FIX
-- ============================================================================

-- Check your balance after claiming
SELECT 
  'After Claiming' as status,
  u.name,
  u.rzc_balance as new_balance,
  r.total_referrals,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Check transaction history
SELECT 
  type,
  amount,
  description,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 6: CREATE AUTOMATED CHECK FUNCTION
-- This function will check and award missing bonuses automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_award_missing_referral_bonuses()
RETURNS TABLE (
  referrer_id UUID,
  referrer_name TEXT,
  missing_bonuses INTEGER,
  awarded_amount NUMERIC
) AS $$
DECLARE
  v_referrer RECORD;
  v_referred_user RECORD;
  v_missing_count INTEGER;
BEGIN
  -- Loop through all users with referrals
  FOR v_referrer IN
    SELECT 
      u.id,
      u.name,
      u.wallet_address,
      r.total_referrals,
      COALESCE(bonus_count.count, 0) as bonuses_received
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
  LOOP
    v_missing_count := v_referrer.total_referrals - v_referrer.bonuses_received;
    
    -- Find the referred users who didn't trigger a bonus
    FOR v_referred_user IN
      SELECT DISTINCT u.id, u.wallet_address
      FROM wallet_referrals r
      JOIN wallet_users u ON r.user_id = u.id
      LEFT JOIN wallet_rzc_transactions t ON 
        t.user_id = v_referrer.id 
        AND t.type = 'referral_bonus'
        AND t.metadata->>'referred_user_id' = u.id::text
      WHERE r.referrer_id = v_referrer.id
        AND t.id IS NULL
      LIMIT v_missing_count
    LOOP
      -- Award the missing bonus
      PERFORM award_rzc_tokens(
        v_referrer.id,
        50,
        'referral_bonus',
        'Retroactive referral bonus',
        jsonb_build_object(
          'referred_user_id', v_referred_user.id,
          'referred_user_address', v_referred_user.wallet_address,
          'retroactive', true,
          'auto_claimed', true
        )
      );
    END LOOP;
    
    -- Return the result
    referrer_id := v_referrer.id;
    referrer_name := v_referrer.name;
    missing_bonuses := v_missing_count;
    awarded_amount := v_missing_count * 50;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION check_and_award_missing_referral_bonuses IS 
'Checks for users who have referrals but missing bonuses and awards them automatically';

-- ============================================================================
-- STEP 7: RUN THE AUTOMATED CHECK
-- ============================================================================

-- Run this to automatically award all missing bonuses
SELECT * FROM check_and_award_missing_referral_bonuses();

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This script will:
-- 1. Find all users with missing referral bonuses
-- 2. Award the missing bonuses (50 RZC each)
-- 3. Create a function to automate this check
-- 4. Prevent future missing bonuses
-- 
-- Run Steps 1-3 first to see what's missing
-- Then run Step 4 to manually award (or Step 7 to auto-award)
-- Finally run Step 5 to verify
-- 
-- The function in Step 6 can be called periodically to ensure
-- no bonuses are ever missed again.
-- 
