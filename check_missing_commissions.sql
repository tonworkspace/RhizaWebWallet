-- ============================================================================
-- CHECK: Find Store Purchases That May Have Wrong Commission
-- ============================================================================
-- Look for recent store purchases and check if commissions were awarded correctly
-- ============================================================================

-- 1. Find recent store RZC purchases
SELECT 
  rt.id,
  rt.user_id,
  wu.wallet_address as buyer_wallet,
  rt.amount as rzc_purchased,
  rt.metadata->>'package_price_usd' as purchase_usd,
  rt.metadata->>'transaction_hash' as tx_hash,
  rt.created_at,
  wu.referrer_id,
  (SELECT wallet_address FROM wallet_users WHERE id = wu.referrer_id) as referrer_wallet
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
WHERE rt.transaction_type = 'package_purchase'
  AND rt.description LIKE '%Direct RZC store purchase%'
  AND rt.created_at > NOW() - INTERVAL '7 days'
ORDER BY rt.created_at DESC
LIMIT 20;

-- 2. Check if commissions were awarded for these purchases
WITH recent_purchases AS (
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
)
SELECT 
  rp.*,
  -- Check if commission was awarded
  (
    SELECT rt2.amount 
    FROM rzc_transactions rt2
    WHERE rt2.user_id = rp.referrer_id
      AND rt2.transaction_type = 'referral_commission'
      AND rt2.metadata->>'buyer_user_id' = rp.buyer_id::TEXT
      AND rt2.created_at >= rp.purchase_time
      AND rt2.created_at <= rp.purchase_time + INTERVAL '5 minutes'
    LIMIT 1
  ) as commission_awarded_rzc,
  -- Calculate what commission SHOULD be at current price
  (rp.purchase_usd * 0.10) / (SELECT price_usd FROM ico_rounds WHERE is_active = TRUE LIMIT 1) as expected_commission_rzc,
  -- Calculate what commission WAS with old hardcoded price
  (rp.purchase_usd * 0.10) / 0.12 as old_wrong_commission_rzc
FROM recent_purchases rp
WHERE rp.referrer_id IS NOT NULL
ORDER BY rp.purchase_time DESC;

-- 3. Find the specific $5 purchase mentioned
SELECT 
  rt.id,
  wu.wallet_address as buyer,
  rt.amount as rzc_purchased,
  rt.metadata->>'package_price_usd' as purchase_usd,
  rt.created_at,
  (SELECT wallet_address FROM wallet_users WHERE id = wu.referrer_id) as referrer,
  -- Check commission
  (
    SELECT rt2.amount 
    FROM rzc_transactions rt2
    WHERE rt2.user_id = wu.referrer_id
      AND rt2.transaction_type = 'referral_commission'
      AND rt2.metadata->>'buyer_user_id' = wu.id::TEXT
      AND rt2.created_at >= rt.created_at
      AND rt2.created_at <= rt.created_at + INTERVAL '5 minutes'
    LIMIT 1
  ) as commission_awarded,
  -- Expected commission at $0.05/RZC
  ((rt.metadata->>'package_price_usd')::NUMERIC * 0.10) / 0.05 as should_be_rzc,
  -- Wrong commission at $0.12/RZC  
  ((rt.metadata->>'package_price_usd')::NUMERIC * 0.10) / 0.12 as wrong_amount_rzc
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
WHERE rt.transaction_type = 'package_purchase'
  AND rt.description LIKE '%Direct RZC store purchase%'
  AND (rt.metadata->>'package_price_usd')::NUMERIC BETWEEN 4.5 AND 5.5
  AND rt.created_at > NOW() - INTERVAL '24 hours'
  AND wu.referrer_id IS NOT NULL
ORDER BY rt.created_at DESC
LIMIT 5;
