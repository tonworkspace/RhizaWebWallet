-- ============================================================================
-- FIX: Store Referral Commission - Use Dynamic RZC Price from ICO Rounds
-- ============================================================================
-- PROBLEM: award_package_purchase_commission uses hardcoded $0.12 RZC price
-- SOLUTION: Get current price from active ico_rounds table
-- ============================================================================

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
  -- ✅ Get current RZC price from active ICO round (dynamic, not hardcoded)
  SELECT price_usd INTO v_rzc_price
  FROM ico_rounds
  WHERE is_active = TRUE
  ORDER BY round_number ASC
  LIMIT 1;

  -- Fallback to $0.05 if no active round found (should never happen)
  IF v_rzc_price IS NULL OR v_rzc_price <= 0 THEN
    v_rzc_price := 0.05;
    RAISE WARNING 'No active ICO round found, using fallback price $0.05';
  END IF;

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

  -- ✅ Calculate 10% commission in RZC using CURRENT price
  -- Commission = (Package Price * 10%) / Current RZC Price
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
      'commission_rzc_price', v_rzc_price,
      'transaction_hash', p_transaction_hash
    )
  );

  -- Return success
  referrer_id := v_referrer_id;
  commission_amount := v_commission_rzc;
  success := TRUE;
  message := 'Awarded ' || ROUND(v_commission_rzc, 2)::TEXT || ' RZC commission to referrer (at $' || v_rzc_price::TEXT || '/RZC)';
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION award_package_purchase_commission IS 'Awards 10% commission to referrer when their referral purchases a package - uses dynamic RZC price from active ICO round';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Test the fix with a $5 purchase at current seed price ($0.05)
SELECT 
  'Test: $5 purchase commission' as test_case,
  (5 * 0.10) as commission_usd,
  (SELECT price_usd FROM ico_rounds WHERE is_active = TRUE LIMIT 1) as current_rzc_price,
  ((5 * 0.10) / (SELECT price_usd FROM ico_rounds WHERE is_active = TRUE LIMIT 1)) as expected_commission_rzc,
  'Should be 10 RZC at $0.05/RZC' as note;

-- ============================================================================
-- APPLY THIS FIX
-- ============================================================================
SELECT '✅ Store commission function updated to use dynamic RZC price from ICO rounds' as status;
