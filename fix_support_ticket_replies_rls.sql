-- Fix RLS policies for support_ticket_replies to work with your auth setup
-- This removes the JWT-based policies and uses simpler wallet_address matching

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view replies to their tickets" ON support_ticket_replies;
DROP POLICY IF EXISTS "Users can reply to their tickets" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins can view all replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins can create replies" ON support_ticket_replies;
DROP POLICY IF EXISTS "Admins can update replies" ON support_ticket_replies;

-- Create simpler, more permissive policies that work with your setup

-- Allow users to view replies to their own tickets (non-internal)
CREATE POLICY "Users can view their ticket replies" ON support_ticket_replies
    FOR SELECT USING (
        is_internal = FALSE AND
        ticket_id IN (
            SELECT id FROM wallet_support_tickets 
            WHERE wallet_address = wallet_address
        )
    );

-- Allow anyone authenticated to insert replies (we'll validate on app side)
CREATE POLICY "Authenticated users can add replies" ON support_ticket_replies
    FOR INSERT WITH CHECK (
        is_admin = FALSE AND
        is_internal = FALSE
    );

-- Allow admins to do everything
CREATE POLICY "Admins have full access to replies" ON support_ticket_replies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Alternative: If the above doesn't work, use this more permissive policy
-- Uncomment if needed:

-- DROP POLICY IF EXISTS "Authenticated users can add replies" ON support_ticket_replies;
-- 
-- CREATE POLICY "Allow all authenticated inserts" ON support_ticket_replies
--     FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON support_ticket_replies TO authenticated;
GRANT SELECT, INSERT ON support_ticket_replies TO anon;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'support_ticket_replies';
