-- ============================================================================
-- URGENT FIX: Sync is_activated from wallet_activations → wallet_users
-- Run this in Supabase SQL Editor FIRST before anything else.
--
-- Problem: wallet_activations has completed records but wallet_users.is_activated
-- is still FALSE because the address format changed (EQ→UQ) and the activate_wallet
-- function couldn't find the user by the new address.
-- ============================================================================

-- Step 1: Update wallet_users.is_activated for all users who have a completed
-- activation record in wallet_activations (matches by user_id, format-agnostic)
UPDATE wallet_users wu
SET 
  is_activated = TRUE,
  activated_at = COALESCE(wu.activated_at, wa.completed_at),
  activation_fee_paid = COALESCE(NULLIF(wu.activation_fee_paid, 0), wa.activation_fee_ton),
  updated_at = NOW()
FROM wallet_activations wa
WHERE wa.user_id = wu.id
  AND wa.status = 'completed'
  AND (wu.is_activated = FALSE OR wu.is_activated IS NULL);

-- Step 2: Also catch cases where wallet_activations only has wallet_address
-- (no user_id FK) — match by address variants
UPDATE wallet_users wu
SET
  is_activated = TRUE,
  activated_at = COALESCE(wu.activated_at, wa.completed_at),
  activation_fee_paid = COALESCE(NULLIF(wu.activation_fee_paid, 0), wa.activation_fee_ton),
  updated_at = NOW()
FROM wallet_activations wa
WHERE wa.wallet_address = wu.wallet_address
  AND wa.status = 'completed'
  AND (wu.is_activated = FALSE OR wu.is_activated IS NULL);

-- Step 3: Replace check_wallet_activation to ALWAYS check wallet_activations
-- as a fallback so this never breaks again even if is_activated gets out of sync
CREATE OR REPLACE FUNCTION check_wallet_activation(p_wallet_address TEXT)
RETURNS TABLE (
  is_activated BOOLEAN,
  activated_at TIMESTAMP,
  activation_fee_paid DECIMAL(10,4)
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- First try: direct wallet_users lookup (fast path)
  RETURN QUERY
  SELECT
    w.is_activated,
    w.activated_at,
    w.activation_fee_paid
  FROM wallet_users w
  WHERE w.wallet_address = p_wallet_address
    AND w.is_activated = TRUE
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Second try: find user by address, then check wallet_activations by user_id
  SELECT id INTO v_user_id
  FROM wallet_users
  WHERE wallet_address = p_wallet_address
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      TRUE::BOOLEAN,
      wa.completed_at,
      wa.activation_fee_ton
    FROM wallet_activations wa
    WHERE wa.user_id = v_user_id
      AND wa.status = 'completed'
    ORDER BY wa.completed_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Auto-heal: sync is_activated back to wallet_users
      UPDATE wallet_users
      SET is_activated = TRUE,
          activated_at = (SELECT completed_at FROM wallet_activations WHERE user_id = v_user_id AND status = 'completed' ORDER BY completed_at DESC LIMIT 1),
          updated_at = NOW()
      WHERE id = v_user_id AND (is_activated = FALSE OR is_activated IS NULL);
      RETURN;
    END IF;
  END IF;

  -- Third try: wallet_activations by address directly (handles old EQ records)
  RETURN QUERY
  SELECT
    TRUE::BOOLEAN,
    wa.completed_at,
    wa.activation_fee_ton
  FROM wallet_activations wa
  WHERE wa.wallet_address = p_wallet_address
    AND wa.status = 'completed'
  ORDER BY wa.completed_at DESC
  LIMIT 1;

  -- If still not found, return not-activated row so caller gets a result
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE::BOOLEAN,
      NULL::TIMESTAMP,
      0::DECIMAL(10,4);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Verify — show users who are activated in wallet_activations
-- but still show as not activated in wallet_users (should be 0 after this runs)
SELECT
  wu.id,
  wu.wallet_address,
  wu.is_activated AS users_is_activated,
  wa.status       AS activation_status,
  wa.completed_at
FROM wallet_users wu
JOIN wallet_activations wa ON wa.user_id = wu.id
WHERE wa.status = 'completed'
  AND (wu.is_activated = FALSE OR wu.is_activated IS NULL)
ORDER BY wa.completed_at DESC;

-- ============================================================================
-- DONE. The SELECT above should return 0 rows if the sync worked correctly.
-- ============================================================================
