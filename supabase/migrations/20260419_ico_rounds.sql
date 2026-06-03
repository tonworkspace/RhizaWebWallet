-- ============================================================================
-- ICO MULTI-ROUND SALES SYSTEM — PURE SQL EDITION
-- All functions use LANGUAGE sql (no PL/pgSQL variables at all)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ── 1. SALE ROUNDS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_rounds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_name      text NOT NULL,
  round_number    int  NOT NULL UNIQUE,
  price_usd       numeric(18,8) NOT NULL,
  token_cap       bigint NOT NULL,
  tokens_sold     bigint NOT NULL DEFAULT 0,
  bonus_tiers     jsonb NOT NULL DEFAULT '[]',
  start_date      timestamptz,
  end_date        timestamptz,
  is_active       boolean NOT NULL DEFAULT false,
  is_complete     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sale_rounds_single_active
  ON sale_rounds (is_active) WHERE is_active = true;

-- ── 2. ICO PURCHASES TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ico_purchases (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address     text NOT NULL,
  round_id           uuid NOT NULL REFERENCES sale_rounds(id),
  rzc_amount         bigint NOT NULL,
  price_at_purchase  numeric(18,8) NOT NULL,
  cost_usd           numeric(18,4) NOT NULL,
  payment_method     text NOT NULL DEFAULT 'TON',
  tx_hash            text,
  referrer_wallet    text,
  commission_paid    boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ico_purchases_wallet ON ico_purchases (wallet_address);
CREATE INDEX IF NOT EXISTS ico_purchases_round  ON ico_purchases (round_id);

-- ── 3. SEED DATA ──────────────────────────────────────────────────────────────
INSERT INTO sale_rounds (round_name, round_number, price_usd, token_cap, bonus_tiers, start_date, end_date, is_active)
VALUES ('Seed Round', 1, 0.012, 50000000, '[{"min":2500,"bonus":5},{"min":10000,"bonus":15}]', '2025-01-01T00:00:00Z', '2026-06-30T23:59:59Z', true)
ON CONFLICT (round_number) DO NOTHING;

INSERT INTO sale_rounds (round_name, round_number, price_usd, token_cap, bonus_tiers, is_active)
VALUES ('Round 2', 2, 0.018, 75000000, '[{"min":2500,"bonus":3},{"min":10000,"bonus":10}]', false)
ON CONFLICT (round_number) DO NOTHING;

INSERT INTO sale_rounds (round_name, round_number, price_usd, token_cap, bonus_tiers, is_active)
VALUES ('Round 3', 3, 0.025, 100000000, '[{"min":1000,"bonus":2}]', false)
ON CONFLICT (round_number) DO NOTHING;

INSERT INTO sale_rounds (round_name, round_number, price_usd, token_cap, bonus_tiers, is_active)
VALUES ('Public Listing', 4, 1.00, 500000000, '[]', false)
ON CONFLICT (round_number) DO NOTHING;

-- ── 4. RPC: get_active_sale_round ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_active_sale_round()
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'id',               sr.id,
    'round_name',       sr.round_name,
    'round_number',     sr.round_number,
    'price_usd',        sr.price_usd,
    'token_cap',        sr.token_cap,
    'tokens_sold',      sr.tokens_sold,
    'tokens_remaining', sr.token_cap - sr.tokens_sold,
    'progress_pct',     ROUND((sr.tokens_sold::numeric / NULLIF(sr.token_cap, 0)) * 100, 2),
    'bonus_tiers',      COALESCE(sr.bonus_tiers, '[]'::jsonb),
    'start_date',       sr.start_date,
    'end_date',         sr.end_date,
    'is_complete',      sr.is_complete,
    'next_round_price', COALESCE(
      (SELECT nr.price_usd FROM sale_rounds nr WHERE nr.round_number = sr.round_number + 1 LIMIT 1),
      1.00
    )
  )
  FROM  sale_rounds sr
  WHERE sr.is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_active_sale_round TO authenticated, anon, service_role;

-- ── 5. RPC: record_ico_purchase ───────────────────────────────────────────────
-- Pure LANGUAGE sql using writable CTEs.
-- No PL/pgSQL, no DECLARE, no SELECT INTO, no variables of any kind.
-- The three CTEs (r, ins, upd) form a single atomic transaction.
CREATE OR REPLACE FUNCTION record_ico_purchase(
  p_wallet_address  text,
  p_rzc_amount      bigint,
  p_price_usd       numeric,
  p_cost_usd        numeric,
  p_payment_method  text,
  p_tx_hash         text DEFAULT NULL,
  p_referrer_wallet text DEFAULT NULL
)
RETURNS jsonb AS $$
WITH
  -- Read the active round
  r AS (
    SELECT id, round_name, token_cap, tokens_sold, is_complete
    FROM   sale_rounds
    WHERE  is_active = true
    LIMIT  1
  ),
  -- Insert purchase row only if the cap allows it
  ins AS (
    INSERT INTO ico_purchases
      (wallet_address, round_id, rzc_amount, price_at_purchase,
       cost_usd, payment_method, tx_hash, referrer_wallet, commission_paid)
    SELECT
      p_wallet_address,
      r.id,
      p_rzc_amount,
      p_price_usd,
      p_cost_usd,
      p_payment_method,
      p_tx_hash,
      p_referrer_wallet,
      (p_referrer_wallet IS NOT NULL)
    FROM r
    WHERE NOT r.is_complete
      AND (r.tokens_sold + p_rzc_amount) <= r.token_cap
    RETURNING id AS purchase_id, round_id
  ),
  -- Update tokens_sold only when the insert succeeded
  upd AS (
    UPDATE sale_rounds
    SET
      tokens_sold = r.tokens_sold + p_rzc_amount,
      is_complete = ((r.tokens_sold + p_rzc_amount) >= r.token_cap),
      updated_at  = now()
    FROM r
    WHERE sale_rounds.id = r.id
      AND (SELECT count(*) FROM ins) > 0
    RETURNING sale_rounds.tokens_sold AS new_total
  )
SELECT
  CASE
    WHEN (SELECT count(*) FROM r) = 0 THEN
      jsonb_build_object('success', false, 'error', 'No active sale round')
    WHEN (SELECT count(*) FROM ins) = 0 THEN
      jsonb_build_object(
        'success',   false,
        'error',     CASE
                       WHEN (SELECT is_complete FROM r) THEN 'Sale round is complete'
                       ELSE 'Insufficient supply remaining'
                     END,
        'remaining', (SELECT token_cap - tokens_sold FROM r)
      )
    ELSE
      jsonb_build_object(
        'success',           true,
        'purchase_id',       (SELECT purchase_id FROM ins),
        'round_name',        (SELECT round_name FROM r),
        'tokens_sold_total', (SELECT new_total FROM upd)
      )
  END;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_ico_purchase TO authenticated, anon, service_role;

-- ── 6. RPC: get_wallet_ico_purchases ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_wallet_ico_purchases(p_wallet_address text)
RETURNS jsonb AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',                p.id,
        'round_name',        r.round_name,
        'round_number',      r.round_number,
        'rzc_amount',        p.rzc_amount,
        'price_at_purchase', p.price_at_purchase,
        'cost_usd',          p.cost_usd,
        'payment_method',    p.payment_method,
        'tx_hash',           p.tx_hash,
        'created_at',        p.created_at
      )
      ORDER BY p.created_at DESC
    ),
    '[]'::jsonb
  )
  FROM  ico_purchases p
  JOIN  sale_rounds   r ON r.id = p.round_id
  WHERE p.wallet_address = p_wallet_address;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_wallet_ico_purchases TO authenticated, anon, service_role;

-- ── 7. UPDATED_AT TRIGGER ─────────────────────────────────────────────────────
-- Minimal PL/pgSQL — only used for the trigger (no SELECT INTO, no user vars)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sale_rounds_updated_at ON sale_rounds;
CREATE TRIGGER sale_rounds_updated_at
  BEFORE UPDATE ON sale_rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 8. ROW LEVEL SECURITY ─────────────────────────────────────────────────────
ALTER TABLE sale_rounds   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ico_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_rounds_public_read"   ON sale_rounds;
DROP POLICY IF EXISTS "sale_rounds_service_write" ON sale_rounds;
DROP POLICY IF EXISTS "ico_purchases_service_all" ON ico_purchases;

CREATE POLICY "sale_rounds_public_read"
  ON sale_rounds FOR SELECT USING (true);

CREATE POLICY "sale_rounds_service_write"
  ON sale_rounds FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "ico_purchases_service_all"
  ON ico_purchases FOR ALL USING (auth.role() = 'service_role');

SELECT '✅ ICO round system created successfully!' AS status;
