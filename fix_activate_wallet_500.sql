-- ============================================================================
-- FIX: activate_wallet 500 error — address format mismatch (EQ/UQ/raw/kQ)
-- Run this in your Supabase SQL Editor
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
  v_stored_address TEXT;
BEGIN
  -- ── 1. Try exact match first (fast path) ──────────────────────────────────
  SELECT id, is_activated, wallet_address
    INTO v_user_id, v_already_activated, v_stored_address
  FROM wallet_users
  WHERE wallet_address = p_wallet_address
  LIMIT 1;

  -- ── 2. If not found, try all common TON address prefix variants ───────────
  --    TON addresses are base64url-encoded; only the first 2 chars differ
  --    between EQ (bounceable), UQ (non-bounceable), kQ (testnet non-bounceable)
  --    The suffix (chars 3-48) is identical across all formats for the same key.
  IF v_user_id IS NULL THEN
    SELECT id, is_activated, wallet_address
      INTO v_user_id, v_already_activated, v_stored_address
    FROM wallet_users
    WHERE wallet_address IN (
      -- Build the three common variants from the raw suffix (chars 3 onward)
      'EQ' || SUBSTRING(p_wallet_address, 3),
      'UQ' || SUBSTRING(p_wallet_address, 3),
      'kQ' || SUBSTRING(p_wallet_address, 3)
    )
    LIMIT 1;
  END IF;

  -- ── 3. Still not found → hard error ──────────────────────────────────────
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found: %', p_wallet_address;
  END IF;

  -- ── 4. Already activated → treat as success (idempotent) ─────────────────
  --    Returning TRUE instead of raising lets the client continue normally
  --    (the payment went through; we just don't double-record it).
  IF v_already_activated THEN
    RETURN TRUE;
  END IF;

  -- ── 5. Mark activated using the stored address (avoids format drift) ──────
  UPDATE wallet_users
  SET is_activated       = TRUE,
      activated_at       = NOW(),
      activation_fee_paid = p_activation_fee_ton,
      updated_at         = NOW()
  WHERE id = v_user_id;

  -- ── 6. Record activation ──────────────────────────────────────────────────
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

  -- ── 7. In-app notification ────────────────────────────────────────────────
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
