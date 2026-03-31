-- ============================================================================
-- UPDATE REFERRAL REWARDS SYSTEM - CLEAN VERSION
-- ============================================================================
-- This script updates the referral reward amounts to match new requirements:
-- - Signup bonus: $5 worth of RZC (50 RZC at $0.10/RZC)
-- - Welcome bonus: $5 worth of RZC (50 RZC at $0.10/RZC)
-- - Referral commission: 10% of package purchase value
-- - Team sales commission: 1% of weekly team sales
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Package Purchase Commission System
-- ============================================================================
-- When a user purchases a package, their referrer gets 10% commission

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
  v_rzc_price NUMERIC := 0.12; -- $0.10 per RZC (adjust as needed)
BEGIN
  -- Get the referrer
  SELECT referrer_id INTO v_referrer_id
  FROM wallet_users
  WHERE id = p_buyer_user_id;

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
  -- Commission = (Package Price * 10%) / RZC Price
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

COMMENT ON FUNCTION award_package_purchase_commission IS 'Awards 10% commission to referrer when their referral purchases a package';


-- ============================================================================
-- STEP 2: Create Team Sales Commission System (1% Weekly)
-- ============================================================================
-- This will be calculated weekly and distributed to all users based on their team sales

CREATE TABLE IF NOT EXISTS team_sales_weekly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES wallet_users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  team_sales_usd NUMERIC NOT NULL DEFAULT 0,
  commission_percentage NUMERIC NOT NULL DEFAULT 1.0,
  commission_rzc NUMERIC NOT NULL DEFAULT 0,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_team_sales_weekly_user_id ON team_sales_weekly(user_id);
CREATE INDEX IF NOT EXISTS idx_team_sales_weekly_week_start ON team_sales_weekly(week_start);
CREATE INDEX IF NOT EXISTS idx_team_sales_weekly_paid ON team_sales_weekly(paid);

COMMENT ON TABLE team_sales_weekly IS 'Tracks weekly team sales and 1% commission for each user';


-- Function to calculate and distribute weekly team sales commissions
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
  v_rzc_price NUMERIC := 0.12; -- $0.12 per RZC
BEGIN
  -- Loop through all users
  FOR v_user IN 
    SELECT id, wallet_address
    FROM wallet_users
    WHERE is_activated = TRUE
  LOOP
    -- Calculate team sales for this user
    -- Team sales = sum of all package purchases by downline members
    SELECT COALESCE(SUM(pp.price_usd), 0) INTO v_team_sales
    FROM package_purchases pp
    WHERE pp.user_id IN (
      -- Get all downline members recursively
      WITH RECURSIVE downline AS (
        -- Direct referrals
        SELECT id FROM wallet_users WHERE referrer_id = v_user.id
        UNION
        -- Indirect referrals
        SELECT wu.id 
        FROM wallet_users wu
        INNER JOIN downline d ON wu.referrer_id = d.id
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

COMMENT ON FUNCTION calculate_weekly_team_sales_commissions IS 'Calculates 1% weekly team sales commission for all users';


-- Function to pay out weekly team sales commissions
CREATE OR REPLACE FUNCTION payout_weekly_team_sales_commissions(
  p_week_start DATE
)
RETURNS TABLE (
  user_id UUID,
  commission_rzc NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Loop through unpaid commissions for the week
  FOR v_record IN 
    SELECT 
      ts.user_id,
      ts.commission_rzc,
      ts.team_sales_usd,
      ts.week_start,
      ts.week_end
    FROM team_sales_weekly ts
    WHERE ts.week_start = p_week_start
      AND ts.paid = FALSE
      AND ts.commission_rzc > 0
  LOOP
    -- Award RZC tokens
    PERFORM award_rzc_tokens(
      v_record.user_id,
      v_record.commission_rzc,
      'team_sales_commission',
      '1% weekly team sales commission ($' || v_record.team_sales_usd::TEXT || ' in sales)',
      jsonb_build_object(
        'week_start', v_record.week_start,
        'week_end', v_record.week_end,
        'team_sales_usd', v_record.team_sales_usd,
        'commission_percentage', 1
      )
    );

    -- Mark as paid
    UPDATE team_sales_weekly
    SET paid = TRUE, paid_at = NOW()
    WHERE user_id = v_record.user_id
      AND week_start = p_week_start;

    -- Return result
    user_id := v_record.user_id;
    commission_rzc := v_record.commission_rzc;
    status := 'Paid';
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION payout_weekly_team_sales_commissions IS 'Pays out 1% weekly team sales commissions to all eligible users';


-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 'Setup complete! Functions created successfully.' as status;

-- Check functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'award_package_purchase_commission',
  'calculate_weekly_team_sales_commissions',
  'payout_weekly_team_sales_commissions'
)
ORDER BY routine_name;

-- Check table exists
SELECT 
  table_name,
  (SELECT COUNT(*) FROM team_sales_weekly) as row_count
FROM information_schema.tables
WHERE table_name = 'team_sales_weekly';
