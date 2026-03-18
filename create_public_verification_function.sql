-- Create a public verification submission function that works without JWT authentication
-- This function validates the wallet address directly and doesn't rely on RLS

CREATE OR REPLACE FUNCTION submit_verification_request_public(
  p_wallet_address TEXT,
  p_telegram_username TEXT,
  p_old_wallet_address TEXT,
  p_claimed_balance DECIMAL(20,2),
  p_screenshot_url TEXT DEFAULT NULL,
  p_additional_notes TEXT DEFAULT NULL
) RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_current_balance DECIMAL(20,2);
  v_request_id UUID;
  v_priority TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Validate wallet address format (basic check)
  IF p_wallet_address IS NULL OR LENGTH(p_wallet_address) < 10 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Invalid wallet address format'
    );
  END IF;
  
  -- Find user by wallet address
  SELECT id, COALESCE(rzc_balance, 0) 
  INTO v_user_id, v_current_balance
  FROM wallet_users 
  WHERE wallet_address = p_wallet_address;
  
  -- Check if user exists
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User profile not found for this wallet address'
    );
  END IF;
  
  -- Check for existing pending requests
  SELECT COUNT(*) INTO v_existing_count
  FROM balance_verification_requests 
  WHERE user_id = v_user_id 
  AND status IN ('pending', 'under_review');
  
  IF v_existing_count > 0 THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'You already have a pending verification request'
    );
  END IF;
  
  -- Determine priority based on balance discrepancy
  v_priority := CASE 
    WHEN ABS(p_claimed_balance - v_current_balance) > 10000 THEN 'urgent'
    WHEN ABS(p_claimed_balance - v_current_balance) > 1000 THEN 'high'
    ELSE 'normal'
  END;
  
  -- Insert verification request (bypassing RLS by using SECURITY DEFINER)
  INSERT INTO balance_verification_requests (
    user_id,
    wallet_address,
    telegram_username,
    old_wallet_address,
    claimed_balance,
    current_balance,
    screenshot_url,
    additional_notes,
    priority,
    status,
    created_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_telegram_username,
    p_old_wallet_address,
    p_claimed_balance,
    v_current_balance,
    p_screenshot_url,
    p_additional_notes,
    v_priority,
    'pending',
    NOW()
  ) RETURNING id INTO v_request_id;
  
  -- Return success response
  RETURN json_build_object(
    'success', true,
    'message', 'Verification request submitted successfully',
    'request_id', v_request_id,
    'priority', v_priority,
    'discrepancy_amount', p_claimed_balance - v_current_balance,
    'current_balance', v_current_balance,
    'claimed_balance', p_claimed_balance
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', 'Database error: ' || SQLERRM
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION submit_verification_request_public TO anon;
GRANT EXECUTE ON FUNCTION submit_verification_request_public TO authenticated;

-- Test the function
DO $$
DECLARE
  test_user RECORD;
  test_result JSON;
BEGIN
  -- Get a test user
  SELECT id, wallet_address, COALESCE(rzc_balance, 0) as balance
  INTO test_user
  FROM wallet_users 
  LIMIT 1;
  
  IF test_user.id IS NOT NULL THEN
    -- Test the function
    SELECT submit_verification_request_public(
      test_user.wallet_address,
      '@test_public_function',
      'EQTestOldWallet123',
      test_user.balance + 1000,
      NULL,
      'Test of public verification function'
    ) INTO test_result;
    
    RAISE NOTICE 'Test result: %', test_result;
    
    -- Clean up if successful
    IF (test_result->>'success')::boolean THEN
      DELETE FROM balance_verification_requests 
      WHERE telegram_username = '@test_public_function';
      RAISE NOTICE 'Test data cleaned up';
    END IF;
  ELSE
    RAISE NOTICE 'No test user found';
  END IF;
END $$;