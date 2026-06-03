-- ═══════════════════════════════════════════════════════════════════════════
-- Add TON Payment Support to Launchpad
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add payment method and TON amount columns to presale_transactions
ALTER TABLE presale_transactions
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'usdc' CHECK (payment_method IN ('usdc', 'ton')),
ADD COLUMN IF NOT EXISTS amount_ton NUMERIC(20, 9) DEFAULT NULL;

-- 2. Add presale wallet address to launchpad_projects
ALTER TABLE launchpad_projects
ADD COLUMN IF NOT EXISTS presale_wallet_address TEXT DEFAULT NULL;

-- 3. Add comment to explain the columns
COMMENT ON COLUMN presale_transactions.payment_method IS 'Payment method used: usdc (EVM) or ton (TON blockchain)';
COMMENT ON COLUMN presale_transactions.amount_ton IS 'Amount paid in TON (if payment_method = ton)';
COMMENT ON COLUMN launchpad_projects.presale_wallet_address IS 'TON wallet address for receiving presale payments';

-- 4. Create index for faster queries by payment method
CREATE INDEX IF NOT EXISTS idx_presale_transactions_payment_method 
ON presale_transactions(payment_method);

-- 5. Drop and recreate the get_project_progress function to handle both payment methods
DROP FUNCTION IF EXISTS get_project_progress(uuid);

CREATE OR REPLACE FUNCTION get_project_progress(project_uuid UUID)
RETURNS TABLE (
  progress_percent NUMERIC,
  time_remaining TEXT,
  is_active BOOLEAN,
  can_purchase BOOLEAN
) AS $$
DECLARE
  v_project RECORD;
  v_now TIMESTAMP;
  v_diff INTERVAL;
BEGIN
  SELECT * INTO v_project
  FROM launchpad_projects
  WHERE id = project_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  v_now := NOW();

  -- Calculate progress
  progress_percent := ROUND((v_project.raised_amount / NULLIF(v_project.hard_cap, 0)) * 100, 2);

  -- Calculate time remaining
  IF v_project.status = 'live' AND v_now < v_project.presale_end THEN
    v_diff := v_project.presale_end - v_now;
    time_remaining := CONCAT(
      EXTRACT(DAY FROM v_diff)::TEXT, 'd ',
      EXTRACT(HOUR FROM v_diff)::TEXT, 'h ',
      EXTRACT(MINUTE FROM v_diff)::TEXT, 'm'
    );
    is_active := TRUE;
    can_purchase := v_project.raised_amount < v_project.hard_cap;
  ELSIF v_project.status = 'upcoming' THEN
    v_diff := v_project.presale_start - v_now;
    time_remaining := CONCAT('Starts in ', 
      EXTRACT(DAY FROM v_diff)::TEXT, 'd ',
      EXTRACT(HOUR FROM v_diff)::TEXT, 'h'
    );
    is_active := FALSE;
    can_purchase := FALSE;
  ELSE
    time_remaining := 'Ended';
    is_active := FALSE;
    can_purchase := FALSE;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a view for payment statistics
CREATE OR REPLACE VIEW launchpad_payment_stats AS
SELECT 
  project_id,
  payment_method,
  COUNT(*) as transaction_count,
  SUM(amount_usdc) as total_usdc,
  SUM(amount_ton) as total_ton,
  SUM(tokens_received) as total_tokens
FROM presale_transactions
WHERE status = 'confirmed'
GROUP BY project_id, payment_method;

-- 7. Grant permissions
GRANT SELECT ON launchpad_payment_stats TO authenticated;
GRANT SELECT ON launchpad_payment_stats TO anon;

-- ═══════════════════════════════════════════════════════════════════════════
-- Success Message
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ TON payment support added successfully!';
  RAISE NOTICE '   - payment_method column added (usdc/ton)';
  RAISE NOTICE '   - amount_ton column added';
  RAISE NOTICE '   - presale_wallet_address added to projects';
  RAISE NOTICE '   - Payment statistics view created';
END $$;
