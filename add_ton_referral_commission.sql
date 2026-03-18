-- ============================================================================
-- TON REFERRAL COMMISSION SYSTEM
-- Referrers earn 10% of the TON paid when their referral activates/purchases
-- Earnings are recorded as pending and paid out by admin/backend
-- ============================================================================

-- Table to track TON commission earnings
CREATE TABLE IF NOT EXISTS referral_ton_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  ton_amount NUMERIC(18, 6) NOT NULL,         -- 10% of buyer's TON payment
  source_ton_amount NUMERIC(18, 6) NOT NULL,  -- full TON amount buyer paid
  package_name TEXT NOT NULL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',     -- pending | paid
  paid_at TIMESTAMPTZ,
  paid_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ton_earnings_referrer ON referral_ton_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_ton_earnings_status ON referral_ton_earnings(status);

-- RLS
ALTER TABLE referral_ton_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ton earnings" ON referral_ton_earnings;
CREATE POLICY "Users can view own ton earnings"
  ON referral_ton_earnings FOR SELECT
  USING (
    referrer_id IN (
      SELECT id FROM wallet_users WHERE wallet_address = auth.uid()::text
    )
  );

-- ============================================================================
-- Function: record_ton_commission
-- Called when a referral activates/purchases — records 10% TON for referrer
-- ============================================================================
CREATE OR REPLACE FUNCTION record_ton_commission(
  p_buyer_user_id UUID,
  p_ton_amount NUMERIC,       -- total TON the buyer paid
  p_package_name TEXT,
  p_transaction_hash TEXT
)
RETURNS TABLE (
  referrer_id UUID,
  commission_ton NUMERIC,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_commission NUMERIC;
BEGIN
  -- Find referrer
  SELECT wu.referrer_id INTO v_referrer_id
  FROM wallet_users wu
  WHERE wu.id = p_buyer_user_id;

  IF v_referrer_id IS NULL THEN
    referrer_id := NULL;
    commission_ton := 0;
    success := FALSE;
    message := 'No referrer found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- 10% of TON paid
  v_commission := ROUND((p_ton_amount * 0.10)::NUMERIC, 6);

  INSERT INTO referral_ton_earnings (
    referrer_id, buyer_id, ton_amount, source_ton_amount,
    package_name, transaction_hash, status
  ) VALUES (
    v_referrer_id, p_buyer_user_id, v_commission, p_ton_amount,
    p_package_name, p_transaction_hash, 'pending'
  );

  referrer_id := v_referrer_id;
  commission_ton := v_commission;
  success := TRUE;
  message := 'Recorded ' || v_commission::TEXT || ' TON commission for referrer';
  RETURN NEXT;
END;
$$;

-- ============================================================================
-- Function: get_referrer_ton_earnings
-- Returns total pending and paid TON for a referrer
-- ============================================================================
CREATE OR REPLACE FUNCTION get_referrer_ton_earnings(p_referrer_id UUID)
RETURNS TABLE (
  pending_ton NUMERIC,
  paid_ton NUMERIC,
  total_ton NUMERIC,
  pending_count INT,
  paid_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN status = 'pending' THEN ton_amount ELSE 0 END), 0) AS pending_ton,
    COALESCE(SUM(CASE WHEN status = 'paid'    THEN ton_amount ELSE 0 END), 0) AS paid_ton,
    COALESCE(SUM(ton_amount), 0) AS total_ton,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INT AS pending_count,
    COUNT(CASE WHEN status = 'paid'    THEN 1 END)::INT AS paid_count
  FROM referral_ton_earnings
  WHERE referrer_id = p_referrer_id;
END;
$$;
