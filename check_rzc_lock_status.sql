-- ============================================================================
-- CHECK RZC LOCK STATUS
-- ============================================================================
-- Run this to see how many users have RZC locked vs unlocked
-- ============================================================================

-- Overall status summary
SELECT 
  CASE 
    WHEN balance_verified = true AND can_send_rzc = true THEN '✅ Unlocked (Can Send RZC)'
    WHEN balance_verified = true AND can_send_rzc = false THEN '⚠️ Verified but Locked'
    WHEN balance_verified = false OR balance_verified IS NULL THEN '🔒 Locked (Not Verified)'
    ELSE '❓ Unknown Status'
  END as status,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM wallet_users
GROUP BY 
  CASE 
    WHEN balance_verified = true AND can_send_rzc = true THEN '✅ Unlocked (Can Send RZC)'
    WHEN balance_verified = true AND can_send_rzc = false THEN '⚠️ Verified but Locked'
    WHEN balance_verified = false OR balance_verified IS NULL THEN '🔒 Locked (Not Verified)'
    ELSE '❓ Unknown Status'
  END
ORDER BY user_count DESC;

-- Detailed breakdown
SELECT 
  balance_verified,
  can_send_rzc,
  verification_badge_awarded,
  COUNT(*) as user_count
FROM wallet_users
GROUP BY balance_verified, can_send_rzc, verification_badge_awarded
ORDER BY user_count DESC;

-- Sample of locked users
SELECT 
  wallet_address,
  name,
  rzc_balance,
  balance_verified,
  can_send_rzc,
  verification_badge_awarded,
  created_at
FROM wallet_users
WHERE can_send_rzc IS NOT TRUE
ORDER BY rzc_balance DESC
LIMIT 10;

-- Sample of unlocked users
SELECT 
  wallet_address,
  name,
  rzc_balance,
  balance_verified,
  can_send_rzc,
  verification_badge_awarded,
  created_at
FROM wallet_users
WHERE can_send_rzc = true
ORDER BY rzc_balance DESC
LIMIT 10;

-- Verification requests status
SELECT 
  status,
  COUNT(*) as request_count,
  ROUND(AVG(discrepancy_amount), 2) as avg_discrepancy
FROM balance_verification_requests
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'under_review' THEN 2
    WHEN 'approved' THEN 3
    WHEN 'resolved' THEN 4
    WHEN 'rejected' THEN 5
    ELSE 6
  END;

-- Total RZC locked vs unlocked
SELECT 
  CASE 
    WHEN can_send_rzc = true THEN 'Unlocked RZC'
    ELSE 'Locked RZC'
  END as status,
  COUNT(*) as users,
  SUM(rzc_balance) as total_rzc,
  ROUND(AVG(rzc_balance), 2) as avg_rzc_per_user
FROM wallet_users
GROUP BY 
  CASE 
    WHEN can_send_rzc = true THEN 'Unlocked RZC'
    ELSE 'Locked RZC'
  END;
