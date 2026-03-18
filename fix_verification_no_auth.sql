-- ============================================================================
-- FIX: Balance Verification Submission Without Supabase Auth
-- This app uses wallet-based auth (no Supabase JWT), so we need an RPC
-- that accepts wallet_address directly instead of relying on auth.jwt()
-- ============================================================================

-- Drop old version
DROP FUNCTION IF EXISTS submit_balance_verification_request_by_wallet(TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT);

-- Create new wallet-address-based submission function
CREATE OR REPLACE FUNCTION submit_balance_verification_request_by_wallet(
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
  v_discrepancy DECIMAL(20,2);
BEGIN
  -- Look up user by wallet address
  SELECT id, COALESCE(rzc_balance, 0)
  INTO v_user_id, v_current_balance
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found for this wallet address.'
    );
  END IF;

  -- Check for existing pending/under_review request
  IF EXISTS (
    SELECT 1 FROM balance_verification_requests
    WHERE user_id = v_user_id
    AND status IN ('pending', 'under_review')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You already have a pending verification request. Please wait for it to be reviewed.'
    );
  END IF;

  -- Calculate discrepancy and priority
  v_discrepancy := p_claimed_balance - v_current_balance;

  v_priority := CASE
    WHEN ABS(v_discrepancy) > 10000 THEN 'urgent'
    WHEN ABS(v_discrepancy) > 1000  THEN 'high'
    WHEN ABS(v_discrepancy) < 100   THEN 'low'
    ELSE 'normal'
  END;

  -- Insert the request
  INSERT INTO balance_verification_requests (
    user_id,
    wallet_address,
    telegram_username,
    old_wallet_address,
    claimed_balance,
    current_balance,
    discrepancy_amount,
    screenshot_url,
    additional_notes,
    status,
    priority,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_telegram_username,
    p_old_wallet_address,
    p_claimed_balance,
    v_current_balance,
    v_discrepancy,
    p_screenshot_url,
    p_additional_notes,
    'pending',
    v_priority,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Verification request submitted successfully! We will review it within 24-48 hours.',
    'priority', v_priority,
    'discrepancy_amount', v_discrepancy,
    'current_balance', v_current_balance,
    'claimed_balance', p_claimed_balance
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in submit_balance_verification_request_by_wallet: %', SQLERRM;
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to anon so unauthenticated wallet users can call it
GRANT EXECUTE ON FUNCTION submit_balance_verification_request_by_wallet(TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_balance_verification_request_by_wallet(TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

-- Also create a wallet-based get_user_verification_status
DROP FUNCTION IF EXISTS get_user_verification_status_by_wallet(TEXT);

CREATE OR REPLACE FUNCTION get_user_verification_status_by_wallet(
  p_wallet_address TEXT
) RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_request JSON;
BEGIN
  SELECT id INTO v_user_id
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT row_to_json(r) INTO v_request
  FROM (
    SELECT * FROM balance_verification_requests
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT 1
  ) r;

  RETURN json_build_object(
    'success', true,
    'has_request', v_request IS NOT NULL,
    'request', v_request
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_verification_status_by_wallet(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_verification_status_by_wallet(TEXT) TO authenticated;

-- Wallet-based balance status check
DROP FUNCTION IF EXISTS get_user_balance_status_by_wallet(TEXT);

CREATE OR REPLACE FUNCTION get_user_balance_status_by_wallet(
  p_wallet_address TEXT
) RETURNS JSON AS $func$
DECLARE
  v_user RECORD;
BEGIN
  SELECT id, rzc_balance, balance_verified, balance_locked
  INTO v_user
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;

  IF v_user.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'balance_status', json_build_object(
      'balance_verified', COALESCE(v_user.balance_verified, false),
      'can_send_rzc', NOT COALESCE(v_user.balance_locked, true),
      'rzc_balance', COALESCE(v_user.rzc_balance, 0)
    )
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_balance_status_by_wallet(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_balance_status_by_wallet(TEXT) TO authenticated;


-- ============================================================================
-- ADMIN: Get all verification requests (wallet-based admin check, no JWT)
-- ============================================================================
DROP FUNCTION IF EXISTS get_all_verification_requests_by_wallet(TEXT, TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_all_verification_requests_by_wallet(
  p_admin_wallet TEXT,
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $func$
DECLARE
  v_is_admin BOOLEAN;
  v_requests JSON;
  v_total_count INTEGER;
BEGIN
  -- Verify admin status by wallet address
  SELECT (role = 'admin') INTO v_is_admin
  FROM wallet_users
  WHERE wallet_address = p_admin_wallet;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Total count
  SELECT COUNT(*) INTO v_total_count
  FROM balance_verification_requests
  WHERE (p_status IS NULL OR status = p_status);

  -- Fetch requests with user info
  SELECT json_agg(
    json_build_object(
      'id', bvr.id,
      'user_id', bvr.user_id,
      'wallet_address', bvr.wallet_address,
      'telegram_username', bvr.telegram_username,
      'old_wallet_address', bvr.old_wallet_address,
      'claimed_balance', bvr.claimed_balance,
      'current_balance', bvr.current_balance,
      'discrepancy_amount', bvr.discrepancy_amount,
      'screenshot_url', bvr.screenshot_url,
      'additional_notes', bvr.additional_notes,
      'status', bvr.status,
      'priority', bvr.priority,
      'admin_notes', bvr.admin_notes,
      'resolution_notes', bvr.resolution_notes,
      'reviewed_by', bvr.reviewed_by,
      'reviewed_at', bvr.reviewed_at,
      'created_at', bvr.created_at,
      'updated_at', bvr.updated_at,
      'user_info', json_build_object(
        'username', COALESCE(wu.name, 'Unknown'),
        'display_name', COALESCE(wu.name, 'Unknown'),
        'created_at', wu.created_at
      )
    ) ORDER BY bvr.created_at DESC
  ) INTO v_requests
  FROM balance_verification_requests bvr
  LEFT JOIN wallet_users wu ON bvr.user_id = wu.id
  WHERE (p_status IS NULL OR bvr.status = p_status)
  LIMIT p_limit OFFSET p_offset;

  RETURN json_build_object(
    'success', true,
    'requests', COALESCE(v_requests, '[]'::json),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_verification_requests_by_wallet(TEXT, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_all_verification_requests_by_wallet(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;


-- ============================================================================
-- ADMIN: Update verification request (wallet-based admin check, no JWT)
-- Approving sets balance_verified=true, can_send_rzc=true, credits RZC if needed
-- ============================================================================
DROP FUNCTION IF EXISTS admin_update_verification_request_by_wallet(TEXT, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_update_verification_request_by_wallet(
  p_admin_wallet TEXT,
  p_request_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSON AS $func$
DECLARE
  v_is_admin BOOLEAN;
  v_admin_id UUID;
  v_request RECORD;
  v_credited_amount DECIMAL(20,2) := 0;
  v_transaction_id UUID;
  v_balance_unlocked BOOLEAN := false;
  v_badge_id UUID;
BEGIN
  -- Verify admin and get their UUID
  SELECT id, (role = 'admin') INTO v_admin_id, v_is_admin
  FROM wallet_users
  WHERE wallet_address = p_admin_wallet;

  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Fetch the request
  SELECT * INTO v_request
  FROM balance_verification_requests
  WHERE id = p_request_id;

  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Verification request not found');
  END IF;

  -- Update the request status
  UPDATE balance_verification_requests SET
    status = p_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- If approved/resolved: credit missing RZC and unlock transfers
  IF p_status IN ('approved', 'resolved') THEN
    -- Credit discrepancy if positive (user was owed tokens)
    IF v_request.discrepancy_amount > 0 THEN
      UPDATE wallet_users
      SET rzc_balance = COALESCE(rzc_balance, 0) + v_request.discrepancy_amount,
          updated_at = NOW()
      WHERE id = v_request.user_id;

      v_credited_amount := v_request.discrepancy_amount;

      -- Log the RZC transaction
      INSERT INTO wallet_rzc_transactions (
        user_id, amount, type, description,
        balance_after, created_at
      )
      SELECT
        v_request.user_id,
        v_request.discrepancy_amount,
        'migration',
        'Balance verification credit - approved by admin',
        COALESCE(rzc_balance, 0),
        NOW()
      FROM wallet_users WHERE id = v_request.user_id
      RETURNING id INTO v_transaction_id;
    END IF;

    -- Unlock RZC transfers
    UPDATE wallet_users
    SET balance_verified = true,
        balance_locked = false,
        updated_at = NOW()
    WHERE id = v_request.user_id;

    v_balance_unlocked := true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', CASE
      WHEN p_status IN ('approved', 'resolved') THEN 'Request approved. RZC transfers unlocked.'
      WHEN p_status = 'rejected' THEN 'Request rejected.'
      ELSE 'Request updated.'
    END,
    'credited_amount', v_credited_amount,
    'transaction_id', v_transaction_id,
    'balance_unlocked', v_balance_unlocked,
    'verification_badge_awarded', false,
    'status', p_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_update_verification_request_by_wallet(TEXT, UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION admin_update_verification_request_by_wallet(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
