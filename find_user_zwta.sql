-- ============================================================================
-- FIND USER #ZwTA - Quick Diagnostic
-- ============================================================================
-- Based on screenshot: Rhiza User #ZwTA, $250.00 RZC, $0.128 balance
-- Payment: 12.7660 TON
-- ============================================================================

-- Method 1: Find by RZC balance (most unique identifier)
SELECT 
  id,
  wallet_address,
  name,
  rzc_balance,
  is_activated,
  activated_at,
  activation_fee_paid,
  created_at
FROM wallet_users
WHERE rzc_balance = 250.00
   OR rzc_balance BETWEEN 249 AND 251
ORDER BY created_at DESC;

-- Method 2: Find by name pattern
SELECT 
  id,
  wallet_address,
  name,
  rzc_balance,
  is_activated,
  activated_at,
  created_at
FROM wallet_users
WHERE name LIKE '%ZwTA%'
   OR name LIKE '%zwta%'
ORDER BY created_at DESC;

-- Method 3: Find by recent payment of 12.7660 TON
SELECT 
  wu.id,
  wu.wallet_address,
  wu.name,
  wu.rzc_balance,
  wu.is_activated,
  pi.total_ton,
  pi.tx_hash,
  pi.status as invoice_status,
  pi.created_at as payment_date
FROM wallet_users wu
JOIN payment_invoices pi ON wu.wallet_address = pi.wallet_address
WHERE pi.total_ton BETWEEN 12.76 AND 12.77
  AND pi.status = 'completed'
ORDER BY pi.created_at DESC;

-- Method 4: Find by recent failed activations
SELECT 
  wu.id,
  wu.wallet_address,
  wu.name,
  wu.rzc_balance,
  wu.is_activated,
  wa.activation_fee_ton,
  wa.status as activation_status,
  wa.created_at as activation_attempt
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.is_activated = FALSE
  AND wa.activation_fee_ton BETWEEN 12.76 AND 12.77
ORDER BY wa.created_at DESC;

-- Method 5: Comprehensive search combining all clues
SELECT 
  wu.id,
  wu.wallet_address,
  wu.name,
  wu.rzc_balance,
  wu.is_activated,
  wu.activated_at,
  wu.activation_fee_paid,
  pi.total_ton as paid_amount,
  pi.tx_hash,
  pi.status as payment_status,
  pi.created_at as payment_date,
  wa.status as activation_status
FROM wallet_users wu
LEFT JOIN payment_invoices pi ON wu.wallet_address = pi.wallet_address
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE (
  -- Match by RZC balance
  wu.rzc_balance BETWEEN 249 AND 251
  OR
  -- Match by name
  wu.name LIKE '%ZwTA%'
  OR
  -- Match by payment amount
  pi.total_ton BETWEEN 12.76 AND 12.77
)
AND wu.is_activated = FALSE  -- Not activated yet
ORDER BY pi.created_at DESC
LIMIT 10;

-- ============================================================================
-- ONCE YOU FIND THE USER, GET THEIR DETAILS
-- ============================================================================

-- Replace USER_ID_HERE with the actual UUID from above
\set user_id 'USER_ID_HERE'

-- Get complete user profile
SELECT 
  id,
  wallet_address,
  name,
  email,
  rzc_balance,
  is_activated,
  activated_at,
  activation_fee_paid,
  referrer_code,
  created_at,
  updated_at
FROM wallet_users
WHERE id = :'user_id';

-- Get payment details
SELECT 
  id,
  invoice_number,
  total_ton,
  total_usd,
  tx_hash,
  status,
  payment_method,
  package_name,
  created_at,
  updated_at
FROM payment_invoices
WHERE wallet_address = (SELECT wallet_address FROM wallet_users WHERE id = :'user_id')
ORDER BY created_at DESC;

-- Get activation attempts
SELECT 
  id,
  activation_fee_ton,
  activation_fee_usd,
  transaction_hash,
  status,
  created_at,
  completed_at
FROM wallet_activations
WHERE user_id = :'user_id'
ORDER BY created_at DESC;

-- Get recent notifications (to see if any failed)
SELECT 
  id,
  wallet_address,
  type,
  title,
  message,
  created_at
FROM wallet_notifications
WHERE user_id = :'user_id'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- QUICK ACTIVATION COMMAND
-- ============================================================================
-- Once you have the user_id and tx_hash, run this:

DO $$
DECLARE
  v_user_id UUID := 'PASTE_USER_ID_HERE';
  v_wallet_address TEXT;
  v_tx_hash TEXT := 'PASTE_TX_HASH_HERE';
BEGIN
  -- Get wallet address
  SELECT wallet_address INTO v_wallet_address
  FROM wallet_users
  WHERE id = v_user_id;

  -- Activate
  UPDATE wallet_users
  SET is_activated = TRUE,
      activated_at = NOW(),
      activation_fee_paid = 12.7660,
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Record activation
  INSERT INTO wallet_activations (
    user_id, wallet_address, activation_fee_usd, activation_fee_ton,
    ton_price_at_activation, transaction_hash, status, completed_at
  ) VALUES (
    v_user_id, v_wallet_address, 31.38, 12.7660, 2.45, v_tx_hash, 'completed', NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET status = 'completed', completed_at = NOW();

  -- Create notification
  INSERT INTO wallet_notifications (
    user_id, wallet_address, type, title, message, priority, created_at
  ) VALUES (
    v_user_id, v_wallet_address, 'system_announcement',
    'Wallet Activated Successfully!',
    'Welcome to RhizaCore! Your wallet is now fully activated.',
    'high', NOW()
  );

  RAISE NOTICE '✅ User activated: %', v_wallet_address;
END $$;
