-- Diagnostic queries for support_ticket_replies RLS issues

-- 1. Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'support_ticket_replies'
) as table_exists;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'support_ticket_replies';

-- 3. List all current policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'support_ticket_replies'
ORDER BY policyname;

-- 4. Check table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'support_ticket_replies'
ORDER BY grantee, privilege_type;

-- 5. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'support_ticket_replies'
ORDER BY ordinal_position;

-- 6. Count existing replies
SELECT COUNT(*) as total_replies FROM support_ticket_replies;

-- 7. Check if there are any tickets to reply to
SELECT 
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tickets
FROM wallet_support_tickets;

-- 8. Test a sample insert (will fail if RLS is blocking)
-- Uncomment to test:
-- INSERT INTO support_ticket_replies (
--     ticket_id,
--     wallet_address,
--     message,
--     is_admin,
--     is_internal
-- ) VALUES (
--     (SELECT id FROM wallet_support_tickets LIMIT 1),
--     'test_address',
--     'Test message',
--     false,
--     false
-- );
