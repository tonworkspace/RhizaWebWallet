-- ============================================================================
-- FIX: Activate Wallet Notification Error
-- ============================================================================
-- Issue: wallet_notifications.wallet_address is NULL causing constraint violation
-- Root Cause: The activate_wallet function is not properly passing wallet_address
-- Solution: Fix the notification insert to ensure wallet_address is always set
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_wallet(
  p_wallet_address TEXT,
  p_activation_fee_usd DECIMAL(10,2),
  p_activation_fee_ton DECIMAL(10,4),
  p_ton_price DECIMAL(10,2),
  p_transaction_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_already_activated BOOLEAN;
BEGIN
  -- Validate input
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RAISE EXCEPTION 'Wallet address is required';
  END IF;

  -- Get user_id and check if already activated
  SELECT id, is_activated INTO v_user_id, v_already_activated
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found: %', p_wallet_address;
  END IF;
  
  IF v_already_activated THEN
    RAISE NOTICE 'Wallet already activated: %', p_wallet_address;
    RETURN TRUE; -- Return success if already activated
  END IF;
  
  -- Update wallet_users
  UPDATE wallet_users
  SET is_activated = TRUE,
      activated_at = NOW(),
      activation_fee_paid = p_activation_fee_ton,
      updated_at = NOW()
  WHERE wallet_address = p_wallet_address;
  
  -- Record activation
  INSERT INTO wallet_activations (
    user_id,
    wallet_address,
    activation_fee_usd,
    activation_fee_ton,
    ton_price_at_activation,
    transaction_hash,
    status,
    completed_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_activation_fee_usd,
    p_activation_fee_ton,
    p_ton_price,
    p_transaction_hash,
    'completed',
    NOW()
  );
  
  -- ── FIX: Create notification with explicit wallet_address ──────────────────
  -- CRITICAL: Always pass wallet_address to prevent NULL constraint violation
  BEGIN
    INSERT INTO wallet_notifications (
      user_id,
      wallet_address,  -- CRITICAL: Must not be NULL
      type,
      title,
      message,
      data,
      priority,
      created_at
    ) VALUES (
      v_user_id,
      p_wallet_address,  -- EXPLICIT: Use the function parameter
      'system_announcement',
      'Wallet Activated Successfully!',
      'Welcome to RhizaCore! Your wallet is now fully activated and you can access all ecosystem features.',
      jsonb_build_object(
        'activation_fee_usd', p_activation_fee_usd,
        'activation_fee_ton', p_activation_fee_ton,
        'transaction_hash', p_transaction_hash
      ),
      'high',
      NOW()
    );
    
    RAISE NOTICE '✅ Activation notification created for wallet: %', p_wallet_address;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '⚠️ Notifications table does not exist, skipping notification';
    WHEN undefined_column THEN
      RAISE NOTICE '⚠️ Notifications table missing columns, skipping notification';
    WHEN OTHERS THEN
      -- Log the error but don't fail the activation
      RAISE NOTICE '⚠️ Failed to create notification (non-blocking): %', SQLERRM;
  END;
  
  RAISE NOTICE '✅ Wallet activated successfully: %', p_wallet_address;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_wallet TO authenticated, anon;

-- ============================================================================
-- VERIFICATION TEST
-- ============================================================================

-- Test the function with a sample wallet (replace with actual test wallet)
-- SELECT activate_wallet(
--   'UQTest123...', 
--   10.00,  -- activation_fee_usd
--   0.2,    -- activation_fee_ton
--   2.45,   -- ton_price
--   'test_tx_hash_123'
-- );

-- Check recent activations
SELECT 
  wa.wallet_address,
  wa.activation_fee_usd,
  wa.activation_fee_ton,
  wa.status,
  wa.completed_at,
  wu.is_activated
FROM wallet_activations wa
JOIN wallet_users wu ON wa.user_id = wu.id
ORDER BY wa.completed_at DESC
LIMIT 5;

-- Check recent activation notifications
SELECT 
  wn.wallet_address,
  wn.type,
  wn.title,
  wn.message,
  wn.created_at
FROM wallet_notifications wn
WHERE wn.type = 'system_announcement'
AND wn.title LIKE '%Activated%'
ORDER BY wn.created_at DESC
LIMIT 5;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ activate_wallet function fixed!';
  RAISE NOTICE '📋 Changes:';
  RAISE NOTICE '   1. Added wallet_address validation';
  RAISE NOTICE '   2. Fixed notification insert to explicitly pass wallet_address';
  RAISE NOTICE '   3. Added error handling to prevent activation failure';
  RAISE NOTICE '   4. Returns TRUE if already activated (idempotent)';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test the fix:';
  RAISE NOTICE '   1. Try activating a wallet from the UI';
  RAISE NOTICE '   2. Check that notification is created with wallet_address';
  RAISE NOTICE '   3. Verify no NULL constraint violations';
END $$;
