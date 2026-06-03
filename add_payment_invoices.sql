-- ============================================================================
-- PAYMENT INVOICES TABLE
-- Persistent invoice record created at checkout open, updated through lifecycle
-- Users can always retrieve their payment info regardless of modal state
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT NOT NULL UNIQUE,          -- Human-readable: INV-20260411-XXXX
  user_id       UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  wallet_address TEXT NOT NULL,
  
  -- Package snapshot (immutable at invoice creation)
  package_id    TEXT NOT NULL,
  package_name  TEXT NOT NULL,
  price_usd     NUMERIC(12,2) NOT NULL,
  activation_fee_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_usd     NUMERIC(12,2) NOT NULL,
  total_ton     NUMERIC(18,8) NOT NULL,
  ton_price_usd NUMERIC(12,4) NOT NULL,
  rzc_reward    INTEGER NOT NULL DEFAULT 0,

  -- Payment routing (snapshot at invoice creation)
  payment_address TEXT NOT NULL,
  referrer_wallet TEXT,
  commission_ton  NUMERIC(18,8) DEFAULT 0,
  platform_ton    NUMERIC(18,8),

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired', 'cancelled')),

  -- Transaction result
  tx_hash       TEXT,
  network       TEXT NOT NULL DEFAULT 'mainnet',
  payment_method TEXT NOT NULL DEFAULT 'auto'
    CHECK (payment_method IN ('auto', 'manual')),

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  paid_at       TIMESTAMPTZ,
  activated_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Error tracking
  error_message TEXT,
  retry_count   INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_wallet    ON payment_invoices(wallet_address);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id   ON payment_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON payment_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_tx_hash   ON payment_invoices(tx_hash);
CREATE INDEX IF NOT EXISTS idx_invoices_created   ON payment_invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number    ON payment_invoices(invoice_number);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_invoice_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_updated_at ON payment_invoices;
CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON payment_invoices
  FOR EACH ROW EXECUTE FUNCTION update_invoice_timestamp();

-- RLS: users can only read their own invoices
ALTER TABLE payment_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invoices_select_own ON payment_invoices;
CREATE POLICY invoices_select_own ON payment_invoices
  FOR SELECT USING (wallet_address = current_setting('app.wallet_address', true));

DROP POLICY IF EXISTS invoices_insert_own ON payment_invoices;
CREATE POLICY invoices_insert_own ON payment_invoices
  FOR INSERT WITH CHECK (true); -- service role inserts

DROP POLICY IF EXISTS invoices_update_own ON payment_invoices;
CREATE POLICY invoices_update_own ON payment_invoices
  FOR UPDATE USING (true); -- service role updates

-- Helper function to increment retry count
CREATE OR REPLACE FUNCTION increment_invoice_retry(p_invoice_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE payment_invoices 
  SET retry_count = COALESCE(retry_count, 0) + 1
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
