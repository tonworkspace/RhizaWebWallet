# RZC Token System - Database Commands Reference

Quick reference for common RZC database operations in Supabase SQL Editor.

---

## 🚀 Migration Commands

### Run Initial Migration
```sql
-- Copy and paste contents of supabase_rzc_migration.sql
-- Then run in Supabase SQL Editor
```

### Award Retroactive Bonuses to Existing Users
```sql
SELECT * FROM award_retroactive_signup_bonuses();
```

---

## 👤 User Balance Queries

### Get User's RZC Balance
```sql
SELECT name, wallet_address, rzc_balance 
FROM wallet_users 
WHERE wallet_address = 'EQAbc...';
```

### Get Top 20 RZC Holders
```sql
SELECT name, wallet_address, rzc_balance, created_at
FROM wallet_users
ORDER BY rzc_balance DESC
LIMIT 20;
```

### Get Users with Zero Balance
```sql
SELECT name, wallet_address, created_at
FROM wallet_users
WHERE rzc_balance = 0
ORDER BY created_at DESC;
```

### Get Average RZC Balance
```sql
SELECT 
  COUNT(*) as total_users,
  AVG(rzc_balance) as avg_balance,
  MIN(rzc_balance) as min_balance,
  MAX(rzc_balance) as max_balance,
  SUM(rzc_balance) as total_in_circulation
FROM wallet_users;
```

---

## 📜 Transaction History Queries

### Get User's RZC Transaction History
```sql
SELECT 
  type,
  amount,
  balance_after,
  description,
  metadata,
  created_at
FROM wallet_rzc_transactions
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC;
```

### Get All Signup Bonuses
```sql
SELECT 
  u.name,
  u.wallet_address,
  t.amount,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'signup_bonus'
ORDER BY t.created_at DESC;
```

### Get All Referral Bonuses
```sql
SELECT 
  u.name as referrer_name,
  u.wallet_address as referrer_address,
  t.amount,
  t.metadata->>'referred_user_address' as referred_address,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'referral_bonus'
ORDER BY t.created_at DESC;
```

### Get All Milestone Bonuses
```sql
SELECT 
  u.name,
  u.wallet_address,
  t.amount,
  t.metadata->>'milestone' as milestone,
  t.metadata->>'referral_count' as referral_count,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.type = 'milestone_bonus'
ORDER BY t.created_at DESC;
```

### Get Recent RZC Activity (Last 50)
```sql
SELECT * FROM recent_rzc_activity LIMIT 50;
```

---

## 📊 Analytics Queries

### RZC Distribution by Range
```sql
SELECT 
  CASE 
    WHEN rzc_balance = 100 THEN '100 RZC (New Users)'
    WHEN rzc_balance BETWEEN 101 AND 500 THEN '101-500 RZC'
    WHEN rzc_balance BETWEEN 501 AND 1000 THEN '501-1,000 RZC'
    WHEN rzc_balance BETWEEN 1001 AND 5000 THEN '1,001-5,000 RZC'
    WHEN rzc_balance BETWEEN 5001 AND 10000 THEN '5,001-10,000 RZC'
    ELSE '10,000+ RZC'
  END as balance_range,
  COUNT(*) as user_count,
  SUM(rzc_balance) as total_rzc,
  ROUND(AVG(rzc_balance), 2) as avg_rzc
FROM wallet_users
GROUP BY balance_range
ORDER BY MIN(rzc_balance);
```

### Transaction Summary by Type
```sql
SELECT * FROM rzc_transaction_summary;
```

### Daily RZC Activity
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as transaction_count,
  SUM(amount) as total_awarded,
  COUNT(DISTINCT user_id) as unique_users
FROM wallet_rzc_transactions
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;
```

### Top Referrers by RZC Earned
```sql
SELECT 
  u.name,
  u.wallet_address,
  COUNT(*) as referral_bonuses,
  SUM(t.amount) as total_referral_rzc,
  r.total_referrals,
  r.rank
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
LEFT JOIN wallet_referrals r ON u.id = r.user_id
WHERE t.type IN ('referral_bonus', 'milestone_bonus')
GROUP BY u.id, u.name, u.wallet_address, r.total_referrals, r.rank
ORDER BY total_referral_rzc DESC
LIMIT 20;
```

---

## 🎁 Manual RZC Operations

### Award RZC to Specific User
```sql
-- Replace USER_ID with actual UUID
SELECT award_rzc_tokens(
  'USER_ID'::UUID,
  50.0,                    -- Amount
  'manual_bonus',          -- Type
  'Manual bonus award',    -- Description
  '{"reason": "special event"}'::JSONB  -- Metadata
);
```

### Award Bonus to Multiple Users
```sql
-- Award 10 RZC to all users with more than 5 referrals
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN 
    SELECT u.id 
    FROM wallet_users u
    JOIN wallet_referrals r ON u.id = r.user_id
    WHERE r.total_referrals >= 5
  LOOP
    PERFORM award_rzc_tokens(
      v_user.id,
      10.0,
      'special_bonus',
      'Bonus for active referrers',
      '{"campaign": "referral_boost"}'::JSONB
    );
  END LOOP;
END $$;
```

### Award Event Bonus
```sql
-- Award 25 RZC to all users (e.g., holiday bonus)
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT id FROM wallet_users
  LOOP
    PERFORM award_rzc_tokens(
      v_user.id,
      25.0,
      'event_bonus',
      'Holiday celebration bonus',
      '{"event": "new_year_2026"}'::JSONB
    );
  END LOOP;
END $$;
```

---

## 🔍 Verification Queries

### Check Migration Status
```sql
SELECT 
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_users' AND column_name = 'rzc_balance'
  ) as rzc_column_exists,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'wallet_rzc_transactions'
  ) as transactions_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'award_rzc_tokens'
  ) as function_exists;
```

### Check Data Integrity
```sql
-- Verify all users have RZC balance
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE rzc_balance IS NOT NULL) as users_with_balance,
  COUNT(*) FILTER (WHERE rzc_balance >= 100) as users_with_min_balance
FROM wallet_users;
```

### Check Transaction Consistency
```sql
-- Verify transaction balances match user balances
SELECT 
  u.name,
  u.wallet_address,
  u.rzc_balance as current_balance,
  (
    SELECT balance_after 
    FROM wallet_rzc_transactions 
    WHERE user_id = u.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_transaction_balance,
  CASE 
    WHEN u.rzc_balance = (
      SELECT balance_after 
      FROM wallet_rzc_transactions 
      WHERE user_id = u.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM wallet_users u
WHERE EXISTS (
  SELECT 1 FROM wallet_rzc_transactions WHERE user_id = u.id
)
LIMIT 20;
```

---

## 🧹 Maintenance Queries

### Find Users Without Signup Bonus
```sql
SELECT 
  u.id,
  u.name,
  u.wallet_address,
  u.rzc_balance,
  u.created_at
FROM wallet_users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM wallet_rzc_transactions t 
  WHERE t.user_id = u.id 
  AND t.type = 'signup_bonus'
)
ORDER BY u.created_at DESC;
```

### Find Duplicate Transactions (Should be empty)
```sql
SELECT 
  user_id,
  type,
  amount,
  created_at,
  COUNT(*) as duplicate_count
FROM wallet_rzc_transactions
GROUP BY user_id, type, amount, created_at
HAVING COUNT(*) > 1;
```

### Archive Old Transactions (Optional)
```sql
-- Create archive table
CREATE TABLE IF NOT EXISTS wallet_rzc_transactions_archive (
  LIKE wallet_rzc_transactions INCLUDING ALL
);

-- Move transactions older than 1 year to archive
WITH moved_rows AS (
  DELETE FROM wallet_rzc_transactions
  WHERE created_at < NOW() - INTERVAL '1 year'
  RETURNING *
)
INSERT INTO wallet_rzc_transactions_archive
SELECT * FROM moved_rows;
```

---

## 📈 Performance Queries

### Check Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'wallet_rzc_transactions'
ORDER BY idx_scan DESC;
```

### Check Table Size
```sql
SELECT 
  pg_size_pretty(pg_total_relation_size('wallet_rzc_transactions')) as total_size,
  pg_size_pretty(pg_relation_size('wallet_rzc_transactions')) as table_size,
  pg_size_pretty(pg_indexes_size('wallet_rzc_transactions')) as indexes_size;
```

### Analyze Query Performance
```sql
EXPLAIN ANALYZE
SELECT * 
FROM wallet_rzc_transactions 
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔒 Security Queries

### Check RLS Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'wallet_rzc_transactions';
```

### Audit Recent Changes
```sql
-- Get recent RZC awards (last 24 hours)
SELECT 
  u.name,
  u.wallet_address,
  t.type,
  t.amount,
  t.description,
  t.metadata,
  t.created_at
FROM wallet_rzc_transactions t
JOIN wallet_users u ON t.user_id = u.id
WHERE t.created_at > NOW() - INTERVAL '24 hours'
ORDER BY t.created_at DESC;
```

---

## 🎯 Quick Stats Dashboard

### Complete RZC Overview
```sql
SELECT 
  -- User Stats
  (SELECT COUNT(*) FROM wallet_users) as total_users,
  (SELECT COUNT(*) FROM wallet_users WHERE rzc_balance > 100) as users_earned_extra,
  
  -- Balance Stats
  (SELECT SUM(rzc_balance) FROM wallet_users) as total_rzc_circulation,
  (SELECT AVG(rzc_balance) FROM wallet_users) as avg_rzc_per_user,
  (SELECT MAX(rzc_balance) FROM wallet_users) as highest_balance,
  
  -- Transaction Stats
  (SELECT COUNT(*) FROM wallet_rzc_transactions) as total_transactions,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE type = 'signup_bonus') as signup_bonuses,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE type = 'referral_bonus') as referral_bonuses,
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE type = 'milestone_bonus') as milestone_bonuses,
  
  -- Today's Activity
  (SELECT COUNT(*) FROM wallet_rzc_transactions WHERE created_at > CURRENT_DATE) as transactions_today,
  (SELECT SUM(amount) FROM wallet_rzc_transactions WHERE created_at > CURRENT_DATE) as rzc_awarded_today;
```

---

## 💡 Tips

1. **Always use the function:** Use `award_rzc_tokens()` instead of direct INSERT/UPDATE
2. **Check before awarding:** Verify user exists before awarding RZC
3. **Use metadata:** Store additional context in the metadata JSONB field
4. **Monitor regularly:** Run analytics queries to track RZC distribution
5. **Backup before bulk operations:** Create backup before running bulk award scripts

---

**Last Updated:** February 21, 2026  
**Version:** 1.0  
**For:** RZC Token System v1.0
