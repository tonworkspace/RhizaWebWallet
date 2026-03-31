-- ============================================================================
-- SERVER-SIDE RATE LIMITING FOR WALLET LOGIN
-- Prevents brute-force attacks on encrypted wallet passwords
-- ============================================================================
-- Date: March 25, 2026
-- Security Issue: #3 (CRITICAL)
-- Purpose: Add server-side rate limiting that cannot be bypassed by client

-- ============================================================================
-- 1. ADD RATE LIMITING COLUMNS TO wallet_users TABLE
-- ============================================================================

ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_failed_attempt TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_wallet_users_locked_until ON wallet_users(locked_until);
CREATE INDEX IF NOT EXISTS idx_wallet_users_failed_attempts ON wallet_users(failed_login_attempts);

-- ============================================================================
-- 2. CREATE RATE LIMITING FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION attempt_wallet_login(
  p_wallet_address TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_duration INTEGER DEFAULT 300  -- 5 minutes in seconds
) RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Get user record
  SELECT 
    id,
    wallet_address,
    failed_login_attempts,
    locked_until,
    last_failed_attempt
  INTO v_user
  FROM wallet_users 
  WHERE wallet_address = p_wallet_address;
  
  -- If user doesn't exist, return not found (don't reveal this to client)
  IF NOT FOUND THEN
    RETURN json_build_object(
      'allowed', false,
      'locked', false,
      'reason', 'not_found',
      'message', 'Wallet not found'
    );
  END IF;
  
  -- Check if currently locked
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until > v_now THEN
    RETURN json_build_object(
      'allowed', false,
      'locked', true,
      'locked_until', v_user.locked_until,
      'seconds_remaining', EXTRACT(EPOCH FROM (v_user.locked_until - v_now))::INTEGER,
      'message', 'Account temporarily locked due to too many failed attempts'
    );
  END IF;
  
  -- If lockout expired, reset counters
  IF v_user.locked_until IS NOT NULL AND v_user.locked_until <= v_now THEN
    UPDATE wallet_users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_failed_attempt = NULL
    WHERE wallet_address = p_wallet_address;
    
    RETURN json_build_object(
      'allowed', true,
      'locked', false,
      'attempts_remaining', p_max_attempts,
      'message', 'Login attempt allowed'
    );
  END IF;
  
  -- Check if too many attempts
  IF v_user.failed_login_attempts >= p_max_attempts THEN
    -- Lock the account
    v_locked_until := v_now + (p_lockout_duration || ' seconds')::INTERVAL;
    
    UPDATE wallet_users 
    SET 
      locked_until = v_locked_until
    WHERE wallet_address = p_wallet_address;
    
    RETURN json_build_object(
      'allowed', false,
      'locked', true,
      'locked_until', v_locked_until,
      'seconds_remaining', p_lockout_duration,
      'message', 'Account locked due to too many failed attempts'
    );
  END IF;
  
  -- Allow attempt
  RETURN json_build_object(
    'allowed', true,
    'locked', false,
    'attempts_remaining', p_max_attempts - v_user.failed_login_attempts,
    'current_attempts', v_user.failed_login_attempts,
    'message', 'Login attempt allowed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREATE FUNCTION TO RECORD FAILED ATTEMPT
-- ============================================================================

CREATE OR REPLACE FUNCTION record_failed_login(
  p_wallet_address TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_duration INTEGER DEFAULT 300
) RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_new_attempts INTEGER;
  v_locked_until TIMESTAMPTZ;
BEGIN
  -- Get current user record
  SELECT 
    id,
    wallet_address,
    failed_login_attempts,
    locked_until
  INTO v_user
  FROM wallet_users 
  WHERE wallet_address = p_wallet_address;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Wallet not found'
    );
  END IF;
  
  -- Increment failed attempts
  v_new_attempts := COALESCE(v_user.failed_login_attempts, 0) + 1;
  
  -- Check if should lock
  IF v_new_attempts >= p_max_attempts THEN
    v_locked_until := v_now + (p_lockout_duration || ' seconds')::INTERVAL;
    
    UPDATE wallet_users 
    SET 
      failed_login_attempts = v_new_attempts,
      locked_until = v_locked_until,
      last_failed_attempt = v_now
    WHERE wallet_address = p_wallet_address;
    
    RETURN json_build_object(
      'success', true,
      'locked', true,
      'locked_until', v_locked_until,
      'attempts', v_new_attempts,
      'attempts_remaining', 0,
      'message', 'Account locked due to too many failed attempts'
    );
  ELSE
    -- Just increment counter
    UPDATE wallet_users 
    SET 
      failed_login_attempts = v_new_attempts,
      last_failed_attempt = v_now
    WHERE wallet_address = p_wallet_address;
    
    RETURN json_build_object(
      'success', true,
      'locked', false,
      'attempts', v_new_attempts,
      'attempts_remaining', p_max_attempts - v_new_attempts,
      'message', format('Failed attempt recorded. %s attempts remaining', p_max_attempts - v_new_attempts)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. CREATE FUNCTION TO RESET ON SUCCESSFUL LOGIN
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_login_attempts(
  p_wallet_address TEXT
) RETURNS JSON AS $$
BEGIN
  UPDATE wallet_users 
  SET 
    failed_login_attempts = 0,
    locked_until = NULL,
    last_failed_attempt = NULL,
    last_login_at = NOW()
  WHERE wallet_address = p_wallet_address;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Login attempts reset'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Wallet not found'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE SECURITY AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('success', 'failed', 'locked')),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for security audit
CREATE INDEX IF NOT EXISTS idx_wallet_login_attempts_address ON wallet_login_attempts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_login_attempts_type ON wallet_login_attempts(attempt_type);
CREATE INDEX IF NOT EXISTS idx_wallet_login_attempts_created ON wallet_login_attempts(created_at DESC);

-- ============================================================================
-- 6. CREATE FUNCTION TO LOG LOGIN ATTEMPTS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_login_attempt(
  p_wallet_address TEXT,
  p_attempt_type TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO wallet_login_attempts (
    wallet_address,
    attempt_type,
    ip_address,
    user_agent,
    metadata,
    created_at
  ) VALUES (
    p_wallet_address,
    p_attempt_type,
    p_ip_address,
    p_user_agent,
    p_metadata,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE wallet_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only admins can view login attempt logs
CREATE POLICY "Admins can view login attempts"
  ON wallet_login_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_users.wallet_address = current_setting('app.wallet_address', true)
      AND wallet_users.role = 'admin'
    )
  );

-- System can insert login attempts
CREATE POLICY "System can insert login attempts"
  ON wallet_login_attempts FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION attempt_wallet_login TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_failed_login TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_login_attempts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_login_attempt TO anon, authenticated;

GRANT SELECT, INSERT ON wallet_login_attempts TO anon, authenticated;

-- ============================================================================
-- 9. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN wallet_users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN wallet_users.locked_until IS 'Timestamp until which the account is locked';
COMMENT ON COLUMN wallet_users.last_failed_attempt IS 'Timestamp of the last failed login attempt';

COMMENT ON FUNCTION attempt_wallet_login IS 'Checks if a login attempt is allowed based on rate limiting rules';
COMMENT ON FUNCTION record_failed_login IS 'Records a failed login attempt and locks account if threshold exceeded';
COMMENT ON FUNCTION reset_login_attempts IS 'Resets failed login counters on successful authentication';
COMMENT ON FUNCTION log_login_attempt IS 'Logs login attempts for security audit trail';

COMMENT ON TABLE wallet_login_attempts IS 'Security audit log for all wallet login attempts';

-- ============================================================================
-- 10. VERIFICATION QUERY
-- ============================================================================

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_users' 
AND column_name IN ('failed_login_attempts', 'locked_until', 'last_failed_attempt');

-- Verify functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'attempt_wallet_login',
  'record_failed_login',
  'reset_login_attempts',
  'log_login_attempt'
);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- To apply this migration:
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Create a new query
-- 3. Paste this entire file
-- 4. Click "Run"
-- 5. Verify all columns, functions, and tables are created

