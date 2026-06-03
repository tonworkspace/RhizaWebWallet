-- ============================================================================
-- RhizaX Launchpad Database Schema - FIXED FOR COMPATIBILITY
-- ============================================================================
-- Description: Complete database schema for launchpad projects and transactions
-- Compatible with existing wallet_users table
-- Created: May 13, 2026
-- Fixed: Uses wallet_users instead of profiles, adds notifications table
-- ============================================================================

-- ── Create notifications table (if not exists) ─────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES wallet_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ── Drop existing launchpad tables (if any) ────────────────────────────────

DROP TABLE IF EXISTS presale_transactions CASCADE;
DROP TABLE IF EXISTS launchpad_projects CASCADE;

-- ── Create launchpad_projects table ────────────────────────────────────────

CREATE TABLE launchpad_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Information
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_url TEXT,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('live', 'upcoming', 'ended', 'success')) DEFAULT 'upcoming',
  
  -- Financial Details
  total_supply BIGINT NOT NULL,
  presale_allocation BIGINT NOT NULL,
  presale_rate DECIMAL(18, 6) NOT NULL, -- How many tokens per 1 USDC
  listing_rate DECIMAL(18, 6) NOT NULL,
  soft_cap DECIMAL(18, 2) NOT NULL,
  hard_cap DECIMAL(18, 2) NOT NULL,
  raised_amount DECIMAL(18, 2) DEFAULT 0,
  min_purchase DECIMAL(18, 2) DEFAULT 50,
  max_purchase DECIMAL(18, 2) DEFAULT 10000,
  
  -- Timing
  presale_start TIMESTAMPTZ NOT NULL,
  presale_end TIMESTAMPTZ NOT NULL,
  listing_date TIMESTAMPTZ,
  
  -- Verification Badges
  kyc_verified BOOLEAN DEFAULT FALSE,
  audit_verified BOOLEAN DEFAULT FALSE,
  safu_verified BOOLEAN DEFAULT FALSE,
  doxxed BOOLEAN DEFAULT FALSE,
  
  -- Social Links
  website_url TEXT,
  twitter_url TEXT,
  telegram_url TEXT,
  discord_url TEXT,
  etherscan_url TEXT,
  
  -- Contract Addresses
  presale_contract_address TEXT,
  token_contract_address TEXT,
  
  -- Token Distribution (percentages)
  distribution_presale INTEGER DEFAULT 30,
  distribution_liquidity INTEGER DEFAULT 15,
  distribution_team INTEGER DEFAULT 20,
  distribution_marketing INTEGER DEFAULT 10,
  distribution_reserve INTEGER DEFAULT 25,
  
  -- Vesting
  tge_unlock_percent INTEGER DEFAULT 20, -- Token Generation Event unlock
  vesting_months INTEGER DEFAULT 6,
  monthly_unlock_percent DECIMAL(5, 2) DEFAULT 13.33,
  
  -- Liquidity
  liquidity_lock_days INTEGER DEFAULT 365,
  liquidity_percent INTEGER DEFAULT 60, -- % of raised funds for liquidity
  
  -- Metadata
  featured BOOLEAN DEFAULT FALSE,
  trending BOOLEAN DEFAULT FALSE,
  participant_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Create presale_transactions table ──────────────────────────────────────

CREATE TABLE presale_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations (FIXED: References wallet_users instead of profiles)
  project_id UUID NOT NULL REFERENCES launchpad_projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
  user_address TEXT NOT NULL,
  
  -- Transaction Details
  amount_usdc DECIMAL(18, 2) NOT NULL,
  tokens_received DECIMAL(18, 6) NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')) DEFAULT 'pending',
  
  -- Blockchain Details
  block_number BIGINT,
  gas_used BIGINT,
  gas_price DECIMAL(18, 9),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error handling
  error_message TEXT
);

-- ── Create indexes for performance ─────────────────────────────────────────

-- Projects indexes
CREATE INDEX idx_projects_status ON launchpad_projects(status);
CREATE INDEX idx_projects_featured ON launchpad_projects(featured);
CREATE INDEX idx_projects_trending ON launchpad_projects(trending);
CREATE INDEX idx_projects_presale_end ON launchpad_projects(presale_end);
CREATE INDEX idx_projects_created_at ON launchpad_projects(created_at DESC);

-- Transactions indexes
CREATE INDEX idx_transactions_user_address ON presale_transactions(user_address);
CREATE INDEX idx_transactions_user_id ON presale_transactions(user_id);
CREATE INDEX idx_transactions_project_id ON presale_transactions(project_id);
CREATE INDEX idx_transactions_status ON presale_transactions(status);
CREATE INDEX idx_transactions_tx_hash ON presale_transactions(tx_hash);
CREATE INDEX idx_transactions_created_at ON presale_transactions(created_at DESC);

-- ── Enable Row Level Security ──────────────────────────────────────────────

ALTER TABLE launchpad_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE presale_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ── RLS Policies for launchpad_projects ────────────────────────────────────

-- Anyone can view projects
CREATE POLICY "Projects are viewable by everyone"
  ON launchpad_projects FOR SELECT
  USING (true);

-- Only admins can insert projects
CREATE POLICY "Only admins can create projects"
  ON launchpad_projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- Only admins can update projects
CREATE POLICY "Only admins can update projects"
  ON launchpad_projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- Only admins can delete projects
CREATE POLICY "Only admins can delete projects"
  ON launchpad_projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- ── RLS Policies for presale_transactions ──────────────────────────────────

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
  ON presale_transactions FOR SELECT
  USING (
    user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  );

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON presale_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- Authenticated users can create transactions
CREATE POLICY "Authenticated users can create transactions"
  ON presale_transactions FOR INSERT
  WITH CHECK (
    user_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
  );

-- Only system/admins can update transaction status
CREATE POLICY "Only admins can update transactions"
  ON presale_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      AND role = 'admin'
    )
  );

-- ── RLS Policies for notifications ─────────────────────────────────────────

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM wallet_users
      WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    )
  );

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ── Create function to update project stats ────────────────────────────────

CREATE OR REPLACE FUNCTION update_project_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update raised amount and participant count when transaction is confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    UPDATE launchpad_projects
    SET 
      raised_amount = raised_amount + NEW.amount_usdc,
      participant_count = (
        SELECT COUNT(DISTINCT user_address)
        FROM presale_transactions
        WHERE project_id = NEW.project_id
        AND status = 'confirmed'
      ),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  -- Subtract amount if transaction fails after being confirmed
  IF NEW.status = 'failed' AND OLD.status = 'confirmed' THEN
    UPDATE launchpad_projects
    SET 
      raised_amount = GREATEST(0, raised_amount - NEW.amount_usdc),
      participant_count = (
        SELECT COUNT(DISTINCT user_address)
        FROM presale_transactions
        WHERE project_id = NEW.project_id
        AND status = 'confirmed'
      ),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Create trigger for automatic stats update ──────────────────────────────

CREATE TRIGGER trigger_update_project_stats
  AFTER INSERT OR UPDATE OF status ON presale_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_stats();

-- ── Create function to auto-update project status ──────────────────────────

CREATE OR REPLACE FUNCTION auto_update_project_status()
RETURNS void AS $$
BEGIN
  -- Mark projects as 'live' when presale starts
  UPDATE launchpad_projects
  SET status = 'live', updated_at = NOW()
  WHERE status = 'upcoming'
  AND presale_start <= NOW()
  AND presale_end > NOW();
  
  -- Mark projects as 'ended' when presale ends (if soft cap not reached)
  UPDATE launchpad_projects
  SET status = 'ended', updated_at = NOW()
  WHERE status = 'live'
  AND presale_end <= NOW()
  AND raised_amount < soft_cap;
  
  -- Mark projects as 'success' when presale ends (if soft cap reached)
  UPDATE launchpad_projects
  SET status = 'success', updated_at = NOW()
  WHERE status = 'live'
  AND presale_end <= NOW()
  AND raised_amount >= soft_cap;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Create function to get project progress ────────────────────────────────

CREATE OR REPLACE FUNCTION get_project_progress(project_uuid UUID)
RETURNS TABLE (
  progress_percent DECIMAL(5, 2),
  time_remaining INTERVAL,
  is_active BOOLEAN,
  can_purchase BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE 
      WHEN p.hard_cap > 0 THEN ROUND((p.raised_amount / p.hard_cap * 100)::NUMERIC, 2)
      ELSE 0::DECIMAL(5, 2)
    END as progress_percent,
    CASE
      WHEN p.presale_end > NOW() THEN p.presale_end - NOW()
      ELSE INTERVAL '0'
    END as time_remaining,
    (p.status = 'live' AND p.presale_end > NOW()) as is_active,
    (
      p.status = 'live' 
      AND p.presale_end > NOW() 
      AND p.raised_amount < p.hard_cap
    ) as can_purchase
  FROM launchpad_projects p
  WHERE p.id = project_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Insert seed data (example projects) ────────────────────────────────────

INSERT INTO launchpad_projects (
  name, symbol, tagline, description, logo_url, status,
  total_supply, presale_allocation, presale_rate, listing_rate,
  soft_cap, hard_cap, min_purchase, max_purchase,
  presale_start, presale_end, listing_date,
  kyc_verified, audit_verified, safu_verified, doxxed,
  website_url, twitter_url, telegram_url,
  featured, trending
) VALUES
-- Abundance Protocol (Live)
(
  'Abundance Protocol',
  'ABDT',
  'Micro-Lending DeFi Ecosystem',
  'Abundance Protocol is a mathematically verified micro-lending ecosystem generating sustainable yields while empowering unbanked communities globally. Built on proven DeFi principles with institutional-grade security.',
  'https://via.placeholder.com/100/10b981/ffffff?text=A',
  'live',
  1000000000, -- 1B total supply
  300000000,  -- 300M presale allocation (30%)
  4.2,        -- 1 USDC = 4.2 ABDT
  3.8,        -- 1 USDC = 3.8 ABDT (listing)
  50000,      -- 50k soft cap
  200000,     -- 200k hard cap
  50,         -- min 50 USDC
  10000,      -- max 10k USDC
  NOW() - INTERVAL '2 days',  -- Started 2 days ago
  NOW() + INTERVAL '3 days',  -- Ends in 3 days
  NOW() + INTERVAL '7 days',  -- Lists in 7 days
  true, true, true, false,    -- KYC, Audit, SAFU verified
  'https://abundance.protocol',
  'https://twitter.com/abundance',
  'https://t.me/abundance',
  true,  -- featured
  true   -- trending
),

-- DeFi Yield (Live)
(
  'DeFi Yield',
  'DYD',
  'Automated Yield Optimization',
  'DeFi Yield is an automated yield optimization protocol that maximizes returns across multiple DeFi platforms using advanced algorithms and smart routing.',
  'https://via.placeholder.com/100/06b6d4/ffffff?text=D',
  'live',
  500000000,
  150000000,
  5.0,
  4.5,
  40000,
  200000,
  50,
  10000,
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '10 days',
  false, true, true, false,
  'https://defiyield.io',
  'https://twitter.com/defiyield',
  'https://t.me/defiyield',
  false,
  true
),

-- MetaGaming (Upcoming)
(
  'MetaGaming',
  'MGT',
  'Play-to-Earn Gaming Platform',
  'MetaGaming is a next-generation play-to-earn gaming platform featuring AAA-quality games with real economic value and true asset ownership.',
  'https://via.placeholder.com/100/8b5cf6/ffffff?text=M',
  'upcoming',
  2000000000,
  400000000,
  8.0,
  7.0,
  30000,
  150000,
  50,
  10000,
  NOW() + INTERVAL '2 days',
  NOW() + INTERVAL '9 days',
  NOW() + INTERVAL '14 days',
  true, false, false, true,
  'https://metagaming.gg',
  'https://twitter.com/metagaming',
  'https://t.me/metagaming',
  false,
  false
),

-- GreenEnergy (Success)
(
  'GreenEnergy',
  'GRN',
  'Sustainable Energy Blockchain',
  'GreenEnergy tokenizes renewable energy assets, enabling global investment in sustainable energy projects with transparent carbon credit tracking.',
  'https://via.placeholder.com/100/22c55e/ffffff?text=G',
  'success',
  750000000,
  225000000,
  3.5,
  3.0,
  50000,
  250000,
  50,
  10000,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '2 days',
  true, true, true, true,
  'https://greenenergy.eco',
  'https://twitter.com/greenenergy',
  'https://t.me/greenenergy',
  false,
  false
);

-- Update GreenEnergy to have full raised amount (success case)
UPDATE launchpad_projects
SET raised_amount = 250000, participant_count = 2156
WHERE symbol = 'GRN';

-- Update Abundance Protocol with current progress
UPDATE launchpad_projects
SET raised_amount = 134500, participant_count = 1428
WHERE symbol = 'ABDT';

-- Update DeFi Yield with current progress
UPDATE launchpad_projects
SET raised_amount = 91600, participant_count = 892
WHERE symbol = 'DYD';

-- ── Create view for active projects ────────────────────────────────────────

CREATE OR REPLACE VIEW active_projects AS
SELECT 
  p.*,
  ROUND((p.raised_amount / p.hard_cap * 100)::NUMERIC, 2) as progress_percent,
  CASE
    WHEN p.presale_end > NOW() THEN p.presale_end - NOW()
    ELSE INTERVAL '0'
  END as time_remaining,
  (p.status = 'live' AND p.presale_end > NOW()) as is_active
FROM launchpad_projects p
WHERE p.status IN ('live', 'upcoming')
ORDER BY 
  CASE p.status
    WHEN 'live' THEN 1
    WHEN 'upcoming' THEN 2
  END,
  p.presale_start ASC;

-- ── Grant permissions ───────────────────────────────────────────────────────

-- Grant select on view to authenticated users
GRANT SELECT ON active_projects TO authenticated;
GRANT SELECT ON active_projects TO anon;

-- ── Create notification trigger for new transactions ───────────────────────

CREATE OR REPLACE FUNCTION notify_new_presale_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to user (FIXED: Uses wallet_users)
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    priority,
    metadata
  )
  SELECT
    wu.id,
    'presale_purchase',
    'Presale Purchase Confirmed',
    'Your purchase of ' || NEW.tokens_received || ' ' || proj.symbol || ' tokens has been confirmed!',
    'high',
    jsonb_build_object(
      'project_id', NEW.project_id,
      'project_name', proj.name,
      'amount_usdc', NEW.amount_usdc,
      'tokens_received', NEW.tokens_received,
      'tx_hash', NEW.tx_hash
    )
  FROM wallet_users wu
  JOIN launchpad_projects proj ON proj.id = NEW.project_id
  WHERE wu.wallet_address = NEW.user_address
  AND NEW.status = 'confirmed';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_presale_transaction
  AFTER INSERT OR UPDATE OF status ON presale_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION notify_new_presale_transaction();

-- ============================================================================
-- End of Schema
-- ============================================================================

-- Verify tables created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('launchpad_projects', 'presale_transactions', 'notifications')
ORDER BY table_name;

-- Show sample data
SELECT 
  name,
  symbol,
  status,
  raised_amount,
  hard_cap,
  participant_count,
  presale_end
FROM launchpad_projects
ORDER BY 
  CASE status
    WHEN 'live' THEN 1
    WHEN 'upcoming' THEN 2
    WHEN 'success' THEN 3
    WHEN 'ended' THEN 4
  END;

-- Compatibility check
SELECT 
  '✅ Launchpad tables created successfully' as status,
  (SELECT COUNT(*) FROM launchpad_projects) as projects_count,
  (SELECT COUNT(*) FROM presale_transactions) as transactions_count,
  (SELECT COUNT(*) FROM notifications) as notifications_count,
  (SELECT COUNT(*) FROM wallet_users) as wallet_users_count;
