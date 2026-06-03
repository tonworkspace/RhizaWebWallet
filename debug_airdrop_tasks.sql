-- Debug script to check airdrop tasks table and functions

-- 1. Check if table exists and has data
SELECT 
    'Table exists' as check_type,
    COUNT(*) as count,
    MIN(id) as min_id,
    MAX(id) as max_id
FROM airdrop_tasks;

-- 2. List all tasks with their IDs
SELECT 
    id,
    title,
    action,
    is_active,
    created_at
FROM airdrop_tasks
ORDER BY id;

-- 3. Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%airdrop_task%'
ORDER BY routine_name;

-- 4. Test update function with a known ID (replace 1 with actual ID)
-- SELECT update_airdrop_task(
--     1,
--     'Test Task',
--     'Test Description',
--     100,
--     'test_action',
--     'social',
--     'easy',
--     true,
--     'Test instructions',
--     null,
--     'manual',
--     '{}',
--     null,
--     'admin_test'
-- );

-- 5. Check if airdrop_task_stats view exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name LIKE '%airdrop%'
ORDER BY table_name;
