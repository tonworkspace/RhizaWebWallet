-- ============================================================================
-- RZC TRANSFER SYSTEM
-- ============================================================================
-- Enables sending and receiving RZC tokens using wallet addresses or usernames
-- Supports @username or wallet address as recipient
-- ============================================================================

-- ============================================================================
-- STEP 1: Create RZC Transfer Function
-- ============================================================================

CREATE OR REPLACE FUNCTION transfer_rzc(
  p_sender_user_id UUID,
  p_recipient_identifier TEXT,  -- Can be username or wallet address
  p_amount NUMERIC,
  p_comment TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  recipient_user_id UUID,
  recipient_username TEXT,
  new_sender_balance NUMERIC,
  new_recipient_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient_user_id UUID;
  v_recipient_wallet TEXT;
  v_recipient_username TEXT;
  v_sender_balance NUMERIC;
  v_recipient_balance NUMERIC;
  v_transaction_id UUID;
  v_sender_wallet TEXT;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    success := FALSE;
    message := 'Amount must be greater than 0';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Get sender info
  SELECT wallet_address, rzc_balance INTO v_sender_wallet, v_sender_balance
  FROM wallet_users
  WHERE id = p_sender_user_id;

  IF v_sender_wallet IS NULL THEN
    success := FALSE;
    message := 'Sender not found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check sender has enough balance
  IF v_sender_balance < p_amount THEN
    success := FALSE;
    message := 'Insufficient RZC balance';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Resolve recipient (username or wallet address)
  -- First, try to resolve as username
  IF p_recipient_identifier LIKE '@%' OR LENGTH(p_recipient_identifier) < 40 THEN
    -- It's likely a username
    DECLARE
      v_clean_username TEXT;
    BEGIN
      v_clean_username := TRIM(LEADING '@' FROM p_recipient_identifier);
      
      SELECT id, wallet_address, name 
      INTO v_recipient_user_id, v_recipient_wallet, v_recipient_username
      FROM wallet_users
      WHERE LOWER(name) = LOWER(v_clean_username);
      
      IF v_recipient_user_id IS NULL THEN
        success := FALSE;
        message := 'User "' || v_clean_username || '" not found';
        RETURN NEXT;
        RETURN;
      END IF;
    END;
  ELSE
    -- It's a wallet address
    SELECT id, name 
    INTO v_recipient_user_id, v_recipient_username
    FROM wallet_users
    WHERE wallet_address = p_recipient_identifier;
    
    IF v_recipient_user_id IS NULL THEN
      success := FALSE;
      message := 'Recipient wallet not found';
      RETURN NEXT;
      RETURN;
    END IF;
    
    v_recipient_wallet := p_recipient_identifier;
  END IF;

  -- Prevent self-transfer
  IF p_sender_user_id = v_recipient_user_id THEN
    success := FALSE;
    message := 'Cannot send RZC to yourself';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Perform the transfer (atomic transaction)
  BEGIN
    -- Deduct from sender
    UPDATE wallet_users
    SET rzc_balance = rzc_balance - p_amount
    WHERE id = p_sender_user_id;

    -- Add to recipient
    UPDATE wallet_users
    SET rzc_balance = rzc_balance + p_amount
    WHERE id = v_recipient_user_id;

    -- Record sender transaction
    INSERT INTO rzc_transactions (
      user_id,
      amount,
      type,
      description,
      metadata,
      created_at
    ) VALUES (
      p_sender_user_id,
      -p_amount,  -- Negative for outgoing
      'transfer_sent',
      COALESCE(p_comment, 'Sent RZC to ' || COALESCE(v_recipient_username, v_recipient_wallet)),
      jsonb_build_object(
        'recipient_user_id', v_recipient_user_id,
        'recipient_wallet', v_recipient_wallet,
        'recipient_username', v_recipient_username,
        'comment', p_comment
      ),
      NOW()
    ) RETURNING id INTO v_transaction_id;

    -- Record recipient transaction
    INSERT INTO rzc_transactions (
      user_id,
      amount,
      type,
      description,
      metadata,
      created_at
    ) VALUES (
      v_recipient_user_id,
      p_amount,  -- Positive for incoming
      'transfer_received',
      COALESCE(p_comment, 'Received RZC from ' || (SELECT name FROM wallet_users WHERE id = p_sender_user_id)),
      jsonb_build_object(
        'sender_user_id', p_sender_user_id,
        'sender_wallet', v_sender_wallet,
        'comment', p_comment,
        'related_transaction_id', v_transaction_id
      ),
      NOW()
    );

    -- Get new balances
    SELECT rzc_balance INTO v_sender_balance
    FROM wallet_users
    WHERE id = p_sender_user_id;

    SELECT rzc_balance INTO v_recipient_balance
    FROM wallet_users
    WHERE id = v_recipient_user_id;

    -- Return success
    success := TRUE;
    message := 'Transfer successful';
    transaction_id := v_transaction_id;
    recipient_user_id := v_recipient_user_id;
    recipient_username := v_recipient_username;
    new_sender_balance := v_sender_balance;
    new_recipient_balance := v_recipient_balance;
    RETURN NEXT;

  EXCEPTION WHEN OTHERS THEN
    success := FALSE;
    message := 'Transfer failed: ' || SQLERRM;
    RETURN NEXT;
  END;
END;
$$;

COMMENT ON FUNCTION transfer_rzc IS 'Transfers RZC tokens between users using username or wallet address';


-- ============================================================================
-- STEP 2: Create Function to Get RZC Transfer History
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rzc_transfer_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  transaction_id UUID,
  amount NUMERIC,
  type TEXT,
  description TEXT,
  counterparty_username TEXT,
  counterparty_wallet TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id as transaction_id,
    rt.amount,
    rt.type,
    rt.description,
    CASE 
      WHEN rt.type = 'transfer_sent' THEN rt.metadata->>'recipient_username'
      WHEN rt.type = 'transfer_received' THEN (
        SELECT name FROM wallet_users WHERE id = (rt.metadata->>'sender_user_id')::UUID
      )
      ELSE NULL
    END as counterparty_username,
    CASE 
      WHEN rt.type = 'transfer_sent' THEN rt.metadata->>'recipient_wallet'
      WHEN rt.type = 'transfer_received' THEN rt.metadata->>'sender_wallet'
      ELSE NULL
    END as counterparty_wallet,
    rt.metadata->>'comment' as comment,
    rt.created_at
  FROM rzc_transactions rt
  WHERE rt.user_id = p_user_id
    AND rt.type IN ('transfer_sent', 'transfer_received')
  ORDER BY rt.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_rzc_transfer_history IS 'Gets RZC transfer history for a user';


-- ============================================================================
-- STEP 3: Create Function to Get Pending/Recent Transfers
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_rzc_transfers(
  p_user_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  transaction_id UUID,
  amount NUMERIC,
  type TEXT,
  counterparty_username TEXT,
  counterparty_wallet TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  time_ago TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id as transaction_id,
    rt.amount,
    rt.type,
    CASE 
      WHEN rt.type = 'transfer_sent' THEN rt.metadata->>'recipient_username'
      WHEN rt.type = 'transfer_received' THEN (
        SELECT name FROM wallet_users WHERE id = (rt.metadata->>'sender_user_id')::UUID
      )
      ELSE NULL
    END as counterparty_username,
    CASE 
      WHEN rt.type = 'transfer_sent' THEN rt.metadata->>'recipient_wallet'
      WHEN rt.type = 'transfer_received' THEN rt.metadata->>'sender_wallet'
      ELSE NULL
    END as counterparty_wallet,
    rt.created_at,
    CASE 
      WHEN AGE(NOW(), rt.created_at) < INTERVAL '1 minute' THEN 'Just now'
      WHEN AGE(NOW(), rt.created_at) < INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM AGE(NOW(), rt.created_at))::TEXT || ' min ago'
      WHEN AGE(NOW(), rt.created_at) < INTERVAL '24 hours' THEN EXTRACT(HOUR FROM AGE(NOW(), rt.created_at))::TEXT || ' hours ago'
      ELSE EXTRACT(DAY FROM AGE(NOW(), rt.created_at))::TEXT || ' days ago'
    END as time_ago
  FROM rzc_transactions rt
  WHERE rt.user_id = p_user_id
    AND rt.type IN ('transfer_sent', 'transfer_received')
    AND rt.created_at > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY rt.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_recent_rzc_transfers IS 'Gets recent RZC transfers within specified hours';


-- ============================================================================
-- STEP 4: Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION transfer_rzc TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_rzc TO service_role;
GRANT EXECUTE ON FUNCTION get_rzc_transfer_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_rzc_transfer_history TO anon;
GRANT EXECUTE ON FUNCTION get_recent_rzc_transfers TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_rzc_transfers TO anon;


-- ============================================================================
-- STEP 5: Verification and Testing
-- ============================================================================

-- Check functions exist
SELECT 
  'Functions Created' as status,
  routine_name as function_name
FROM information_schema.routines
WHERE routine_name IN (
  'transfer_rzc',
  'get_rzc_transfer_history',
  'get_recent_rzc_transfers'
)
ORDER BY routine_name;


-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Transfer RZC using username
/*
SELECT * FROM transfer_rzc(
  'SENDER_USER_ID'::UUID,
  '@john',  -- or just 'john'
  100,
  'Payment for services'
);
*/

-- Example 2: Transfer RZC using wallet address
/*
SELECT * FROM transfer_rzc(
  'SENDER_USER_ID'::UUID,
  'UQx1...abc',
  50,
  'Thanks!'
);
*/

-- Example 3: Get transfer history
/*
SELECT * FROM get_rzc_transfer_history('USER_ID'::UUID, 20);
*/

-- Example 4: Get recent transfers (last 24 hours)
/*
SELECT * FROM get_recent_rzc_transfers('USER_ID'::UUID, 24);
*/

-- Example 5: Check RZC balance
/*
SELECT 
  name,
  wallet_address,
  rzc_balance
FROM wallet_users
WHERE id = 'USER_ID'::UUID;
*/


-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
SELECT 'RZC transfer system setup complete!' as status;

-- Verification summary
SELECT 
  'Setup Verification' as report,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%transfer_rzc%') as transfer_functions,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance') as balance_column_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'rzc_transactions') as transactions_table_exists;
