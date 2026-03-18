-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FIX WALLET-BASED AUTHENTICATION SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════
-- This fixes the authentication issue for wallet-based users

-- Enhanced submit function that works with wallet authentication
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
BEGIN
  -- Get JWT claims
  v_jwt_claims := auth.jwt();
  
  -- Check if we have JWT at all
  IF v_jwt_claims IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No authentication token found'
    );
  END IF;
  
  -- Try to get wallet address from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  -- If no wallet_address in JWT, try other methods
  IF v_wallet_address IS NULL THEN
    -- Try to get from user_metadata
    v_wallet_address := (auth.jwt() -> 'user_metadata' ->> 'wallet_address');
    
    -- If still null, try app_metadata
    IF v_wallet_address IS NULL THEN
      v_wallet_address := (auth.jwt() -> 'app_metadata' ->> 'wallet_address');
    END IF;
  END IF;
  
  -- If we still don't have wallet address, look up by auth user ID
  IF v_wallet_address IS NULL THEN
    DECLARE
      v_auth_user_id TEXT;
    BEGIN
      v_auth_user_id := auth.jwt() ->> 'sub';
      IF v_auth_user_id IS NOT NULL THEN
        SELECT id, wallet_address, COALESCE(rzc_balance, 0) 
        INTO v_user_id, v_wallet_address, v_current_balance
        FROM wallet_users 
        WHERE auth_user_id = v_auth_user_id::UUID;
      END IF;
    END;
  END IF;
  
  -- If we have wallet address but no user_id yet, look up the user
  IF v_wallet_address IS NOT NULL AND v_user_id IS NULL THEN
    SELECT id, COALESCE(rzc_balance, 0) 
    INTO v_user_id, v_current_balance
    FROM wallet_users 
    WHERE wallet_address = v_wallet_address;
  END IF;
  
  -- Final validation
  IF v_user_id IS NULL OR v_wallet_address IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User profile not found. Please ensure you are logged in with your wallet.',
      'debug_info', json_build_object(
        'wallet_address', v_wallet_address,
        'user_id', v_user_id,
        'jwt_sub', auth.jwt() ->> 'sub'
      )
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
      'error', 'You already have a pending verification request'
    );
  END IF;
  
  -- Determine priority
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
    'error', 'Database error: ' || SQLERRM
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced get_user_balance_status for wallet authentication
CREATE OR REPLACE FUNCTION get_user_balance_status()
RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_user_status RECORD;
  v_badges JSON;
  v_jwt_claims JSON;
BEGIN
  -- Get JWT claims
  v_jwt_claims := auth.jwt();
  
  -- Check if we have JWT at all
  IF v_jwt_claims IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No authentication token found'
    );
  END IF;
  
  -- Try to get wallet address from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  -- If no wallet_address in JWT, try other methods
  IF v_wallet_address IS NULL THEN
    -- Try to get from user_metadata
    v_wallet_address := (auth.jwt() -> 'user_metadata' ->> 'wallet_address');
    
    -- If still null, try app_metadata
    IF v_wallet_address IS NULL THEN
      v_wallet_address := (auth.jwt() -> 'app_metadata' ->> 'wallet_address');
    END IF;
  END IF;
  
  -- If we still don't have wallet address, look up by auth user ID
  IF v_wallet_address IS NULL THEN
    DECLARE
      v_auth_user_id TEXT;
    BEGIN
      v_auth_user_id := auth.jwt() ->> 'sub';
      IF v_auth_user_id IS NOT NULL THEN
        SELECT id, wallet_address 
        INTO v_user_id, v_wallet_address
        FROM wallet_users 
        WHERE auth_user_id = v_auth_user_id::UUID;
      END IF;
    END;
  END IF;
  
  -- If we have wallet address but no user_id yet, look up the user
  IF v_wallet_address IS NOT NULL AND v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM wallet_users 
    WHERE wallet_address = v_wallet_address;
  END IF;
  
  -- Final validation
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User profile not found'
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
-- ✅ WALLET AUTHENTICATION FIX COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Wallet authentication system fixed! Functions now work with wallet-based auth.' as status;
-- Enhanced get_user_verification_status for wallet authentication
CREATE OR REPLACE FUNCTION get_user_verification_status()
RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_request JSON;
  v_jwt_claims JSON;
BEGIN
  -- Get JWT claims
  v_jwt_claims := auth.jwt();
  
  -- Check if we have JWT at all
  IF v_jwt_claims IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'No authentication token found'
    );
  END IF;
  
  -- Try to get wallet address from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  -- If no wallet_address in JWT, try other methods
  IF v_wallet_address IS NULL THEN
    -- Try to get from user_metadata
    v_wallet_address := (auth.jwt() -> 'user_metadata' ->> 'wallet_address');
    
    -- If still null, try app_metadata
    IF v_wallet_address IS NULL THEN
      v_wallet_address := (auth.jwt() -> 'app_metadata' ->> 'wallet_address');
    END IF;
  END IF;
  
  -- If we still don't have wallet address, look up by auth user ID
  IF v_wallet_address IS NULL THEN
    DECLARE
      v_auth_user_id TEXT;
    BEGIN
      v_auth_user_id := auth.jwt() ->> 'sub';
      IF v_auth_user_id IS NOT NULL THEN
        SELECT id, wallet_address 
        INTO v_user_id, v_wallet_address
        FROM wallet_users 
        WHERE auth_user_id = v_auth_user_id::UUID;
      END IF;
    END;
  END IF;
  
  -- If we have wallet address but no user_id yet, look up the user
  IF v_wallet_address IS NOT NULL AND v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM wallet_users 
    WHERE wallet_address = v_wallet_address;
  END IF;
  
  -- Final validation
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'User profile not found'
    );
  END IF;
  
  -- Get user's most recent verification request
  SELECT json_build_object(
    'id', id,
    'telegram_username', telegram_username,
    'old_wallet_address', old_wallet_address,
    'claimed_balance', claimed_balance,
    'current_balance', current_balance,
    'discrepancy_amount', discrepancy_amount,
    'status', status,
    'priority', priority,
    'admin_notes', admin_notes,
    'resolution_notes', resolution_notes,
    'created_at', created_at,
    'reviewed_at', reviewed_at,
    'updated_at', updated_at
  ) INTO v_request
  FROM balance_verification_requests
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN json_build_object(
    'success', true,
    'has_request', v_request IS NOT NULL,
    'request', v_request
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ ALL WALLET AUTHENTICATION FUNCTIONS UPDATED
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'All wallet authentication functions updated successfully!' a