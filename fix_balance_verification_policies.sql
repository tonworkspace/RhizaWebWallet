-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔧 FIX BALANCE VERIFICATION POLICIES (CLEAN EXISTING)
-- ═══════════════════════════════════════════════════════════════════════════════
-- This script safely removes existing policies and recreates them

-- ─── Drop Existing Policies (if they exist) ─────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Users can create verification requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Users can update own pending requests" ON balance_verification_requests;
DROP POLICY IF EXISTS "Admins can manage all verification requests" ON balance_verification_requests;

-- ─── Drop Existing Functions (if they exist) ────────────────────────────────────
DROP FUNCTION IF EXISTS submit_balance_verification_request(TEXT, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_user_verification_status();
DROP FUNCTION IF EXISTS admin_update_verification_request(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_all_verification_requests(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS update_balance_verification_timestamp();
DROP FUNCTION IF EXISTS verify_balance_verification_setup();

-- ─── Drop Existing Triggers (if they exist) ─────────────────────────────────────
DROP TRIGGER IF EXISTS update_balance_verification_requests_timestamp ON balance_verification_requests;

-- ─── Recreate RLS Policies ───────────────────────────────────────────────────────

-- Users can only see their own requests
CREATE POLICY "Users can view own verification requests" ON balance_verification_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_users.id = balance_verification_requests.user_id 
      AND wallet_users.wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

-- Users can create their own requests (but only one pending at a time)
CREATE POLICY "Users can create verification requests" ON balance_verification_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_users.id = balance_verification_requests.user_id 
      AND wallet_users.wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

-- Users can update their own pending requests
CREATE POLICY "Users can update own pending requests" ON balance_verification_requests
  FOR UPDATE USING (
    status = 'pending' AND
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_users.id = balance_verification_requests.user_id 
      AND wallet_users.wallet_address = auth.jwt() ->> 'wallet_address'
    )
  );

-- Admins can see and manage all requests
CREATE POLICY "Admins can manage all verification requests" ON balance_verification_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_users.wallet_address = auth.jwt() ->> 'wallet_address'
      AND wallet_users.role = 'admin'
    )
  );

-- ─── Recreate Functions ──────────────────────────────────────────────────────────

-- Function to submit a balance verification request
CREATE OR REPLACE FUNCTION submit_balance_verification_request(
  p_telegram_username TEXT,
  p_old_wallet_address TEXT,
  p_claimed_balance DECIMAL(20,2),
  p_screenshot_url TEXT DEFAULT NULL,
  p_additional_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_current_balance DECIMAL(20,2);
  v_wallet_address TEXT;
  v_request_id UUID;
  v_existing_request UUID;
BEGIN
  -- Get user info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get user ID and current balance from wallet_users table
  SELECT id, COALESCE(rzc_balance, 0) INTO v_user_id, v_current_balance
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Check for existing pending request
  SELECT id INTO v_existing_request
  FROM balance_verification_requests
  WHERE user_id = v_user_id AND status = 'pending';
  
  IF v_existing_request IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already have a pending verification request');
  END IF;
  
  -- Create the verification request
  INSERT INTO balance_verification_requests (
    user_id,
    wallet_address,
    telegram_username,
    old_wallet_address,
    claimed_balance,
    current_balance,
    screenshot_url,
    additional_notes
  ) VALUES (
    v_user_id,
    v_wallet_address,
    p_telegram_username,
    p_old_wallet_address,
    p_claimed_balance,
    v_current_balance,
    p_screenshot_url,
    p_additional_notes
  ) RETURNING id INTO v_request_id;
  
  RETURN json_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Verification request submitted successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's verification request status
CREATE OR REPLACE FUNCTION get_user_verification_status()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_request RECORD;
BEGIN
  -- Get user info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get user ID from wallet_users table
  SELECT id INTO v_user_id
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Get latest verification request
  SELECT * INTO v_request
  FROM balance_verification_requests
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_request IS NULL THEN
    RETURN json_build_object('success', true, 'has_request', false);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'has_request', true,
    'request', row_to_json(v_request)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to update verification request status
CREATE OR REPLACE FUNCTION admin_update_verification_request(
  p_request_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_is_admin BOOLEAN;
  v_admin_user_id UUID;
BEGIN
  -- Get admin info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Verify admin status from wallet_users table using role
  SELECT id, (role = 'admin') INTO v_admin_user_id, v_is_admin
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Update the request
  UPDATE balance_verification_requests
  SET 
    status = p_status,
    reviewed_by = v_admin_user_id,
    reviewed_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    resolution_notes = COALESCE(p_resolution_notes, resolution_notes),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Verification request not found');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Verification request updated successfully');
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all verification requests for admin dashboard
CREATE OR REPLACE FUNCTION get_all_verification_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_is_admin BOOLEAN;
  v_requests JSON;
  v_total_count INTEGER;
BEGIN
  -- Get admin info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Verify admin status from wallet_users table using role
  SELECT (role = 'admin') INTO v_is_admin
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM balance_verification_requests bvr
  JOIN wallet_users u ON bvr.user_id = u.id
  WHERE (p_status IS NULL OR bvr.status = p_status);
  
  -- Get requests with user info
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
      'reviewed_by', bvr.reviewed_by,
      'reviewed_at', bvr.reviewed_at,
      'admin_notes', bvr.admin_notes,
      'resolution_notes', bvr.resolution_notes,
      'created_at', bvr.created_at,
      'updated_at', bvr.updated_at,
      'user_info', json_build_object(
        'username', COALESCE(u.username, u.name, 'Unknown'),
        'display_name', COALESCE(u.display_name, u.name, 'Unknown'),
        'created_at', u.created_at
      )
    )
  ) INTO v_requests
  FROM balance_verification_requests bvr
  JOIN wallet_users u ON bvr.user_id = u.id
  WHERE (p_status IS NULL OR bvr.status = p_status)
  ORDER BY 
    CASE bvr.priority 
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'normal' THEN 3
      WHEN 'low' THEN 4
    END,
    bvr.created_at DESC
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Recreate Triggers ───────────────────────────────────────────────────────────

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_balance_verification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_balance_verification_requests_timestamp
  BEFORE UPDATE ON balance_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_verification_timestamp();

-- ─── Verification Function ───────────────────────────────────────────────────────

-- Function to check system setup
CREATE OR REPLACE FUNCTION verify_balance_verification_setup()
RETURNS JSON AS $$
DECLARE
  v_table_exists BOOLEAN;
  v_functions_count INTEGER;
  v_policies_count INTEGER;
  v_bucket_exists BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'balance_verification_requests'
  ) INTO v_table_exists;
  
  -- Check functions
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines 
  WHERE routine_name LIKE '%balance_verification%';
  
  -- Check RLS policies
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies 
  WHERE tablename = 'balance_verification_requests';
  
  -- Check storage bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets 
    WHERE id = 'verification-documents'
  ) INTO v_bucket_exists;
  
  RETURN json_build_object(
    'success', true,
    'setup_status', json_build_object(
      'table_exists', v_table_exists,
      'functions_count', v_functions_count,
      'policies_count', v_policies_count,
      'bucket_exists', v_bucket_exists,
      'all_ready', v_table_exists AND v_functions_count >= 4 AND v_policies_count >= 4 AND v_bucket_exists
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ BALANCE VERIFICATION POLICIES FIXED
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Balance verification policies and functions recreated successfully!' as status;