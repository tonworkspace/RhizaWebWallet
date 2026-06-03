-- ============================================================================
-- REWARD CONFIG HELPER FUNCTIONS (Compatible Version)
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_reward_amount(TEXT);
DROP FUNCTION IF EXISTS get_all_rewards();
DROP FUNCTION IF EXISTS update_reward_config(TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_reward_config_history(TEXT, INT);
DROP FUNCTION IF EXISTS update_reward_config_timestamp();

-- Function 1: Get reward amount by key (SQL function, no DECLARE)
CREATE OR REPLACE FUNCTION get_reward_amount(p_key TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT value
  FROM reward_config
  WHERE key = p_key AND is_active = true
  LIMIT 1;
$$;

-- Function 2: Get all active rewards (SQL function)
CREATE OR REPLACE FUNCTION get_all_rewards()
RETURNS TABLE (
  key TEXT,
  value NUMERIC,
  description TEXT,
  category TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    key,
    value,
    description,
    category
  FROM reward_config
  WHERE is_active = true
  ORDER BY category, key;
$$;

-- Function 3: Get reward config history (SQL function)
CREATE OR REPLACE FUNCTION get_reward_config_history(
  p_key TEXT, 
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  old_value NUMERIC,
  new_value NUMERIC,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    old_value,
    new_value,
    changed_by,
    change_reason,
    created_at
  FROM reward_config_audit
  WHERE key = p_key
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- Function 4: Auto-update timestamp trigger (minimal plpgsql)
CREATE OR REPLACE FUNCTION update_reward_config_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_reward_config_timestamp ON reward_config;

CREATE TRIGGER trigger_update_reward_config_timestamp
  BEFORE UPDATE ON reward_config
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_config_timestamp();

-- Test the get_reward_amount function
SELECT 
  'REFERRAL_BONUS' as key,
  get_reward_amount('REFERRAL_BONUS') as value,
  'Test successful' as status;

-- Show all rewards
SELECT * FROM get_all_rewards();
