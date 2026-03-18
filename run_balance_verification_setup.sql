-- ═══════════════════════════════════════════════════════════════════════════════
-- 🚀 RUN BALANCE VERIFICATION SETUP
-- ═══════════════════════════════════════════════════════════════════════════════
-- Execute this to set up the complete balance verification system

-- First, check if the functions already exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_balance_status') THEN
        RAISE NOTICE 'Setting up balance verification system...';
    ELSE
        RAISE NOTICE 'Balance verification system already exists, updating...';
    END IF;
END $$;

-- ─── Balance Verification Requests Table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  
  -- User submitted information
  telegram_username TEXT NOT NULL,
  old_wallet_address TEXT NOT NULL, -- Wallet used before migration
  claimed_balance DECIMAL(20,2) NOT NULL, -- What user claims their balance should be
  screenshot_url TEXT, -- URL to uploaded screenshot of telegram wallet balance
  additional_notes TEXT,
  
  -- System information
  current_balance DECIMAL(20,2) NOT NULL, -- Current RZC balance in system
  discrepancy_amount DECIMAL(20,2) GENERATED ALWAYS AS (claimed_balance - current_balance) STORED,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Admin workflow
  reviewed_by UUID REFERENCES wallet_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT unique_user_pending_request UNIQUE (user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- ─── Indexes for Performance ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_balance_verification_status ON balance_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_balance_verification_user ON balance_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_verification_created ON balance_verification_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_verification_priority ON balance_verification_requests(priority, status);

-- ─── Enable RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE balance_verification_requests ENABLE ROW LEVEL SECURITY;

-- ─── Add Verification Fields to wallet_users Table ──────────────────────────────
ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS balance_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS balance_locked BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS verification_badge_earned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'basic', 'premium', 'gold'));

-- ─── Create Verification Badge Types ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('balance_verified', 'kyc_verified', 'premium_member', 'early_adopter')),
  badge_level TEXT NOT NULL DEFAULT 'basic' CHECK (badge_level IN ('basic', 'silver', 'gold', 'platinum')),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, badge_type)
);

-- ─── Indexes for Performance ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_verification_badges_user ON verification_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_badges_type ON verification_badges(badge_type, is_active);
CREATE INDEX IF NOT EXISTS idx_wallet_users_verification ON wallet_users(balance_verified, balance_locked);

-- ─── RLS Policies ────────────────────────────────────────────────────────────────

-- Users can view their own verification requests
DROP POLICY IF EXISTS "Users can view own verification requests" ON balance_verification_requests;
CREATE POLICY "Users can view own verification requests" ON balance_verification_requests
  FOR SELECT USING (auth.jwt() ->> 'wallet_address' = wallet_address);

-- Users can insert their own verification requests
DROP POLICY IF EXISTS "Users can create own verification requests" ON balance_verification_requests;
CREATE POLICY "Users can create own verification requests" ON balance_verification_requests
  FOR INSERT WITH CHECK (auth.jwt() ->> 'wallet_address' = wallet_address);

-- Admins can view all verification requests
DROP POLICY IF EXISTS "Admins can view all verification requests" ON balance_verification_requests;
CREATE POLICY "Admins can view all verification requests" ON balance_verification_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_address = auth.jwt() ->> 'wallet_address' 
      AND role = 'admin'
    )
  );

-- Admins can update all verification requests
DROP POLICY IF EXISTS "Admins can update all verification requests" ON balance_verification_requests;
CREATE POLICY "Admins can update all verification requests" ON balance_verification_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM wallet_users 
      WHERE wallet_address = auth.jwt() ->> 'wallet_address' 
      AND role = 'admin'
    )
  );

-- ─── Submit Verification Request Function ───────────────────────────────────────
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
BEGIN
  -- Get user info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get user ID and current balance
  SELECT id, COALESCE(rzc_balance, 0) INTO v_user_id, v_current_balance
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
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
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Get User Verification Status Function ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_user_verification_status()
RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_request JSON;
BEGIN
  -- Get user info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get user ID
  SELECT id INTO v_user_id
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
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

-- ─── Function to Check User's Balance Lock Status ───────────────────────────────
CREATE OR REPLACE FUNCTION get_user_balance_status()
RETURNS JSON AS $func$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_user_status RECORD;
  v_badges JSON;
BEGIN
  -- Get user info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
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
  WHERE wallet_address = v_wallet_address;
  
  IF v_user_status IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
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
  WHERE user_id = v_user_status.id AND is_active = TRUE;
  
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

-- ─── Enhanced Admin Update Function with Balance Unlock ─────────────────────────
CREATE OR REPLACE FUNCTION admin_update_verification_request_with_unlock(
  p_request_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSON AS $func$
DECLARE
  v_wallet_address TEXT;
  v_is_admin BOOLEAN;
  v_admin_user_id UUID;
  v_request RECORD;
  v_credit_amount DECIMAL(20,2);
  v_transaction_id UUID;
  v_badge_id UUID;
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
  
  -- Get the verification request details
  SELECT * INTO v_request
  FROM balance_verification_requests
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Verification request not found');
  END IF;
  
  -- Calculate credit amount (only if approving and there's a positive discrepancy)
  v_credit_amount := 0;
  IF p_status = 'approved' AND v_request.discrepancy_amount > 0 THEN
    v_credit_amount := v_request.discrepancy_amount;
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update the verification request
    UPDATE balance_verification_requests
    SET 
      status = CASE 
        WHEN p_status = 'approved' THEN 'resolved'
        ELSE p_status
      END,
      reviewed_by = v_admin_user_id,
      reviewed_at = NOW(),
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      resolution_notes = CASE 
        WHEN p_status = 'approved' 
        THEN COALESCE(p_resolution_notes, 'Approved - Balance verified and unlocked' || 
          CASE WHEN v_credit_amount > 0 THEN ', ' || v_credit_amount || ' RZC credited' ELSE '' END)
        ELSE COALESCE(p_resolution_notes, resolution_notes)
      END,
      updated_at = NOW()
    WHERE id = p_request_id;
    
    -- If approving, unlock balance and award verification badge
    IF p_status = 'approved' THEN
      -- Credit RZC if there's a positive discrepancy
      IF v_credit_amount > 0 THEN
        UPDATE wallet_users
        SET 
          rzc_balance = COALESCE(rzc_balance, 0) + v_credit_amount,
          updated_at = NOW()
        WHERE id = v_request.user_id;
        
        -- Create RZC transaction record (if rzc_transactions table exists)
        BEGIN
          INSERT INTO rzc_transactions (
            user_id,
            type,
            amount,
            balance_after,
            description,
            reference_id,
            created_at
          )
          SELECT 
            v_request.user_id,
            'balance_verification',
            v_credit_amount,
            COALESCE(wu.rzc_balance, 0),
            'Balance verification approved - RZC credited for discrepancy',
            p_request_id,
            NOW()
          FROM wallet_users wu
          WHERE wu.id = v_request.user_id;
        EXCEPTION WHEN OTHERS THEN
          -- Continue if rzc_transactions table doesn't exist
          NULL;
        END;
      END IF;
      
      -- UNLOCK BALANCE AND MARK AS VERIFIED
      UPDATE wallet_users
      SET 
        balance_verified = TRUE,
        balance_locked = FALSE,
        verification_badge_earned_at = NOW(),
        verification_level = 'basic',
        updated_at = NOW()
      WHERE id = v_request.user_id;
      
      -- AWARD VERIFICATION BADGE
      INSERT INTO verification_badges (
        user_id,
        badge_type,
        badge_level,
        earned_at,
        metadata,
        is_active
      ) VALUES (
        v_request.user_id,
        'balance_verified',
        'basic',
        NOW(),
        json_build_object(
          'verification_request_id', p_request_id,
          'verified_by', v_admin_user_id,
          'credited_amount', v_credit_amount,
          'verification_date', NOW()
        ),
        TRUE
      ) ON CONFLICT (user_id, badge_type) 
      DO UPDATE SET 
        earned_at = NOW(),
        metadata = json_build_object(
          'verification_request_id', p_request_id,
          'verified_by', v_admin_user_id,
          'credited_amount', v_credit_amount,
          'verification_date', NOW()
        ),
        is_active = TRUE
      RETURNING id INTO v_badge_id;
      
      RETURN json_build_object(
        'success', true, 
        'message', 'Balance verification approved! User balance unlocked and verification badge awarded.' ||
          CASE WHEN v_credit_amount > 0 THEN ' ' || v_credit_amount || ' RZC credited.' ELSE '' END,
        'credited_amount', v_credit_amount,
        'transaction_id', v_transaction_id,
        'badge_id', v_badge_id,
        'balance_unlocked', true,
        'verification_badge_awarded', true,
        'status', 'resolved'
      );
    ELSE
      -- If rejected, keep balance locked
      RETURN json_build_object(
        'success', true, 
        'message', 'Verification request ' || p_status,
        'credited_amount', 0,
        'balance_unlocked', false,
        'verification_badge_awarded', false,
        'status', p_status
      );
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Rollback will happen automatically
    RETURN json_build_object('success', false, 'error', 'Failed to process verification: ' || SQLERRM);
  END;
  
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ BALANCE VERIFICATION SETUP COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Balance verification system setup complete! Functions created successfully.' as status;

-- ─── Get All Verification Requests (Admin) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION get_all_verification_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $func$
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
  
  -- Verify admin status
  SELECT (role = 'admin') INTO v_is_admin
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Get total count
  SELECT COUNT(*) INTO v_total_count
  FROM balance_verification_requests
  WHERE (p_status IS NULL OR status = p_status);
  
  -- Get verification requests with user info
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
      'status', bvr.status,
      'priority', bvr.priority,
      'admin_notes', bvr.admin_notes,
      'resolution_notes', bvr.resolution_notes,
      'created_at', bvr.created_at,
      'reviewed_at', bvr.reviewed_at,
      'updated_at', bvr.updated_at,
      'user_info', json_build_object(
        'username', COALESCE(wu.username, wu.name, 'Unknown'),
        'display_name', COALESCE(wu.name, wu.username, 'Unknown'),
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

-- ─── Storage Bucket Setup ────────────────────────────────────────────────────────

-- Create storage bucket for verification documents (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ COMPLETE BALANCE VERIFICATION SETUP FINISHED
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Complete balance verification system setup finished! All functions and tables created successfully.' as status;