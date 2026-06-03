-- ============================================================================
-- REWARD CONFIGURATION SYSTEM - CLEAN SETUP
-- ============================================================================

-- Step 1: Drop everything that might exist
DROP TABLE IF EXISTS reward_config_audit CASCADE;
DROP TABLE IF EXISTS reward_config CASCADE;

-- Step 2: Create reward_config table
CREATE TABLE reward_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  min_value NUMERIC DEFAULT 0,
  max_value NUMERIC DEFAULT 100000,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT reward_config_key_format CHECK (key ~ '^[A-Z0-9_]+$'),
  CONSTRAINT reward_config_value_range CHECK (value >= min_value AND value <= max_value),
  CONSTRAINT reward_config_category_valid CHECK (category IN ('general', 'signup', 'activation', 'referral', 'milestone', 'transaction', 'login', 'commission'))
);

-- Step 3: Create indexes
CREATE INDEX idx_reward_config_key ON reward_config(key);
CREATE INDEX idx_reward_config_category ON reward_config(category);
CREATE INDEX idx_reward_config_active ON reward_config(is_active);

-- Step 4: Create audit table
CREATE TABLE reward_config_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID NOT NULL REFERENCES reward_config(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_config_audit_config ON reward_config_audit(config_id);
CREATE INDEX idx_reward_config_audit_created ON reward_config_audit(created_at DESC);

-- Step 5: Enable RLS
ALTER TABLE reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_config_audit ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
CREATE POLICY "Anyone can read active reward config" 
  ON reward_config FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Service role can manage reward config" 
  ON reward_config FOR ALL 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read audit log" 
  ON reward_config_audit FOR SELECT 
  USING (true);

CREATE POLICY "System can insert audit log" 
  ON reward_config_audit FOR INSERT 
  WITH CHECK (true);

-- Step 7: Grant permissions
GRANT SELECT ON reward_config TO anon, authenticated;
GRANT SELECT ON reward_config_audit TO anon, authenticated;
GRANT ALL ON reward_config TO service_role;
GRANT ALL ON reward_config_audit TO service_role;

-- Step 8: Insert default values
INSERT INTO reward_config (key, value, description, category, min_value, max_value, updated_by) VALUES
  ('SIGNUP_BONUS', 4.5, 'Welcome bonus on wallet creation (~$0.60)', 'signup', 0, 1000, 'system_init'),
  ('ACTIVATION_BONUS', 15, 'Bonus for wallet activation (~$2.00)', 'activation', 0, 1000, 'system_init'),
  ('REFERRAL_BONUS', 50, 'Bonus for each successful referral (~$6.65)', 'referral', 0, 1000, 'system_init'),
  ('REFERRAL_MILESTONE_10', 75, 'Bonus at 10 referrals (~$10.00)', 'milestone', 0, 5000, 'system_init'),
  ('REFERRAL_MILESTONE_50', 125, 'Bonus at 50 referrals (~$16.63)', 'milestone', 0, 10000, 'system_init'),
  ('REFERRAL_MILESTONE_100', 500, 'Bonus at 100 referrals (~$66.50)', 'milestone', 0, 50000, 'system_init'),
  ('REFERRAL_MILESTONE_250', 800, 'Bonus at 250 referrals (~$106.40)', 'milestone', 0, 100000, 'system_init'),
  ('REFERRAL_MILESTONE_500', 1500, 'Bonus at 500 referrals (~$199.50)', 'milestone', 0, 100000, 'system_init'),
  ('TRANSACTION_BONUS', 1, 'Small bonus per transaction (~$0.13)', 'transaction', 0, 100, 'system_init'),
  ('DAILY_LOGIN', 1, 'Daily login bonus (~$0.13)', 'login', 0, 100, 'system_init'),
  ('PACKAGE_COMMISSION_PERCENT', 10, 'Commission percentage for package purchases', 'commission', 0, 50, 'system_init'),
  ('TON_COMMISSION_PERCENT', 10, 'Commission percentage for TON payments', 'commission', 0, 50, 'system_init'),
  ('SQUAD_MINING_BASE_REWARD', 1, 'Base reward per squad member (~$0.13)', 'general', 0, 1000, 'system_init'),
  ('SQUAD_MINING_COOLDOWN_HOURS', 8, 'Hours between squad mining claims', 'general', 1, 168, 'system_init');

-- Step 9: Verify
SELECT COUNT(*) as total_configs FROM reward_config;
