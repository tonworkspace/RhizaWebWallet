-- ============================================================================
-- TOP RZC HOLDERS LEADERBOARD
-- ============================================================================
-- Query to fetch the top 100 RZC holders with their balances and rankings
-- Excludes admin accounts and inactive users for fair leaderboard

-- Basic Top 100 Query
SELECT 
  ROW_NUMBER() OVER (ORDER BY rzc_balance DESC) as rank,
  name,
  wallet_address,
  rzc_balance,
  is_activated,
  created_at,
  -- Mask wallet address for privacy (show first 6 and last 4 chars)
  CONCAT(
    SUBSTRING(wallet_address, 1, 6),
    '...',
    SUBSTRING(wallet_address, LENGTH(wallet_address) - 3, 4)
  ) as masked_address
FROM wallet_users
WHERE 
  role != 'admin' -- Exclude admin accounts
  AND is_active = true -- Only active users
  AND rzc_balance > 0 -- Must have positive balance
ORDER BY rzc_balance DESC
LIMIT 100;

-- ============================================================================
-- ENHANCED LEADERBOARD WITH STATS
-- ============================================================================
-- Includes additional context like referral count and activation status

SELECT 
  ROW_NUMBER() OVER (ORDER BY wu.rzc_balance DESC) as rank,
  wu.name,
  CONCAT(
    SUBSTRING(wu.wallet_address, 1, 6),
    '...',
    SUBSTRING(wu.wallet_address, LENGTH(wu.wallet_address) - 3, 4)
  ) as masked_address,
  wu.rzc_balance,
  wu.is_activated,
  COALESCE(wr.total_referrals, 0) as total_referrals,
  COALESCE(wr.total_earned, 0) as referral_earnings,
  wu.created_at,
  -- Calculate days since joining
  EXTRACT(DAY FROM (NOW() - wu.created_at)) as days_active
FROM wallet_users wu
LEFT JOIN wallet_referrals wr ON wu.id = wr.user_id
WHERE 
  wu.role != 'admin'
  AND wu.is_active = true
  AND wu.rzc_balance > 0
ORDER BY wu.rzc_balance DESC
LIMIT 100;

-- ============================================================================
-- LEADERBOARD SUMMARY STATS
-- ============================================================================
-- Provides context about the overall distribution

SELECT 
  COUNT(*) as total_holders,
  SUM(rzc_balance) as total_rzc_in_circulation,
  AVG(rzc_balance) as average_balance,
  MAX(rzc_balance) as highest_balance,
  MIN(rzc_balance) as lowest_balance,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rzc_balance) as median_balance,
  COUNT(CASE WHEN rzc_balance >= 1000 THEN 1 END) as holders_over_1k,
  COUNT(CASE WHEN rzc_balance >= 10000 THEN 1 END) as holders_over_10k,
  COUNT(CASE WHEN rzc_balance >= 100000 THEN 1 END) as holders_over_100k
FROM wallet_users
WHERE 
  role != 'admin'
  AND is_active = true
  AND rzc_balance > 0;
