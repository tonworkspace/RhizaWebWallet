-- ============================================================================
-- CHECK IF award_rzc_tokens FUNCTION EXISTS
-- ============================================================================

-- Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'award_rzc_tokens'
  AND routine_schema = 'public';

-- If function doesn't exist, create it
-- ============================================================================
-- CREATE award_rzc_tokens FUNCTION
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
'Awards RZC tokens to a user and records the transaction';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION award_rzc_tokens TO anon;

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

-- Test with your user ID (this will actually award tokens, so be careful!)
-- Uncomment to test:
/*
SELECT award_rzc_tokens(
  '99c8c1fd-7174-4bad-848f-4c0cc0bb4641'::uuid,
  50,
  'referral_bonus',
  'Test referral bonus',
  jsonb_build_object('test', true)
);
*/

-- Check if it worked
/*
SELECT 
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
LIMIT 5;
*/
