-- ============================================================================
-- MIGRATION: Add balance evidence fields to balance_verification_requests
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- ─── 1. Add new columns to the table ─────────────────────────────────────────

ALTER TABLE balance_verification_requests
  ADD COLUMN IF NOT EXISTS available_balance_before_migration DECIMAL(20,2),
  ADD COLUMN IF NOT EXISTS claimable_balance_before_migration DECIMAL(20,2),
  ADD COLUMN IF NOT EXISTS available_balance_screenshot_url   TEXT,
  ADD COLUMN IF NOT EXISTS claimable_balance_screenshot_url   TEXT,
  ADD COLUMN IF NOT EXISTS current_balance_screenshot_url     TEXT;

-- ─── 2. Drop old RPC and recreate with new parameters ────────────────────────

DROP FUNCTION IF EXISTS submit_balance_verification_request_by_wallet(TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS submit_balance_verification_request_by_wallet(TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION submit_balance_verification_request_by_wallet(
  p_wallet_address                      TEXT,
  p_telegram_username                   TEXT,
  p_old_wallet_address                  TEXT,
  p_claimed_balance                     DECIMAL(20,2),
  p_screenshot_url                      TEXT    DEFAULT NULL,
  p_additional_notes                    TEXT    DEFAULT NULL,
  p_available_balance_before_migration  DECIMAL(20,2) DEFAULT NULL,
  p_claimable_balance_before_migration  DECIMAL(20,2) DEFAULT NULL,
  p_available_balance_screenshot_url    TEXT    DEFAULT NULL,
  p_claimable_balance_screenshot_url    TEXT    DEFAULT NULL,
  p_current_balance_screenshot_url      TEXT    DEFAULT NULL
) RETURNS JSON AS $func$
DECLARE
  v_user_id         UUID;
  v_current_balance DECIMAL(20,2);
  v_request_id      UUID;
  v_priority        TEXT;
  v_discrepancy     DECIMAL(20,2);
BEGIN
  -- Look up user by wallet address
  SELECT id, COALESCE(rzc_balance, 0)
  INTO v_user_id, v_current_balance
  FROM wallet_users
  WHERE wallet_address = p_wallet_address;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found for this wallet address.'
    );
  END IF;

  -- Block duplicate pending requests
  IF EXISTS (
    SELECT 1 FROM balance_verification_requests
    WHERE user_id = v_user_id
      AND status IN ('pending', 'under_review')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You already have a pending verification request. Please wait for it to be reviewed.'
    );
  END IF;

  -- Calculate discrepancy and priority
  v_discrepancy := p_claimed_balance - v_current_balance;

  v_priority := CASE
    WHEN ABS(v_discrepancy) > 10000 THEN 'urgent'
    WHEN ABS(v_discrepancy) > 1000  THEN 'high'
    WHEN ABS(v_discrepancy) < 100   THEN 'low'
    ELSE 'normal'
  END;

  INSERT INTO balance_verification_requests (
    user_id,
    wallet_address,
    telegram_username,
    old_wallet_address,
    claimed_balance,
    current_balance,
    screenshot_url,
    additional_notes,
    available_balance_before_migration,
    claimable_balance_before_migration,
    available_balance_screenshot_url,
    claimable_balance_screenshot_url,
    current_balance_screenshot_url,
    status,
    priority,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    p_wallet_address,
    p_telegram_username,
    p_old_wallet_address,
    p_claimed_balance,
    v_current_balance,
    p_screenshot_url,
    p_additional_notes,
    p_available_balance_before_migration,
    p_claimable_balance_before_migration,
    p_available_balance_screenshot_url,
    p_claimable_balance_screenshot_url,
    p_current_balance_screenshot_url,
    'pending',
    v_priority,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_request_id;

  RETURN json_build_object(
    'success',            true,
    'request_id',         v_request_id,
    'message',            'Verification request submitted successfully! We will review it within 24-48 hours.',
    'priority',           v_priority,
    'discrepancy_amount', v_discrepancy,
    'current_balance',    v_current_balance,
    'claimed_balance',    p_claimed_balance
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in submit_balance_verification_request_by_wallet: %', SQLERRM;
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION submit_balance_verification_request_by_wallet(
  TEXT, TEXT, TEXT, DECIMAL, TEXT, TEXT, DECIMAL, DECIMAL, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- ─── 3. Verify ───────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'balance_verification_requests'
ORDER BY ordinal_position;
