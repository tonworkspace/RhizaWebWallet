-- ============================================================================
-- WALLET DATABASE HEALTH CHECK
-- Run these queries in Supabase SQL Editor to verify database health
-- ============================================================================

-- ============================================================================
-- 1. CHECK ALL TABLES EXIST
-- ============================================================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'wallet_%'
ORDER BY table_name;

-- Expected: 11 tables
-- wallet_activity_logs
-- wallet_analytics_events
-- wallet_newsletter_subscriptions
-- wallet_notification_preferences
-- wallet_notifications
-- wallet_referral_earnings
-- wallet_referrals
-- wallet_rzc_reward_claims
-- wallet_rzc_transactions
-- wallet_transactions
-- wallet_users

-- ============================================================================
-- 2. CHECK ROW COUNTS
-- ============================================================================
SELECT 
  'wallet_users' as table_name,
  COUNT(*) as row_count
FROM wallet_users
UNION ALL
SELECT 'wallet_referrals', COUNT(*) FROM wallet_referrals
UNION ALL
SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
UNION ALL
SELECT 'wallet_rzc_transactions', COUNT(*) FROM wallet_rzc_transactions
UNION ALL
SELECT 'wallet_notifications', COUNT(*) FROM wallet_notifications
UNION ALL
SELECT 'wallet_activity_logs', COUNT(*) FROM wallet_activity_logs
ORDER BY table_name;

-- ============================================================================
-- 3. CHECK DATA INTEGRITY
-- ============================================================================

-- Users without referral records
SELECT 
  'Users without referral records' as issue,
  COUNT(*) as count
FROM wallet_users u
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE r.id IS NULL;

-- Referrals without users
SELECT 
  'Referrals without users' as issue,
  COUNT(*) as count
FROM wallet_referrals r
LEFT JOIN wallet_users u ON r.user_id = u.id
WHERE u.id IS NULL;

-- Transactions without users
SELECT 
  'Transactions without users' as issue,
  COUNT(*) as count
FROM wallet_transactions t
LEFT JOIN wallet_users u ON t.user_id = u.id
WHERE u.id IS NULL;

-- RZC transactions without users
SELECT 
  'RZC transactions without users' as issue,
  COUNT(*) as count
FROM wallet_rzc_transactions t
LEFT JOIN wallet_users u ON t.user_id = u.id
WHERE u.id IS NULL;

-- ============================================================================
-- 4. CHECK INDEXES
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'wallet_%'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes for performance

-- ============================================================================
-- 5. CHECK FOREIGN KEYS
-- ============================================================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'wallet_%'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- 6. CHECK FUNCTIONS
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%wallet%' OR routine_name LIKE '%rzc%')
ORDER BY routine_name;

-- Expected functions:
-- award_rzc_tokens
-- update_updated_at_column

-- ============================================================================
-- 7. CHECK RLS POLICIES
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'wallet_%'
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. USER STATISTICS
-- ============================================================================
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN is_active THEN 1 END) as active_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
  SUM(rzc_balance) as total_rzc_balance,
  AVG(rzc_balance) as avg_rzc_balance,
  MAX(rzc_balance) as max_rzc_balance,
  MIN(created_at) as first_user_created,
  MAX(created_at) as last_user_created
FROM wallet_users;

-- ============================================================================
-- 9. REFERRAL STATISTICS
-- ============================================================================
SELECT 
  COUNT(*) as total_referral_records,
  COUNT(CASE WHEN referrer_id IS NOT NULL THEN 1 END) as users_with_referrer,
  SUM(total_referrals) as total_referrals_made,
  SUM(total_earned) as total_earned_from_referrals,
  AVG(total_referrals) as avg_referrals_per_user,
  MAX(total_referrals) as max_referrals_by_one_user
FROM wallet_referrals;

-- ============================================================================
-- 10. TRANSACTION STATISTICS
-- ============================================================================
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'send' THEN 1 END) as send_transactions,
  COUNT(CASE WHEN type = 'receive' THEN 1 END) as receive_transactions,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_transactions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
  MIN(created_at) as first_transaction,
  MAX(created_at) as last_transaction
FROM wallet_transactions;

-- ============================================================================
-- 11. RZC TRANSACTION STATISTICS
-- ============================================================================
SELECT 
  type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(created_at) as first_transaction,
  MAX(created_at) as last_transaction
FROM wallet_rzc_transactions
GROUP BY type
ORDER BY transaction_count DESC;

-- ============================================================================
-- 12. RECENT ACTIVITY
-- ============================================================================
SELECT 
  'User Signups (Last 24h)' as metric,
  COUNT(*)::text as value
FROM wallet_users
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'Transactions (Last 24h)',
  COUNT(*)::text
FROM wallet_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'RZC Transactions (Last 24h)',
  COUNT(*)::text
FROM wallet_rzc_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'Referrals (Last 24h)',
  COUNT(*)::text
FROM wallet_referrals
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- 13. TOP USERS BY RZC BALANCE
-- ============================================================================
SELECT 
  name,
  wallet_address,
  rzc_balance,
  created_at
FROM wallet_users
ORDER BY rzc_balance DESC
LIMIT 10;

-- ============================================================================
-- 14. TOP REFERRERS
-- ============================================================================
SELECT 
  u.name,
  u.wallet_address,
  r.referral_code,
  r.total_referrals,
  r.total_earned,
  r.rank
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
ORDER BY r.total_referrals DESC
LIMIT 10;

-- ============================================================================
-- 15. CHECK FOR ANOMALIES
-- ============================================================================

-- Users with negative RZC balance (should be 0)
SELECT 
  'Users with negative RZC balance' as anomaly,
  COUNT(*) as count
FROM wallet_users
WHERE rzc_balance < 0;

-- Users with unusually high RZC balance (> 100,000)
SELECT 
  'Users with very high RZC balance' as anomaly,
  COUNT(*) as count
FROM wallet_users
WHERE rzc_balance > 100000;

-- Referrals with mismatched counts
SELECT 
  'Referrals with count mismatch' as anomaly,
  COUNT(*) as count
FROM wallet_referrals r
WHERE r.total_referrals != (
  SELECT COUNT(*) 
  FROM wallet_referrals r2 
  WHERE r2.referrer_id = r.user_id
);

-- Duplicate wallet addresses (should be 0)
SELECT 
  'Duplicate wallet addresses' as anomaly,
  COUNT(*) as count
FROM (
  SELECT wallet_address, COUNT(*) as cnt
  FROM wallet_users
  GROUP BY wallet_address
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================================================
-- 16. DATABASE SIZE
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'wallet_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 17. PERFORMANCE CHECK
-- ============================================================================

-- Slow queries (if pg_stat_statements is enabled)
-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   max_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%wallet_%'
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- Table bloat check
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  CASE 
    WHEN n_live_tup > 0 
    THEN ROUND((n_dead_tup::numeric / n_live_tup::numeric) * 100, 2)
    ELSE 0 
  END as dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'wallet_%'
ORDER BY n_dead_tup DESC;

-- ============================================================================
-- HEALTH CHECK SUMMARY
-- ============================================================================
SELECT 
  'Database Health Check Complete' as status,
  NOW() as checked_at,
  (SELECT COUNT(*) FROM wallet_users) as total_users,
  (SELECT COUNT(*) FROM wallet_transactions) as total_transactions,
  (SELECT SUM(rzc_balance) FROM wallet_users) as total_rzc_in_circulation;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- Expected Results:
-- - All 11 tables should exist
-- - No orphaned records (0 count for integrity checks)
-- - Foreign keys properly set up
-- - award_rzc_tokens function exists
-- - RLS policies enabled on all tables
-- - No negative RZC balances
-- - No duplicate wallet addresses
-- - Dead tuple percentage < 20%
-- 
-- If any issues found:
-- 1. Check the specific query that failed
-- 2. Review the table structure
-- 3. Run appropriate fix queries
-- 4. Re-run health check to verify
-- 
