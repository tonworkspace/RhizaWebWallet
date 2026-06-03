-- Create support_ticket_replies table for ticket conversations
-- This table stores replies/messages in a support ticket thread

CREATE TABLE IF NOT EXISTS support_ticket_replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID NOT NULL REFERENCES wallet_support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES wallet_users(id) ON DELETE SET NULL,
    wallet_address TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes only visible to admins
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_ticket_id ON support_ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_created_at ON support_ticket_replies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_wallet_address ON support_ticket_replies(wallet_address);
CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_is_admin ON support_ticket_replies(is_admin);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_support_ticket_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_ticket_replies_updated_at
    BEFORE UPDATE ON support_ticket_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_replies_updated_at();

-- Trigger to update parent ticket's updated_at when a reply is added
CREATE OR REPLACE FUNCTION update_parent_ticket_on_reply()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE wallet_support_tickets 
    SET updated_at = NOW(),
        status = CASE 
            WHEN NEW.is_admin = TRUE AND status = 'open' THEN 'pending'
            WHEN NEW.is_admin = FALSE AND status = 'pending' THEN 'open'
            ELSE status
        END
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parent_ticket_on_reply
    AFTER INSERT ON support_ticket_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_parent_ticket_on_reply();

-- Enable Row Level Security (RLS)
ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view replies to their own tickets (excluding internal notes)
CREATE POLICY "Users can view replies to their tickets" ON support_ticket_replies
    FOR SELECT USING (
        is_internal = FALSE AND (
            wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            OR user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            OR ticket_id IN (
                SELECT id FROM wallet_support_tickets 
                WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            )
        )
    );

-- Users can insert replies to their own tickets
CREATE POLICY "Users can reply to their tickets" ON support_ticket_replies
    FOR INSERT WITH CHECK (
        is_admin = FALSE AND
        is_internal = FALSE AND (
            wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            OR user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
        ) AND
        ticket_id IN (
            SELECT id FROM wallet_support_tickets 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

-- Admins can view all replies (including internal notes)
CREATE POLICY "Admins can view all replies" ON support_ticket_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admins can insert replies (including internal notes)
CREATE POLICY "Admins can create replies" ON support_ticket_replies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND role IN ('admin', 'super_admin')
        )
    );

-- Admins can update their own replies
CREATE POLICY "Admins can update replies" ON support_ticket_replies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM wallet_users 
            WHERE wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND role IN ('admin', 'super_admin')
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT ON support_ticket_replies TO authenticated;
GRANT UPDATE ON support_ticket_replies TO authenticated;

-- Comments for documentation
COMMENT ON TABLE support_ticket_replies IS 'Replies and messages in support ticket conversations';
COMMENT ON COLUMN support_ticket_replies.id IS 'Unique identifier for the reply';
COMMENT ON COLUMN support_ticket_replies.ticket_id IS 'Reference to the parent support ticket';
COMMENT ON COLUMN support_ticket_replies.user_id IS 'Reference to the user who sent the reply (optional)';
COMMENT ON COLUMN support_ticket_replies.wallet_address IS 'Wallet address of the user who sent the reply';
COMMENT ON COLUMN support_ticket_replies.message IS 'Content of the reply message';
COMMENT ON COLUMN support_ticket_replies.is_admin IS 'Whether this reply is from an admin/support agent';
COMMENT ON COLUMN support_ticket_replies.is_internal IS 'Whether this is an internal note (only visible to admins)';
COMMENT ON COLUMN support_ticket_replies.created_at IS 'Timestamp when the reply was created';
COMMENT ON COLUMN support_ticket_replies.updated_at IS 'Timestamp when the reply was last updated';

-- Add reply_count column to wallet_support_tickets for quick reference
ALTER TABLE wallet_support_tickets ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- Function to update reply count
CREATE OR REPLACE FUNCTION update_ticket_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE wallet_support_tickets 
        SET reply_count = reply_count + 1
        WHERE id = NEW.ticket_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE wallet_support_tickets 
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = OLD.ticket_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_reply_count
    AFTER INSERT OR DELETE ON support_ticket_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_reply_count();

-- Backfill reply_count for existing tickets
UPDATE wallet_support_tickets t
SET reply_count = (
    SELECT COUNT(*) 
    FROM support_ticket_replies r 
    WHERE r.ticket_id = t.id
);
