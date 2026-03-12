-- ============================================================================
-- UPDATE RZC PRICE IN DATABASE FUNCTIONS
-- ============================================================================
-- This script updates the RZC price across all database functions
-- Run this whenever you change the RZC price in config/rzcConfig.ts
-- ============================================================================

-- ============================================================================
-- STEP 1: Create RZC Configuration Table
-- ============================================================================
-- This table stores the current RZC price and other configuration values

CREATE TABLE IF NOT EXISTS rzc_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value NUMERIC NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default RZC price
INSERT INTO rzc_config (key, value, description)
VALUES ('rzc_price_usd', 0.12, 'Current RZC token price in USD')
ON CONFLICT (key) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_rzc_config_key ON rzc_config(key);

COMMENT ON TABLE rzc_config IS 'Stores RZC token configuration including price';


-- ============================================================================
-- STEP 2: Create Function to Get RZC Price
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rzc_price()
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  SELECT value INTO v_price
  FROM rzc_config
  WHERE key = 'rzc_price_usd';
  
  -- Default to 0.10 if not found
  RETURN COALESCE(v_price, 0.10);
END;
$$;

COMMENT ON FUNCTION get_rzc_price IS 'Returns the current RZC price in USD';


-- ============================================================================
-- STEP 3: Create Function to Update RZC Price
-- ============================================================================

CREATE OR REPLACE FUNCTION update_rzc_price(
  p_new_price NUMERIC,
  p_updated_by TEXT DEFAULT 'system'
)
RETURNS TABLE (
  old_price NUMERIC,
  new_price NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_price NUMERIC;
BEGIN
  -- Validate price
  IF p_new_price <= 0 THEN
    RAISE EXCEPTION 'RZC price must be greater than 0';
  END IF;
  
  -- Get old price
  SELECT value INTO v_old_price
  FROM rzc_config
  WHERE key = 'rzc_price_usd';
  
  -- Update price
  UPDATE rzc_config
  SET value = p_new_price,
      updated_at = NOW(),
      updated_by = p_updated_by
  WHERE key = 'rzc_price_usd';
  
  -- Return result
  old_price := v_old_price;
  new_price := p_new_price;
  updated_at := NOW();
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION update_rzc_price IS 'Updates the RZC price in USD';


-- ============================================================================
-- STEP 4: Update Package Purchase Commission Function
-- ============================================================================
-- Replace hardcoded price with dynamic price from config

CREATE OR REPLACE FUNCTION award_package_purchase_commission(
  p_buyer_user_id UUID,
  p_package_price_usd NUMERIC,
  p_package_name TEXT,
  p_transaction_hash TEXT
)
RETURNS TABLE (
  referrer_id UUID,
  commission_amount NUMERIC,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id UUID;
  v_commission_rzc NUMERIC;
  v_rzc_price NUMERIC;
BEGIN
  -- Get current RZC price from config
  v_rzc_price := get_rzc_price();
  
  -- Get the referrer from wallet_referrals table
  SELECT wr.referrer_id INTO v_referrer_id
  FROM wallet_users wu
  JOIN wallet_referrals wr ON wu.id = wr.user_id
  WHERE wu.id = p_buyer_user_id;

  -- If no referrer, return early
  IF v_referrer_id IS NULL THEN
    referrer_id := NULL;
    commission_amount := 0;
    success := FALSE;
    message := 'No referrer found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Calculate 10% commission in RZC
  v_commission_rzc := (p_package_price_usd * 0.10) / v_rzc_price;

  -- Award commission to referrer
  PERFORM award_rzc_tokens(
    v_referrer_id,
    v_commission_rzc,
    'referral_commission',
    '10% commission from ' || p_package_name || ' purchase by referral',
    jsonb_build_object(
      'buyer_user_id', p_buyer_user_id,
      'package_name', p_package_name,
      'package_price_usd', p_package_price_usd,
      'commission_percentage', 10,
      'commission_usd', p_package_price_usd * 0.10,
      'rzc_price_usd', v_rzc_price,
      'transaction_hash', p_transaction_hash
    )
  );

  -- Return success
  referrer_id := v_referrer_id;
  commission_amount := v_commission_rzc;
  success := TRUE;
  message := 'Awarded ' || v_commission_rzc::TEXT || ' RZC commission to referrer';
  RETURN NEXT;
END;
$$;


-- ============================================================================
-- STEP 5: Update Team Sales Commission Function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_weekly_team_sales_commissions(
  p_week_start DATE,
  p_week_end DATE
)
RETURNS TABLE (
  user_id UUID,
  wallet_address TEXT,
  team_sales_usd NUMERIC,
  commission_rzc NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_team_sales NUMERIC;
  v_commission_rzc NUMERIC;
  v_rzc_price NUMERIC;
BEGIN
  -- Get current RZC price from config
  v_rzc_price := get_rzc_price();
  
  -- Loop through all users
  FOR v_user IN 
    SELECT id, wallet_address
    FROM wallet_users
    WHERE is_activated = TRUE
  LOOP
    -- Calculate team sales for this user
    SELECT COALESCE(SUM(pp.price_usd), 0) INTO v_team_sales
    FROM package_purchases pp
    WHERE pp.user_id IN (
      -- Get all downline members recursively
      WITH RECURSIVE downline AS (
        -- Direct referrals
        SELECT wu.id 
        FROM wallet_users wu
        JOIN wallet_referrals wr ON wu.id = wr.user_id
        WHERE wr.referrer_id = v_user.id
        UNION
        -- Indirect referrals
        SELECT wu.id 
        FROM wallet_users wu
        JOIN wallet_referrals wr ON wu.id = wr.user_id
        INNER JOIN downline d ON wr.referrer_id = d.id
      )
      SELECT id FROM downline
    )
    AND pp.purchased_at BETWEEN p_week_start AND p_week_end;

    -- Skip if no team sales
    IF v_team_sales = 0 THEN
      CONTINUE;
    END IF;

    -- Calculate 1% commission in RZC
    v_commission_rzc := (v_team_sales * 0.01) / v_rzc_price;

    -- Insert or update team sales record
    INSERT INTO team_sales_weekly (
      user_id,
      week_start,
      week_end,
      team_sales_usd,
      commission_percentage,
      commission_rzc,
      paid,
      created_at
    ) VALUES (
      v_user.id,
      p_week_start,
      p_week_end,
      v_team_sales,
      1.0,
      v_commission_rzc,
      FALSE,
      NOW()
    )
    ON CONFLICT (user_id, week_start) 
    DO UPDATE SET
      team_sales_usd = EXCLUDED.team_sales_usd,
      commission_rzc = EXCLUDED.commission_rzc;

    -- Return result
    user_id := v_user.id;
    wallet_address := v_user.wallet_address;
    team_sales_usd := v_team_sales;
    commission_rzc := v_commission_rzc;
    status := 'Calculated';
    RETURN NEXT;
  END LOOP;
END;
$$;


-- ============================================================================
-- STEP 6: Create Helper Functions for Price Conversion
-- ============================================================================

-- Convert USD to RZC
CREATE OR REPLACE FUNCTION usd_to_rzc(p_usd_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN FLOOR(p_usd_amount / get_rzc_price());
END;
$$;

COMMENT ON FUNCTION usd_to_rzc IS 'Converts USD amount to RZC tokens';


-- Convert RZC to USD
CREATE OR REPLACE FUNCTION rzc_to_usd(p_rzc_amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN p_rzc_amount * get_rzc_price();
END;
$$;

COMMENT ON FUNCTION rzc_to_usd IS 'Converts RZC tokens to USD amount';


-- ============================================================================
-- STEP 7: Create Price History Table (Optional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rzc_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_rzc_price_history_changed_at ON rzc_price_history(changed_at DESC);

COMMENT ON TABLE rzc_price_history IS 'Tracks historical changes to RZC price';


-- Trigger to log price changes
CREATE OR REPLACE FUNCTION log_rzc_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.value IS DISTINCT FROM NEW.value AND NEW.key = 'rzc_price_usd' THEN
    INSERT INTO rzc_price_history (old_price, new_price, changed_by, reason)
    VALUES (OLD.value, NEW.value, NEW.updated_by, 'Price updated via update_rzc_price function');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_rzc_price_change ON rzc_config;
CREATE TRIGGER trigger_log_rzc_price_change
AFTER UPDATE ON rzc_config
FOR EACH ROW
EXECUTE FUNCTION log_rzc_price_change();


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check current RZC price
SELECT 
  'Current RZC Price' as info,
  get_rzc_price() as price_usd,
  '1 RZC = $' || get_rzc_price()::TEXT as display;

-- Check configuration table
SELECT * FROM rzc_config WHERE key = 'rzc_price_usd';

-- Test conversions
SELECT 
  'Conversion Tests' as info,
  usd_to_rzc(100) as "100_usd_to_rzc",
  rzc_to_usd(1000) as "1000_rzc_to_usd";


-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Update RZC price to $0.15
-- SELECT * FROM update_rzc_price(0.15, 'admin');

-- Example 2: Get current price
-- SELECT get_rzc_price();

-- Example 3: Convert $100 to RZC
-- SELECT usd_to_rzc(100);

-- Example 4: Convert 1000 RZC to USD
-- SELECT rzc_to_usd(1000);

-- Example 5: View price history
-- SELECT * FROM rzc_price_history ORDER BY changed_at DESC;


-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
SELECT 'RZC price configuration system installed successfully!' as status;
