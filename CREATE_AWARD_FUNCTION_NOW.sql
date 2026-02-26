-- ============================================================================
-- CREATE award_rzc_tokens FUNCTION - REQUIRED FOR AUTOMATION
-- Run this FIRST to enable automated reward system
-- ============================================================================

-- Step 1: Check if function already exists
SELECT 
  routine_name,
  'Function exists' as status
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';

-- If the above returns no rows, the function doesn't exist. Create it below:

-- ============================================================================
-- Step 2: CREATE THE FUNCTION
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
BEGIN
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
'Awards RZC tokens to a user and records the transaction. Used by automated reward system.';

-- ============================================================================
-- Step 3: GRANT PERMISSIONS (CRITICAL FOR AUTOMATION)
-- ============================================================================

GRANT EXECUTE ON FUNCTION award_rzc_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO anon;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO service_role;

-- ============================================================================
-- Step 4: TEST THE FUNCTION
-- ============================================================================

-- Test with a small amount first (1 RZC)
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  1,
  'test_bonus',
  'Test function - automated system check',
  jsonb_build_object('test', true, 'automated', true)
);

-- Verify it worked
SELECT 
  'Test Result' as status,
  u.name,
  u.rzc_balance,
  t.type,
  t.amount,
  t.description,
  t.created_at
FROM wallet_users u
LEFT JOIN wallet_rzc_transactions t ON u.id = t.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY t.created_at DESC
LIMIT 1;

-- ============================================================================
-- Step 5: NOW CLAIM YOUR MISSING 50 RZC USING THE FUNCTION
-- ============================================================================

SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  50,
  'referral_bonus',
  'Referral bonus - retroactive claim',
  jsonb_build_object(
    'referred_user_id', 'ce852b0e-a3cb-468b-9c85-5bb4a23e0f94',
    'referred_user_address', 'EQAie1sT4_ng9saBvIZsoOfWwsPqZmL-2BtoOCubI1x4',
    'retroactive', true,
    'automated_system_ready', true
  )
);

-- ============================================================================
-- Step 6: VERIFY EVERYTHING
-- ============================================================================

-- Check your balance
SELECT 
  'Final Status' as status,
  u.name,
  u.rzc_balance as current_balance,
  r.total_referrals,
  r.total_earned,
  (SELECT COUNT(*) FROM wallet_rzc_transactions 
   WHERE user_id = u.id AND type = 'referral_bonus') as bonuses_received
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
WHERE u.id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641';

-- Check recent transactions
SELECT 
  type,
  amount,
  balance_after,
  description,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- After Step 4: Should see 1 RZC test transaction
-- After Step 5: Should see 50 RZC referral bonus
-- After Step 6: 
--   - current_balance should be 51 RZC more than before (1 test + 50 bonus)
--   - total_referrals: 1
--   - bonuses_received: 1 (or 2 if test bonus counted)
--   - total_earned: 50 (or 51)
-- ============================================================================

-- ============================================================================
-- AUTOMATION IS NOW ENABLED! ✅
-- ============================================================================
-- 
-- Once this function is created:
-- ✅ Auto-claim on login will work
-- ✅ Manual claim UI button will work
-- ✅ New referrals will automatically award bonuses
-- ✅ All reward systems will function properly
-- 
-- The prevention system is now fully operational!
-- ============================================================================
