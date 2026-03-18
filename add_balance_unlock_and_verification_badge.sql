-- ═══════════════════════════════════════════════════════════════════════════════
-- 🔓 BALANCE UNLOCK & VERIFICATION BADGE SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════════
-- Integrates balance verification with balance unlock and verification badge

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

-- ─── Enhanced Admin Update Function with Balance Unlock ─────────────────────────
CREATE OR REPLACE FUNCTION admin_update_verification_request_with_unlock(
  p_request_id UUID,
  p_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Function to Check User's Balance Lock Status ───────────────────────────────
CREATE OR REPLACE FUNCTION get_user_balance_status()
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Function to Get All Users' Verification Status (Admin) ─────────────────────
CREATE OR REPLACE FUNCTION get_all_users_verification_status(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
) RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_is_admin BOOLEAN;
  v_users JSON;
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
  SELECT COUNT(*) INTO v_total_count FROM wallet_users;
  
  -- Get users with verification status
  SELECT json_agg(
    json_build_object(
      'id', wu.id,
      'wallet_address', wu.wallet_address,
      'name', COALESCE(wu.name, wu.username, 'Unknown'),
      'balance_verified', wu.balance_verified,
      'balance_locked', wu.balance_locked,
      'verification_level', wu.verification_level,
      'verification_badge_earned_at', wu.verification_badge_earned_at,
      'rzc_balance', wu.rzc_balance,
      'created_at', wu.created_at,
      'badge_count', COALESCE(badge_counts.count, 0)
    ) ORDER BY wu.created_at DESC
  ) INTO v_users
  FROM wallet_users wu
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM verification_badges
    WHERE is_active = TRUE
    GROUP BY user_id
  ) badge_counts ON wu.id = badge_counts.user_id
  LIMIT p_limit OFFSET p_offset;
  
  RETURN json_build_object(
    'success', true,
    'users', COALESCE(v_users, '[]'::json),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Function to Manually Unlock User Balance (Admin Emergency) ─────────────────
CREATE OR REPLACE FUNCTION admin_unlock_user_balance(
  p_user_wallet_address TEXT,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_is_admin BOOLEAN;
  v_admin_user_id UUID;
  v_target_user_id UUID;
BEGIN
  -- Get admin info from JWT
  v_wallet_address := auth.jwt() ->> 'wallet_address';
  
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Verify admin status
  SELECT id, (role = 'admin') INTO v_admin_user_id, v_is_admin
  FROM wallet_users 
  WHERE wallet_address = v_wallet_address;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Get target user
  SELECT id INTO v_target_user_id
  FROM wallet_users
  WHERE wallet_address = p_user_wallet_address;
  
  IF v_target_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  
  -- Unlock balance
  UPDATE wallet_users
  SET 
    balance_locked = FALSE,
    balance_verified = TRUE,
    verification_level = 'basic',
    updated_at = NOW()
  WHERE id = v_target_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User balance unlocked manually by admin',
    'admin_notes', p_admin_notes
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ BALANCE UNLOCK & VERIFICATION BADGE SYSTEM COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT 'Balance unlock and verification badge system added successfully!' as status;