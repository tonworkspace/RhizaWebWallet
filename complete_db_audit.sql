-- ============================================================================
-- COMPLETE DATABASE AUDIT - RhizaCore Wallet System
-- ============================================================================
-- Comprehensive audit of all tables, functions, security, and data integrity
-- Run this in Supabase SQL Editor
-- ============================================================================

\echo '========================================='
\echo 'RHIZACORE DATABASE AUDIT REPORT'
\echo 'Generated: ' || NOW()
\echo '========================================='
\echo ''

-- ============================================================================
-- SECTION 1: DATABASE OVERVIEW
-- ============================================================================

\echo '1. DATABASE OVERVIEW'
\echo '-----------------------------------'
SELECT 
    'Total Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'Total Functions' as metric,
    COUNT(*) as value
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
SELECT 
    'Total Indexes' as metric,
    COUNT(*) as value
FROM pg_indexes
WHERE schemaname = 'public';
\echo ''

-- ============================================================================
-- SECTION 2: TABLE INVENTORY
-- ============================================================================

\echo '2. TABLE INVENTORY & SIZES'
\echo '-----------------------------------'
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size('public.'||tablename)) AS table_size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.tablename) as columns
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;
\echo ''

-- ============================================================================
-- SECTION 3: WALLET USERS TABLE
-- ============================================================================

\echo '3. WALLET USERS - SCHEMA'
\echo '-----------------------------------'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'wallet_users'
ORDER BY ordinal_position;
\echo ''

\echo '4. WALLET USERS - STATISTICS'
\echo '-----------------------------------'
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE is_activated = true) as activated_users,
    COUNT(*) FILTER (WHERE node_activated = true) as node_activated_users,
    COUNT(*) FILTER (WHERE is_activated = true AND node_activated = false) as partial_activation,
    ROUND(AVG(rzc_balance), 2) as avg_rzc_balance,
    ROUND(AVG(total_activation_spent), 2) as avg_activation_spent,
    MAX(rzc_balance) as max_rzc_balance,
    SUM(rzc_balance) as total_rzc_in_circulation
FROM wallet_users;
\echo ''

-- ============================================================================
-- SECTION 4: WALLET ACTIVATIONS
-- ============================================================================

\echo '5. WALLET ACTIVATIONS - SCHEMA'
\echo '-----------------------------------'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_activations'
ORDER BY ordinal_position;
\echo ''

\echo '6. WALLET ACTIVATIONS - STATISTICS'
\echo '-----------------------------------'
SELECT 
    COUNT(*) as total_activations,
    COUNT(*) FILTER (WHERE node_activated = true) as node_activations,
    COUNT(*) FILTER (WHERE activation_source = 'store') as store_activations,
    COUNT(*) FILTER (WHERE activation_source = 'package') as package_activations,
    COUNT(*) FILTER (WHERE activation_source = 'direct') as direct_activations,
    ROUND(AVG(activation_fee_usd), 2) as avg_activation_fee,
    ROUND(SUM(activation_fee_usd), 2) as total_activation_revenue,
    ROUND(SUM(activation_fee_ton), 4) as total_activation_ton
FROM wallet_activations;
\echo ''

-- ============================================================================
-- SECTION 5: REFERRAL SYSTEM
-- ============================================================================

\echo '7. WALLET REFERRALS - SCHEMA'
\echo '-----------------------------------'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_referrals'
ORDER BY ordinal_position;
\echo ''

\echo '8. REFERRAL STATISTICS'
\echo '-----------------------------------'
SELECT 
    COUNT(*) as total_referral_codes,
    COUNT(*) FILTER (WHERE total_referrals > 0) as active_referrers,
    SUM(total_referrals) as total_referrals_made,
    ROUND(AVG(total_referrals), 2) as avg_referrals_per_user,
    ROUND(SUM(total_earned), 2) as total_referral_earnings,
    ROUND(AVG(total_earned), 2) as avg_earnings_per_referrer,
    MAX(total_referrals) as max_referrals_by_one_user
FROM wallet_referrals;
\echo ''

-- ============================================================================
-- SECTION 6: RZC TRANSACTIONS
-- ============================================================================

\echo '9. RZC TRANSACTIONS - SCHEMA'
\echo '-----------------------------------'
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'rzc_transactions'
ORDER BY ordinal_position;
\echo ''

\echo '10. RZC TRANSACTION STATISTICS'
\echo '-----------------------------------'
SELECT 
    transaction_type,
    COUNT(*) as count,
    ROUND(SUM(amount), 2) as total_amount,
    ROUND(AVG(amount), 2) as avg_amount,
    ROUND(MIN(amount), 2) as min_amount,
    ROUND(MAX(amount), 2) as max_amount
FROM rzc_transactions
GROUP BY transaction_type
ORDER BY total_amount DESC;
\echo ''

-- ============================================================================
-- SECTION 7: ACTIVITY LOG
-- ============================================================================

\echo '11. ACTIVITY LOG - STATISTICS'
\echo '-----------------------------------'
SELECT 
    event_type,
    COUNT(*) as count,
    MAX(created_at) as last_occurrence
FROM wallet_activity_log
GROUP BY event_type
ORDER BY count DESC
LIMIT 15;
\echo ''

-- ============================================================================
-- SECTION 8: NOTIFICATIONS
-- ============================================================================

\echo '12. NOTIFICATIONS - STATISTICS'
\echo '-----------------------------------'
SELECT 
    notification_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_read = true) as read,
    COUNT(*) FILTER (WHERE is_read = false) as unread,
    ROUND(COUNT(*) FILTER (WHERE is_read = true)::NUMERIC / COUNT(*) * 100, 2) as read_percentage
FROM wallet_notifications
GROUP BY notification_type
ORDER BY total DESC;
\echo ''

-- ============================================================================
-- SECTION 9: AIRDROP TASKS
-- ============================================================================

\echo '13. AIRDROP TASKS - OVERVIEW'
\echo '-----------------------------------'
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE is_active = true) as active_tasks,
    COUNT(*) FILTER (WHERE is_repeatable = true) as repeatable_tasks,
    ROUND(AVG(rzc_reward), 2) as avg_reward,
    ROUND(SUM(rzc_reward), 2) as total_potential_rewards
FROM airdrop_tasks;
\echo ''

\echo '14. AIRDROP COMPLETIONS - STATISTICS'
\echo '-----------------------------------'
SELECT 
    at.task_name,
    COUNT(atc.id) as completions,
    ROUND(SUM(atc.rzc_earned), 2) as total_rzc_distributed
FROM airdrop_tasks at
LEFT JOIN airdrop_task_completions atc ON at.id = atc.task_id
GROUP BY at.task_name
ORDER BY completions DESC
LIMIT 10;
\echo ''

-- ============================================================================
-- SECTION 10: FUNCTIONS INVENTORY
-- ============================================================================

\echo '15. DATABASE FUNCTIONS'
\echo '-----------------------------------'
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
\echo ''

-- ============================================================================
-- SECTION 11: CRITICAL FUNCTIONS CHECK
-- ============================================================================

\echo '16. CRITICAL FUNCTIONS - VERIFICATION'
\echo '-----------------------------------'
SELECT 
    routine_name,
    CASE 
        WHEN routine_name = 'activate_wallet_atomic' THEN 
            (SELECT COUNT(*) FROM information_schema.parameters 
             WHERE specific_name LIKE '%activate_wallet_atomic%')
        ELSE NULL
    END as parameter_count,
    'OK' as status
FROM information_schema.routines
WHERE routine_name IN (
    'activate_wallet_atomic',
    'check_node_milestone_status',
    'award_package_purchase_commission',
    'record_ton_commission',
    'manual_activation_recovery'
)
ORDER BY routine_name;
\echo ''

-- ============================================================================
-- SECTION 12: INDEXES
-- ============================================================================

\echo '17. DATABASE INDEXES'
\echo '-----------------------------------'
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
\echo ''

-- ============================================================================
-- SECTION 13: ROW LEVEL SECURITY
-- ============================================================================

\echo '18. ROW LEVEL SECURITY POLICIES'
\echo '-----------------------------------'
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
\echo ''

-- ============================================================================
-- SECTION 14: DATA INTEGRITY CHECKS
-- ============================================================================

\echo '19. DATA INTEGRITY - ANOMALIES'
\echo '-----------------------------------'

-- Check 1: Users with activation but no activation record
SELECT 
    'Users activated but no activation record' as check_name,
    COUNT(*) as count
FROM wallet_users wu
LEFT JOIN wallet_activations wa ON wu.id = wa.user_id
WHERE wu.is_activated = true AND wa.id IS NULL

UNION ALL

-- Check 2: Activation records without users
SELECT 
    'Activation records without users' as check_name,
    COUNT(*) as count
FROM wallet_activations wa
LEFT JOIN wallet_users wu ON wa.user_id = wu.id
WHERE wu.id IS NULL

UNION ALL

-- Check 3: Referrals without users
SELECT 
    'Referral codes without users' as check_name,
    COUNT(*) as count
FROM wallet_referrals wr
LEFT JOIN wallet_users wu ON wr.user_id = wu.id
WHERE wu.id IS NULL

UNION ALL

-- Check 4: Transactions without users
SELECT 
    'Transactions without users' as check_name,
    COUNT(*) as count
FROM rzc_transactions rt
LEFT JOIN wallet_users wu ON rt.user_id = wu.id
WHERE wu.id IS NULL

UNION ALL

-- Check 5: Node activated but spent < 18
SELECT 
    'Node activated but spent < 18' as check_name,
    COUNT(*) as count
FROM wallet_users
WHERE node_activated = true AND total_activation_spent < 18

UNION ALL

-- Check 6: Spent >= 18 but node not activated
SELECT 
    'Spent >= 18 but node not activated' as check_name,
    COUNT(*) as count
FROM wallet_users
WHERE total_activation_spent >= 18 AND node_activated = false

UNION ALL

-- Check 7: Activated but no spent amount
SELECT 
    'Activated but no spent amount' as check_name,
    COUNT(*) as count
FROM wallet_users
WHERE is_activated = true AND (total_activation_spent IS NULL OR total_activation_spent = 0)

UNION ALL

-- Check 8: Negative RZC balances
SELECT 
    'Negative RZC balances' as check_name,
    COUNT(*) as count
FROM wallet_users
WHERE rzc_balance < 0;
\echo ''

-- ============================================================================
-- SECTION 15: REFERRAL INTEGRITY
-- ============================================================================

\echo '20. REFERRAL INTEGRITY CHECK'
\echo '-----------------------------------'
SELECT 
    wr.referral_code,
    wr.total_referrals as recorded_referrals,
    COUNT(wu.id) as actual_referrals,
    wr.total_referrals - COUNT(wu.id) as difference
FROM wallet_referrals wr
LEFT JOIN wallet_users wu ON wu.referrer_code = wr.referral_code
WHERE wr.total_referrals > 0
GROUP BY wr.referral_code, wr.total_referrals
HAVING wr.total_referrals != COUNT(wu.id)
LIMIT 10;
\echo ''

-- ============================================================================
-- SECTION 16: RZC BALANCE INTEGRITY
-- ============================================================================

\echo '21. RZC BALANCE INTEGRITY (Sample)'
\echo '-----------------------------------'
SELECT 
    wu.wallet_address,
    wu.rzc_balance as current_balance,
    COALESCE(SUM(
        CASE 
            WHEN rt.transaction_type IN ('reward', 'purchase', 'referral_bonus', 'airdrop') THEN rt.amount
            WHEN rt.transaction_type IN ('withdrawal', 'transfer_out', 'spend') THEN -rt.amount
            ELSE 0
        END
    ), 0) as calculated_balance,
    ROUND(wu.rzc_balance - COALESCE(SUM(
        CASE 
            WHEN rt.transaction_type IN ('reward', 'purchase', 'referral_bonus', 'airdrop') THEN rt.amount
            WHEN rt.transaction_type IN ('withdrawal', 'transfer_out', 'spend') THEN -rt.amount
            ELSE 0
        END
    ), 0), 2) as difference
FROM wallet_users wu
LEFT JOIN rzc_transactions rt ON wu.id = rt.user_id
WHERE wu.rzc_balance > 0
GROUP BY wu.id, wu.wallet_address, wu.rzc_balance
HAVING ABS(wu.rzc_balance - COALESCE(SUM(
    CASE 
        WHEN rt.transaction_type IN ('reward', 'purchase', 'referral_bonus', 'airdrop') THEN rt.amount
        WHEN rt.transaction_type IN ('withdrawal', 'transfer_out', 'spend') THEN -rt.amount
        ELSE 0
    END
), 0)) > 0.01
LIMIT 10;
\echo ''

-- ============================================================================
-- SECTION 17: RECENT ACTIVITY
-- ============================================================================

\echo '22. RECENT ACTIVATIONS (Last 10)'
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

\echo '23. RECENT TRANSACTIONS (Last 10)'
\echo '-----------------------------------'
SELECT 
    wu.wallet_address,
    rt.transaction_type,
    rt.amount,
    rt.description,
    rt.created_at
FROM rzc_transactions rt
JOIN wallet_users wu ON rt.user_id = wu.id
ORDER BY rt.created_at DESC
LIMIT 10;
\echo ''

-- ============================================================================
-- SECTION 18: PERFORMANCE METRICS
-- ============================================================================

\echo '24. TABLE BLOAT & PERFORMANCE'
\echo '-----------------------------------'
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                   pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    ROUND((pg_total_relation_size(schemaname||'.'||tablename) - 
           pg_relation_size(schemaname||'.'||tablename))::NUMERIC / 
          NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0) * 100, 2) as index_ratio
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
\echo ''

-- ============================================================================
-- SECTION 19: SECURITY AUDIT
-- ============================================================================

\echo '25. SECURITY - RLS STATUS'
\echo '-----------------------------------'
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
\echo ''

\echo '26. SECURITY - PUBLIC ACCESS'
\echo '-----------------------------------'
SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges
WHERE grantee IN ('anon', 'authenticated', 'public')
AND table_schema = 'public'
ORDER BY table_name, grantee;
\echo ''

-- ============================================================================
-- SECTION 20: BUSINESS METRICS
-- ============================================================================

\echo '27. BUSINESS METRICS'
\echo '-----------------------------------'
SELECT 
    'Total Revenue (Activations)' as metric,
    '$' || ROUND(SUM(activation_fee_usd), 2) as value
FROM wallet_activations

UNION ALL

SELECT 
    'Total RZC Distributed' as metric,
    ROUND(SUM(amount), 2)::TEXT || ' RZC' as value
FROM rzc_transactions
WHERE transaction_type IN ('reward', 'purchase', 'referral_bonus', 'airdrop')

UNION ALL

SELECT 
    'Total Referral Earnings' as metric,
    ROUND(SUM(total_earned), 2)::TEXT || ' RZC' as value
FROM wallet_referrals

UNION ALL

SELECT 
    'Activation Conversion Rate' as metric,
    ROUND(COUNT(*) FILTER (WHERE is_activated = true)::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 2)::TEXT || '%' as value
FROM wallet_users

UNION ALL

SELECT 
    'Node Milestone Conversion' as metric,
    ROUND(COUNT(*) FILTER (WHERE node_activated = true)::NUMERIC / 
          NULLIF(COUNT(*) FILTER (WHERE is_activated = true), 0) * 100, 2)::TEXT || '%' as value
FROM wallet_users

UNION ALL

SELECT 
    'Avg RZC per User' as metric,
    ROUND(AVG(rzc_balance), 2)::TEXT || ' RZC' as value
FROM wallet_users
WHERE rzc_balance > 0;
\echo ''

-- ============================================================================
-- SECTION 21: GROWTH METRICS
-- ============================================================================

\echo '28. GROWTH METRICS (Last 30 Days)'
\echo '-----------------------------------'
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users
FROM wallet_users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 10;
\echo ''

-- ============================================================================
-- SECTION 22: TOP USERS
-- ============================================================================

\echo '29. TOP USERS BY RZC BALANCE'
\echo '-----------------------------------'
SELECT 
    wallet_address,
    ROUND(rzc_balance, 2) as rzc_balance,
    is_activated,
    node_activated,
    created_at
FROM wallet_users
WHERE rzc_balance > 0
ORDER BY rzc_balance DESC
LIMIT 10;
\echo ''

\echo '30. TOP REFERRERS'
\echo '-----------------------------------'
SELECT 
    wu.wallet_address,
    wr.referral_code,
    wr.total_referrals,
    ROUND(wr.total_earned, 2) as total_earned
FROM wallet_referrals wr
JOIN wallet_users wu ON wr.user_id = wu.id
WHERE wr.total_referrals > 0
ORDER BY wr.total_referrals DESC
LIMIT 10;
\echo ''

-- ============================================================================
-- AUDIT COMPLETE
-- ============================================================================

\echo '========================================='
\echo 'AUDIT COMPLETE'
\echo '========================================='
\echo ''
\echo 'SUMMARY:'
\echo '- Review all sections above'
\echo '- Check for any anomalies (Section 19)'
\echo '- Verify data integrity (Section 16, 20, 21)'
\echo '- Ensure RLS is enabled (Section 25)'
\echo '- Check performance metrics (Section 24)'
\echo ''
\echo 'NEXT STEPS:'
\echo '1. Fix any anomalies found'
\echo '2. Optimize slow queries if needed'
\echo '3. Review security policies'
\echo '4. Monitor business metrics'
\echo '========================================='
