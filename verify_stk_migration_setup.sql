-- ============================================================================
-- STK MIGRATION SYSTEM VERIFICATION
-- ============================================================================
-- Run this to verify the STK migration system is set up correctly
-- ============================================================================

-- Check if stk_migrations table exists
SELECT 
    '✅ Table Exists' as status,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations'
UNION ALL
SELECT 
    '❌ Table Missing' as status,
    'stk_migrations' as table_name,
    'N/A' as table_type
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'stk_migrations'
);

-- Check table structure
SELECT 
    '📋 Column Structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations'
ORDER BY ordinal_position;

-- Check constraints
SELECT 
    '🔒 Constraints' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations';

-- Check indexes
SELECT 
    '⚡ Indexes' as info,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'stk_migrations';

-- Check RLS policies
SELECT 
    '🛡️ RLS Policies' as info,
    policyname,
    cmd as command,
    permissive,
    roles
FROM pg_policies
WHERE tablename = 'stk_migrations';

-- Check if RLS is enabled
SELECT 
    '🔐 RLS Status' as info,
    relname as table_name,
    relrowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname = 'stk_migrations';

-- Test conversion formula
SELECT 
    '💱 Conversion Tests' as info,
    stk_amount,
    stk_amount as starfi_points,
    ROUND((stk_amount::numeric / 10000000) * 8, 2) as rzc_equivalent
FROM (
    VALUES 
        (10000000),
        (50000000),
        (100000000),
        (1250000),
        (10109000000000::bigint)
) AS test_data(stk_amount);

-- Count existing migrations
SELECT 
    '📊 Migration Stats' as info,
    COUNT(*) as total_migrations,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM public.stk_migrations;

-- Show recent migrations (if any)
SELECT 
    '📝 Recent Migrations' as info,
    id,
    wallet_address,
    stk_amount,
    rzc_equivalent,
    status,
    created_at
FROM public.stk_migrations
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================

DO $$
DECLARE
    table_exists boolean;
    rls_enabled boolean;
    policies_count integer;
    indexes_count integer;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'stk_migrations'
    ) INTO table_exists;
    
    -- Check RLS enabled
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'stk_migrations' 
    INTO rls_enabled;
    
    -- Count policies
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'stk_migrations' 
    INTO policies_count;
    
    -- Count indexes
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE tablename = 'stk_migrations' 
    INTO indexes_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '   STK MIGRATION VERIFICATION REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    IF table_exists THEN
        RAISE NOTICE '✅ Table exists: stk_migrations';
    ELSE
        RAISE NOTICE '❌ Table missing: stk_migrations';
        RAISE NOTICE '   → Run: create_stk_migrations_table.sql';
    END IF;
    
    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS enabled';
    ELSE
        RAISE NOTICE '❌ RLS not enabled';
    END IF;
    
    IF policies_count >= 4 THEN
        RAISE NOTICE '✅ RLS policies configured (% policies)', policies_count;
    ELSE
        RAISE NOTICE '⚠️  Only % RLS policies found (expected 4+)', policies_count;
    END IF;
    
    IF indexes_count >= 3 THEN
        RAISE NOTICE '✅ Indexes created (% indexes)', indexes_count;
    ELSE
        RAISE NOTICE '⚠️  Only % indexes found (expected 3+)', indexes_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Conversion Ratio: 10,000,000 STK = 8 RZC';
    RAISE NOTICE '💱 Formula: (STK / 10,000,000) * 8 = RZC';
    RAISE NOTICE '';
    
    IF table_exists AND rls_enabled AND policies_count >= 4 THEN
        RAISE NOTICE '🎉 STK Migration System: READY';
    ELSE
        RAISE NOTICE '⚠️  STK Migration System: INCOMPLETE';
        RAISE NOTICE '   Please complete setup steps above';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
