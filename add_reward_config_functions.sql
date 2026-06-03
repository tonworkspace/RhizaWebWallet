-- ============================================================================
-- REWARD CONFIG HELPER FUNCTIONS
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS get_reward_amount(TEXT);
DROP FUNCTION IF EXISTS get_all_rewards();
DROP FUNCTION IF EXISTS update_reward_config(TEXT, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_reward_config_history(TEXT, INT);
DROP FUNCTION IF EXISTS update_reward_config_timestamp();

-- Function 1: Get reward amount by key
CREATE OR REPLACE FUNCTION get_reward_amount(p_key TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result_value NUMERIC;
BEGIN
  SELECT value INTO result_value
  FROM reward_config
  WHERE key = p_key AND is_active = true;
  
  IF result_value IS NULL THEN
    RAISE EXCEPTION 'Reward config not found: %', p_key;
  END IF;
  
  RETURN result_value;
END;
$$;

-- Function 2: Get all active rewards
CREATE OR REPLACE FUNCTION get_all_rewards()
RETURNS TABLE (
  key TEXT,
  value NUMERIC,
  description TEXT,
  category TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
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
$$;

-- Function 3: Update reward config with audit
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
)
LANGUAGE plpgsql
AS $$
DECLARE
  config_record RECORD;
BEGIN
  -- Get current config
  SELECT id, value, min_value, max_value 
  INTO config_record
  FROM reward_config
  WHERE key = p_key;
  
  IF config_record.id IS NULL THEN
    success := false;
    message := 'Reward config not found: ' || p_key;
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Validate new value
  IF p_new_value < config_record.min_value OR p_new_value > config_record.max_value THEN
    success := false;
    message := format('Value must be between %s and %s', config_record.min_value, config_record.max_value);
    old_value := config_record.value;
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
    config_record.id, p_key, config_record.value, p_new_value, p_changed_by, p_change_reason
  );
  
  success := true;
  message := 'Reward config updated successfully';
  old_value := config_record.value;
  new_value := p_new_value;
  RETURN NEXT;
END;
$$;

-- Function 4: Get reward config history
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
LANGUAGE plpgsql
STABLE
AS $$
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
$$;

-- Function 5: Auto-update timestamp trigger
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

-- Test the functions
SELECT get_reward_amount('REFERRAL_BONUS') as test_result;
