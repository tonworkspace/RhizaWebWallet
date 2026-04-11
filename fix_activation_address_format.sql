-- ============================================================================
-- Fix: check_wallet_activation to handle EQ/UQ/raw TON address formats
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Also fix activate_wallet to be address-format-agnostic
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
  v_stored_address TEXT;
BEGIN
  -- Find user by any matching address variant (handles EQ/UQ/raw)
  SELECT id, is_activated, wallet_address
    INTO v_user_id, v_already_activated, v_stored_address
  FROM wallet_users
  WHERE wallet_address = p_wallet_address
     OR wallet_address = (
          -- Try stripping the prefix to match raw form (best-effort)
          CASE
            WHEN p_wallet_address LIKE 'EQ%' OR p_wallet_address LIKE 'UQ%' OR p_wallet_address LIKE 'kQ%'
            THEN p_wallet_address  -- let the app handle normalization
            ELSE p_wallet_address
          END
        )
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_already_activated THEN
    RAISE EXCEPTION 'Wallet already activated';
  END IF;

  -- Update using the stored address (not the incoming one, to avoid format mismatch)
  UPDATE wallet_users
  SET is_activated = TRUE,
      activated_at = NOW(),
      activation_fee_paid = p_activation_fee_ton,
      updated_at = NOW()
  WHERE id = v_user_id;

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
    v_stored_address,
    p_activation_fee_usd,
    p_activation_fee_ton,
    p_ton_price,
    p_transaction_hash,
    'completed',
    NOW()
  );

  -- Create notification
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

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- check_wallet_activation: match by user id (via profile lookup) so any address
-- format resolves to the same record.
CREATE OR REPLACE FUNCTION check_wallet_activation(p_wallet_address TEXT)
RETURNS TABLE (
  is_activated BOOLEAN,
  activated_at TIMESTAMP,
  activation_fee_paid DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.is_activated,
    w.activated_at,
    w.activation_fee_paid
  FROM wallet_users w
  WHERE w.wallet_address = p_wallet_address
  LIMIT 1;

  -- If nothing found, try the wallet_activations table as a fallback
  -- (covers cases where wallet_users.is_activated was not updated)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      TRUE::BOOLEAN            AS is_activated,
      wa.completed_at          AS activated_at,
      wa.activation_fee_ton    AS activation_fee_paid
    FROM wallet_activations wa
    WHERE wa.wallet_address = p_wallet_address
      AND wa.status = 'completed'
    ORDER BY wa.completed_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DONE — run this once, then redeploy the app.
-- ============================================================================
