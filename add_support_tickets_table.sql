-- Create wallet_support_tickets table for user support requests
-- This table stores support tickets submitted by users through the FloatingSupport component

CREATE TABLE IF NOT EXISTS wallet_support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
    wallet_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallet_support_tickets_wallet_address ON wallet_support_tickets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_support_tickets_status ON wallet_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_wallet_support_tickets_created_at ON wallet_support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_support_tickets_user_id ON wallet_support_tickets(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_wallet_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_support_tickets_updated_at
    BEFORE UPDATE ON wallet_support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_support_tickets_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE wallet_support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own tickets
CREATE POLICY "Users can view their own support tickets" ON wallet_support_tickets
    FOR SELECT USING (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        OR user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
    );

-- Users can insert their own tickets
CREATE POLICY "Users can create support tickets" ON wallet_support_tickets
    FOR INSERT WITH CHECK (
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        OR user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
    );

-- Admins can view all tickets
CREATE POLICY "Admins can view all support tickets" ON wallet_support_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admins can update all tickets (for status changes and admin notes)
CREATE POLICY "Admins can update support tickets" ON wallet_support_tickets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND role IN ('admin', 'super_admin')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT ON wallet_support_tickets TO authenticated;
GRANT UPDATE ON wallet_support_tickets TO authenticated;

-- Comments for documentation
COMMENT ON TABLE wallet_support_tickets IS 'Support tickets submitted by users for help requests';
COMMENT ON COLUMN wallet_support_tickets.id IS 'Unique identifier for the support ticket';
COMMENT ON COLUMN wallet_support_tickets.user_id IS 'Reference to the user who submitted the ticket (optional)';
COMMENT ON COLUMN wallet_support_tickets.wallet_address IS 'Wallet address of the user who submitted the ticket';
COMMENT ON COLUMN wallet_support_tickets.subject IS 'Subject/category of the support request';
COMMENT ON COLUMN wallet_support_tickets.message IS 'Detailed message describing the issue or question';
COMMENT ON COLUMN wallet_support_tickets.status IS 'Current status of the ticket (open, pending, resolved, closed)';
COMMENT ON COLUMN wallet_support_tickets.admin_notes IS 'Response or notes from admin/support team';
COMMENT ON COLUMN wallet_support_tickets.created_at IS 'Timestamp when the ticket was created';
COMMENT ON COLUMN wallet_support_tickets.updated_at IS 'Timestamp when the ticket was last updated';