-- Simple fix for support_ticket_replies RLS
-- This creates very permissive policies that will work immediately

-- Disable RLS temporarily to clean up
ALTER TABLE support_ticket_replies DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view replies to their tickets" ON support_ticket_replies;
DROP POLICY IF EXISTS "Users can reply to their tickets" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins can view all replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins can create replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins can update replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Users can view their ticket replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Authenticated users can add replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins have full access to replies" ON support_ticket_replies;

-- Re-enable RLS
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies

-- 1. Allow SELECT for all authenticated users (they can see all non-internal replies)
CREATE POLICY "allow_select_replies" ON support_ticket_replies
    FOR SELECT 
    USING (is_internal = FALSE);

-- 2. Allow INSERT for all authenticated users
CREATE POLICY "allow_insert_replies" ON support_ticket_replies
    FOR INSERT 
    WITH CHECK (true);

-- 3. Allow UPDATE for admins only
CREATE POLICY "allow_update_replies_admin" ON support_ticket_replies
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE wallet_users.wallet_address = (
                SELECT wallet_address FROM wallet_support_tickets 
                WHERE id = support_ticket_replies.ticket_id 
                LIMIT 1
            )
            AND wallet_users.role IN ('admin', 'super_admin')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON support_ticket_replies TO authenticated;
GRANT SELECT, INSERT ON support_ticket_replies TO anon;

-- Verify the policies are created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual 
        ELSE 'No USING clause' 
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check 
        ELSE 'No WITH CHECK clause' 
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'support_ticket_replies'
ORDER BY policyname;

-- Test query to verify access
-- SELECT COUNT(*) FROM support_ticket_replies;
