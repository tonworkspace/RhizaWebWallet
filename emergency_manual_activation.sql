-- ============================================================================
-- EMERGENCY: Manual Wallet Activation Recovery
-- ============================================================================
-- Use this to manually activate wallets that paid but failed to activate
-- due to the notification database error
-- ============================================================================

-- STEP 1: First, deploy the fix to prevent future failures
-- Run: fix_activate_wallet_notification_error.sql

-- STEP 2: Find the failed activation
-- Replace 'USER_WALLET_ADDRESS' with the actual wallet address from the screenshot
-- The user shows: Rhiza User #ZwTA with $250.00 RZC and $0.128

SELECT 
  wu.id as user_id,
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  wu.activated_at,
  wu.rzc_balance,
  wa.activation_fee_ton,
  wa.transaction_hash,
  wa.status,
  wa.created_at
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.name LIKE '%ZwTA%' 
   OR wu.wallet_address LIKE '%ZwTA%'
ORDER BY wa.created_at DESC
LIMIT 5;

-- STEP 3: Manual activation for the specific user
-- Replace these values with actual data from the query above:
DO $$
DECLARE
  v_user_id UUID;
  v_wallet_address TEXT;
  v_activation_fee_ton DECIMAL(10,4) := 12.7660; -- From screenshot
  v_activation_fee_usd DECIMAL(10,2) := 31.38;   -- 12.7660 TON * ~$2.45
  v_ton_price DECIMAL(10,2) := 2.45;
  v_tx_hash TEXT := 'REPLACE_WITH_ACTUAL_TX_HASH'; -- Get from VIEW TX button
BEGIN
  -- Find the user (adjust the WHERE clause based on what you know)
  SELECT id, wallet_address INTO v_user_id, v_wallet_address
  FROM wallet_users
  WHERE name LIKE '%ZwTA%'
     OR rzc_balance = 250.00
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Check the query above and adjust the WHERE clause.';
  END IF;

  RAISE NOTICE 'Found user: % (%)', v_wallet_address, v_user_id;

  -- Check if already activated
  IF EXISTS (SELECT 1 FROM wallet_users WHERE id = v_user_id AND is_activated = TRUE) THEN
    RAISE NOTICE '✅ User is already activated!';
    RETURN;
  END IF;

  -- Manually activate the wallet
  UPDATE wallet_users
  SET is_activated = TRUE,
      activated_at = NOW(),
      activation_fee_paid = v_activation_fee_ton,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Record the activation
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
    v_wallet_address,
    v_activation_fee_usd,
    v_activation_fee_ton,
    v_ton_price,
    v_tx_hash,
    'completed',
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'completed',
      completed_at = NOW(),
      transaction_hash = EXCLUDED.transaction_hash;

  -- Create success notification (with wallet_address!)
  INSERT INTO wallet_notifications (
    user_id,
    wallet_address,
    type,
    title,
    message,
    data,
    priority,
    created_at
  ) VALUES (
    v_user_id,
    v_wallet_address,
    'system_announcement',
    'Wallet Activated Successfully!',
    'Welcome to RhizaCore! Your wallet is now fully activated and you can access all ecosystem features.',
    jsonb_build_object(
      'activation_fee_usd', v_activation_fee_usd,
      'activation_fee_ton', v_activation_fee_ton,
      'transaction_hash', v_tx_hash,
      'manual_recovery', true
    ),
    'high',
    NOW()
  );

  RAISE NOTICE '✅ Wallet manually activated successfully!';
  RAISE NOTICE '   User ID: %', v_user_id;
  RAISE NOTICE '   Wallet: %', v_wallet_address;
  RAISE NOTICE '   Fee: % TON', v_activation_fee_ton;
  RAISE NOTICE '';
  RAISE NOTICE '📱 Tell the user to:';
  RAISE NOTICE '   1. Refresh the page (F5)';
  RAISE NOTICE '   2. The PENDING banner should disappear';
  RAISE NOTICE '   3. Wallet should show as ACTIVATED';
END $$;

-- STEP 4: Verify the activation
SELECT 
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  wu.activated_at,
  wu.activation_fee_paid,
  wu.rzc_balance,
  wa.status as activation_status,
  wa.transaction_hash
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.name LIKE '%ZwTA%'
   OR wu.wallet_address LIKE '%ZwTA%';

-- STEP 5: Check the notification was created
SELECT 
  wn.wallet_address,
  wn.type,
  wn.title,
  wn.message,
  wn.created_at
FROM wallet_notifications wn
JOIN wallet_users wu ON wn.user_id = wu.id
WHERE wu.name LIKE '%ZwTA%'
ORDER BY wn.created_at DESC
LIMIT 5;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
-- 1. This is a ONE-TIME recovery script for users affected by the bug
-- 2. After running this, IMMEDIATELY deploy fix_activate_wallet_notification_error.sql
-- 3. The root cause is fixed in the SQL function, this just recovers existing failures
-- 4. You may need to run this for multiple affected users
-- 5. Get the actual transaction hash from the "VIEW TX" button in the UI

-- ============================================================================
-- ALTERNATIVE: Batch recovery for all failed activations
-- ============================================================================
-- If multiple users are affected, use this query to find them all:

SELECT 
  wu.id,
  wu.wallet_address,
  wu.name,
  wu.is_activated,
  pi.total_ton as paid_amount,
  pi.status as invoice_status,
  pi.tx_hash,
  pi.created_at as payment_date
FROM wallet_users wu
JOIN payment_invoices pi ON wu.wallet_address = pi.wallet_address
WHERE pi.status = 'completed'  -- Payment succeeded
  AND wu.is_activated = FALSE  -- But wallet not activated
  AND pi.created_at > NOW() - INTERVAL '24 hours'  -- Recent failures
ORDER BY pi.created_at DESC;

-- Then run the manual activation DO block above for each user
