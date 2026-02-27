-- ============================================================================
-- WALLET ACTIVATION RPC FUNCTIONS
-- ============================================================================
-- These functions handle the $15 wallet activation flow
-- Users pay $15 to activate wallet and receive 150 RZC genesis grant
-- ============================================================================

-- Function 1: Get Wallet Activation Status
-- Returns activation status and details for a user
CREATE OR REPLACE FUNCTION get_wallet_activation_status(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'success', true,
    'wallet_activated', wu.is_activated,
    'wallet_activated_at', wu.activated_at,
    'activation_details', (
      SELECT json_build_object(
        'id', wa.id,
        'ton_amount', wa.activation_fee_ton,
        'usd_amount', wa.activation_fee_usd,
        'rzc_awarded', 150,
        'transaction_hash', wa.transaction_hash,
        'status', 'completed',
        'created_at', wa.activated_at
      )
      FROM wallet_activations wa
      WHERE wa.wallet_address = wu.wallet_address
      ORDER BY wa.activated_at DESC
      LIMIT 1
    )
  ) INTO v_result
  FROM wallet_users wu
  WHERE wu.id = p_user_id;
  
  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Process Wallet Activation
-- Activates wallet, awards 150 RZC, and records transaction
CREATE OR REPLACE FUNCTION process_wallet_activation(
  p_user_id INTEGER,
  p_ton_amount NUMERIC,
  p_ton_price NUMERIC,
  p_transaction_hash TEXT,
  p_sender_address TEXT,
  p_receiver_address TEXT
)
RETURNS JSON AS $$
DECLARE
  v_wallet_address TEXT;
  v_already_activated BOOLEAN;
  v_new_balance NUMERIC;
BEGIN
  -- Get wallet address and activation status
  SELECT wallet_address, is_activated 
  INTO v_wallet_address, v_already_activated
  FROM wallet_users 
  WHERE id = p_user_id;
  
  -- Check if user exists
  IF v_wallet_address IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Check if already activated
  IF v_already_activated THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Wallet already activated'
    );
  END IF;
  
  -- Update wallet_users - activate and award 150 RZC
  UPDATE wallet_users
  SET 
    is_activated = TRUE,
    activated_at = NOW(),
    activation_fee_paid = 15,
    rzc_balance = rzc_balance + 150,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING rzc_balance INTO v_new_balance;
  
  -- Insert activation record for audit trail
  INSERT INTO wallet_activations (
    wallet_address,
    activation_fee_usd,
    activation_fee_ton,
    ton_price,
    transaction_hash,
    sender_address,
    receiver_address,
    activated_at
  ) VALUES (
    v_wallet_address,
    15,
    p_ton_amount,
    p_ton_price,
    p_transaction_hash,
    p_sender_address,
    p_receiver_address,
    NOW()
  );
  
  -- Create RZC transaction record
  INSERT INTO wallet_rzc_transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    'activation_reward',
    150,
    v_new_balance,
    'Wallet activation genesis grant',
    json_build_object(
      'transaction_hash', p_transaction_hash,
      'activation_fee_usd', 15,
      'activation_fee_ton', p_ton_amount,
      'ton_price', p_ton_price,
      'sender_address', p_sender_address,
      'receiver_address', p_receiver_address
    ),
    NOW()
  );
  
  RETURN json_build_object(
    'success', true,
    'rzc_awarded', 150,
    'new_balance', v_new_balance,
    'message', 'Wallet activated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION get_wallet_activation_status(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_wallet_activation(INTEGER, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================
-- Test get_wallet_activation_status
-- SELECT get_wallet_activation_status(1);

-- Test process_wallet_activation (replace with actual values)
-- SELECT process_wallet_activation(
--   1,                                    -- user_id
--   6.1224,                              -- ton_amount
--   2.45,                                -- ton_price
--   'EQxxx...transaction_hash',          -- transaction_hash
--   'EQxxx...sender_address',            -- sender_address
--   'EQxxx...receiver_address'           -- receiver_address
-- );

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. These functions work with existing wallet_users and wallet_activations tables
-- 2. Activation fee is fixed at $15 USD
-- 3. Genesis grant is fixed at 150 RZC
-- 4. Transaction hash can be truncated if too long (handled in frontend)
-- 5. Functions include error handling and validation
-- 6. All operations are atomic (transaction-safe)
-- ============================================================================
