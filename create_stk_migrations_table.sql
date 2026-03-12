-- ============================================================================
-- STK TO STARFI POINT MIGRATION SYSTEM
-- ============================================================================
-- This creates a separate table for STK token migrations to StarFi Points
-- Conversion: 10,000,000 STK = 8 RZC (via StarFi Points)
-- ============================================================================

-- Create stk_migrations table
CREATE TABLE IF NOT EXISTS public.stk_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    telegram_username TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    stk_wallet_address TEXT NOT NULL,
    nft_token_id TEXT NOT NULL,
    stk_amount NUMERIC NOT NULL CHECK (stk_amount > 0),
    starfi_points NUMERIC NOT NULL CHECK (starfi_points > 0),
    rzc_equivalent NUMERIC NOT NULL CHECK (rzc_equivalent >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    CONSTRAINT unique_wallet_stk_migration UNIQUE (wallet_address)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stk_migrations_wallet ON public.stk_migrations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_stk_migrations_status ON public.stk_migrations(status);
CREATE INDEX IF NOT EXISTS idx_stk_migrations_created ON public.stk_migrations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stk_migrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own STK migrations" ON public.stk_migrations;
DROP POLICY IF EXISTS "Users can insert their own STK migrations" ON public.stk_migrations;
DROP POLICY IF EXISTS "Admins can view all STK migrations" ON public.stk_migrations;
DROP POLICY IF EXISTS "Admins can update STK migrations" ON public.stk_migrations;

-- Policy: Users can view their own STK migration requests
CREATE POLICY "Users can view their own STK migrations"
    ON public.stk_migrations
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own STK migration requests
CREATE POLICY "Users can insert their own STK migrations"
    ON public.stk_migrations
    FOR INSERT
    WITH CHECK (true);

-- Policy: Admins can view all STK migrations
CREATE POLICY "Admins can view all STK migrations"
    ON public.stk_migrations
    FOR SELECT
    USING (true);

-- Policy: Admins can update STK migrations
CREATE POLICY "Admins can update STK migrations"
    ON public.stk_migrations
    FOR UPDATE
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.stk_migrations TO anon, authenticated;
GRANT UPDATE ON public.stk_migrations TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'stk_migrations';

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert a test STK migration (uncomment to test)
/*
INSERT INTO public.stk_migrations (
    wallet_address,
    telegram_username,
    mobile_number,
    stk_wallet_address,
    nft_token_id,
    stk_amount,
    starfi_points,
    rzc_equivalent,
    status
) VALUES (
    'UQTest123456789',
    '@testuser',
    '+1234567890',
    'UQOldSTKWallet123',
    'NFT-12345',
    10000000,
    10000000,
    8,
    'pending'
);
*/

-- View all STK migrations
-- SELECT * FROM public.stk_migrations ORDER BY created_at DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ STK Migrations table created successfully!';
    RAISE NOTICE '📊 Table: public.stk_migrations';
    RAISE NOTICE '🔒 RLS enabled with policies';
    RAISE NOTICE '💱 Conversion: 10,000,000 STK = 8 RZC';
END $$;
