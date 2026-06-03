-- ============================================================
-- Mainnet Engagement Table  (fixed: role column, premining field)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop & recreate so re-runs are idempotent
DROP TABLE IF EXISTS mainnet_engagement CASCADE;

CREATE TABLE mainnet_engagement (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID,                                               -- optional, no FK (wallet_address is the key)
  wallet_address       TEXT        NOT NULL UNIQUE,
  full_name            TEXT        NOT NULL,
  email                TEXT        NOT NULL,
  telegram             TEXT,
  phone                TEXT,
  country              TEXT        NOT NULL,
  rzc_balance_claim    NUMERIC     DEFAULT 0,
  rzc_balance_verified NUMERIC     DEFAULT 0,
  premining_amount     NUMERIC     DEFAULT 0,   -- RZC mined during pre-mining season
  rzc_migrated         NUMERIC     DEFAULT 0,   -- RZC Coins Migrated
  coins_bought         NUMERIC     DEFAULT 0,   -- RZC Coins Bought
  hear_about           TEXT,
  has_balance_issue    BOOLEAN     DEFAULT FALSE,
  balance_issue_query  TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','verified','rejected')),
  admin_notes          TEXT,
  submitted_at         TIMESTAMPTZ DEFAULT NOW(),
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mainnet_engagement_wallet  ON mainnet_engagement(wallet_address);
CREATE INDEX idx_mainnet_engagement_status  ON mainnet_engagement(status);
CREATE INDEX idx_mainnet_engagement_user    ON mainnet_engagement(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE mainnet_engagement ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anon) can INSERT — wallet address acts as the key
CREATE POLICY "Anyone can submit engagement"
  ON mainnet_engagement FOR INSERT
  WITH CHECK (true);

-- Anyone can read any row (public leaderboard-style; tighten if needed)
CREATE POLICY "Anyone can view engagement"
  ON mainnet_engagement FOR SELECT
  USING (true);

-- Allow upsert / update by wallet owner or admin
CREATE POLICY "Owner or admin can update engagement"
  ON mainnet_engagement FOR UPDATE
  USING (true)      -- wallet_address match enforced at app layer
  WITH CHECK (true);

-- Admins (role = 'admin' in wallet_users) can delete
CREATE POLICY "Admin can delete engagement"
  ON mainnet_engagement FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE auth_user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_mainnet_engagement_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_mainnet_engagement_updated_at ON mainnet_engagement;
CREATE TRIGGER trigger_mainnet_engagement_updated_at
  BEFORE UPDATE ON mainnet_engagement
  FOR EACH ROW EXECUTE FUNCTION update_mainnet_engagement_updated_at();

-- Verify
SELECT 'mainnet_engagement table created successfully ✓' AS result;
SELECT COUNT(*) AS total_rows FROM mainnet_engagement;
