-- ============================================================================
-- QUICK SUPABASE AUDIT - Two-Tier Activation System
-- ============================================================================
-- Run this in Supabase SQL Editor to verify everything is set up correctly
-- ============================================================================

-- 1. Check if new columns exist
SELECT '1. CHECKING NEW COLUMNS' as step;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wallet_users'
AND column_name IN ('node_activated', 'node_activated_at', 'total_activation_spent')
ORDER BY column_name;

-- 2. Check if functions exist
SELECT '2. CHECKING FUNCTIONS' as step;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN (
    'activate_wallet_atomic',
    'check_node_milestone_status',
    'manual_activation_recovery'
)
ORDER BY routine_name;

-- 3. Check function parameters (should be 6 for activate_wallet_atomic)
SELECT '3. CHECKING FUNCTION PARAMETERS' as step;
SELECT 
    parameter_name,
    data_type
FROM information_schema.parameters
WHERE specific_name LIKE '%activate_wallet_atomic%'
ORDER BY ordinal_position;

-- 4. Test the activate_wallet_atomic function
SELECT '4. TESTING ACTIVATE_WALLET_ATOMIC' as step;
SELECT activate_wallet_atomic(
    'UQTest_Quick_Audit_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    10.00,
    0.27,
    37.00,
    'test_tx_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'store'
);

-- 5. Check activation statistics
SELECT '5. ACTIVATION STATISTICS' as step;
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_activated = true) as activated_users,
    COUNT(*) FILTER (WHERE node_activated = true) as node_milestone_reached,
    COUNT(*) FILTER (WHERE is_activated = true AND node_activated = false) as partial_activation,
    ROUND(AVG(total_activation_spent), 2) as avg_spent
FROM wallet_users;

-- 6. Check for data anomalies
SELECT '6. CHECKING FOR ANOMALIES' as step;
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

-- 7. Check recent activations
SELECT '7. RECENT ACTIVATIONS (Last 5)' as step;
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
LIMIT 5;

-- 8. Check indexes
SELECT '8. CHECKING INDEXES' as step;
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('wallet_users', 'wallet_activations')
AND indexname LIKE '%node%'
ORDER BY tablename, indexname;

-- ============================================================================
-- AUDIT COMPLETE
-- ============================================================================
-- If all queries return expected results, your database is ready!
-- 
-- Expected Results:
-- 1. Should show 3 columns (node_activated, node_activated_at, total_activation_spent)
-- 2. Should show 3 functions
-- 3. Should show 6 parameters
-- 4. Should return JSON with success: true, node_activated: false, remaining_for_node: 8
-- 5. Should show your user statistics
-- 6. All anomaly counts should be 0
-- 7. Should show recent activations (if any)
-- 8. Should show node-related indexes
-- ============================================================================
