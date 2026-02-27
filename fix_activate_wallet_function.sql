-- ============================================================================
-- FIX: Update activate_wallet function to handle notifications correctly
-- ============================================================================
-- Run this in Supabase SQL Editor

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
  -- Get user_id and check if already activated
  SELECT id, is_activated INTO v_user_id, v_already_activated
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF v_already_activated THEN
    RAISE EXCEPTION 'Wallet already activated';
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
  
  -- Create notification (with wallet_address included)
  BEGIN
    INSERT INTO wallet_notifications (
      user_id,
      wallet_address,
      type,
      title,
      message,
      priority,
      created_at
    ) VALUES (
      v_user_id,
      p_wallet_address,
      'system_announcement',
      'Wallet Activated Successfully!',
      'Welcome to RhizaCore! Your wallet is now fully activated and you can access all ecosystem features.',
      'high',
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'Notifications table does not exist, skipping notification';
    WHEN undefined_column THEN
      -- If wallet_address column doesn't exist in notifications, try without it
      INSERT INTO wallet_notifications (
        user_id,
        type,
        title,
        message,
        priority,
        created_at
      ) VALUES (
        v_user_id,
        'system_announcement',
        'Wallet Activated Successfully!',
        'Welcome to RhizaCore! Your wallet is now fully activated and you can access all ecosystem features.',
        'high',
        NOW()
      );
  END;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_wallet TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the function (replace with your wallet address)
-- SELECT activate_wallet(
--   'YOUR_WALLET_ADDRESS',
--   25.00,  -- activation_fee_usd
--   0.01,   -- activation_fee_ton
--   2500.00, -- ton_price
--   'test_tx_hash'
-- );

-- Check if it worked
-- SELECT 
--   wallet_address,
--   is_activated,
--   activated_at,
--   activation_fee_paid
-- FROM wallet_users
-- WHERE wallet_address = 'YOUR_WALLET_ADDRESS';

SELECT '✅ activate_wallet function updated successfully!' as status;
