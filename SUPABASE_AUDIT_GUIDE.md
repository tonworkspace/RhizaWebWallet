# Supabase Database Audit Guide

## 🎯 Purpose
Audit your Supabase database to ensure:
- Schema is correct
- Functions are deployed
- Security policies are in place
- Data integrity is maintained
- Performance is optimized

---

## 📋 Quick Audit Checklist

Run these queries in Supabase SQL Editor to audit your database:

### ✅ 1. Check if Two-Tier Activation Columns Exist

```sql
-- Check wallet_users table for new columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'wallet_users'
AND column_name IN ('node_activated', 'node_activated_at', 'total_activation_spent')
ORDER BY column_name;
```

**Expected Result:** 3 rows showing the new columns

---

### ✅ 2. Check if Two-Tier Activation Functions Exist

```sql
-- Check if activate_wallet_atomic function exists (6 parameters)
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name IN (
    'activate_wallet_atomic',
    'check_node_milestone_status',
    'manual_activation_recovery'
)
ORDER BY routine_name;
```

**Expected Result:** 3 functions listed

---

### ✅ 3. Check Function Parameters

```sql
-- Check activate_wallet_atomic parameters
SELECT 
    parameter_name,
    data_type,
    parameter_mode
FROM information_schema.parameters
WHERE specific_name LIKE '%activate_wallet_atomic%'
ORDER BY ordinal_position;
```

**Expected Result:** Should show 6 parameters including `p_activation_source`

---

### ✅ 4. Test activate_wallet_atomic Function

```sql
-- Test the function with a dummy wallet
SELECT activate_wallet_atomic(
    'UQTest_Audit_12345',  -- Test wallet address
    10.00,                  -- $10 activation
    0.27,                   -- TON amount
    37.00,                  -- TON price
    'test_tx_audit_001',    -- Test transaction hash
    'store'                 -- Activation source
);
```

**Expected Result:** JSON with `success: true`, `node_activated: false`, `remaining_for_node: 8`

---

### ✅ 5. Test check_node_milestone_status Function

```sql
-- Check the test wallet status
SELECT check_node_milestone_status('UQTest_Audit_12345');
```

**Expected Result:** JSON showing activation status and milestone progress

---

### ✅ 6. Check All Tables Schema

```sql
-- List all tables and their row counts
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.tablename) as column_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected Result:** List of all your tables with sizes

---

### ✅ 7. Check Wallet Users Table Structure

```sql
-- Full wallet_users table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'wallet_users'
ORDER BY ordinal_position;
```

**Expected Result:** All columns including new two-tier fields

---

### ✅ 8. Check Wallet Activations Table Structure

```sql
-- Full wallet_activations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'wallet_activations'
ORDER BY ordinal_position;
```

**Expected Result:** Should include `node_activated`, `total_spent`, `activation_source`

---

### ✅ 9. Check Indexes

```sql
-- List all indexes on wallet tables
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('wallet_users', 'wallet_activations', 'wallet_referrals')
ORDER BY tablename, indexname;
```

**Expected Result:** Should include `idx_wallet_users_node_activated`

---

### ✅ 10. Check RLS (Row Level Security) Policies

```sql
-- Check RLS policies on wallet_users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('wallet_users', 'wallet_activations')
ORDER BY tablename, policyname;
```

**Expected Result:** List of security policies

---

### ✅ 11. Check Data Integrity

```sql
-- Check for users with activation but no activation record
SELECT 
    wu.id,
    wu.wallet_address,
    wu.is_activated,
    wu.node_activated,
    wu.total_activation_spent,
    wa.id as activation_record_id
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.is_activated = true
AND wa.id IS NULL
LIMIT 10;
```

**Expected Result:** Should be empty (no orphaned activations)

---

### ✅ 12. Check Activation Statistics

```sql
-- Get activation statistics
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_activated = true) as activated_users,
    COUNT(*) FILTER (WHERE node_activated = true) as node_milestone_reached,
    COUNT(*) FILTER (WHERE is_activated = true AND node_activated = false) as partial_activation,
    ROUND(AVG(total_activation_spent), 2) as avg_spent,
    ROUND(AVG(total_activation_spent) FILTER (WHERE is_activated = true), 2) as avg_spent_activated
FROM wallet_users;
```

**Expected Result:** Statistics about your user base

---

### ✅ 13. Check Recent Activations

```sql
-- Check recent activations with details
SELECT 
    wu.wallet_address,
    wu.is_activated,
    wu.node_activated,
    wu.total_activation_spent,
    wu.activated_at,
    wa.activation_source,
    wa.transaction_hash
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.is_activated = true
ORDER BY wu.activated_at DESC
LIMIT 20;
```

**Expected Result:** Recent activations with source tracking

---

### ✅ 14. Check for Anomalies

```sql
-- Find potential data issues
SELECT 
    'Activated but no spent amount' as issue,
    COUNT(*) as count
FROM wallet_users
WHERE is_activated = true 
AND (total_activation_spent IS NULL OR total_activation_spent = 0)

UNION ALL

SELECT 
    'Node activated but spent < 18' as issue,
    COUNT(*) as count
FROM wallet_users
WHERE node_activated = true 
AND total_activation_spent < 18

UNION ALL

SELECT 
    'Spent >= 18 but node not activated' as issue,
    COUNT(*) as count
FROM wallet_users
WHERE total_activation_spent >= 18 
AND node_activated = false

UNION ALL

SELECT 
    'Activated but no activation record' as issue,
    COUNT(*) as count
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.is_activated = true 
AND wa.id IS NULL;
```

**Expected Result:** All counts should be 0 (no anomalies)

---

### ✅ 15. Check Function Permissions

```sql
-- Check who can execute the functions
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN (
    'activate_wallet_atomic',
    'check_node_milestone_status',
    'manual_activation_recovery'
)
ORDER BY routine_name, grantee;
```

**Expected Result:** Functions should be executable by `authenticated` and `anon`

---

## 🔍 Deep Dive Audits

### Audit #1: Activation Flow Integrity

```sql
-- Check if all activations have corresponding transactions
SELECT 
    wa.user_id,
    wa.wallet_address,
    wa.transaction_hash,
    wa.activation_source,
    wal.event_type,
    wal.created_at as log_created
FROM wallet_activations wa
LEFT JOIN wallet_activity_log wal 
    ON wa.wallet_address = wal.wallet_address 
    AND wal.metadata->>'transaction_hash' = wa.transaction_hash
WHERE wa.created_at > NOW() - INTERVAL '7 days'
ORDER BY wa.created_at DESC
LIMIT 50;
```

---

### Audit #2: Referral Commission Tracking

```sql
-- Check if referral commissions are being awarded
SELECT 
    wu.wallet_address,
    wr.referral_code,
    wr.total_earned,
    wr.total_referrals,
    COUNT(ref.id) as actual_referrals
FROM wallet_users wu
JOIN wallet_referrals wr ON wu.id = wr.user_id
LEFT JOIN wallet_referrals ref ON ref.referrer_code = wr.referral_code
WHERE wr.total_referrals > 0
GROUP BY wu.wallet_address, wr.referral_code, wr.total_earned, wr.total_referrals
HAVING COUNT(ref.id) != wr.total_referrals
LIMIT 20;
```

---

### Audit #3: RZC Balance Integrity

```sql
-- Check if RZC balances match transaction history
SELECT 
    wu.wallet_address,
    wu.rzc_balance as current_balance,
    COALESCE(SUM(
        CASE 
            WHEN rt.transaction_type IN ('reward', 'purchase', 'referral_bonus') THEN rt.amount
            WHEN rt.transaction_type IN ('withdrawal', 'transfer_out') THEN -rt.amount
            ELSE 0
        END
    ), 0) as calculated_balance,
    wu.rzc_balance - COALESCE(SUM(
        CASE 
            WHEN rt.transaction_type IN ('reward', 'purchase', 'referral_bonus') THEN rt.amount
            WHEN rt.transaction_type IN ('withdrawal', 'transfer_out') THEN -rt.amount
            ELSE 0
        END
    ), 0) as difference
FROM wallet_users wu
LEFT JOIN rzc_transactions rt ON wu.id = rt.user_id
WHERE wu.rzc_balance > 0
GROUP BY wu.id, wu.wallet_address, wu.rzc_balance
HAVING ABS(wu.rzc_balance - COALESCE(SUM(
    CASE 
        WHEN rt.transaction_type IN ('reward', 'purchase', 'referral_bonus') THEN rt.amount
        WHEN rt.transaction_type IN ('withdrawal', 'transfer_out') THEN -rt.amount
        ELSE 0
    END
), 0)) > 0.01
LIMIT 20;
```

---

### Audit #4: Performance Check

```sql
-- Check slow queries and table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

## 🛠️ Automated Audit Script

Create this as `audit_supabase.sql`:

```sql
-- ============================================================================
-- SUPABASE DATABASE AUDIT SCRIPT
-- ============================================================================
-- Run this script to get a complete audit report
-- ============================================================================

\echo '========================================='
\echo 'SUPABASE DATABASE AUDIT REPORT'
\echo '========================================='
\echo ''

\echo '1. TWO-TIER ACTIVATION COLUMNS'
\echo '-----------------------------------'
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_users'
AND column_name IN ('node_activated', 'node_activated_at', 'total_activation_spent');
\echo ''

\echo '2. TWO-TIER ACTIVATION FUNCTIONS'
\echo '-----------------------------------'
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'activate_wallet_atomic',
    'check_node_milestone_status',
    'manual_activation_recovery'
);
\echo ''

\echo '3. ACTIVATION STATISTICS'
\echo '-----------------------------------'
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_activated = true) as activated_users,
    COUNT(*) FILTER (WHERE node_activated = true) as node_milestone_reached,
    COUNT(*) FILTER (WHERE is_activated = true AND node_activated = false) as partial_activation,
    ROUND(AVG(total_activation_spent), 2) as avg_spent
FROM wallet_users;
\echo ''

\echo '4. DATA ANOMALIES'
\echo '-----------------------------------'
SELECT 
    'Activated but no spent amount' as issue,
    COUNT(*) as count
FROM wallet_users
WHERE is_activated = true 
AND (total_activation_spent IS NULL OR total_activation_spent = 0)

UNION ALL

SELECT 
    'Node activated but spent < 18' as issue,
    COUNT(*) as count
FROM wallet_users
WHERE node_activated = true 
AND total_activation_spent < 18

UNION ALL

SELECT 
    'Spent >= 18 but node not activated' as issue,
    COUNT(*) as count
FROM wallet_users
WHERE total_activation_spent >= 18 
AND node_activated = false;
\echo ''

\echo '5. RECENT ACTIVATIONS (Last 10)'
\echo '-----------------------------------'
SELECT 
    wu.wallet_address,
    wu.is_activated,
    wu.node_activated,
    wu.total_activation_spent,
    wa.activation_source,
    wu.activated_at
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.is_activated = true
ORDER BY wu.activated_at DESC
LIMIT 10;
\echo ''

\echo '========================================='
\echo 'AUDIT COMPLETE'
\echo '========================================='
```

**Run it:**
```bash
psql -h your-db-host -U your-user -d your-database -f audit_supabase.sql
```

---

## 📊 Supabase Dashboard Checks

### 1. **Database Health**
- Go to: Supabase Dashboard → Database → Health
- Check: CPU usage, memory, connections
- **Expected:** < 70% usage

### 2. **API Logs**
- Go to: Supabase Dashboard → Logs → API
- Check for: Errors, slow queries
- **Expected:** No 500 errors, queries < 1s

### 3. **Database Logs**
- Go to: Supabase Dashboard → Logs → Database
- Check for: Errors, warnings
- **Expected:** No critical errors

### 4. **Auth Logs**
- Go to: Supabase Dashboard → Logs → Auth
- Check for: Failed logins, suspicious activity
- **Expected:** Normal login patterns

### 5. **Storage**
- Go to: Supabase Dashboard → Storage
- Check: Bucket sizes, file counts
- **Expected:** Within limits

---

## 🔒 Security Audit

### Check RLS is Enabled

```sql
-- Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('wallet_users', 'wallet_activations', 'rzc_transactions')
ORDER BY tablename;
```

**Expected:** `rowsecurity = true` for all

---

### Check for Public Access

```sql
-- Check for tables with public access
SELECT 
    grantee,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'anon'
AND table_schema = 'public'
ORDER BY table_name;
```

**Expected:** Only read access where appropriate

---

## 📈 Performance Audit

### Check Missing Indexes

```sql
-- Find tables that might need indexes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND tablename IN ('wallet_users', 'wallet_activations', 'rzc_transactions')
AND n_distinct > 100
ORDER BY tablename, attname;
```

---

### Check Query Performance

```sql
-- Check slow queries (requires pg_stat_statements extension)
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%wallet%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## ✅ Audit Checklist

Print this and check off as you verify:

- [ ] Two-tier activation columns exist
- [ ] Two-tier activation functions exist
- [ ] Functions have correct parameters
- [ ] Test activation works ($10 → wallet only)
- [ ] Test milestone works ($18 → node activated)
- [ ] All tables have proper structure
- [ ] Indexes are in place
- [ ] RLS policies are enabled
- [ ] No data anomalies found
- [ ] Recent activations look correct
- [ ] Function permissions are correct
- [ ] No orphaned records
- [ ] Referral tracking works
- [ ] RZC balances are accurate
- [ ] Performance is acceptable
- [ ] No security issues
- [ ] Logs show no errors
- [ ] Dashboard health is good

---

## 🆘 Common Issues & Fixes

### Issue: "function activate_wallet_atomic does not exist"
**Fix:** Run `add_node_activation_milestone.sql`

### Issue: "column node_activated does not exist"
**Fix:** Run the ALTER TABLE statements from the migration

### Issue: "permission denied for function"
**Fix:** Grant execute permissions:
```sql
GRANT EXECUTE ON FUNCTION activate_wallet_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION activate_wallet_atomic TO anon;
```

### Issue: Data anomalies found
**Fix:** Run data correction scripts or manual updates

---

## 📞 Support

If audit reveals issues:
1. Note the specific error/anomaly
2. Check the migration files
3. Verify all migrations ran successfully
4. Check Supabase logs for errors
5. Test functions manually

**Remember:** Always backup before making fixes!
