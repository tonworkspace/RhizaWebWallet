-- RhizaCore Mining & Shareholder System Database Schema
-- Execute this in your Supabase SQL Editor

-- =====================================================
-- 1. MINING NODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS mining_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium', 'vip')),
  tier_name TEXT NOT NULL, -- e.g., 'Silver', 'Gold', 'Platinum'
  price_point INTEGER NOT NULL, -- $100, $200, etc.
  activation_fee DECIMAL(10,2) NOT NULL,
  mining_rate DECIMAL(10,2) NOT NULL, -- RZC per day
  revenue_share_percentage DECIMAL(5,2) DEFAULT 0, -- For VIP only
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'pending')),
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL for lifetime nodes
  last_mining_claim TIMESTAMP DEFAULT NOW(),
  total_mined DECIMAL(12,2) DEFAULT 0,
  nft_certificate_id TEXT, -- TON NFT ID for VIP
  nft_minted BOOLEAN DEFAULT FALSE,
  transaction_hash TEXT, -- Purchase transaction
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (wallet_address) REFERENCES wallets(address) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_mining_nodes_wallet ON mining_nodes(wallet_address);
CREATE INDEX idx_mining_nodes_tier ON mining_nodes(tier);
CREATE INDEX idx_mining_nodes_status ON mining_nodes(status);
CREATE INDEX idx_mining_nodes_activated ON mining_nodes(activated_at);

-- =====================================================
-- 2. SHAREHOLDER BENEFITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shareholder_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  tier_name TEXT NOT NULL,
  
  -- Revenue Distribution
  revenue_share_amount DECIMAL(12,2) DEFAULT 0,
  profit_pool_total DECIMAL(12,2) DEFAULT 0,
  share_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Governance
  governance_votes_cast INTEGER DEFAULT 0,
  governance_proposals_created INTEGER DEFAULT 0,
  
  -- Airdrops & Bonuses
  airdrops_received INTEGER DEFAULT 0,
  airdrop_value DECIMAL(10,2) DEFAULT 0,
  bonus_rewards DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  distributed BOOLEAN DEFAULT FALSE,
  distributed_at TIMESTAMP,
  transaction_hash TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (node_id) REFERENCES mining_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_address) REFERENCES wallets(address) ON DELETE CASCADE,
  UNIQUE(node_id, month_year)
);

CREATE INDEX idx_shareholder_benefits_node ON shareholder_benefits(node_id);
CREATE INDEX idx_shareholder_benefits_wallet ON shareholder_benefits(wallet_address);
CREATE INDEX idx_shareholder_benefits_month ON shareholder_benefits(month_year);
CREATE INDEX idx_shareholder_benefits_distributed ON shareholder_benefits(distributed);

-- =====================================================
-- 3. PROFIT POOL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profit_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month_year TEXT NOT NULL UNIQUE, -- Format: 'YYYY-MM'
  
  -- Revenue Sources
  transaction_fees DECIMAL(12,2) DEFAULT 0,
  activation_fees DECIMAL(12,2) DEFAULT 0,
  marketplace_commissions DECIMAL(12,2) DEFAULT 0,
  staking_penalties DECIMAL(12,2) DEFAULT 0,
  other_revenue DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  
  -- Allocations
  shareholder_allocation DECIMAL(12,2) DEFAULT 0, -- 30% of total
  operations_allocation DECIMAL(12,2) DEFAULT 0, -- 70% of total
  
  -- Tier Pools
  silver_pool DECIMAL(10,2) DEFAULT 0, -- 30% of shareholder allocation
  gold_pool DECIMAL(10,2) DEFAULT 0, -- 35% of shareholder allocation
  platinum_pool DECIMAL(10,2) DEFAULT 0, -- 35% of shareholder allocation
  
  -- Shareholder Counts
  silver_shareholders INTEGER DEFAULT 0,
  gold_shareholders INTEGER DEFAULT 0,
  platinum_shareholders INTEGER DEFAULT 0,
  
  -- Status
  calculated BOOLEAN DEFAULT FALSE,
  distributed BOOLEAN DEFAULT FALSE,
  calculated_at TIMESTAMP,
  distributed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profit_pool_month ON profit_pool(month_year);
CREATE INDEX idx_profit_pool_distributed ON profit_pool(distributed);

-- =====================================================
-- 4. GOVERNANCE PROPOSALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS governance_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('feature', 'tokenomics', 'partnership', 'treasury', 'other')),
  
  -- Voting
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'passed', 'rejected', 'expired', 'executed')),
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  votes_abstain INTEGER DEFAULT 0,
  quorum_required INTEGER DEFAULT 10, -- Minimum votes needed
  
  -- Creator
  created_by TEXT NOT NULL,
  creator_tier TEXT NOT NULL,
  
  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  voting_starts_at TIMESTAMP DEFAULT NOW(),
  voting_ends_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  
  -- Metadata
  discussion_url TEXT,
  execution_details JSONB,
  
  FOREIGN KEY (created_by) REFERENCES wallets(address) ON DELETE CASCADE
);

CREATE INDEX idx_governance_proposals_status ON governance_proposals(status);
CREATE INDEX idx_governance_proposals_creator ON governance_proposals(created_by);
CREATE INDEX idx_governance_proposals_type ON governance_proposals(proposal_type);

-- =====================================================
-- 5. GOVERNANCE VOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS governance_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL,
  voter_address TEXT NOT NULL,
  node_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('for', 'against', 'abstain')),
  voting_power INTEGER DEFAULT 1, -- Based on tier
  comment TEXT,
  voted_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (proposal_id) REFERENCES governance_proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_address) REFERENCES wallets(address) ON DELETE CASCADE,
  FOREIGN KEY (node_id) REFERENCES mining_nodes(id) ON DELETE CASCADE,
  UNIQUE(proposal_id, voter_address)
);

CREATE INDEX idx_governance_votes_proposal ON governance_votes(proposal_id);
CREATE INDEX idx_governance_votes_voter ON governance_votes(voter_address);

-- =====================================================
-- 6. MINING CLAIMS TABLE (Track daily mining rewards)
-- =====================================================
CREATE TABLE IF NOT EXISTS mining_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  claim_date DATE NOT NULL,
  claimed_at TIMESTAMP DEFAULT NOW(),
  transaction_hash TEXT,
  
  FOREIGN KEY (node_id) REFERENCES mining_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_address) REFERENCES wallets(address) ON DELETE CASCADE,
  UNIQUE(node_id, claim_date)
);

CREATE INDEX idx_mining_claims_node ON mining_claims(node_id);
CREATE INDEX idx_mining_claims_wallet ON mining_claims(wallet_address);
CREATE INDEX idx_mining_claims_date ON mining_claims(claim_date);

-- =====================================================
-- 7. NODE TIER CONFIGURATIONS (Reference Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS node_tier_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'premium', 'vip')),
  tier_name TEXT NOT NULL, -- 'Silver', 'Gold', 'Platinum'
  price_point INTEGER NOT NULL,
  activation_fee DECIMAL(10,2) NOT NULL,
  mining_rate DECIMAL(10,2) NOT NULL,
  revenue_share_percentage DECIMAL(5,2) DEFAULT 0,
  referral_direct_percentage DECIMAL(5,2) DEFAULT 5,
  referral_indirect_percentage DECIMAL(5,2) DEFAULT 2,
  priority_support BOOLEAN DEFAULT FALSE,
  early_access BOOLEAN DEFAULT FALSE,
  governance_rights BOOLEAN DEFAULT FALSE,
  nft_certificate BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tier, price_point)
);

-- Insert default configurations
INSERT INTO node_tier_configs (tier, tier_name, price_point, activation_fee, mining_rate, referral_direct_percentage, referral_indirect_percentage) VALUES
-- Standard Tier
('standard', 'Bronze', 100, 15, 10, 5, 2),
('standard', 'Bronze+', 200, 15, 25, 5, 2),
('standard', 'Silver', 300, 15, 40, 5, 2),
('standard', 'Silver+', 400, 15, 60, 5, 2),

-- Premium Tier
('premium', 'Gold', 500, 45, 100, 7, 3),
('premium', 'Gold+', 600, 45, 130, 7, 3),
('premium', 'Platinum', 700, 45, 160, 7, 3),
('premium', 'Platinum+', 1000, 45, 250, 7, 3),

-- VIP Tier (Shareholders)
('vip', 'Silver Shareholder', 2000, 120, 400, 10, 5),
('vip', 'Gold Shareholder', 5000, 120, 1200, 10, 5),
('vip', 'Platinum Shareholder', 10000, 120, 3000, 10, 5);

-- Update VIP tiers with shareholder benefits
UPDATE node_tier_configs SET 
  revenue_share_percentage = 5,
  priority_support = TRUE,
  early_access = TRUE,
  governance_rights = TRUE,
  nft_certificate = TRUE
WHERE tier_name = 'Silver Shareholder';

UPDATE node_tier_configs SET 
  revenue_share_percentage = 10,
  priority_support = TRUE,
  early_access = TRUE,
  governance_rights = TRUE,
  nft_certificate = TRUE
WHERE tier_name = 'Gold Shareholder';

UPDATE node_tier_configs SET 
  revenue_share_percentage = 20,
  priority_support = TRUE,
  early_access = TRUE,
  governance_rights = TRUE,
  nft_certificate = TRUE
WHERE tier_name = 'Platinum Shareholder';

-- Update Premium tiers
UPDATE node_tier_configs SET 
  priority_support = TRUE,
  early_access = TRUE
WHERE tier = 'premium';

-- =====================================================
-- 8. FUNCTIONS FOR AUTOMATION
-- =====================================================

-- Function to calculate daily mining rewards
CREATE OR REPLACE FUNCTION calculate_daily_mining_rewards()
RETURNS void AS $$
DECLARE
  node_record RECORD;
  days_since_last_claim INTEGER;
  reward_amount DECIMAL(10,2);
BEGIN
  FOR node_record IN 
    SELECT * FROM mining_nodes 
    WHERE status = 'active' 
    AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    -- Calculate days since last claim
    days_since_last_claim := EXTRACT(DAY FROM NOW() - node_record.last_mining_claim);
    
    IF days_since_last_claim >= 1 THEN
      -- Calculate reward
      reward_amount := node_record.mining_rate * days_since_last_claim;
      
      -- Update wallet balance
      UPDATE wallets 
      SET rzc_balance = rzc_balance + reward_amount,
          updated_at = NOW()
      WHERE address = node_record.wallet_address;
      
      -- Record claim
      INSERT INTO mining_claims (node_id, wallet_address, amount, claim_date)
      VALUES (node_record.id, node_record.wallet_address, reward_amount, CURRENT_DATE);
      
      -- Update node
      UPDATE mining_nodes 
      SET last_mining_claim = NOW(),
          total_mined = total_mined + reward_amount,
          updated_at = NOW()
      WHERE id = node_record.id;
      
      -- Create notification
      INSERT INTO notifications (wallet_address, type, title, message, priority)
      VALUES (
        node_record.wallet_address,
        'reward_claimed',
        'Mining Rewards Claimed',
        'You received ' || reward_amount || ' RZC from your mining node',
        'normal'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly profit pool
CREATE OR REPLACE FUNCTION calculate_monthly_profit_pool(target_month TEXT)
RETURNS void AS $$
DECLARE
  total_rev DECIMAL(12,2);
  shareholder_alloc DECIMAL(12,2);
  silver_count INTEGER;
  gold_count INTEGER;
  platinum_count INTEGER;
BEGIN
  -- Calculate total revenue for the month
  -- This is a simplified version - you'll need to aggregate from your actual revenue sources
  total_rev := 100000; -- Replace with actual calculation
  
  -- 30% goes to shareholders
  shareholder_alloc := total_rev * 0.30;
  
  -- Count active shareholders
  SELECT COUNT(*) INTO silver_count FROM mining_nodes WHERE tier_name = 'Silver Shareholder' AND status = 'active';
  SELECT COUNT(*) INTO gold_count FROM mining_nodes WHERE tier_name = 'Gold Shareholder' AND status = 'active';
  SELECT COUNT(*) INTO platinum_count FROM mining_nodes WHERE tier_name = 'Platinum Shareholder' AND status = 'active';
  
  -- Insert or update profit pool
  INSERT INTO profit_pool (
    month_year, total_revenue, shareholder_allocation, operations_allocation,
    silver_pool, gold_pool, platinum_pool,
    silver_shareholders, gold_shareholders, platinum_shareholders,
    calculated, calculated_at
  ) VALUES (
    target_month, total_rev, shareholder_alloc, total_rev * 0.70,
    shareholder_alloc * 0.30, shareholder_alloc * 0.35, shareholder_alloc * 0.35,
    silver_count, gold_count, platinum_count,
    TRUE, NOW()
  )
  ON CONFLICT (month_year) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    shareholder_allocation = EXCLUDED.shareholder_allocation,
    silver_pool = EXCLUDED.silver_pool,
    gold_pool = EXCLUDED.gold_pool,
    platinum_pool = EXCLUDED.platinum_pool,
    calculated = TRUE,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE mining_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shareholder_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;

-- Policies for mining_nodes
CREATE POLICY "Users can view their own nodes" ON mining_nodes
  FOR SELECT USING (wallet_address = current_setting('app.current_user_address', TRUE));

CREATE POLICY "Users can insert their own nodes" ON mining_nodes
  FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_user_address', TRUE));

-- Policies for shareholder_benefits
CREATE POLICY "Users can view their own benefits" ON shareholder_benefits
  FOR SELECT USING (wallet_address = current_setting('app.current_user_address', TRUE));

-- Policies for mining_claims
CREATE POLICY "Users can view their own claims" ON mining_claims
  FOR SELECT USING (wallet_address = current_setting('app.current_user_address', TRUE));

-- Policies for governance_votes
CREATE POLICY "Users can view all votes" ON governance_votes
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can insert their own votes" ON governance_votes
  FOR INSERT WITH CHECK (voter_address = current_setting('app.current_user_address', TRUE));

-- =====================================================
-- 10. TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_mining_nodes_updated_at BEFORE UPDATE ON mining_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profit_pool_updated_at BEFORE UPDATE ON profit_pool
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DONE! 
-- =====================================================
-- Next steps:
-- 1. Run this SQL in Supabase
-- 2. Create the Mining Nodes purchase page
-- 3. Implement payment processing
-- 4. Build shareholder dashboard
-- 5. Set up automated daily mining rewards (cron job)
-- 6. Set up monthly profit distribution (cron job)
