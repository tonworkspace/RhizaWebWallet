-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FIX AUTHENTICATION ISSUE FOR SUBMIT FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════════
-- This fixes the authentication issue when submitting verification requests

-- First, let's check what's in the JWT token
CREATE OR REPLACE FUNCTION debug_jwt_token()
RETURNS JSON AS $func$
DECLARE
  v_jwt_claims JSON;
  v_wallet_address TEXT;
  v_user_id TEXT;
BEGIN
  -- Get the full JWT claims
  v_jwt_claims := auth.jwt();
  
  -- Extract specific fields
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  v_user_id := auth.jwt() ->> 'sub';
  
  RETURN json_build_object(
    'success', true,
    'jwt_claims', v_jwt_claims,
    'wallet_address', v_wallet_address,
    'user_id', v_user_id,
    'has_jwt', v_jwt_claims IS NOT NULL
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'jwt_claims', NULL
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced submit function with better authentication handling
CREATE OR REPLACE FUNCTION submit_balance_verification_request(
  p_telegram_username TEXT,
  p_old_wallet_address TEXT,
  p_claimed_balance DECIMAL(20,2),
  p_screenshot_url TEXT DEFAULT NULL,
  p_additional_notes TEXT DEFAULT NULL
) RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_current_balance DECIMAL(20,2);
  v_request_id UUID;
  v_priority TEXT;
  v_jwt_claims JSON;
  v_auth_user_id TEXT;
BEGIN
  -- Debug: Get JWT information
  v_jwt_claims := auth.jwt();
  v_auth_user_id := auth.jwt() ->> 'sub';
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  -- Log authentication attempt
  RAISE NOTICE 'Authentication attempt - JWT present: %, User ID: %, Wallet: %', 
    v_jwt_claims IS NOT NULL, v_auth_user_id, v_wallet_address;
  
  -- Check if we have any authentication
  IF v_jwt_claims IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No JWT token found - user not authenticated',
      'debug_info', 'JWT claims are null'
    );
  END IF;
  
  -- Try multiple ways to get user identification
  IF v_wallet_address IS NULL AND v_auth_user_id IS NOT NULL THEN
    -- Try to find user by auth user ID
    SELECT id, wallet_address, COALESCE(rzc_balance, 0) 
    INTO v_user_id, v_wallet_address, v_current_balance
    FROM wallet_users 
    WHERE auth_user_id = v_auth_user_id::UUID;
    
    IF v_user_id IS NULL THEN
      -- Try to find by email if available
      DECLARE
        v_email TEXT;
      BEGIN
        v_email := auth.jwt() ->> 'email';
        IF v_email IS NOT NULL THEN
          SELECT id, wallet_address, COALESCE(rzc_balance, 0) 
          INTO v_user_id, v_wallet_address, v_current_balance
          FROM wallet_users 
          WHERE email = v_email;
        END IF;
      END;
    END IF;
  ELSIF v_wallet_address IS NOT NULL THEN
    -- Use wallet address from JWT
    SELECT id, COALESCE(rzc_balance, 0) 
    INTO v_user_id, v_current_balance
    FROM wallet_users 
    WHERE wallet_address = v_wallet_address;
  END IF;
  
  -- Final check if we found the user
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User not found in database',
      'debug_info', json_build_object(
        'wallet_address', v_wallet_address,
        'auth_user_id', v_auth_user_id,
        'jwt_email', auth.jwt() ->> 'email'
      )
    );
  END IF;
  
  -- Check if user already has a pending request
  IF EXISTS (
    SELECT 1 FROM balance_verification_requests 
    WHERE user_id = v_user_id 
    AND status IN ('pending', 'under_review')
  ) THEN
    RETURN json_build_object('success', false, 'error', 'You already have a pending verification request');
  END IF;
  
  -- Determine priority based on discrepancy amount
  v_priority := CASE 
    WHEN ABS(p_claimed_balance - v_current_balance) > 10000 THEN 'urgent'
    WHEN ABS(p_claimed_balance - v_current_balance) > 1000 THEN 'high'
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
    p_screenshot_url,
    p_additional_notes,
    v_priority,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Verification request submitted successfully',
    'request_id', v_request_id,
    'priority', v_priority,
    'discrepancy_amount', p_claimed_balance - v_current_balance
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', SQLERRM,
    'debug_info', json_build_object(
      'user_id', v_user_id,
      'wallet_address', v_wallet_address,
      'auth_user_id', v_auth_user_id
    )
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced get_user_balance_status with better authentication
CREATE OR REPLACE FUNCTION get_user_balance_status()
RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_user_status RECORD;
  v_badges JSON;
  v_jwt_claims JSON;
  v_auth_user_id TEXT;
BEGIN
  -- Debug: Get JWT information
  v_jwt_claims := auth.jwt();
  v_auth_user_id := auth.jwt() ->> 'sub';
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  -- Check if we have any authentication
  IF v_jwt_claims IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No JWT token found - user not authenticated'
    );
  END IF;
  
  -- Try multiple ways to get user identification
  IF v_wallet_address IS NULL AND v_auth_user_id IS NOT NULL THEN
    -- Try to find user by auth user ID
    SELECT id, wallet_address INTO v_user_id, v_wallet_address
    FROM wallet_users 
    WHERE auth_user_id = v_auth_user_id::UUID;
    
    IF v_user_id IS NULL THEN
      -- Try to find by email if available
      DECLARE
        v_email TEXT;
      BEGIN
        v_email := auth.jwt() ->> 'email';
        IF v_email IS NOT NULL THEN
          SELECT id, wallet_address INTO v_user_id, v_wallet_address
          FROM wallet_users 
          WHERE email = v_email;
        END IF;
      END;
    END IF;
  ELSIF v_wallet_address IS NOT NULL THEN
    -- Use wallet address from JWT
    SELECT id INTO v_user_id
    FROM wallet_users 
    WHERE wallet_address = v_wallet_address;
  END IF;
  
  -- Final check if we found the user
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User not found in database'
    );
  END IF;
  
  -- Get user status
  SELECT 
    id,
    balance_verified,
    balance_locked,
    verification_badge_earned_at,
    verification_level,
    rzc_balance
  INTO v_user_status
  FROM wallet_users 
  WHERE id = v_user_id;
  
  -- Get user's badges
  SELECT json_agg(
    json_build_object(
      'badge_type', badge_type,
      'badge_level', badge_level,
      'earned_at', earned_at,
      'is_active', is_active,
      'metadata', metadata
    )
  ) INTO v_badges
  FROM verification_badges
  WHERE user_id = v_user_id AND is_active = TRUE;
  
  RETURN json_build_object(
    'success', true,
    'balance_status', json_build_object(
      'balance_verified', v_user_status.balance_verified,
      'balance_locked', v_user_status.balance_locked,
      'verification_level', v_user_status.verification_level,
      'verification_badge_earned_at', v_user_status.verification_badge_earned_at,
      'rzc_balance', v_user_status.rzc_balance,
      'can_send_rzc', NOT v_user_status.balance_locked,
      'verification_badges', COALESCE(v_badges, '[]'::json)
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ AUTHENTICATION FIX APPLIED
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Authentication fix applied! Functions now handle multiple authentication methods.' as status;