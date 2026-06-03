-- ============================================================================
-- BACKFILL: Award Missing Store Purchase Commissions
-- ============================================================================
-- This script finds store purchases where commission was either:
-- 1. Not awarded at all
-- 2. Awarded with wrong amount (due to hardcoded $0.12 price)
-- And awards the correct commission amount
-- ============================================================================

DO $$
DECLARE
  v_purchase RECORD;
  v_commission_awarded NUMERIC;
  v_expected_commission NUMERIC;
  v_current_rzc_price NUMERIC;
  v_commission_diff NUMERIC;
  v_count INTEGER := 0;
BEGIN
  -- Get current RZC price
  SELECT price_usd INTO v_current_rzc_price
  FROM ico_rounds
  WHERE is_active = TRUE
  LIMIT 1;

  IF v_current_rzc_price IS NULL THEN
    v_current_rzc_price := 0.05;
  END IF;

  RAISE NOTICE 'Using RZC price: $%', v_current_rzc_price;
  RAISE NOTICE '---';

  -- Loop through recent store purchases with referrers
  FOR v_purchase IN
    SELECT 
      rt.id as purchase_id,
      rt.user_id as buyer_id,
      wu.wallet_address as buyer_wallet,
      rt.amount as rzc_purchased,
      (rt.metadata->>'package_price_usd')::NUMERIC as purchase_usd,
      rt.metadata->>'transaction_hash' as tx_hash,
      rt.created_at as purchase_time,
      wu.referrer_id,
      (SELECT wallet_address FROM wallet_users WHERE id = wu.referrer_id) as referrer_wallet
    FROM rzc_transactions rt
    JOIN wallet_users wu ON rt.user_id = wu.id
    WHERE rt.transaction_type = 'package_purchase'
      AND rt.description LIKE '%Direct RZC store purchase%'
      AND rt.created_at > NOW() - INTERVAL '7 days'
      AND wu.referrer_id IS NOT NULL
    ORDER BY rt.created_at DESC
  LOOP
    -- Check if commission was already awarded
    SELECT COALESCE(SUM(rt2.amount), 0) INTO v_commission_awarded
    FROM rzc_transactions rt2
    WHERE rt2.user_id = v_purchase.referrer_id
      AND rt2.transaction_type = 'referral_commission'
      AND rt2.metadata->>'buyer_user_id' = v_purchase.buyer_id::TEXT
      AND rt2.created_at >= v_purchase.purchase_time
      AND rt2.created_at <= v_purchase.purchase_time + INTERVAL '10 minutes';

    -- Calculate expected commission
    v_expected_commission := (v_purchase.purchase_usd * 0.10) / v_current_rzc_price;
    v_commission_diff := v_expected_commission - v_commission_awarded;

    -- If commission is missing or significantly wrong (more than 1 RZC difference)
    IF ABS(v_commission_diff) > 1 THEN
      RAISE NOTICE 'Purchase: % bought $% of RZC', 
        SUBSTRING(v_purchase.buyer_wallet, 1, 8), 
        v_purchase.purchase_usd;
      RAISE NOTICE '  Expected commission: % RZC', ROUND(v_expected_commission, 2);
      RAISE NOTICE '  Awarded commission: % RZC', ROUND(v_commission_awarded, 2);
      RAISE NOTICE '  Difference: % RZC', ROUND(v_commission_diff, 2);

      -- Award the missing/corrected commission
      IF v_commission_diff > 0 THEN
        PERFORM award_rzc_tokens(
          v_purchase.referrer_id,
          v_commission_diff,
          'referral_commission',
          'Corrected 10% commission from Store RZC Purchase (backfill)',
          jsonb_build_object(
            'buyer_user_id', v_purchase.buyer_id,
            'package_name', 'Store RZC Purchase',
            'package_price_usd', v_purchase.purchase_usd,
            'commission_percentage', 10,
            'commission_usd', v_purchase.purchase_usd * 0.10,
            'commission_rzc_price', v_current_rzc_price,
            'transaction_hash', v_purchase.tx_hash,
            'backfill', true,
            'original_commission', v_commission_awarded,
            'corrected_commission', v_expected_commission
          )
        );

        RAISE NOTICE '  ✅ Awarded % RZC to referrer %', 
          ROUND(v_commission_diff, 2),
          SUBSTRING(v_purchase.referrer_wallet, 1, 8);
        
        v_count := v_count + 1;
      END IF;

      RAISE NOTICE '---';
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % commissions corrected', v_count;
END $$;

-- ============================================================================
-- VERIFICATION: Check results
-- ============================================================================
SELECT 
  'Backfilled commissions' as type,
  COUNT(*) as count,
  SUM(amount) as total_rzc
FROM rzc_transactions
WHERE transaction_type = 'referral_commission'
  AND description LIKE '%backfill%'
  AND created_at > NOW() - INTERVAL '1 hour';
