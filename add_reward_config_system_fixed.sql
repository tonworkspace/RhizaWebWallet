-- ============================================================================
-- REWARD CONFIGURATION SYSTEM (Fixed - No Admin Check)
-- ============================================================================
-- Description: Database-driven reward configuration for flexible bonus management
-- Author: System
-- Date: 2024
-- ============================================================================

-- ============================================================================
-- 1. CREATE REWARD_CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_config (
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
  
  -- Constraints
  CONSTRAINT reward_config_key_format CHECK (key ~ '^[A-Z0-9_]+$'),
  CONSTRAINT reward_config_value_range CHECK (value >= min_value AND value <= max_value),
  CONSTRAINT reward_config_category_valid CHECK (category IN ('general', 'signup', 'activation', 'referral', 'milestone', 'transaction', 'login', 'commission'))
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reward_config_key ON reward_config(key);
CREATE INDEX IF NOT EXISTS idx_reward_config_category ON reward_config(category);
CREATE INDEX IF NOT EXISTS idx_reward_config_active ON reward_config(is_active);
CREATE INDEX IF NOT EXISTS idx_reward_config_updated ON reward_config(updated_at DESC);

-- ============================================================================
-- 3. CREATE AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS reward_config_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID NOT NULL REFERENCES reward_config(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_config_audit_config ON reward_config_audit(config_id);
CREATE INDEX IF NOT EXISTS idx_reward_config_audit_created ON reward_config_audit(created_at DESC);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE reward_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_config_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES (Simplified - No Admin Check)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read active reward config" ON reward_config;
DROP POLICY IF EXISTS "Admins can manage reward config" ON reward_config;
DROP POLICY IF EXISTS "Service role can manage reward config" ON reward_config;
DROP POLICY IF EXISTS "Anyone can read audit log" ON reward_config_audit;
DROP POLICY IF EXISTS "System can insert audit log" ON reward_config_audit;

-- Allow public read of active configs
CREATE POLICY "Anyone can read active reward config" 
  ON reward_config FOR SELECT 
  USING (is_active = true);

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role can manage reward config" 
  ON reward_config FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Allow public read of audit log
CREATE POLICY "Anyone can read audit log" 
  ON reward_config_audit FOR SELECT 
  USING (true);

-- Allow system to insert audit log
CREATE POLICY "System can insert audit log" 
  ON reward_config_audit FOR INSERT 
  WITH CHECK (true);

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get reward amount by key
CREATE OR REPLACE FUNCTION get_reward_amount(p_key TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  SELECT value INTO v_amount
  FROM reward_config
  WHERE key = p_key AND is_active = true;
  
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Reward config not found: %', p_key;
  END IF;
  
  RETURN v_amount;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get all active rewards
CREATE OR REPLACE FUNCTION get_all_rewards()
RETURNS TABLE (
  key TEXT,
  value NUMERIC,
  description TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.key,
    r.value,
    r.description,
    r.category
  FROM reward_config r
  WHERE r.is_active = true
  ORDER BY r.category, r.key;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update reward config with audit trail
CREATE OR REPLACE FUNCTION update_reward_config(
  p_key TEXT,
  p_new_value NUMERIC,
  p_changed_by TEXT,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  old_value NUMERIC,
  new_value NUMERIC
) AS $$
DECLARE
  v_config_id UUID;
  v_old_value NUMERIC;
  v_min_value NUMERIC;
  v_max_value NUMERIC;
BEGIN
  -- Get current config
  SELECT id, value, min_value, max_value 
  INTO v_config_id, v_old_value, v_min_value, v_max_value
  FROM reward_config
  WHERE key = p_key;
  
  IF v_config_id IS NULL THEN
    success := false;
    message := 'Reward config not found: ' || p_key;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Validate new value
  IF p_new_value < v_min_value OR p_new_value > v_max_value THEN
    success := false;
    message := format('Value must be between %s and %s', v_min_value, v_max_value);
    old_value := v_old_value;
    new_value := p_new_value;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Update config
  UPDATE reward_config
  SET 
    value = p_new_value,
    updated_by = p_changed_by,
    updated_at = NOW()
  WHERE key = p_key;
  
  -- Insert audit log
  INSERT INTO reward_config_audit (
    config_id, key, old_value, new_value, changed_by, change_reason
  ) VALUES (
    v_config_id, p_key, v_old_value, p_new_value, p_changed_by, p_change_reason
  );
  
  success := true;
  message := 'Reward config updated successfully';
  old_value := v_old_value;
  new_value := p_new_value;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get reward config history
CREATE OR REPLACE FUNCTION get_reward_config_history(p_key TEXT, p_limit INT DEFAULT 10)
RETURNS TABLE (
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.old_value,
    a.new_value,
    a.changed_by,
    a.change_reason,
    a.created_at
  FROM reward_config_audit a
  WHERE a.key = p_key
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. CREATE TRIGGER FOR AUTO-UPDATING updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reward_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reward_config_timestamp ON reward_config;

CREATE TRIGGER trigger_update_reward_config_timestamp
  BEFORE UPDATE ON reward_config
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_config_timestamp();

-- ============================================================================
-- 8. INSERT DEFAULT VALUES (Based on 1 RZC = $0.133)
-- ============================================================================

INSERT INTO reward_config (key, value, description, category, min_value, max_value, updated_by) VALUES
  -- Signup & Activation
  ('SIGNUP_BONUS', 4.5, 'Welcome bonus on wallet creation (~$0.60)', 'signup', 0, 1000, 'system_init'),
  ('ACTIVATION_BONUS', 15, 'Bonus for wallet activation (~$2.00)', 'activation', 0, 1000, 'system_init'),
  
  -- Referral Bonuses
  ('REFERRAL_BONUS', 50, 'Bonus for each successful referral (~$6.65)', 'referral', 0, 1000, 'system_init'),
  
  -- Milestone Bonuses
  ('REFERRAL_MILESTONE_10', 75, 'Bonus at 10 referrals (~$10.00)', 'milestone', 0, 5000, 'system_init'),
  ('REFERRAL_MILESTONE_50', 125, 'Bonus at 50 referrals (~$16.63)', 'milestone', 0, 10000, 'system_init'),
  ('REFERRAL_MILESTONE_100', 500, 'Bonus at 100 referrals (~$66.50)', 'milestone', 0, 50000, 'system_init'),
  ('REFERRAL_MILESTONE_250', 800, 'Bonus at 250 referrals (~$106.40)', 'milestone', 0, 100000, 'system_init'),
  ('REFERRAL_MILESTONE_500', 1500, 'Bonus at 500 referrals (~$199.50)', 'milestone', 0, 100000, 'system_init'),
  
  -- Transaction & Login
  ('TRANSACTION_BONUS', 1, 'Small bonus per transaction (~$0.13)', 'transaction', 0, 100, 'system_init'),
  ('DAILY_LOGIN', 1, 'Daily login bonus (~$0.13)', 'login', 0, 100, 'system_init'),
  
  -- Commission Percentages
  ('PACKAGE_COMMISSION_PERCENT', 10, 'Commission percentage for package purchases (in RZC)', 'commission', 0, 50, 'system_init'),
  ('TON_COMMISSION_PERCENT', 10, 'Commission percentage for TON payments', 'commission', 0, 50, 'system_init'),
  
  -- Squad Mining
  ('SQUAD_MINING_BASE_REWARD', 1, 'Base reward per squad member for mining (~$0.13)', 'general', 0, 1000, 'system_init'),
  ('SQUAD_MINING_COOLDOWN_HOURS', 8, 'Hours between squad mining claims', 'general', 1, 168, 'system_init')
  
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON reward_config TO anon, authenticated;
GRANT SELECT ON reward_config_audit TO anon, authenticated;
GRANT ALL ON reward_config TO service_role;
GRANT ALL ON reward_config_audit TO service_role;

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- View all reward configs
SELECT 
  key,
  value,
  ROUND(value * 0.133, 2) as usd_value,
  description,
  category,
  is_active
FROM reward_config
ORDER BY category, key;

-- Test get_reward_amount function
SELECT get_reward_amount('REFERRAL_BONUS') as referral_bonus;

-- Test get_all_rewards function
SELECT * FROM get_all_rewards();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Reward configuration system created successfully!';
  RAISE NOTICE '📊 Total configs: %', (SELECT COUNT(*) FROM reward_config);
  RAISE NOTICE '🎯 Active configs: %', (SELECT COUNT(*) FROM reward_config WHERE is_active = true);
  RAISE NOTICE '';
  RAISE NOTICE '💰 Sample Values (1 RZC = $0.133):';
  RAISE NOTICE '  • Signup Bonus: 4.5 RZC (~$0.60)';
  RAISE NOTICE '  • Referral Bonus: 50 RZC (~$6.65)';
  RAISE NOTICE '  • Activation Bonus: 15 RZC (~$2.00)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Run update_rewards_keep_referral_50.sql to apply custom values';
  RAISE NOTICE '2. Update frontend services to use get_reward_amount()';
  RAISE NOTICE '3. Test reward flows with new system';
  RAISE NOTICE '';
END $$;
