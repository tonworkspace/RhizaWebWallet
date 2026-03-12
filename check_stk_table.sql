-- ============================================================================
-- QUICK CHECK: Does stk_migrations table exist?
-- ============================================================================
-- Run this to verify the table was created successfully
-- ============================================================================

-- Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'stk_migrations'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING - Run RUN_THIS_FIRST_STK_SETUP.sql'
    END as status;

-- If table exists, show structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations'
ORDER BY ordinal_position;

-- Show RLS status
SELECT 
    relname as table_name,
    CASE 
        WHEN relrowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status
FROM pg_class
WHERE relname = 'stk_migrations';

-- Count policies
SELECT 
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✅ Policies OK'
        ELSE '⚠️ Missing policies'
    END as policy_status
FROM pg_policies
WHERE tablename = 'stk_migrations';

-- Test conversion formula
SELECT 
    '💱 Conversion Test' as test,
    10000000 as stk_amount,
    10000000 as starfi_points,
    (10000000::numeric / 10000000) * 8 as rzc_equivalent,
    '✅ Should be 8 RZC' as expected;
