-- ============================================================================
-- CHECK: User Referrer Setup for TON Commission Split
-- ============================================================================
-- This checks if the $5 RZC buyer has a referrer and if the referrer has
-- a wallet address for receiving on-chain TON commissions
-- ============================================================================

-- 1. Find the recent $5 RZC purchase
WITH recent_5_dollar_purchase AS (
  SELECT 
    rt.id,
    rt.user_id as buyer_id,
    wu.wallet_address as buyer_wallet,
    rt.amount as rzc_purchased,
    (rt.metadata->>'package_price_usd')::NUMERIC as purchase_usd,
    rt.metadata->>'transaction_hash' as tx_hash,
    rt.created_at
  FROM rzc_transactions rt
  JOIN wallet_users wu ON rt.user_id = wu.id
  WHERE rt.transaction_type = 'package_purchase'
    AND rt.description LIKE '%Direct RZC store purchase%'
    AND (rt.metadata->>'package_price_usd')::NUMERIC BETWEEN 4.5 AND 5.5
    AND rt.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY rt.created_at DESC
  LIMIT 1
)
SELECT 
  p.*,
  -- Buyer's referrer info
  buyer.referrer_code as buyer_has_referrer_code,
  buyer.referrer_id as buyer_referrer_id,
  
  -- Referrer's details
  referrer.wallet_address as referrer_wallet_address,
  referrer.referral_code as referrer_code,
  referrer.is_activated as referrer_is_activated,
  
  -- Analysis
  CASE 
    WHEN buyer.referrer_code IS NULL THEN '❌ Buyer has NO referrer code'
    WHEN buyer.referrer_id IS NULL THEN '❌ Referrer code exists but referrer_id is NULL'
    WHEN referrer.wallet_address IS NULL THEN '❌ Referrer exists but has NO wallet address'
    WHEN referrer.wallet_address IS NOT NULL THEN '✅ Referrer wallet found - TON split should work'
    ELSE '⚠️ Unknown issue'
  END as ton_split_status
FROM recent_5_dollar_purchase p
JOIN wallet_users buyer ON p.buyer_id = buyer.id
LEFT JOIN wallet_users referrer ON buyer.referrer_id = referrer.id;

-- 2. Check if TON commission was recorded in database
WITH recent_5_dollar_purchase AS (
  SELECT 
    rt.user_id as buyer_id,
    rt.created_at as purchase_time
  FROM rzc_transactions rt
  WHERE rt.transaction_type = 'package_purchase'
    AND rt.description LIKE '%Direct RZC store purchase%'
    AND (rt.metadata->>'package_price_usd')::NUMERIC BETWEEN 4.5 AND 5.5
    AND rt.created_at > NOW() - INTERVAL '24 hours'
  ORDER BY rt.created_at DESC
  LIMIT 1
)
SELECT 
  tc.*,
  referrer.wallet_address as referrer_wallet,
  CASE 
    WHEN tc.id IS NULL THEN '❌ No TON commission record found'
    WHEN tc.paid = TRUE THEN '✅ TON commission recorded and marked as paid'
    WHEN tc.paid = FALSE THEN '⚠️ TON commission recorded but not yet paid'
  END as commission_status
FROM recent_5_dollar_purchase p
JOIN wallet_users buyer ON p.buyer_id = buyer.id
LEFT JOIN ton_commissions tc ON tc.buyer_user_id = p.buyer_id 
  AND tc.created_at >= p.purchase_time 
  AND tc.created_at <= p.purchase_time + INTERVAL '5 minutes'
LEFT JOIN wallet_users referrer ON tc.referrer_id = referrer.id;

-- 3. Check the actual on-chain transaction (if we have the hash)
-- This would need to be checked on TonViewer/TonScan manually
SELECT 
  rt.metadata->>'transaction_hash' as tx_hash,
  'Check this transaction on TonViewer to see if it has 2 messages (multisend)' as instruction,
  'https://tonviewer.com/transaction/' || (rt.metadata->>'transaction_hash') as tonviewer_link
FROM rzc_transactions rt
WHERE rt.transaction_type = 'package_purchase'
  AND rt.description LIKE '%Direct RZC store purchase%'
  AND (rt.metadata->>'package_price_usd')::NUMERIC BETWEEN 4.5 AND 5.5
  AND rt.created_at > NOW() - INTERVAL '24 hours'
ORDER BY rt.created_at DESC
LIMIT 1;

-- 4. General check: All store purchases in last 24h with referrer status
SELECT 
  wu.wallet_address as buyer,
  (rt.metadata->>'package_price_usd')::NUMERIC as purchase_usd,
  rt.created_at,
  wu.referrer_code as has_referrer_code,
  (SELECT wallet_address FROM wallet_users WHERE id = wu.referrer_id) as referrer_wallet,
  CASE 
    WHEN wu.referrer_id IS NOT NULL AND EXISTS(
      SELECT 1 FROM wallet_users WHERE id = wu.referrer_id AND wallet_address IS NOT NULL
    ) THEN '✅ Should use multisend'
    ELSE '❌ Single transaction (no referrer or no wallet)'
  END as expected_behavior
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
WHERE rt.transaction_type = 'package_purchase'
  AND rt.description LIKE '%Direct RZC store purchase%'
  AND rt.created_at > NOW() - INTERVAL '24 hours'
ORDER BY rt.created_at DESC;
