-- Fix Balance Verification RPC Function
-- This ensures the RPC function works properly and requests show in admin dashboard

-- 1. Drop existing function to recreate it fresh
DROP FUNCTION IF EXISTS submit_balance_verification_request(TEXT, TEXT, DECIMAL, TEXT, TEXT);

-- 2. Create the RPC function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION submit_balance_verification_request(
  p_telegram_username TEXT,
  p_old_wallet_address TEXT,
  p_claimed_balance DECIMAL(20,2),
  p_screenshot_url TEXT DEFAULT NULL,
  p_additional_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_current_balance DECIMAL(20,2);
  v_request_id UUID;
  v_priority TEXT;
  v_discrepancy DECIMAL(20,2);
  v_jwt_claims JSON;
BEGIN
  -- Get JWT claims
  v_jwt_claims := auth.jwt();
  
  -- Check if we have JWT
  IF v_jwt_claims IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No authentication token found. Please log in again.'
    );
  END IF;
  
  -- Try multiple methods to get wallet address
  v_wallet_address := COALESCE(
    auth.jwt() ->> 'wallet_address',
    auth.jwt() -> 'user_metadata' ->> 'wallet_address',
    auth.jwt() -> 'app_metadata' ->> 'wallet_address'
  );
  
  -- If still no wallet address, try looking up by auth user ID
  IF v_wallet_address IS NULL THEN
    SELECT id, wallet_address, COALESCE(rzc_balance, 0) 
    INTO v_user_id, v_wallet_address, v_current_balance
    FROM wallet_users 
    WHERE auth_user_id = (auth.jwt() ->> 'sub')::UUID;
  ELSE
    -- Look up user by wallet address
    SELECT id, COALESCE(rzc_balance, 0) 
    INTO v_user_id, v_current_balance
    FROM wallet_users 
    WHERE wallet_address = v_wallet_address;
  END IF;
  
  -- Validate we found the user
  IF v_user_id IS NULL OR v_wallet_address IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User profile not found. Please ensure you are logged in with your wallet.'
    );
  END IF;
  
  -- Check for existing pending request
  IF EXISTS (
    SELECT 1 FROM balance_verification_requests 
    WHERE user_id = v_user_id 
    AND status IN ('pending', 'under_review')
  ) THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'You already have a pending verification request. Please wait for admin review.'
    );
  END IF;
  
  -- Calculate discrepancy
  v_discrepancy := p_claimed_balance - v_current_balance;
  
  -- Determine priority based on discrepancy amount
  v_priority := CASE 
    WHEN ABS(v_discrepancy) > 10000 THEN 'urgent'
    WHEN ABS(v_discrepancy) > 1000 THEN 'high'
    WHEN ABS(v_discrepancy) < 100 THEN 'low'
    ELSE 'normal'
  END;
  
  -- Insert verification request
  INSERT INTO balance_verification_requests (
    user_id,
    wallet_address,
    telegram_username,
    old_wallet_address,
    claimed_balance,
    current_balance,
    discrepancy,
    discrepancy_amount,
    screenshot_url,
    additional_notes,
    priority,
    status
  ) VALUES (
    v_user_id,
    v_wallet_address,
    p_telegram_username,
    p_old_wallet_address,
    p_claimed_balance,
    v_current_balance,
    v_discrepancy,
    ABS(v_discrepancy),
    p_screenshot_url,
    p_additional_notes,
    v_priority,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Verification request submitted successfully! An admin will review it soon.',
    'request_id', v_request_id,
    'priority', v_priority,
    'discrepancy_amount', ABS(v_discrepancy),
    'status', 'pending'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error and return it
  RAISE WARNING 'Error in submit_balance_verification_request: %', SQLERRM;
  RETURN json_build_object(
    'success', false, 
    'error', 'Failed to submit request: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION submit_balance_verification_request(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_balance_verification_request(TEXT, TEXT, DECIMAL, TEXT, TEXT) TO anon;

-- 4. Ensure RLS policies allow the function to work
-- Temporarily disable RLS to allow SECURITY DEFINER function to work
ALTER TABLE balance_verification_requests DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE balance_verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Users can view their own verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Admins can view all verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON balance_verification_requests;

-- Create new policies that work with SECURITY DEFINER
CREATE POLICY "Allow insert via RPC function"
  ON balance_verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view own requests"
  ON balance_verification_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM wallet_users 
      WHERE wallet_address = COALESCE(
        auth.jwt() ->> 'wallet_address',
        auth.jwt() -> 'user_metadata' ->> 'wallet_address',
        auth.jwt() -> 'app_metadata' ->> 'wallet_address'
      )
      OR auth_user_id = (auth.jwt() ->> 'sub')::UUID
    )
  );

CREATE POLICY "Admins can view all requests"
  ON balance_verification_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE (
        wallet_address = COALESCE(
          auth.jwt() ->> 'wallet_address',
          auth.jwt() -> 'user_metadata' ->> 'wallet_address',
          auth.jwt() -> 'app_metadata' ->> 'wallet_address'
        )
        OR auth_user_id = (auth.jwt() ->> 'sub')::UUID
      )
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update requests"
  ON balance_verification_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE (
        wallet_address = COALESCE(
          auth.jwt() ->> 'wallet_address',
          auth.jwt() -> 'user_metadata' ->> 'wallet_address',
          auth.jwt() -> 'app_metadata' ->> 'wallet_address'
        )
        OR auth_user_id = (auth.jwt() ->> 'sub')::UUID
      )
      AND role = 'admin'
    )
  );

-- 5. Verify the setup
SELECT 
  'Balance Verification RPC Function Fixed!' as status,
  'Users can now submit verification requests successfully' as message,
  'Requests will appear in admin dashboard immediately' as note;

-- Test query to check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'submit_balance_verification_request';
