-- ============================================================================
-- FIX DUPLICATE REFERRAL BONUS CLAIMS
-- Prevents users from claiming the same referral bonus multiple times
-- ============================================================================

-- Step 1: Update award_rzc_tokens function to prevent duplicate referral bonuses
-- ============================================================================

CREATE OR REPLACE FUNCTION award_rzc_tokens(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_new_balance NUMERIC;
  v_existing_bonus_count INTEGER;
  v_referred_user_id UUID;
BEGIN
  -- If this is a referral bonus, check for duplicates
  IF p_type = 'referral_bonus' AND p_metadata IS NOT NULL THEN
    -- Extract referred_user_id from metadata
    v_referred_user_id := (p_metadata->>'referred_user_id')::UUID;
    
    IF v_referred_user_id IS NOT NULL THEN
      -- Check if bonus already awarded for this referred user
      SELECT COUNT(*) INTO v_existing_bonus_count
      FROM wallet_rzc_transactions
      WHERE user_id = p_user_id
        AND type = 'referral_bonus'
        AND (metadata->>'referred_user_id')::UUID = v_referred_user_id;
      
      -- If bonus already exists, skip awarding
      IF v_existing_bonus_count > 0 THEN
        RAISE NOTICE 'Referral bonus already awarded for referred user %. Skipping.', v_referred_user_id;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Update user's RZC balance
  UPDATE wallet_users
  SET 
    rzc_balance = rzc_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert transaction record
  INSERT INTO wallet_rzc_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_amount,
    v_new_balance,
    p_description,
    p_metadata,
    NOW()
  );

  -- Update referral earnings if it's a referral bonus
  IF p_type = 'referral_bonus' THEN
    UPDATE wallet_referrals
    SET 
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RAISE NOTICE 'Awarded % RZC to user %. New balance: %', p_amount, p_user_id, v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION award_rzc_tokens IS 
'Awards RZC tokens to a user and records the transaction. Prevents duplicate referral bonuses for the same referred user.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO anon;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO service_role;

-- ============================================================================
-- Step 2: Verify the fix works
-- ============================================================================

-- Test 1: Check current state
SELECT 
  u.name,
  u.rzc_balance,
  COUNT(DISTINCT (t.metadata->>'referred_user_id')::UUID) as unique_referral_bonuses,
  COUNT(*) FILTER (WHERE t.type = 'referral_bonus') as total_referral_transactions
FROM wallet_users u
LEFT JOIN wallet_rzc_transactions t ON u.id = t.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
GROUP BY u.id, u.name, u.rzc_balance;

-- Test 2: Try to award duplicate bonus (should be prevented)
-- Replace with actual user IDs from your system
/*
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  25,
  'referral_bonus',
  'Test duplicate prevention',
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',
    'referred_user_address', 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4'
  )
);
*/

-- Test 3: Verify balance didn't change (duplicate was prevented)
SELECT 
  u.name,
  u.rzc_balance,
  COUNT(*) FILTER (WHERE t.type = 'referral_bonus') as referral_bonus_count
FROM wallet_users u
LEFT JOIN wallet_rzc_transactions t ON u.id = t.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
GROUP BY u.id, u.name, u.rzc_balance;

-- ============================================================================
-- WHAT THIS FIX DOES:
-- ============================================================================
-- 
-- ✅ Prevents duplicate referral bonuses for the same referred user
-- ✅ Checks metadata->>'referred_user_id' before awarding
-- ✅ Silently skips if bonus already exists (no error thrown)
-- ✅ Works with both manual claims and automatic awards
-- ✅ Maintains all existing functionality
-- 
-- HOW IT WORKS:
-- 1. When awarding a referral_bonus, extracts referred_user_id from metadata
-- 2. Checks if a transaction already exists for that referred user
-- 3. If exists, returns early without awarding (logs notice)
-- 4. If not exists, proceeds with normal award flow
-- 
-- RESULT:
-- Users can no longer claim the same 25 RZC referral bonus multiple times
-- after reloading the page!
-- ============================================================================
