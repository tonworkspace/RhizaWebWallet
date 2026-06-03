-- ═══════════════════════════════════════════════════════════════════════════
-- Add TON Payment Support to Launchpad (SAFE VERSION)
-- This version is safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add payment method and TON amount columns to presale_transactions
DO $$ 
BEGIN
  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'presale_transactions' 
    AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE presale_transactions
    ADD COLUMN payment_method TEXT DEFAULT 'usdc' CHECK (payment_method IN ('usdc', 'ton'));
    RAISE NOTICE '✅ Added payment_method column';
  ELSE
    RAISE NOTICE '⏭️  payment_method column already exists';
  END IF;

  -- Add amount_ton column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'presale_transactions' 
    AND column_name = 'amount_ton'
  ) THEN
    ALTER TABLE presale_transactions
    ADD COLUMN amount_ton NUMERIC(20, 9) DEFAULT NULL;
    RAISE NOTICE '✅ Added amount_ton column';
  ELSE
    RAISE NOTICE '⏭️  amount_ton column already exists';
  END IF;
END $$;

-- 2. Add presale wallet address to launchpad_projects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'launchpad_projects' 
    AND column_name = 'presale_wallet_address'
  ) THEN
    ALTER TABLE launchpad_projects
    ADD COLUMN presale_wallet_address TEXT DEFAULT NULL;
    RAISE NOTICE '✅ Added presale_wallet_address column';
  ELSE
    RAISE NOTICE '⏭️  presale_wallet_address column already exists';
  END IF;
END $$;

-- 3. Add comments to explain the columns
COMMENT ON COLUMN presale_transactions.payment_method IS 'Payment method used: usdc (EVM) or ton (TON blockchain)';
COMMENT ON COLUMN presale_transactions.amount_ton IS 'Amount paid in TON (if payment_method = ton)';
COMMENT ON COLUMN launchpad_projects.presale_wallet_address IS 'TON wallet address for receiving presale payments';

-- 4. Create index for faster queries by payment method
CREATE INDEX IF NOT EXISTS idx_presale_transactions_payment_method 
ON presale_transactions(payment_method);

-- 5. Drop and recreate the get_project_progress function
-- This ensures the function signature matches our needs
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

-- 6. Create or replace the payment statistics view
DROP VIEW IF EXISTS launchpad_payment_stats;

CREATE VIEW launchpad_payment_stats AS
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
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TON Payment Support Migration Complete!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Changes:';
  RAISE NOTICE '   ✓ payment_method column (usdc/ton)';
  RAISE NOTICE '   ✓ amount_ton column';
  RAISE NOTICE '   ✓ presale_wallet_address column';
  RAISE NOTICE '   ✓ Payment statistics view';
  RAISE NOTICE '   ✓ get_project_progress function updated';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Next Steps:';
  RAISE NOTICE '   1. Configure presale_wallet_address for your projects';
  RAISE NOTICE '   2. Integrate TonPresalePayment component';
  RAISE NOTICE '   3. Test on testnet';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Documentation: See README_TON_PAYMENT.md';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
